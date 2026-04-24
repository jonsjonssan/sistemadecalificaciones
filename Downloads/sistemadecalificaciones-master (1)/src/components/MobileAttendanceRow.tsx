"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Clock, FileQuestion } from "lucide-react";

interface Estudiante {
  id: string;
  numero: number;
  nombre: string;
  activo: boolean;
}

interface MobileAttendanceRowProps {
  estudiante: Estudiante;
  estado: string;
  onEstadoChange: (estudianteId: string, estado: string) => void;
  darkMode: boolean;
}

export default function MobileAttendanceRow({ estudiante, estado, onEstadoChange, darkMode }: MobileAttendanceRowProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    setSwipeOffset(Math.max(-100, Math.min(100, diff)));
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 50) {
      const estados = ["presente", "ausente", "tarde", "justificada"];
      const currentIdx = estados.indexOf(estado);
      const nextIdx = (currentIdx + 1) % estados.length;
      onEstadoChange(estudiante.id, estados[nextIdx]);
    } else if (swipeOffset < -50) {
      const estados = ["presente", "ausente", "tarde", "justificada"];
      const currentIdx = estados.indexOf(estado);
      const prevIdx = currentIdx <= 0 ? estados.length - 1 : currentIdx - 1;
      onEstadoChange(estudiante.id, estados[prevIdx]);
    }
    setSwipeOffset(0);
    setIsSwiping(false);
  };

  const getEstadoConfig = () => {
    switch (estado) {
      case "presente":
        return { icon: Check, color: "text-green-600", bg: darkMode ? "bg-green-900/30 border-green-800" : "bg-green-50 border-green-200", label: "Presente" };
      case "ausente":
        return { icon: X, color: "text-red-600", bg: darkMode ? "bg-red-900/30 border-red-800" : "bg-red-50 border-red-200", label: "Ausente" };
      case "tarde":
        return { icon: Clock, color: "text-amber-600", bg: darkMode ? "bg-amber-900/30 border-amber-800" : "bg-amber-50 border-amber-200", label: "Tarde" };
      case "justificada":
        return { icon: FileQuestion, color: "text-blue-600", bg: darkMode ? "bg-blue-900/30 border-blue-800" : "bg-blue-50 border-blue-200", label: "Justificada" };
      default:
        return { icon: Check, color: "text-slate-600", bg: darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200", label: "Sin marcar" };
    }
  };

  const config = getEstadoConfig();
  const Icon = config.icon;

  return (
    <div
      className={`p-3 border rounded-lg mb-2 transition-transform ${config.bg}`}
      style={{ transform: isSwiping ? `translateX(${swipeOffset}px)` : undefined }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`text-xs w-8 h-6 flex items-center justify-center ${darkMode ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-500'}`}>
            {estudiante.numero}
          </Badge>
          <div>
            <p className="text-sm font-medium truncate max-w-[150px] sm:max-w-[200px]">{estudiante.nombre}</p>
            <p className={`text-xs ${config.color}`}>{config.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEstadoChange(estudiante.id, "presente")}
            className={`p-2 rounded-md transition-colors ${estado === "presente" ? "bg-green-600 text-white" : darkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"}`}
            aria-label="Presente"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEstadoChange(estudiante.id, "ausente")}
            className={`p-2 rounded-md transition-colors ${estado === "ausente" ? "bg-red-600 text-white" : darkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"}`}
            aria-label="Ausente"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEstadoChange(estudiante.id, "tarde")}
            className={`p-2 rounded-md transition-colors ${estado === "tarde" ? "bg-amber-600 text-white" : darkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"}`}
            aria-label="Tarde"
          >
            <Clock className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEstadoChange(estudiante.id, "justificada")}
            className={`p-2 rounded-md transition-colors ${estado === "justificada" ? "bg-blue-600 text-white" : darkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"}`}
            aria-label="Justificada"
          >
            <FileQuestion className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        Desliza para cambiar estado rápidamente
      </p>
    </div>
  );
}
