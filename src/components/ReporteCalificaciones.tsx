"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Grado, Estudiante, Asignatura } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";

type CalificacionRow = {
  id: string;
  estudianteId: string;
  materiaId: string;
  trimestre: number;
  promedioFinal: number | null;
  actividadesCotidianas: string | null;
  actividadesIntegradoras: string | null;
  calificacionAC: number | null;
  calificacionAI: number | null;
  examenTrimestral: number | null;
  recuperacion: number | null;
  estudiante?: { id: string; numero: number; nombre: string; gradoId: string };
  materia?: { id: string; nombre: string };
};

type RangoNota = "reprobado" | "condicionado" | "aprobado" | "sin_datos";

function getRangoNota(promedio: number | null): RangoNota {
  if (promedio === null || promedio === undefined) return "sin_datos";
  if (promedio < 5.0) return "reprobado";
  if (promedio < 6.5) return "condicionado";
  return "aprobado";
}

function getRangoColor(rango: RangoNota, darkMode: boolean) {
  switch (rango) {
    case "reprobado":
      return darkMode
        ? "bg-red-900/60 text-red-200 ring-1 ring-red-600"
        : "bg-red-100 text-red-800 ring-1 ring-red-300";
    case "condicionado":
      return darkMode
        ? "bg-amber-900/60 text-amber-200 ring-1 ring-amber-600"
        : "bg-amber-100 text-amber-800 ring-1 ring-amber-300";
    case "aprobado":
      return darkMode
        ? "bg-emerald-900/60 text-emerald-200 ring-1 ring-emerald-600"
        : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300";
    case "sin_datos":
    default:
      return darkMode
        ? "bg-slate-800 text-slate-500"
        : "bg-slate-100 text-slate-400";
  }
}

function getRangoLabel(rango: RangoNota) {
  switch (rango) {
    case "reprobado": return "Reprobado";
    case "condicionado": return "Condicionado";
    case "aprobado": return "Aprobado";
    case "sin_datos": return "—";
  }
}

interface ReporteCalificacionesProps {
  grados: Grado[];
  darkMode: boolean;
  todasAsignaturas?: Array<{ id: string; nombre: string; gradoId: string }>;
}

export default function ReporteCalificaciones({ grados, darkMode, todasAsignaturas }: ReporteCalificacionesProps) {
  const [gradoId, setGradoId] = useState("");
  const [trimestre, setTrimestre] = useState("1");
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [materias, setMaterias] = useState<Asignatura[]>([]);
  const [calificaciones, setCalificaciones] = useState<CalificacionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const grado = useMemo(() => grados.find(g => g.id === gradoId), [grados, gradoId]);

  const handleGradoChange = useCallback((val: string) => {
    setGradoId(val);
    if (!val) return;
    setLoading(true);
    setError("");
    Promise.all([
      fetch(`/api/estudiantes?gradoId=${val}&_=${Date.now()}`, { cache: "no-store", credentials: "include" }),
      fetch(`/api/materias?gradoId=${val}&_=${Date.now()}`, { cache: "no-store", credentials: "include" }),
      fetch(`/api/calificaciones?gradoId=${val}&_=${Date.now()}`, { cache: "no-store", credentials: "include" }),
    ])
      .then(async ([estRes, matRes, calRes]) => {
        if (!estRes.ok || !matRes.ok || !calRes.ok) throw new Error("Error al cargar datos");
        const [estData, matData, calData] = await Promise.all([estRes.json(), matRes.json(), calRes.json()]);
        setEstudiantes(estData);
        setMaterias(matData);
        setCalificaciones(Array.isArray(calData) ? calData : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar"))
      .finally(() => setLoading(false));
  }, []);

  // Filtrar calificaciones por trimestre seleccionado
  const calificacionesTrimestre = useMemo(() =>
    calificaciones.filter(c => c.trimestre === parseInt(trimestre)),
    [calificaciones, trimestre]
  );

  // Matriz: estudiante × materia → promedioFinal
  const matriz = useMemo(() => {
    const map = new Map<string, Map<string, number | null>>();
    for (const cal of calificacionesTrimestre) {
      const estudianteId = cal.estudianteId;
      const materiaId = cal.materiaId;
      if (!map.has(estudianteId)) map.set(estudianteId, new Map());
      map.get(estudianteId)!.set(materiaId, cal.promedioFinal);
    }
    return map;
  }, [calificacionesTrimestre]);

  // Conteo por rango para el resumen
  const conteo = useMemo(() => {
    let reprobado = 0;
    let condicionado = 0;
    let aprobado = 0;
    let sinDatos = 0;
    for (const est of estudiantes) {
      const notasMaterias: (number | null)[] = [];
      for (const mat of materias) {
        const nota = matriz.get(est.id)?.get(mat.id) ?? null;
        notasMaterias.push(nota);
      }
      if (notasMaterias.every(n => n === null)) {
        sinDatos++;
        continue;
      }
      const promedioEstudiante = notasMaterias.filter(n => n !== null) as number[];
      if (promedioEstudiante.length === 0) {
        sinDatos++;
      } else {
        const avg = promedioEstudiante.reduce((a, b) => a + b, 0) / promedioEstudiante.length;
        if (avg < 5.0) reprobado++;
        else if (avg < 6.5) condicionado++;
        else aprobado++;
      }
    }
    return { reprobado, condicionado, aprobado, sinDatos };
  }, [estudiantes, materias, matriz]);

  // Exportar a CSV
  const exportarCSV = useCallback(() => {
    if (!grado) return;
    const headers = ["N°", "Estudiante", ...materias.map(m => m.nombre), "Estado General"];
    const rows = estudiantes.map(est => {
      const estadosMaterias = materias.map(mat => {
        const nota = matriz.get(est.id)?.get(mat.id);
        return getRangoLabel(getRangoNota(nota ?? null));
      });
      const notasNumericas = materias.map(mat => matriz.get(est.id)?.get(mat.id)).filter(n => n !== null && n !== undefined) as number[];
      let estado = "Sin datos";
      if (notasNumericas.length > 0) {
        const avg = notasNumericas.reduce((a, b) => a + b, 0) / notasNumericas.length;
        estado = getRangoLabel(getRangoNota(avg));
      }
      return [est.numero.toString(), est.nombre, ...estadosMaterias, estado];
    });
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_${grado.numero}${grado.seccion}_T${trimestre}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [grado, estudiantes, materias, matriz, trimestre]);

  // Exportar a PDF
  const exportarPDF = useCallback(async () => {
    if (!grado) return;
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const titulo = `Reporte de Estados - ${grado.numero}° "${grado.seccion}" - Trimestre ${trimestre}`;
    doc.setFontSize(11);
    doc.text(titulo, 14, 12);

    const headers = ["N°", "Estudiante", ...materias.map(m => m.nombre.length > 12 ? m.nombre.substring(0, 12) + "…" : m.nombre)];
    const rows = estudiantes.map(est => {
      const estados = materias.map(mat => {
        const nota = matriz.get(est.id)?.get(mat.id);
        return getRangoLabel(getRangoNota(nota ?? null));
      });
      return [est.numero.toString(), est.nombre, ...estados];
    });

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 18,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 38 } },
      didParseCell: (data: any) => {
        if (data.column.index >= 2 && data.row.section === "body") {
          const val = String(data.cell.raw).trim();
          if (val === "Reprobado") {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = "bold";
          } else if (val === "Condicionado") {
            data.cell.styles.textColor = [217, 119, 6];
            data.cell.styles.fontStyle = "bold";
          } else if (val === "Aprobado") {
            data.cell.styles.textColor = [5, 150, 105];
            data.cell.styles.fontStyle = "bold";
          } else {
            data.cell.styles.textColor = [150, 150, 150];
          }
        }
      },
    });

    doc.save(`reporte_estados_${grado.numero}${grado.seccion}_T${trimestre}.pdf`);
  }, [grado, estudiantes, materias, matriz, trimestre]);

  if (!grados || grados.length === 0) {
    return (
      <Card className={`shadow-sm border ${darkMode ? "bg-[#1e293b] border-slate-700 text-white" : "bg-white border-slate-200"}`}>
        <CardContent className="p-6 text-center text-slate-500">No hay grados disponibles.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Leyenda normativa */}
      <Card className={`shadow-sm border ${darkMode ? "bg-[#1e293b] border-slate-700 text-white" : "bg-white border-slate-200"}`}>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-[10px]">Marco Normativo</span>
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${getRangoColor("reprobado", darkMode)}`}>
                <AlertTriangle className="h-3 w-3" /> 0 – 4.99
              </span>
              <span className="text-slate-500 dark:text-slate-400">Reprobado (MINED + C.E.)</span>
            </div>
            <div className={`h-4 w-px ${darkMode ? "bg-slate-600" : "bg-slate-300"}`} />
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${getRangoColor("condicionado", darkMode)}`}>
                <HelpCircle className="h-3 w-3" /> 5.00 – 6.49
              </span>
              <span className="text-slate-500 dark:text-slate-400">Aprueba MINED / Reprueba C.E.</span>
            </div>
            <div className={`h-4 w-px ${darkMode ? "bg-slate-600" : "bg-slate-300"}`} />
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${getRangoColor("aprobado", darkMode)}`}>
                <CheckCircle2 className="h-3 w-3" /> ≥ 6.50
              </span>
              <span className="text-slate-500 dark:text-slate-400">Aprobado (MINED + C.E.)</span>
            </div>
          </div>
          <div className={`mt-2 pt-2 border-t text-[10px] leading-relaxed ${darkMode ? "border-slate-700 text-slate-500" : "border-slate-100 text-slate-400"}`}>
            Según el marco normativo del Ministerio de Educación (MINED), todo estudiante con calificación de <strong>5.00 en adelante aprueba</strong> el grado. El Centro Escolar Católico San José de la Montaña establece un estándar de excelencia de <strong>6.50</strong>. Los estudiantes entre <strong>5.00 y 6.49</strong> aprueban según el MINED pero se consideran <em>condicionados</em> por el Centro Escolar.
          </div>
        </CardContent>
      </Card>

      {/* Selectores */}
      <Card className={`shadow-sm border ${darkMode ? "bg-[#1e293b] border-slate-700" : "bg-white border-slate-200"}`}>
        <CardContent className="p-2 sm:p-3">
          <div className="flex flex-wrap items-end gap-2 sm:gap-3">
            <div className="flex-1 min-w-[140px]">
              <Label className={`text-sm font-medium mb-1 block ${darkMode ? "text-slate-300" : ""}`}>Grado</Label>
              <Select value={gradoId} onValueChange={handleGradoChange}>
                <SelectTrigger className={`h-11 sm:h-12 text-sm ${darkMode ? "bg-slate-800 border-slate-600 text-white" : ""}`}>
                  <SelectValue placeholder="Seleccionar grado" />
                </SelectTrigger>
                <SelectContent>
                  {grados.map(g => (
                    <SelectItem key={g.id} value={g.id} className="text-sm">{g.numero}° &quot;{g.seccion}&quot; - {g.año}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-20 sm:w-28">
              <Label className={`text-sm font-medium mb-1 block ${darkMode ? "text-slate-300" : ""}`}>Trimestre</Label>
              <Select value={trimestre} onValueChange={setTrimestre}>
                <SelectTrigger className={`h-11 sm:h-12 text-sm ${darkMode ? "bg-slate-800 border-slate-600 text-white" : ""}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1" className="text-sm">I</SelectItem>
                  <SelectItem value="2" className="text-sm">II</SelectItem>
                  <SelectItem value="3" className="text-sm">III</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {gradoId && (
              <>
                <Button size="sm" variant="outline" onClick={exportarCSV} className={`h-11 sm:h-12 text-sm ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" : ""}`}>
                  <Download className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" /><span className="hidden sm:inline">Excel (CSV)</span>
                </Button>
                <Button size="sm" variant="outline" onClick={exportarPDF} className={`h-11 sm:h-12 text-sm ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" : ""}`}>
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" /><span className="hidden sm:inline">PDF</span>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contenido */}
      {!gradoId ? (
        <Card className={`shadow-sm border ${darkMode ? "bg-[#1e293b] border-slate-700 text-white" : "bg-white border-slate-200"}`}>
          <CardContent className="p-6 text-center text-slate-500">Selecciona un grado y trimestre para ver el reporte.</CardContent>
        </Card>
      ) : loading ? (
        <Card className={`shadow-sm border ${darkMode ? "bg-[#1e293b] border-slate-700" : "bg-white border-slate-200"}`}>
          <CardContent className="p-3">
            <div className="space-y-2">
              <Skeleton className={`h-4 w-48 ${darkMode ? "bg-slate-700" : "bg-slate-200"}`} />
              <Skeleton className={`h-8 w-full ${darkMode ? "bg-slate-700" : "bg-slate-200"}`} />
              <Skeleton className={`h-8 w-full ${darkMode ? "bg-slate-700" : "bg-slate-200"}`} />
              <Skeleton className={`h-8 w-full ${darkMode ? "bg-slate-700" : "bg-slate-200"}`} />
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className={`shadow-sm border ${darkMode ? "bg-[#1e293b] border-slate-700" : "bg-white border-slate-200"}`}>
          <CardContent className="p-4 text-center text-red-500">{error}</CardContent>
        </Card>
      ) : (
        <>
          {/* Resumen */}
          <div className={`flex flex-wrap gap-3 px-4 py-2.5 rounded-lg border text-sm ${
            darkMode ? "bg-slate-800/80 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-600"
          }`}>
            <span className="font-medium text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider">Resumen</span>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{conteo.aprobado}</span>
              <span className="text-xs">aprobado{conteo.aprobado !== 1 ? "s" : ""}</span>
            </div>
            <div className={`h-4 w-px ${darkMode ? "bg-slate-600" : "bg-slate-300"}`} />
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{conteo.condicionado}</span>
              <span className="text-xs">condicionado{conteo.condicionado !== 1 ? "s" : ""}</span>
            </div>
            <div className={`h-4 w-px ${darkMode ? "bg-slate-600" : "bg-slate-300"}`} />
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs font-semibold text-red-500 dark:text-red-400">{conteo.reprobado}</span>
              <span className="text-xs">reprobado{conteo.reprobado !== 1 ? "s" : ""}</span>
            </div>
            <div className={`h-4 w-px ${darkMode ? "bg-slate-600" : "bg-slate-300"}`} />
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-xs font-semibold text-slate-500">{conteo.sinDatos}</span>
              <span className="text-xs">sin datos</span>
            </div>
          </div>

          {/* Tabla */}
          <Card className={`shadow-xl border overflow-hidden ${darkMode ? "bg-[#1e293b] border-slate-700 text-white" : "bg-white border-slate-200"}`}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm font-medium border-collapse">
                  <thead>
                    <tr className={darkMode ? "bg-gradient-to-r from-slate-700 to-slate-600 text-white" : "bg-gradient-to-r from-slate-700 to-slate-600 text-white"}>
                      <th className="w-10 p-2 text-center font-semibold sticky left-0 z-20 border-r border-b bg-slate-700 border-slate-500">N°</th>
                      <th className="min-w-[140px] sm:min-w-[160px] p-2 text-left font-semibold sticky left-10 z-20 border-r border-b bg-slate-700 border-slate-500">Estudiante</th>
                      {materias.map(mat => (
                        <th key={mat.id} className={`p-2 text-center font-semibold border-r border-b ${darkMode ? "border-slate-600 bg-slate-700" : "border-slate-500 bg-slate-700"}`}
                          style={{ writingMode: "vertical-rl", minWidth: "2.5rem", maxWidth: "3rem" }}>
                          <div className="rotate-180 whitespace-nowrap text-[10px] sm:text-xs py-1">{mat.nombre}</div>
                        </th>
                      ))}
                      <th className={`p-2 text-center font-semibold border-b bg-slate-700 border-slate-500`} style={{ minWidth: "5rem" }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantes.map((est, idx) => {
                      const rowBg = idx % 2 === 0
                        ? (darkMode ? "bg-[#1e293b]" : "bg-white")
                        : (darkMode ? "bg-slate-800/60" : "bg-slate-50/50");
                      const cellBorder = darkMode ? "border-slate-700" : "border-slate-200";
                      const notasMaterias = materias.map(mat => matriz.get(est.id)?.get(mat.id) ?? null);
                      const notasNumericas = notasMaterias.filter(n => n !== null) as number[];
                      const promedioEst = notasNumericas.length > 0
                        ? notasNumericas.reduce((a, b) => a + b, 0) / notasNumericas.length
                        : null;
                      const rangoEst = getRangoNota(promedioEst);
                      const estadoLabel = getRangoLabel(rangoEst);

                      return (
                        <tr key={est.id} className={`border-b transition-colors ${rowBg}`}>
                          <td className={`p-2 text-center font-semibold sticky left-0 z-10 border-r ${cellBorder} ${rowBg}`}>
                            {est.numero}
                          </td>
                          <td className={`p-2 font-medium sticky left-10 z-10 whitespace-nowrap border-r ${cellBorder} ${rowBg}`}>
                            {est.nombre}
                          </td>
                          {materias.map(mat => {
                            const nota = matriz.get(est.id)?.get(mat.id) ?? null;
                            const rango = getRangoNota(nota);
                            const label = getRangoLabel(rango);
                            return (
                              <td key={mat.id} className={`p-1 text-center border-r ${cellBorder}`}>
                                <span className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold whitespace-nowrap ${getRangoColor(rango, darkMode)}`}>
                                  {label}
                                </span>
                              </td>
                            );
                          })}
                          <td className={`p-2 text-center ${cellBorder}`}>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${getRangoColor(rangoEst, darkMode)}`}>
                              {rangoEst === "reprobado" && <AlertTriangle className="h-3 w-3" />}
                              {rangoEst === "condicionado" && <HelpCircle className="h-3 w-3" />}
                              {rangoEst === "aprobado" && <CheckCircle2 className="h-3 w-3" />}
                              {estadoLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer resumen materias */}
              <div className={`flex flex-wrap gap-3 p-3 mt-2 border-t text-xs ${darkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"}`}>
                {materias.map(mat => {
                  const notas = estudiantes.map(est => matriz.get(est.id)?.get(mat.id) ?? null).filter(n => n !== null) as number[];
                  const promedio = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
                  const rango = getRangoNota(promedio);
                  return (
                    <div key={mat.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? "bg-slate-700/50 border border-slate-600" : "bg-slate-100 border border-slate-200"}`}>
                      <span className={`text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                        {mat.nombre}
                      </span>
                      <Badge className={`text-[10px] font-bold ${getRangoColor(rango, darkMode)}`}>
                        {promedio !== null ? promedio.toFixed(2) : "—"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
