"use client";

import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface HelpTooltipProps {
  content: string;
  darkMode?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  children?: React.ReactNode;
}

export function HelpTooltip({ content, darkMode = false, side = "top", children }: HelpTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children || (
            <HelpCircle className={`h-4 w-4 cursor-help ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
          )}
        </TooltipTrigger>
        <TooltipContent side={side} className={`max-w-xs text-xs ${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}>
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ContextualHelpProps {
  section: string;
  darkMode: boolean;
}

const helpContent: Record<string, { title: string; tips: string[]; links?: { label: string; action: string }[] }> = {
  calificaciones: {
    title: "Ayuda: Calificaciones",
    tips: [
      "Selecciona primero el grado y la asignatura antes de ingresar notas",
      "Las actividades cotidianas valen 35% del promedio trimestral",
      "Las actividades integradoras valen 35% del promedio trimestral",
      "El examen trimestral vale 30% del promedio trimestral",
      "Si el promedio final es menor a 5.0, el estudiante puede presentar recuperación",
      "Puedes importar calificaciones desde un archivo CSV",
      "Las calificaciones se guardan automáticamente mientras escribes",
      "Usa el botón 'Config' para ajustar cantidades y porcentajes de actividades"
    ]
  },
  asistencia: {
    title: "Ayuda: Asistencia",
    tips: [
      "Selecciona el grado y la fecha para tomar asistencia",
      "Los estados disponibles son: Presente, Ausente, Tarde y Justificada",
      "Puedes ver el resumen mensual desde la pestaña 'Resumen'",
      "Exporta el resumen de asistencia a CSV para reportes",
      "La asistencia se registra por día, no por hora",
      "Puedes eliminar registros de asistencia si cometiste un error"
    ]
  },
  estudiantes: {
    title: "Ayuda: Estudiantes",
    tips: [
      "Agrega estudiantes uno por uno o importa una lista completa",
      "Puedes reordenar estudiantes arrastrando las filas",
      "El número de lista se asigna automáticamente",
      "Los estudiantes inactivos no aparecen en las listas de calificaciones",
      "Puedes editar el nombre y correo de cada estudiante"
    ]
  },
  boletas: {
    title: "Ayuda: Boletas",
    tips: [
      "Las boletas muestran todas las calificaciones del trimestre",
      "Selecciona el grado y trimestre para generar las boletas",
      "Los administradores pueden elegir qué asignaturas incluir",
      "Puedes imprimir las boletas directamente desde el navegador",
      "Las boletas incluyen promedios por asignatura y general"
    ]
  },
  dashboard: {
    title: "Ayuda: Panel de Inicio",
    tips: [
      "El dashboard muestra estadísticas generales del sistema",
      "Selecciona un grado específico para ver su rendimiento",
      "El Cuadro de Honor muestra los mejores estudiantes",
      "Las Alertas identifican estudiantes con bajo rendimiento",
      "Los accesos rápidos te llevan directamente a las funciones principales"
    ]
  },
  admin: {
    title: "Ayuda: Administración",
    tips: [
      "Crea y gestiona usuarios del sistema (admin y docentes)",
      "Asigna docentes como tutores de grados (2° a 5°)",
      "Asigna docentes a materias específicas (6° a 9°)",
      "Configura el año escolar actual",
      "Puedes resetear el sistema para iniciar un nuevo año escolar",
      "Repara asignaciones si hay inconsistencias en el sistema"
    ]
  }
};

export function ContextualHelp({ section, darkMode }: ContextualHelpProps) {
  const help = helpContent[section];
  if (!help) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={`p-1.5 rounded-md transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              }`}
            aria-label="Ayuda contextual"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className={`max-w-sm p-4 ${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}>
          <div className="space-y-2">
            <p className="text-sm font-semibold">{help.title}</p>
            <ul className="space-y-1.5">
              {help.tips.map((tip, i) => (
                <li key={i} className="text-xs flex items-start gap-1.5">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
