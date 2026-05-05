"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
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
  const [materiasActivas, setMateriasActivas] = useState<Set<string>>(new Set());
  const [calificaciones, setCalificaciones] = useState<CalificacionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [asignaturaCuadroId, setAsignaturaCuadroId] = useState("");
  const [recuperacionesAnuales, setRecuperacionesAnuales] = useState<Map<string, number>>(new Map());
  const [guardandoRecup, setGuardandoRecup] = useState<string | null>(null);

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
        if (avg < 5.0) reprobado++;
        else if (avg < 6.5) condicionado++;
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
        return getRangoLabel(getRangoNota(nota ?? null));
      });
      return [est.numero.toString(), est.nombre, ...estadosMaterias];
    });
    // Leyenda normativa
    const leyenda = [
      [],
      ["MARCO NORMATIVO"],
      ["0 - 4.99", "Reprobado (MINED + C.E.)"],
      ["5.00 - 6.49", "Aprueba MINED / Reprueba C.E."],
      [">= 6.50", "Aprobado (MINED + C.E.)"],
      [],
      ["Segun el marco normativo del Ministerio de Educacion (MINED), todo estudiante con calificacion de 5.00 en adelante aprueba el grado. El Centro Escolar establece un estandar de excelencia de 6.50."],
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

  // ========== Cuadro de Promedios por Período (3 trimestres + PF + Recuperación Anual editable) ==========
  const asignaturaCuadro = useMemo(() => materias.find(m => m.id === asignaturaCuadroId), [materias, asignaturaCuadroId]);

  useEffect(() => {
    if (!gradoId || !asignaturaCuadroId) return;
    fetch(`/api/recuperacion-anual?gradoId=${gradoId}&materiaId=${asignaturaCuadroId}&año=${grado?.año || new Date().getFullYear()}`, { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then((data: Array<{ estudianteId: string; nota: number }>) => {
        const map = new Map<string, number>();
        for (const r of data) map.set(r.estudianteId, r.nota);
        setRecuperacionesAnuales(map);
      })
      .catch(() => setRecuperacionesAnuales(new Map()));
  }, [gradoId, asignaturaCuadroId, grado?.año]);

  const datosCuadroTrimestres = useMemo(() => {
    if (!asignaturaCuadro) return [];
    return estudiantes.map(est => {
      const c1 = calificaciones.find(c => c.estudianteId === est.id && c.materiaId === asignaturaCuadro.id && c.trimestre === 1);
      const c2 = calificaciones.find(c => c.estudianteId === est.id && c.materiaId === asignaturaCuadro.id && c.trimestre === 2);
      const c3 = calificaciones.find(c => c.estudianteId === est.id && c.materiaId === asignaturaCuadro.id && c.trimestre === 3);
      const n1 = c1?.promedioFinal ?? null;
      const n2 = c2?.promedioFinal ?? null;
      const n3 = c3?.promedioFinal ?? null;
      const notasValidas = [n1, n2, n3].filter((n): n is number => n !== null && n !== undefined);
      const pf = notasValidas.length > 0 ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length : null;
      const recup = recuperacionesAnuales.get(est.id) ?? null;
      return { estudiante: est, n1, n2, n3, pf, recup };
    });
  }, [estudiantes, calificaciones, asignaturaCuadro, recuperacionesAnuales]);

  const guardarRecuperacion = useCallback(async (estudianteId: string, nota: string) => {
    if (!asignaturaCuadro) return;
    const trimmed = nota.trim();

    // Si el usuario borró el valor, eliminar la recuperación anual
    if (trimmed === "" || trimmed === "-" || trimmed === "—") {
      setGuardandoRecup(estudianteId);
      try {
        const añoNum = grado?.año || new Date().getFullYear();
        const res = await fetch(
          `/api/recuperacion-anual?estudianteId=${estudianteId}&materiaId=${asignaturaCuadro.id}&año=${añoNum}`,
          { method: "DELETE", credentials: "include" }
        );
        if (res.ok || res.status === 404) {
          setRecuperacionesAnuales(prev => {
            const next = new Map(prev);
            next.delete(estudianteId);
            return next;
          });
        }
      } catch (e) { console.error(e); }
      finally { setGuardandoRecup(null); }
      return;
    }

    const val = parseFloat(trimmed);
    if (isNaN(val) || val < 0 || val > 10) return;
    setGuardandoRecup(estudianteId);
    try {
      const res = await fetch("/api/recuperacion-anual", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estudianteId,
          materiaId: asignaturaCuadro.id,
          nota: val,
          año: grado?.año || new Date().getFullYear(),
        }),
      });
      if (res.ok) {
        setRecuperacionesAnuales(prev => {
          const next = new Map(prev);
          next.set(estudianteId, val);
          return next;
        });
      }
    } catch (e) { console.error(e); }
    finally { setGuardandoRecup(null); }
  }, [asignaturaCuadro, grado]);

  const exportarCuadroCSV = useCallback(() => {
    if (!grado || !asignaturaCuadro) return;
    const headers = ["N°", "Nombre de estudiantes", "1° T", "2° T", "3° T", "PF", "RECUPERACIÓN ANUAL"];
    const rows = datosCuadroTrimestres.map(d => [
      d.estudiante.numero.toString(),
      d.estudiante.nombre,
      d.n1 !== null ? d.n1.toFixed(1) : "",
      d.n2 !== null ? d.n2.toFixed(1) : "",
      d.n3 !== null ? d.n3.toFixed(1) : "",
      d.pf !== null ? d.pf.toFixed(1) : "",
      d.recup !== null ? d.recup.toFixed(1) : "",
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cuadro_promedios_${grado.numero}${grado.seccion}_${asignaturaCuadro.nombre.replace(/\s+/g, "_")}_2025.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [grado, asignaturaCuadro, datosCuadroTrimestres]);

  const exportarCuadroPDF = useCallback(async () => {
    if (!grado || !asignaturaCuadro) return;
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const titulo = `ESCUELA PARROQUIAL SAN JOSÉ DE LA MONTAÑA — CUADRO B — PROMEDIOS POR PERÍODO`;
    const subtitulo = `MATERIA: ${asignaturaCuadro.nombre}  |  GRADO: ${grado.numero}° "${grado.seccion}"  |  AÑO: ${grado.año || new Date().getFullYear()}`;
    doc.setFontSize(10);
    doc.text(titulo, 14, 10);
    doc.setFontSize(9);
    doc.text(subtitulo, 14, 15);

    const headers = ["N°", "Nombre de estudiantes", "1° T", "2° T", "3° T", "PF", "RECUPERACIÓN ANUAL"];
    const rows = datosCuadroTrimestres.map(d => [
      d.estudiante.numero.toString(),
      d.estudiante.nombre,
      d.n1 !== null ? d.n1.toFixed(1) : "—",
      d.n2 !== null ? d.n2.toFixed(1) : "—",
      d.n3 !== null ? d.n3.toFixed(1) : "—",
      d.pf !== null ? d.pf.toFixed(1) : "—",
      d.recup !== null ? d.recup.toFixed(1) : "—",
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 20,
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [20, 184, 166], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 60 } },
      didParseCell: (data: any) => {
        if (data.column.index >= 2 && data.column.index <= 5 && data.row.section === "body") {
          const val = parseFloat(String(data.cell.raw).replace("—", ""));
          if (!isNaN(val)) {
            if (val < 5.0) data.cell.styles.textColor = [220, 38, 38];
            else if (val < 6.5) data.cell.styles.textColor = [217, 119, 6];
            else data.cell.styles.textColor = [5, 150, 105];
          }
        }
      },
    });

    doc.save(`cuadro_promedios_${grado.numero}${grado.seccion}_${asignaturaCuadro.nombre.replace(/\s+/g, "_")}.pdf`);
  }, [grado, asignaturaCuadro, datosCuadroTrimestres]);

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
        return getRangoLabel(getRangoNota(nota ?? null));
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
    doc.text("0 - 4.99  Reprobado (MINED + C.E.)", 14, leyendaY + 5);
    doc.setTextColor(217, 119, 6);
    doc.text("5.00 - 6.49  Aprueba MINED / Reprueba C.E.", 14, leyendaY + 10);
    doc.setTextColor(5, 150, 105);
    doc.text(">= 6.50  Aprobado (MINED + C.E.)", 14, leyendaY + 15);
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.text("Segun el marco normativo del MINED, todo estudiante con calificacion de 5.00 en adelante aprueba el grado.", 14, leyendaY + 22);
    doc.text("El Centro Escolar establece un estandar de excelencia de 6.50.", 14, leyendaY + 26);

    doc.save(`reporte_estados_${grado.numero}${grado.seccion}_T${trimestre}.pdf`);
  }, [grado, estudiantes, materiasFiltradas, matriz, trimestre]);

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
                        ? (darkMode ? "bg-teal-900/40 border-teal-600 text-teal-300" : "bg-teal-50 border-teal-300 text-teal-700")
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
                       {materiasFiltradas.map(mat => (
                        <th key={mat.id} className={`p-2 text-center font-semibold border-r border-b ${darkMode ? "border-slate-600 bg-slate-700" : "border-slate-500 bg-slate-700"}`}
                          style={{ writingMode: "vertical-rl", minWidth: "2.5rem", maxWidth: "3rem" }}>
                          <div className="rotate-180 whitespace-nowrap text-[10px] sm:text-xs py-1">{mat.nombre}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantes.map((est, idx) => {
                      const rowBg = idx % 2 === 0
                        ? (darkMode ? "bg-[#1e293b]" : "bg-white")
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

          {/* ========== CUADRO EXTRA: PROMEDIOS POR PERÍODO (3 TRIMESTRES) ========== */}
          <Card className={`shadow-xl border overflow-hidden mt-4 ${darkMode ? "bg-[#1e293b] border-slate-700 text-white" : "bg-white border-slate-200"}`}>
            <CardContent className="p-3">
              <div className="flex flex-wrap items-end gap-3 mb-3">
                <div className="flex-1 min-w-[180px]">
                  <Label className={`text-sm font-medium mb-1 block ${darkMode ? "text-slate-300" : ""}`}>Asignatura para cuadro de trimestres</Label>
                  <Select value={asignaturaCuadroId} onValueChange={setAsignaturaCuadroId}>
                    <SelectTrigger className={`h-11 sm:h-12 text-sm ${darkMode ? "bg-slate-800 border-slate-600 text-white" : ""}`}>
                      <SelectValue placeholder="Seleccionar asignatura" />
                    </SelectTrigger>
                    <SelectContent>
                      {materias.map(m => (
                        <SelectItem key={m.id} value={m.id} className="text-sm">{m.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {asignaturaCuadroId && (
                  <>
                    <Button size="sm" variant="outline" onClick={exportarCuadroCSV} className={`h-11 sm:h-12 text-sm ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" : ""}`}>
                      <Download className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" /><span className="hidden sm:inline">Excel (CSV)</span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={exportarCuadroPDF} className={`h-11 sm:h-12 text-sm ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" : ""}`}>
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" /><span className="hidden sm:inline">PDF</span>
                    </Button>
                  </>
                )}
              </div>

              {asignaturaCuadroId && !asignaturaCuadro ? (
                <div className="text-center text-slate-500 py-4">Asignatura no encontrada.</div>
              ) : asignaturaCuadroId ? (
                <>
                  <div className={`mb-2 text-center ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                    <div className="text-xs font-bold uppercase tracking-wider">Escuela Parroquial San José de la Montaña</div>
                    <div className="text-sm font-semibold">CUADRO B — PROMEDIOS POR PERÍODO</div>
                    <div className="text-xs">MATERIA: {asignaturaCuadro?.nombre} &nbsp;|&nbsp; GRADO: {grado?.numero}° "{grado?.seccion}" &nbsp;|&nbsp; AÑO: {grado?.año || new Date().getFullYear()}</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm font-medium border-collapse">
                      <thead>
                        <tr className={darkMode ? "bg-gradient-to-r from-teal-700 to-teal-600 text-white" : "bg-gradient-to-r from-teal-600 to-teal-500 text-white"}>
                          <th className="w-10 p-2 text-center font-semibold border-r border-b border-teal-500">N°</th>
                          <th className="min-w-[180px] p-2 text-left font-semibold border-r border-b border-teal-500">Nombre de estudiantes</th>
                          <th className="p-2 text-center font-semibold border-r border-b border-teal-500">1° T</th>
                          <th className="p-2 text-center font-semibold border-r border-b border-teal-500">2° T</th>
                          <th className="p-2 text-center font-semibold border-r border-b border-teal-500">3° T</th>
                          <th className="p-2 text-center font-semibold border-r border-b border-teal-500">PF</th>
                          <th className="p-2 text-center font-semibold border-b border-teal-500">RECUPERACIÓN ANUAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datosCuadroTrimestres.map((d, idx) => {
                          const rowBg = idx % 2 === 0
                            ? (darkMode ? "bg-[#1e293b]" : "bg-white")
                            : (darkMode ? "bg-slate-800/60" : "bg-slate-50/50");
                          const cellBorder = darkMode ? "border-slate-700" : "border-slate-200";
                          const colorNota = (n: number | null) => {
                            if (n === null) return darkMode ? "text-slate-500" : "text-slate-400";
                            if (n < 5.0) return "text-red-600 dark:text-red-400 font-bold";
                            if (n < 6.5) return "text-amber-600 dark:text-amber-400 font-bold";
                            return "text-emerald-600 dark:text-emerald-400 font-bold";
                          };
                          return (
                            <tr key={d.estudiante.id} className={`border-b transition-colors ${rowBg}`}>
                              <td className={`p-2 text-center font-semibold border-r ${cellBorder}`}>{d.estudiante.numero}</td>
                              <td className={`p-2 font-medium whitespace-nowrap border-r ${cellBorder}`}>{d.estudiante.nombre}</td>
                              <td className={`p-2 text-center border-r ${cellBorder} ${colorNota(d.n1)}`}>{d.n1 !== null ? d.n1.toFixed(1) : "—"}</td>
                              <td className={`p-2 text-center border-r ${cellBorder} ${colorNota(d.n2)}`}>{d.n2 !== null ? d.n2.toFixed(1) : "—"}</td>
                              <td className={`p-2 text-center border-r ${cellBorder} ${colorNota(d.n3)}`}>{d.n3 !== null ? d.n3.toFixed(1) : "—"}</td>
                              <td className={`p-2 text-center border-r ${cellBorder} ${colorNota(d.pf)}`}>{d.pf !== null ? d.pf.toFixed(1) : "—"}</td>
                              <td className={`p-1 text-center ${cellBorder} ${colorNota(d.recup)}`}>
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                  defaultValue={d.recup !== null ? d.recup.toFixed(1) : ""}
                                  disabled={guardandoRecup === d.estudiante.id}
                                  onBlur={(e) => {
                                    const val = e.target.value;
                                    const current = d.recup !== null ? d.recup.toFixed(1) : "";
                                    if (val !== current) guardarRecuperacion(d.estudiante.id, val);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  className={`w-16 text-center text-xs sm:text-sm rounded border px-1 py-0.5 outline-none focus:ring-2 focus:ring-teal-500 ${
                                    darkMode
                                      ? "bg-slate-800 border-slate-600 text-white placeholder-slate-500"
                                      : "bg-white border-slate-300 text-slate-800 placeholder-slate-400"
                                  }`}
                                  placeholder="—"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-500 py-4 text-sm">Selecciona una asignatura para ver el cuadro de promedios por período.</div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
