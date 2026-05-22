"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";

type Estudiante = { id: string; numero: number; nombre: string };
type Asignatura = { id: string; nombre: string; gradoId: string };
type Calificacion = {
  id: string;
  estudianteId: string;
  materiaId: string;
  trimestre: number;
  promedioFinal: number | null;
};

interface ResumenAsignaturasProps {
  gradoId: string;
  trimestre: string;
  estudiantes: Estudiante[];
  misMateriasIds: string[];
  todasAsignaturas: Asignatura[];
  darkMode: boolean;
  umbralCondicionado: number;
  umbralAprobado: number;
}

export default function ResumenAsignaturas({
  gradoId,
  trimestre,
  estudiantes,
  misMateriasIds,
  todasAsignaturas,
  darkMode,
  umbralCondicionado,
  umbralAprobado,
}: ResumenAsignaturasProps) {
  const [open, setOpen] = useState(false);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [loading, setLoading] = useState(false);

  const otrasAsignaturas = todasAsignaturas.filter(
    (m) => m.gradoId === gradoId && !misMateriasIds.includes(m.id)
  );

  useEffect(() => {
    if (!open || calificaciones.length > 0 || loading) return;
    setLoading(true);
    fetch(`/api/calificaciones?gradoId=${gradoId}&boleta=true`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          const trimNum = parseInt(trimestre);
          const filtradas = data.filter((c: any) => c.trimestre === trimNum);
          setCalificaciones(filtradas);
        }
      })
      .catch((e) => console.error("Error cargando resumen:", e))
      .finally(() => setLoading(false));
  }, [open, gradoId, trimestre, calificaciones.length, loading]);

  const estudiantesOrdenados = [...estudiantes].sort((a, b) => a.numero - b.numero);

  const getColor = (val: number | null) => {
    if (val === null) return "";
    if (val >= umbralAprobado) return darkMode ? "bg-emerald-800/60 text-emerald-200" : "bg-emerald-100 text-emerald-800";
    if (val >= umbralCondicionado) return darkMode ? "bg-amber-800/60 text-amber-200" : "bg-amber-100 text-amber-800";
    return darkMode ? "bg-red-900/60 text-red-200" : "bg-red-100 text-red-700";
  };

  const celda = (val: number | null) => {
    if (val === null) return <span className="text-gray-400">–</span>;
    return <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${getColor(val)}`}>{Math.round(val)}</span>;
  };

  const promediosPorMateria = otrasAsignaturas.map((m) => {
    const notas = calificaciones
      .filter((c) => c.materiaId === m.id)
      .map((c) => c.promedioFinal)
      .filter((n): n is number => n !== null);
    const promedio = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
    return { materiaId: m.id, promedio };
  });

  if (otrasAsignaturas.length === 0) return null;

  return (
    <div className={`rounded-lg border overflow-hidden transition-all ${darkMode ? 'border-white/20 bg-slate-900/50' : 'border-slate-200 bg-white'}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors ${
          'hover-gradient' + (darkMode ? ' text-slate-200' : ' text-slate-700')
        }`}
      >
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-indigo-500" />
          <span>Resumen de otras asignaturas</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
            darkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
          }`}>
            {otrasAsignaturas.length}
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-xs text-gray-400">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={`text-left px-2 py-1.5 border-b text-[10px] uppercase tracking-wider font-semibold sticky left-0 z-10 ${
                      darkMode ? 'border-white/10 text-slate-400 bg-slate-900/50' : 'border-slate-200 text-slate-500 bg-white'
                    }`}>
                      Estudiante
                    </th>
                    {otrasAsignaturas.map((m) => (
                      <th key={m.id} className={`px-2 py-1.5 border-b text-center text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap ${
                        darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'
                      }`}>
                        {m.nombre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {estudiantesOrdenados.map((est) => {
                    const califsEst = calificaciones.filter((c) => c.estudianteId === est.id);
                    return (
                      <tr key={est.id} className={`hover-gradient`}>
                        <td className={`px-2 py-1 border-b text-[11px] font-medium sticky left-0 z-10 ${
                          darkMode ? 'border-white/5 text-slate-300 bg-slate-900/50' : 'border-slate-100 text-slate-600 bg-white'
                        }`}>
                          {est.numero}. {est.nombre}
                        </td>
                        {otrasAsignaturas.map((m) => {
                          const cal = califsEst.find((c) => c.materiaId === m.id);
                          return (
                            <td key={m.id} className={`px-2 py-1 border-b text-center ${
                              darkMode ? 'border-white/5' : 'border-slate-100'
                            }`}>
                              {celda(cal?.promedioFinal ?? null)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className={darkMode ? 'bg-slate-800/40' : 'bg-slate-50'}>
                    <td className={`px-2 py-1.5 text-[10px] font-semibold sticky left-0 z-10 ${
                      darkMode ? 'text-slate-400 bg-slate-800/40' : 'text-slate-500 bg-slate-50'
                    }`}>
                      Promedio
                    </td>
                    {promediosPorMateria.map((p) => (
                      <td key={p.materiaId} className="px-2 py-1.5 text-center">
                        <span className={`text-[11px] font-bold ${
                          p.promedio !== null
                            ? p.promedio >= umbralAprobado
                              ? darkMode ? 'text-emerald-400' : 'text-emerald-600'
                              : p.promedio >= umbralCondicionado
                                ? darkMode ? 'text-amber-400' : 'text-amber-600'
                                : darkMode ? 'text-red-400' : 'text-red-600'
                            : 'text-gray-400'
                        }`}>
                          {p.promedio !== null ? p.promedio.toFixed(1) : '–'}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
