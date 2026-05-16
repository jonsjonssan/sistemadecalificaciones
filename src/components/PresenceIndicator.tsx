"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronDown, ChevronUp, Wifi, WifiOff, Pencil, ClipboardList, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRealtimePresence, OnlineUser, ActionEvent } from "@/hooks/useRealtimePresence";

interface PresenceIndicatorProps {
  userId: string;
  nombre: string;
  email: string;
  rol: string;
  onActionEmit: (emit: (action: string, description: string, extra?: { grado?: string; asignatura?: string; estudiante?: string }) => void) => void;
  onRemoteAction?: (action: string, descripcion: string, extra?: { grado?: string; asignatura?: string; estudiante?: string }) => void;
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
    "bg-emerald-500", "bg-indigo-500", "bg-rose-500", "bg-amber-500",
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
  onRemoteAction,
}: PresenceIndicatorProps) {
  const { onlineUsers, isConnected, lastAction, emitAction } =
    useRealtimePresence({ userId, nombre, email, rol });
  const [expanded, setExpanded] = useState(false);
  const lastActionRef = useRef<ActionEvent | null>(null);

  React.useEffect(() => {
    onActionEmit(emitAction);
  }, [emitAction, onActionEmit]);

  React.useEffect(() => {
    if (lastAction && lastAction !== lastActionRef.current) {
      lastActionRef.current = lastAction;
      if (lastAction.user.userId !== userId && onRemoteAction) {
        onRemoteAction(lastAction.accion, lastAction.descripcion, {
          grado: lastAction.grado,
          asignatura: lastAction.asignatura,
          estudiante: lastAction.estudiante,
        });
      }
    }
  }, [lastAction, userId, onRemoteAction]);

  // Filtrar a los demas usuarios (excluirme a mi)
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
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
                {isConnected && onlineUsers.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {onlineUsers.length}
                  </Badge>
                )}
                {expanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronUp className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isConnected ? `${onlineUsers.length} usuario(s) en línea` : "Servidor de presencia no conectado. Usa el botón Refrescar para actualizar datos."}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Avatares flotantes de otros usuarios */}
        <div className="flex -space-x-2">
          {visibleAvatars.map((user) => (
            <Tooltip key={user.userId}>
              <TooltipTrigger asChild>
                <div className={`relative inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-background ${getRoleColor(user.userId)}`}>
                  {getInitials(user.nombre)}
                  {user.sessions > 1 && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[7px] font-bold text-white ring-1 ring-background">
                      {user.sessions}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs font-medium">{user.nombre}</p>
                {user.ultimaAccion && (
                  <p className="text-[10px] text-muted-foreground">{user.ultimaAccion.descripcion}</p>
                )}
                {user.sessions > 1 && (
                  <p className="text-[10px] text-blue-400">{user.sessions} pestañas abiertas</p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
          {overflowCount > 0 && (
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background">
              +{overflowCount}
            </div>
          )}
        </div>

        <AnimatePresence>
          {expanded && onlineUsers.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-background/95 backdrop-blur border border-muted-foreground/20 rounded-xl shadow-lg p-3 min-w-[240px] space-y-2">
                <div className="flex items-center gap-2">
                  <Wifi className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs font-medium">
                    {onlineUsers.length} conectado{onlineUsers.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {onlineUsers.map((user) => (
                    <Tooltip key={user.userId}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 cursor-default">
                          <div
                            className={`${getRoleColor(user.userId)} h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${user.userId === userId ? "ring-2 ring-primary ring-offset-1" : ""}`}
                          >
                            {getInitials(user.nombre)}
                            {user.sessions > 1 && (
                              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-500 text-[6px] font-bold text-white ring-1 ring-background">
                                {user.sessions}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
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
                          <div className="flex items-center gap-1">
                            {user.sessions > 1 && (
                              <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 bg-blue-100 text-blue-700">
                                {user.sessions}x
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                              {getRoleLabel(user.rol)}
                            </Badge>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="text-xs">{user.nombre}</p>
                        {user.ultimaAccion && (
                          <p className="text-[10px] text-muted-foreground">
                            {user.ultimaAccion.descripcion}
                          </p>
                        )}
                        {user.sessions > 1 && (
                          <p className="text-[10px] text-blue-400">{user.sessions} pestañas abiertas</p>
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
