"use client";

import React, { useState, useMemo, useCallback, useEffect, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

type Estudiante = { id: string; numero: number; nombre: string; gradoId: string };
type Asignatura = { id: string; nombre: string; gradoId: string };
type CalificacionRow = {
  id: string;
  estudianteId: string;
  materiaId: string;
  trimestre: number;
  promedioFinal: number | null;
};

interface CuadroTrimestresProps {
  gradoId: string;
  gradoNumero: number;
  gradoSeccion: string;
  gradoAño: number;
  asignaturas: Asignatura[];
  estudiantes: Estudiante[];
  darkMode: boolean;
  umbralCondicionado?: number;
  umbralAprobado?: number;
}

const CuadroTrimestres = memo(function CuadroTrimestres({ gradoId, gradoNumero, gradoSeccion, gradoAño, asignaturas, estudiantes, darkMode, umbralCondicionado = 4.5, umbralAprobado = 6.5 }: CuadroTrimestresProps) {
  const [asignaturaCuadroId, setAsignaturaCuadroId] = useState("");
  const [calificaciones, setCalificaciones] = useState<CalificacionRow[]>([]);
  const [recuperacionesAnuales, setRecuperacionesAnuales] = useState<Map<string, number>>(new Map());
  const [guardandoRecup, setGuardandoRecup] = useState<string | null>(null);
  const [inputRecups, setInputRecups] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  const grado = useMemo(() => ({
    id: gradoId,
    numero: gradoNumero,
    seccion: gradoSeccion,
    año: gradoAño,
  }), [gradoId, gradoNumero, gradoSeccion, gradoAño]);

  const asignaturaCuadro = useMemo(() => asignaturas.find(m => m.id === asignaturaCuadroId), [asignaturas, asignaturaCuadroId]);

   
  useEffect(() => {
    if (!gradoId) return;
    let cancelled = false;
    const fetchData = async () => {
      if (!cancelled) setLoading(true);
      try {
        const res = await fetch(`/api/calificaciones?gradoId=${gradoId}&_=${Date.now()}`, { cache: "no-store", credentials: "include" });
        const data = res.ok ? await res.json() : [];
        if (!cancelled) setCalificaciones(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setCalificaciones([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [gradoId]);

  useEffect(() => {
    if (!gradoId || !asignaturaCuadroId) return;
    fetch(`/api/recuperacion-anual?gradoId=${gradoId}&materiaId=${asignaturaCuadroId}&año=${gradoAño || new Date().getFullYear()}`, { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then((data: Array<{ estudianteId: string; nota: number }>) => {
        const map = new Map<string, number>();
        for (const r of data) map.set(r.estudianteId, r.nota);
        setRecuperacionesAnuales(map);
      })
      .catch(() => setRecuperacionesAnuales(new Map()));
  }, [gradoId, asignaturaCuadroId, gradoAño]);

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

    if (trimmed === "" || trimmed === "-" || trimmed === "—") {
      setGuardandoRecup(estudianteId);
      try {
        const añoNum = gradoAño || new Date().getFullYear();
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
          setInputRecups(prev => {
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
          año: gradoAño || new Date().getFullYear(),
        }),
      });
      if (res.ok) {
        setRecuperacionesAnuales(prev => {
          const next = new Map(prev);
          next.set(estudianteId, val);
          return next;
        });
        setInputRecups(prev => {
          const next = new Map(prev);
          next.delete(estudianteId);
          return next;
        });
      }
    } catch (e) { console.error(e); }
    finally { setGuardandoRecup(null); }
  }, [asignaturaCuadro, gradoAño]);

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
    a.download = `cuadro_promedios_${grado.numero}${grado.seccion}_${asignaturaCuadro.nombre.replace(/\s+/g, "_")}_${gradoAño || new Date().getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [grado, asignaturaCuadro, datosCuadroTrimestres, gradoAño]);

  const exportarCuadroPDF = useCallback(async () => {
    if (!grado || !asignaturaCuadro) return;
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const titulo = `ESCUELA PARROQUIAL SAN JOSÉ DE LA MONTAÑA — CUADRO B — PROMEDIOS POR PERÍODO`;
    const subtitulo = `MATERIA: ${asignaturaCuadro.nombre}  |  GRADO: ${grado.numero}° "${grado.seccion}"  |  AÑO: ${gradoAño || new Date().getFullYear()}`;
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
            if (val < umbralCondicionado) data.cell.styles.textColor = [220, 38, 38];
            else if (val < umbralAprobado) data.cell.styles.textColor = [217, 119, 6];
            else data.cell.styles.textColor = [5, 150, 105];
          }
        }
      },
    });

    doc.save(`cuadro_promedios_${grado.numero}${grado.seccion}_${asignaturaCuadro.nombre.replace(/\s+/g, "_")}.pdf`);
  }, [grado, asignaturaCuadro, datosCuadroTrimestres, gradoAño]);

  if (!asignaturas || asignaturas.length === 0 || estudiantes.length === 0) {
    return null;
  }

  return (
    <Card className={`shadow-xl border overflow-hidden mt-4 ${darkMode ? "bg-card border-slate-700 text-white" : "bg-white border-slate-200"}`}>
      <CardContent className="p-3">
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <div className="flex-1 min-w-[180px]">
            <Label className={`text-sm font-medium mb-1 block ${darkMode ? "text-slate-200" : ""}`}>Asignatura para cuadro de trimestres</Label>
            <Select value={asignaturaCuadroId} onValueChange={setAsignaturaCuadroId}>
              <SelectTrigger className={`h-11 sm:h-12 text-sm ${darkMode ? "bg-card border-white/30 text-white" : ""}`}>
                <SelectValue placeholder="Seleccionar asignatura" />
              </SelectTrigger>
              <SelectContent>
                {asignaturas.map(m => (
                  <SelectItem key={m.id} value={m.id} className="text-sm">{m.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {asignaturaCuadroId && (
            <>
              <Button size="sm" variant="outline" onClick={exportarCuadroCSV} className={`h-11 sm:h-12 text-sm ${darkMode ? "bg-card border-white/30 text-white hover:bg-white/10" : ""}`}>
                <Download className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" /><span className="hidden sm:inline">Excel (CSV)</span>
              </Button>
              <Button size="sm" variant="outline" onClick={exportarCuadroPDF} className={`h-11 sm:h-12 text-sm ${darkMode ? "bg-card border-white/30 text-white hover:bg-white/10" : ""}`}>
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" /><span className="hidden sm:inline">PDF</span>
              </Button>
            </>
          )}
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-4">Cargando calificaciones...</div>
        ) : asignaturaCuadroId && !asignaturaCuadro ? (
          <div className="text-center text-slate-500 py-4">Asignatura no encontrada.</div>
        ) : asignaturaCuadroId ? (
          <>
            <div className={`mb-2 text-center ${darkMode ? "text-slate-400" : "text-slate-700"}`}>
              <div className="text-xs font-bold uppercase tracking-wider">Escuela Parroquial San José de la Montaña</div>
              <div className="text-sm font-semibold">CUADRO B — PROMEDIOS POR PERÍODO</div>
              <div className="text-xs">MATERIA: {asignaturaCuadro?.nombre} &nbsp;|&nbsp; GRADO: {gradoNumero}° "{gradoSeccion}" &nbsp;|&nbsp; AÑO: {gradoAño || new Date().getFullYear()}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm font-medium border-collapse">
                <thead>
                  <tr className={darkMode ? "bg-gradient-to-r from-emerald-200 to-emerald-300 text-white" : "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white"}>
                    <th className="w-10 p-2 text-center font-semibold border-r border-b border-emerald-300">N°</th>
                    <th className="min-w-[180px] p-2 text-left font-semibold border-r border-b border-emerald-300">Nombre de estudiantes</th>
                    <th className="p-2 text-center font-semibold border-r border-b border-emerald-300">1° T</th>
                    <th className="p-2 text-center font-semibold border-r border-b border-emerald-300">2° T</th>
                    <th className="p-2 text-center font-semibold border-r border-b border-emerald-300">3° T</th>
                    <th className="p-2 text-center font-semibold border-r border-b border-emerald-300">PF</th>
                    <th className="p-2 text-center font-semibold border-b border-emerald-300">RECUPERACIÓN ANUAL</th>
                  </tr>
                </thead>
                <tbody>
                  {datosCuadroTrimestres.map((d, idx) => {
                    const rowBg = idx % 2 === 0
                      ? (darkMode ? "bg-card" : "bg-white")
                      : (darkMode ? "bg-muted" : "bg-slate-50/50");
                    const cellBorder = darkMode ? "border-slate-700" : "border-slate-200";
                    const colorNota = (n: number | null) => {
                      if (n === null) return darkMode ? "text-slate-500" : "text-slate-400";
                      if (n < umbralCondicionado) return "text-red-600 dark:text-red-400 font-bold";
                      if (n < umbralAprobado) return "text-amber-600 dark:text-amber-400 font-bold";
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
                            value={inputRecups.get(d.estudiante.id) ?? (d.recup !== null ? d.recup.toFixed(1) : "")}
                            disabled={guardandoRecup === d.estudiante.id}
                            onChange={(e) => {
                              setInputRecups(prev => {
                                const next = new Map(prev);
                                next.set(d.estudiante.id, e.target.value);
                                return next;
                              });
                            }}
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
                            className={`w-16 text-center text-xs sm:text-sm rounded border px-1 py-0.5 outline-none focus:ring-2 focus:ring-emerald-500 ${
                              darkMode
                                ? "bg-slate-700 border-white/30 text-emerald-200 placeholder-slate-500"
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
  );
});

export default CuadroTrimestres;
