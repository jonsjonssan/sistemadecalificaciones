"use client";

import React, { useState, useMemo, useCallback, useEffect, memo } from "react";
import { Grado, Estudiante, Asignatura } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, AlertTriangle, CheckCircle2, HelpCircle, X, Check } from "lucide-react";

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

function getRangoNota(promedio: number | null, uc = 4.5, ua = 6.5): RangoNota {
  if (promedio === null || promedio === undefined) return "sin_datos";
  if (promedio < uc) return "reprobado";
  if (promedio < ua) return "condicionado";
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
  umbralCondicionado?: number;
  umbralAprobado?: number;
}

const ReporteCalificaciones = memo(function ReporteCalificaciones({ grados, darkMode, todasAsignaturas, umbralCondicionado = 4.5, umbralAprobado = 6.5 }: ReporteCalificacionesProps) {
  const [gradoId, setGradoId] = useState("");
  const [trimestre, setTrimestre] = useState("1");
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [materias, setMaterias] = useState<Asignatura[]>([]);
  const [materiasActivas, setMateriasActivas] = useState<Set<string>>(new Set());
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
        setMateriasActivas(new Set(matData.map((m: Asignatura) => m.id)));
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

  // Materias filtradas según selección del usuario
  const materiasFiltradas = useMemo(() =>
    materias.filter(m => materiasActivas.has(m.id)),
    [materias, materiasActivas]
  );

  // Conteo por rango para el resumen (solo materias activas)
  const conteo = useMemo(() => {
    let reprobado = 0;
    let condicionado = 0;
    let aprobado = 0;
    let sinDatos = 0;
    for (const est of estudiantes) {
      const notasMaterias: (number | null)[] = [];
      for (const mat of materiasFiltradas) {
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
        if (avg < umbralCondicionado) reprobado++;
        else if (avg < umbralAprobado) condicionado++;
        else aprobado++;
      }
    }
    return { reprobado, condicionado, aprobado, sinDatos };
  }, [estudiantes, materiasFiltradas, matriz]);

  // Exportar a CSV
  const exportarCSV = useCallback(() => {
    if (!grado) return;
    const headers = ["N°", "Estudiante", ...materiasFiltradas.map(m => m.nombre)];
    const rows = estudiantes.map(est => {
        const estadosMaterias = materiasFiltradas.map(mat => {
        const nota = matriz.get(est.id)?.get(mat.id);
        return getRangoLabel(getRangoNota(nota ?? null, umbralCondicionado, umbralAprobado));
      });
      return [est.numero.toString(), est.nombre, ...estadosMaterias];
    });
    // Leyenda normativa
    const leyenda = [
      [],
      ["MARCO NORMATIVO"],
      ["0 - " + (umbralCondicionado - 0.01).toFixed(2), "Reprobado (MINED + C.E.)"],
      [umbralCondicionado.toFixed(2) + " - " + (umbralAprobado - 0.01).toFixed(2), "Condicionado (Aprueba MINED / Reprueba C.E.)"],
      [">= " + umbralAprobado.toFixed(2), "Aprobado (MINED + C.E.)"],
      [],
      ["Segun el marco normativo del Ministerio de Educacion (MINED), todo estudiante con calificacion de 5.00 en adelante aprueba el grado. El Centro Escolar establece un estandar de excelencia de " + umbralAprobado.toFixed(2) + "."],
    ];
    const csv = [headers, ...rows, ...leyenda].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_${grado.numero}${grado.seccion}_T${trimestre}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [grado, estudiantes, materiasFiltradas, matriz, trimestre]);

  // Exportar a PDF
  const exportarPDF = useCallback(async () => {
    if (!grado) return;
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const titulo = `Reporte de Estados - ${grado.numero}° "${grado.seccion}" - Trimestre ${trimestre}`;
    doc.setFontSize(11);
    doc.text(titulo, 14, 12);

    const headers = ["N°", "Estudiante", ...materiasFiltradas.map(m => m.nombre.length > 12 ? m.nombre.substring(0, 12) + "…" : m.nombre)];
    const rows = estudiantes.map(est => {
      const estados = materiasFiltradas.map(mat => {
        const nota = matriz.get(est.id)?.get(mat.id);
        return getRangoLabel(getRangoNota(nota ?? null, umbralCondicionado, umbralAprobado));
      });
      return [est.numero.toString(), est.nombre, ...estados];
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 18;

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

    // Leyenda normativa debajo de la tabla
    const leyendaY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : finalY + 6;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text("MARCO NORMATIVO", 14, leyendaY);
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38);
    doc.text("0 - " + (umbralCondicionado - 0.01).toFixed(2) + "  Reprobado (MINED + C.E.)", 14, leyendaY + 5);
    doc.setTextColor(217, 119, 6);
    doc.text(umbralCondicionado.toFixed(2) + " - " + (umbralAprobado - 0.01).toFixed(2) + "  Condicionado (Aprueba MINED / Reprueba C.E.)", 14, leyendaY + 10);
    doc.setTextColor(5, 150, 105);
    doc.text(">= " + umbralAprobado.toFixed(2) + "  Aprobado (MINED + C.E.)", 14, leyendaY + 15);
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.text("Segun el marco normativo del MINED, todo estudiante con calificacion de 5.00 en adelante aprueba el grado.", 14, leyendaY + 22);
    doc.text("El Centro Escolar establece un estandar de excelencia de " + umbralAprobado.toFixed(2) + ".", 14, leyendaY + 26);

    doc.save(`reporte_estados_${grado.numero}${grado.seccion}_T${trimestre}.pdf`);
  }, [grado, estudiantes, materiasFiltradas, matriz, trimestre]);

  if (!grados || grados.length === 0) {
    return (
      <Card className={`shadow-sm border ${darkMode ? "bg-[#121923] border-slate-700 text-white" : "bg-white border-slate-200"}`}>
        <CardContent className="p-6 text-center text-slate-500">No hay grados disponibles.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Leyenda normativa */}
      <Card className={`shadow-sm border ${darkMode ? "bg-[#121923] border-slate-700 text-white" : "bg-white border-slate-200"}`}>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-[10px]">Marco Normativo</span>
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${getRangoColor("reprobado", darkMode)}`}>
                <AlertTriangle className="h-3 w-3" /> 0 – {(umbralCondicionado - 0.01).toFixed(2)}
              </span>
              <span className="text-slate-500 dark:text-slate-400">Reprobado (MINED + C.E.)</span>
            </div>
            <div className={`h-4 w-px ${darkMode ? "bg-slate-600" : "bg-slate-300"}`} />
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${getRangoColor("condicionado", darkMode)}`}>
                <HelpCircle className="h-3 w-3" /> {umbralCondicionado.toFixed(2)} – {(umbralAprobado - 0.01).toFixed(2)}
              </span>
              <span className="text-slate-500 dark:text-slate-400">Condicionado (Aprueba MINED / Reprueba C.E.)</span>
            </div>
            <div className={`h-4 w-px ${darkMode ? "bg-slate-600" : "bg-slate-300"}`} />
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${getRangoColor("aprobado", darkMode)}`}>
                <CheckCircle2 className="h-3 w-3" /> ≥ {umbralAprobado.toFixed(2)}
              </span>
              <span className="text-slate-500 dark:text-slate-400">Aprobado (MINED + C.E.)</span>
            </div>
          </div>
          <div className={`mt-2 pt-2 border-t text-[10px] leading-relaxed ${darkMode ? "border-slate-700 text-slate-500" : "border-slate-100 text-slate-400"}`}>
            Según el marco normativo del Ministerio de Educación (MINED), todo estudiante con calificación de <strong>5.00 en adelante aprueba</strong> el grado. El Centro Escolar Católico San José de la Montaña establece un estándar de excelencia de <strong>{umbralAprobado.toFixed(2)}</strong>. Los estudiantes entre <strong>{umbralCondicionado.toFixed(2)} y {(umbralAprobado - 0.01).toFixed(2)}</strong> aprueban según el MINED pero se consideran <em>condicionados</em> por el Centro Escolar. Los estudiantes con calificación menor a <strong>{umbralCondicionado.toFixed(2)}</strong> se consideran <em>reprobados</em>.
          </div>
        </CardContent>
      </Card>

      {/* Selectores */}
      <Card className={`shadow-sm border ${darkMode ? "bg-[#121923] border-slate-700" : "bg-white border-slate-200"}`}>
        <CardContent className="p-2 sm:p-3">
          <div className="flex flex-wrap items-end gap-2 sm:gap-3">
            <div className="flex-1 min-w-[140px]">
              <Label className={`text-sm font-medium mb-1 block ${darkMode ? "text-slate-400" : ""}`}>Grado</Label>
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
              <Label className={`text-sm font-medium mb-1 block ${darkMode ? "text-slate-400" : ""}`}>Trimestre</Label>
              <Select value={trimestre} onValueChange={setTrimestre}>
                <SelectTrigger className={`h-11 sm:h-12 text-sm ${darkMode ? "bg-slate-800 border-slate-600 text-white" : ""}`}>
                  <SelectValue placeholder="Seleccionar trimestre" />
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
          {/* Selector de materias activas */}
          {gradoId && materias.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-dashed border-slate-600/30">
              <span className={`text-[10px] font-medium uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Asignaturas:</span>
              {materias.map(mat => {
                const activa = materiasActivas.has(mat.id);
                return (
                  <button
                    key={mat.id}
                    onClick={() => {
                      setMateriasActivas(prev => {
                        const next = new Set(prev);
                        if (next.has(mat.id)) next.delete(mat.id);
                        else next.add(mat.id);
                        return next;
                      });
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all border ${
                      activa
                        ? (darkMode ? "bg-emerald-900/40 border-emerald-600 text-emerald-400" : "bg-emerald-50 border-emerald-300 text-emerald-700")
                        : (darkMode ? "bg-slate-800 border-slate-600 text-slate-500 line-through opacity-60" : "bg-slate-100 border-slate-300 text-slate-400 line-through opacity-60")
                    }`}
                  >
                    {activa ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {mat.nombre}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contenido */}
      {!gradoId ? (
        <Card className={`shadow-sm border ${darkMode ? "bg-[#121923] border-slate-700 text-white" : "bg-white border-slate-200"}`}>
          <CardContent className="p-6 text-center text-slate-500">Selecciona un grado y trimestre para ver el reporte.</CardContent>
        </Card>
      ) : loading ? (
        <Card className={`shadow-sm border ${darkMode ? "bg-[#121923] border-slate-700" : "bg-white border-slate-200"}`}>
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
        <Card className={`shadow-sm border ${darkMode ? "bg-[#121923] border-slate-700" : "bg-white border-slate-200"}`}>
          <CardContent className="p-4 text-center text-red-500">{error}</CardContent>
        </Card>
      ) : (
        <>
          {/* Resumen */}
          <div className={`flex flex-wrap gap-3 px-4 py-2.5 rounded-lg border text-sm ${
            darkMode ? "bg-slate-800/80 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-600"
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
          <Card className={`shadow-xl border overflow-hidden ${darkMode ? "bg-[#121923] border-slate-700 text-white" : "bg-white border-slate-200"}`}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm font-medium border-collapse">
                  <thead>
                    <tr className={darkMode ? "bg-gradient-to-r from-slate-200 to-slate-300 text-white" : "bg-gradient-to-r from-slate-700 to-slate-600 text-white"}>
                      <th className={`w-10 p-2 text-center font-semibold sticky left-0 z-20 border-r border-b ${darkMode ? 'bg-slate-200 border-slate-400' : 'bg-slate-700 border-slate-500'}`}>N°</th>
                      <th className={`min-w-[140px] sm:min-w-[160px] p-2 text-left font-semibold sticky left-10 z-20 border-r border-b ${darkMode ? 'bg-slate-200 border-slate-400' : 'bg-slate-700 border-slate-500'}`}>Estudiante</th>
                       {materiasFiltradas.map(mat => (
                        <th key={mat.id} className={`p-2 text-center font-semibold border-r border-b ${darkMode ? "border-slate-400 bg-slate-200" : "border-slate-500 bg-slate-700"}`}
                          style={{ writingMode: "vertical-rl", minWidth: "2.5rem", maxWidth: "3rem" }}>
                          <div className="rotate-180 whitespace-nowrap text-[10px] sm:text-xs py-1">{mat.nombre}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantes.map((est, idx) => {
                      const rowBg = idx % 2 === 0
                        ? (darkMode ? "bg-[#121923]" : "bg-white")
                        : (darkMode ? "bg-slate-800/60" : "bg-slate-50/50");
                      const cellBorder = darkMode ? "border-slate-700" : "border-slate-200";

                      return (
                        <tr key={est.id} className={`border-b transition-colors ${rowBg}`}>
                          <td className={`p-2 text-center font-semibold sticky left-0 z-10 border-r ${cellBorder} ${rowBg}`}>
                            {est.numero}
                          </td>
                          <td className={`p-2 font-medium sticky left-10 z-10 whitespace-nowrap border-r ${cellBorder} ${rowBg}`}>
                            {est.nombre}
                          </td>
                          {materiasFiltradas.map(mat => {
                            const nota = matriz.get(est.id)?.get(mat.id) ?? null;
                            const rango = getRangoNota(nota, umbralCondicionado, umbralAprobado);
                            const label = getRangoLabel(rango);
                            return (
                              <td key={mat.id} className={`p-1 text-center border-r ${cellBorder}`}>
                                <span className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold whitespace-nowrap ${getRangoColor(rango, darkMode)}`}>
                                  {label}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer resumen materias */}
              <div className={`flex flex-wrap gap-3 p-3 mt-2 border-t text-xs ${darkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"}`}>
                {materiasFiltradas.map(mat => {
                  const notas = estudiantes.map(est => matriz.get(est.id)?.get(mat.id) ?? null).filter(n => n !== null) as number[];
                  const promedio = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
                  const rango = getRangoNota(promedio, umbralCondicionado, umbralAprobado);
                  return (
                    <div key={mat.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? "bg-slate-700/50 border border-slate-600" : "bg-slate-100 border border-slate-200"}`}>
                      <span className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
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
});

export default ReporteCalificaciones;
