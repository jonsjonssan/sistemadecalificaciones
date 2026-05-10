"use client";

import React, { useState } from "react";
import { X, Calculator, HelpCircle } from "lucide-react";

interface MathExplanation {
  title: string;
  description: string;
  formula: string;
  steps: string[];
  example?: string;
}

interface MathInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  explanation: MathExplanation;
}

export function MathInfoModal({ isOpen, onClose, darkMode, explanation }: MathInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden transform transition-all ${
          darkMode
            ? "bg-[#1e293b] border-slate-600 text-white"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            darkMode ? "border-slate-600 bg-slate-800/50" : "border-slate-100 bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-xl ${
                darkMode ? "bg-teal-900/40" : "bg-teal-50"
              }`}
            >
              <Calculator className="h-5 w-5 text-teal-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold">{explanation.title}</h3>
              <p
                className={`text-[11px] ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Proceso de cálculo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? "hover:bg-slate-700 text-slate-400 hover:text-white"
                : "hover:bg-slate-200 text-slate-500 hover:text-slate-900"
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Description */}
          <p
            className={`text-sm leading-relaxed ${
              darkMode ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {explanation.description}
          </p>

          {/* Formula */}
          <div
            className={`rounded-xl border p-4 ${
              darkMode
                ? "bg-slate-800/60 border-slate-700"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <p
              className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${
                darkMode ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Fórmula
            </p>
            <div
              className={`font-mono text-sm px-3 py-2 rounded-lg text-center ${
                darkMode
                  ? "bg-slate-900/60 text-teal-300 border border-teal-800/50"
                  : "bg-white text-teal-700 border border-teal-200"
              }`}
            >
              {explanation.formula}
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <p
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                darkMode ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Pasos del cálculo
            </p>
            <div className="space-y-2">
              {explanation.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5 ${
                      darkMode
                        ? "bg-teal-900/40 text-teal-400"
                        : "bg-teal-100 text-teal-700"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <p
                    className={`text-sm leading-relaxed pt-0.5 ${
                      darkMode ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Example */}
          {explanation.example && (
            <div
              className={`rounded-xl border p-4 ${
                darkMode
                  ? "bg-amber-900/20 border-amber-800/50"
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              <p
                className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${
                  darkMode ? "text-amber-400" : "text-amber-700"
                }`}
              >
                Ejemplo
              </p>
              <p
                className={`text-sm leading-relaxed ${
                  darkMode ? "text-amber-200" : "text-amber-900"
                }`}
              >
                {explanation.example}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t text-center ${
            darkMode
              ? "border-slate-600 bg-slate-800/30 text-slate-500"
              : "border-slate-100 bg-slate-50 text-slate-400"
          }`}
        >
          <p className="text-[11px]">
            Los cálculos se realizan en tiempo real con los datos del sistema
          </p>
        </div>
      </div>
    </div>
  );
}

interface MathInfoButtonProps {
  darkMode: boolean;
  explanation: MathExplanation;
  size?: "sm" | "md";
}

export function MathInfoButton({ darkMode, explanation, size = "sm" }: MathInfoButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center justify-center rounded-full transition-all hover:scale-110 ${
          size === "sm"
            ? "w-5 h-5"
            : "w-6 h-6"
        } ${
          darkMode
            ? "bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-teal-400"
            : "bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-teal-600"
        }`}
        title="Ver proceso de cálculo matemático"
      >
        <HelpCircle className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      </button>

      <MathInfoModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        darkMode={darkMode}
        explanation={explanation}
      />
    </>
  );
}

// Explicaciones predefinidas para cada sección del Dashboard
export const mathExplanations = {
  totalEstudiantes: {
    title: "Total de Estudiantes",
    description:
      "Este indicador representa la suma total de estudiantes registrados en todos los grados y secciones visibles para el usuario actual.",
    formula: "Total = Σ (estudiantes por grado)",
    steps: [
      "Se obtienen todos los grados activos del año escolar actual.",
      "Para cada grado se cuenta el número de estudiantes registrados.",
      "Se suman los conteos de todos los grados.",
      "Si el usuario es docente, solo se cuentan los estudiantes de su grado asignado.",
    ],
    example:
      'Si hay 3 grados con 14, 18 y 25 estudiantes respectivamente: 14 + 18 + 25 = 57 estudiantes en total.',
  },
  gradosActivos: {
    title: "Grados Activos",
    description:
      "Indica el número total de secciones (grados) que están activas en el sistema para el año escolar actual.",
    formula: "Grados Activos = conteo(Grados donde año = añoEscolarActual)",
    steps: [
      "Se consultan todos los grados registrados en la base de datos.",
      "Se filtran solo aquellos cuyo año coincide con el año escolar actual configurado.",
      "Se cuenta el total de registros resultantes.",
    ],
    example:
      "Si existen 2°, 3°, 4°, 5°, 6°, 7°, 8° y 9° para el año 2026, el total sería 8 grados activos.",
  },
  asignaturas: {
    title: "Asignaturas",
    description:
      "Representa el total de materias o asignaturas impartidas en los grados activos del sistema.",
    formula: "Asignaturas = Σ (materias por grado)",
    steps: [
      "Se identifican todos los grados activos del año escolar.",
      "Para cada grado se cuentan las materias asignadas.",
      "Se suman todas las materias de todos los grados.",
      "Si el usuario es docente, solo se muestran sus materias asignadas.",
    ],
    example:
      'Si cada grado tiene 7 materias y hay 8 grados: 7 × 8 = 56 asignaturas en total.',
  },
  docentes: {
    title: "Docentes",
    description:
      "Indica el número total de docentes activos registrados en el sistema con rol de docente o docente-orientador.",
    formula: "Docentes = conteo(Usuarios donde rol ∈ {docente, docente-orientador} ∧ activo = true)",
    steps: [
      "Se consultan todos los usuarios del sistema.",
      "Se filtran aquellos con rol de docente o docente-orientador.",
      "Se verifica que el usuario esté activo (activo = true).",
      "Se cuenta el total de docentes que cumplen estos criterios.",
    ],
    example:
      "Si hay 5 docentes de aula y 3 orientadores registrados y activos, el total sería 8 docentes.",
  },
  rendimientoInstitucional: {
    title: "Rendimiento Institucional",
    description:
      "Este indicador representa el promedio general de calificaciones de toda la institución, calculado como el promedio de los promedios de cada ciclo educativo.",
    formula: "P. Institucional = (P. Primer Ciclo + P. Segundo Ciclo + P. Tercer Ciclo) / 3",
    steps: [
      "Se agrupan los grados en tres ciclos: Primer (2°-3°), Segundo (4°-6°) y Tercer (7°-9°).",
      "Para cada ciclo se calcula el promedio de todos sus grados.",
      "El promedio de un grado se obtiene promediando las calificaciones de todas sus materias.",
      "Finalmente se promedian los tres ciclos para obtener el indicador institucional.",
    ],
    example:
      "Si los ciclos tienen promedios 7.96, 6.54 y 6.80: (7.96 + 6.54 + 6.80) / 3 = 7.10",
  },
  promedioPorCategoria: {
    title: "Promedio por Categoría",
    description:
      "Muestra el promedio institucional de calificaciones agrupadas por tipo de actividad evaluativa: Cotidianas, Integradoras y Exámenes.",
    formula: "P. Categoría = Σ(promedios de la categoría) / cantidad de grados con datos",
    steps: [
      "Se obtienen las calificaciones de todas las materias por tipo de actividad.",
      "Las Cotidianas (AC) tienen un peso del 35% en el promedio final.",
      "Las Integradoras (AI) tienen un peso del 35% en el promedio final.",
      "Los Exámenes tienen un peso del 30% en el promedio final.",
      "Se promedian todas las calificaciones de cada categoría a nivel institucional.",
    ],
    example:
      "Si los promedios de AC son 7.5, 8.0 y 7.0 en tres grados: (7.5 + 8.0 + 7.0) / 3 = 7.50",
  },
  asignaturasPorCiclo: {
    title: "Asignaturas por Ciclo",
    description:
      "Muestra el promedio de calificaciones por ciclo educativo, permitiendo filtrar por materias específicas para un análisis más detallado.",
    formula: "P. Ciclo = Σ(promedios de grado del ciclo) / cantidad de grados con datos",
    steps: [
      "Se agrupan los grados según su ciclo educativo (Primer, Segundo, Tercer).",
      "Para cada grado se calcula el promedio de sus materias seleccionadas.",
      "Si todas las materias están seleccionadas, se usa el promedio completo del grado.",
      "El promedio del ciclo es el promedio de los promedios de sus grados.",
    ],
    example:
      'Si el 2° "A" tiene promedio 8.0 y el 3° "A" tiene 7.9, el Primer Ciclo promedia 7.96.',
  },
};

export default MathInfoButton;
