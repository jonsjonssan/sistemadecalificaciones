"use client";

import { useState, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Book, ChevronDown, ChevronRight } from "lucide-react";

interface CicloAsignaturas {
  nombre: string;
  grados: number[];
  color: string;
  colorBg: string;
  colorBorder: string;
  iconColor: string;
  ringColor: string;
}

const CICLOS: CicloAsignaturas[] = [
  { nombre: "Primer Ciclo", grados: [2, 3], color: "text-teal-600", colorBg: "bg-teal-50", colorBorder: "border-teal-200", iconColor: "text-teal-500", ringColor: "#14b8a6" },
  { nombre: "Segundo Ciclo", grados: [4, 5, 6], color: "text-blue-600", colorBg: "bg-blue-50", colorBorder: "border-blue-200", iconColor: "text-blue-500", ringColor: "#3b82f6" },
  { nombre: "Tercer Ciclo", grados: [7, 8, 9], color: "text-violet-600", colorBg: "bg-violet-50", colorBorder: "border-violet-200", iconColor: "text-violet-500", ringColor: "#8b5cf6" },
];

function getCicloDark(ciclo: CicloAsignaturas) {
  const map: Record<string, { bg: string; border: string; icon: string }> = {
    "Primer Ciclo": { bg: "bg-teal-900/20", border: "border-teal-800", icon: "text-teal-400" },
    "Segundo Ciclo": { bg: "bg-blue-900/20", border: "border-blue-800", icon: "text-blue-400" },
    "Tercer Ciclo": { bg: "bg-violet-900/20", border: "border-violet-800", icon: "text-violet-400" },
  };
  return map[ciclo.nombre] || { bg: "bg-slate-800", border: "border-slate-700", icon: "text-slate-400" };
}

function calcularPromedioGradoAjustado(
  stat: any,
  selectedMaterias: Set<string>
): number | null {
  if (!stat) return null;
  const tieneDatos =
    stat.promedios?.cotidiana != null ||
    stat.promedios?.integradora != null ||
    stat.promedios?.examen != null;
  if (!tieneDatos) return null;

  const promOriginal =
    ((stat.promedios.cotidiana ?? 0) +
      (stat.promedios.integradora ?? 0) +
      (stat.promedios.examen ?? 0)) / 3;

  const allMaterias = stat.materias || [];
  const materiasConDatos = allMaterias.filter((m: any) => m.promedio != null);
  const selectedConDatos = materiasConDatos.filter((m: any) => selectedMaterias.has(m.id));
  if (selectedConDatos.length === 0) return null;

  if (selectedConDatos.length === materiasConDatos.length) {
    return Math.round(promOriginal * 100) / 100;
  }

  const promTodas =
    materiasConDatos.reduce((a: number, m: any) => a + (m.promedio ?? 0), 0) /
    materiasConDatos.length;
  const promSeleccionadas =
    selectedConDatos.reduce((a: number, m: any) => a + (m.promedio ?? 0), 0) /
    selectedConDatos.length;
  if (promTodas === 0) return null;

  return Math.round(promOriginal * (promSeleccionadas / promTodas) * 100) / 100;
}

interface CiclosSectionProps {
  asignaturas: any[];
  stats: any[];
  grados: any[];
  darkMode: boolean;
  selectedMaterias: Set<string>;
  setSelectedMaterias: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const CiclosSection = memo(function CiclosSection({
  asignaturas, stats, grados, darkMode, selectedMaterias, setSelectedMaterias,
}: CiclosSectionProps) {
  const [expandedCiclo, setExpandedCiclo] = useState<string | null>(null);

  const toggleCiclo = (nombre: string) => {
    setExpandedCiclo(expandedCiclo === nombre ? null : nombre);
  };

  const toggleMateria = (id: string) => {
    setSelectedMaterias(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllMaterias = (ids: string[]) => {
    setSelectedMaterias(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  };

  const deselectAllMaterias = (ids: string[]) => {
    setSelectedMaterias(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {CICLOS.map(ciclo => {
        const d = getCicloDark(ciclo);
        const materiasDelCiclo = asignaturas.filter(m => m.grado?.numero && ciclo.grados.includes(m.grado.numero));
        const porGrado = ciclo.grados.map(num => {
          const gradoMaterias = materiasDelCiclo.filter(m => m.grado?.numero === num);
          const mat = gradoMaterias[0];
          const seccion = mat?.grado?.seccion ?? "A";
          const gradoInfo = grados.find((g: any) => g.numero === num);
          return {
            grado: num,
            gradoId: gradoInfo?.id ?? "",
            seccion,
            materias: gradoMaterias.map(m => ({ id: m.id, nombre: m.nombre })),
            estudianteCount: gradoInfo?._count?.estudiantes ?? 0
          };
        }).filter(g => g.materias.length > 0);

        if (porGrado.length === 0) return null;

        const totalMaterias = porGrado.reduce((a, g) => a + g.materias.length, 0);
        const totalEstudiantesCiclo = porGrado.reduce((a, g) => a + g.estudianteCount, 0);
        const isOpen = expandedCiclo === ciclo.nombre;
        const allMateriaIds = porGrado.flatMap(g => g.materias.map(m => m.id));
        const allSelected = allMateriaIds.every(id => selectedMaterias.has(id));
        const someSelected = allMateriaIds.some(id => selectedMaterias.has(id)) && !allSelected;

        const promPorGrado = porGrado.map(g => ({
          ...g,
          promedio: calcularPromedioGradoAjustado(
            stats.find(s => s.gradoId === g.gradoId),
            selectedMaterias
          ),
        }));

        const promsValidos = promPorGrado.map(g => g.promedio).filter((p): p is number => p !== null);
        const promCiclo = promsValidos.length > 0
          ? Math.round((promsValidos.reduce((a, b) => a + b, 0) / promsValidos.length) * 100) / 100
          : null;

        return (
          <Card key={ciclo.nombre} className={`shadow-sm overflow-hidden border-border bg-card`}>
            <div className={`h-1 w-full ${darkMode ? d.bg.replace('/20', '') : ciclo.colorBg}`} />
            <CardHeader
              className={`flex flex-row items-center justify-between cursor-pointer py-3 px-4 ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'} transition-colors`}
              onClick={() => toggleCiclo(ciclo.nombre)}
            >
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${darkMode ? d.bg : ciclo.colorBg}`}>
                  <Book className={`h-4 w-4 ${darkMode ? d.icon : ciclo.iconColor}`} />
                </div>
                <div>
                  <CardTitle className={`text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>{ciclo.nombre}</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {porGrado.map(g => `${g.grado}°${g.seccion}`).join(", ")} · {totalMaterias} asignaturas · {totalEstudiantesCiclo} estudiantes
                  </CardDescription>
                </div>
              </div>
              {isOpen
                ? <ChevronDown className="h-5 w-5 text-muted-foreground" />
                : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
            </CardHeader>

            {isOpen && (
              <CardContent className="px-4 pb-4 pt-0 space-y-4">
                <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Estudiantes</p>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{totalEstudiantesCiclo}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Asignaturas</p>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{totalMaterias}</p>
                  </div>
                  <div className="text-center col-span-2 sm:col-span-1">
                    <p className="text-xs text-muted-foreground">Promedio Ciclo</p>
                    <p className={`text-lg font-bold ${promCiclo != null && Math.round(promCiclo) >= 5 ? (darkMode ? 'text-teal-400' : 'text-teal-600') : (darkMode ? 'text-red-400' : 'text-red-600')}`}>
                      {promCiclo != null ? promCiclo.toFixed(2) : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`select-all-${ciclo.nombre}`}
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={(e) => {
                      if (e.target.checked) selectAllMaterias(allMateriaIds);
                      else deselectAllMaterias(allMateriaIds);
                    }}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                  />
                  <label htmlFor={`select-all-${ciclo.nombre}`} className={`text-xs font-semibold cursor-pointer ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                    {allSelected ? "Deseleccionar todas" : someSelected ? "Seleccionar restantes" : "Seleccionar todas"} las asignaturas
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {promPorGrado.map(grupo => {
                    const stat = stats.find(s => s.gradoId === grupo.gradoId);
                    return (
                      <div key={grupo.grado} className={`rounded-lg border p-3 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {grupo.grado}° "{grupo.seccion}"
                          </h4>
                          <Badge variant={grupo.promedio != null && Math.round(grupo.promedio) >= 5 ? "default" : "destructive"} className={`text-[10px] h-5 ${grupo.promedio != null && Math.round(grupo.promedio) >= 5 ? (darkMode ? 'bg-teal-600' : 'bg-teal-600') : ''}`}>
                            {grupo.promedio != null ? grupo.promedio.toFixed(1) : "N/A"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{grupo.estudianteCount} estudiantes</span>
                        </div>
                        <ul className="space-y-1.5">
                          {grupo.materias.sort((a, b) => a.nombre.localeCompare(b.nombre)).map((mat) => {
                            const statMateria = stat?.materias?.find((m: any) => m.id === mat.id);
                            const isSelected = selectedMaterias.has(mat.id);
                            return (
                              <li key={mat.id} className="text-xs flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleMateria(mat.id)}
                                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-3 w-3 shrink-0"
                                />
                                <span className={`flex-1 truncate ${isSelected ? (darkMode ? 'text-slate-200' : 'text-slate-800') : (darkMode ? 'text-slate-500 line-through' : 'text-slate-400 line-through')}`} title={mat.nombre}>
                                  {mat.nombre}
                                </span>
                                {statMateria?.promedio != null && (
                                  <Badge variant="secondary" className={`shrink-0 text-[10px] h-4 px-1 ${darkMode ? 'bg-slate-700 text-slate-400' : ''}`}>
                                    {statMateria.promedio.toFixed(1)}
                                  </Badge>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
});
