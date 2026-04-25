"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronDown, ChevronUp, Wifi, WifiOff, Pencil, ClipboardList, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRealtimePresence, OnlineUser } from "@/hooks/useRealtimePresence";

interface PresenceIndicatorProps {
  userId: string;
  nombre: string;
  email: string;
  rol: string;
  onActionEmit: (emit: (action: string, description: string, extra?: { grado?: string; asignatura?: string; estudiante?: string }) => void) => void;
}

function getInitials(nombre: string): string {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function getRoleLabel(rol: string): string {
  const map: Record<string, string> = {
    admin: "Admin",
    "admin-directora": "Directora",
    "admin-codirectora": "Codirectora",
    docente: "Docente",
    "docente-orientador": "Orientador",
  };
  return map[rol] ?? rol;
}

function getRoleColor(userId: string): string {
  const colors = [
    "bg-teal-500", "bg-indigo-500", "bg-rose-500", "bg-amber-500",
    "bg-emerald-500", "bg-violet-500", "bg-pink-500", "bg-orange-500",
    "bg-cyan-500", "bg-purple-500",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function ActionIcon({ accion }: { accion: string }) {
  if (accion.includes("Calificacion") || accion.includes("calificacion")) return <Pencil className="h-3 w-3" />;
  if (accion.includes("Asistencia") || accion.includes("asistencia")) return <ClipboardList className="h-3 w-3" />;
  return <Eye className="h-3 w-3" />;
}

export default function PresenceIndicator({
  userId,
  nombre,
  email,
  rol,
  onActionEmit,
}: PresenceIndicatorProps) {
  const { onlineUsers, isConnected, lastAction, emitAction } =
    useRealtimePresence({ userId, nombre, email, rol });
  const [expanded, setExpanded] = useState(false);

  React.useEffect(() => {
    onActionEmit(emitAction);
  }, [emitAction, onActionEmit]);

  const others = onlineUsers.filter((u) => u.userId !== userId);
  const visibleAvatars = others.slice(0, 5);
  const overflowCount = Math.max(0, others.length - 5);

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col items-start gap-1"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="rounded-full h-9 px-3 gap-1.5 bg-background/95 backdrop-blur shadow-lg border-muted-foreground/20 text-xs"
        >
          {isConnected ? (
            <Wifi className="h-3 w-3 text-emerald-500" />
          ) : (
            <WifiOff className="h-3 w-3 text-muted-foreground" />
          )}
          <Users className="h-3.5 w-3.5" />
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {onlineUsers.length}
          </Badge>
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )}
        </Button>

        <AnimatePresence>
          {expanded && onlineUsers.length > 1 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-background/95 backdrop-blur border border-muted-foreground/20 rounded-xl shadow-lg p-3 min-w-[220px] space-y-2">
                <div className="flex items-center gap-2">
                  <Wifi className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs font-medium">
                    {onlineUsers.length} conectado{onlineUsers.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {onlineUsers.map((user) => (
                    <Tooltip key={user.socketId}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 cursor-default">
                          <div
                            className={`${getRoleColor(user.userId)} h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${user.userId === userId ? "ring-2 ring-primary ring-offset-1" : ""}`}
                          >
                            {getInitials(user.nombre)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium truncate">
                              {user.nombre}
                              {user.userId === userId ? " (tú)" : ""}
                            </div>
                            {user.ultimaAccion && user.acciones[0] !== "Conectado" && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <ActionIcon accion={user.acciones[0]} />
                                <span className="truncate">{user.ultimaAccion.descripcion}</span>
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className="ml-auto text-[9px] px-1 py-0 h-4">
                            {getRoleLabel(user.rol)}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="text-xs">{user.nombre}</p>
                        {user.ultimaAccion && (
                          <p className="text-[10px] text-muted-foreground">
                            {user.ultimaAccion.descripcion}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
