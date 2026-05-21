"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Download, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { escapeHtml } from "@/lib/utils/index";

interface Grado { id: string; numero: number; seccion: string; }

interface ResumenEstudiante {
  id: string; nombre: string; numero: number;
  asistencias: number; ausencias: number; tardanzas: number; justificadas: number; total: number;
  fechasPresente?: string[]; fechasAusente?: string[]; fechasTardanza?: string[]; fechasJustificada?: string[];
}

interface GradoData {
  gradoId: string; gradoNumero: number; gradoSeccion: string;
  totalEstudiantes: number; resumen: ResumenEstudiante[];
}

interface ApiResponse {
  grados: GradoData[];
  consolidado: { totalEstudiantes: number; totalAsistencias: number; totalAusencias: number; totalTardanzas: number; totalJustificadas: number };
}

interface ReporteAsistenciaMultiGradoProps {
  grados: Grado[];
  darkMode?: boolean;
}

export default function ReporteAsistenciaMultiGrado({ grados, darkMode: darkModeProp }: ReporteAsistenciaMultiGradoProps) {
  const { resolvedTheme } = useTheme();
  const darkMode = darkModeProp ?? resolvedTheme === "dark";
  const [selectedGrados, setSelectedGrados] = useState<Set<string>>(new Set());
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summaryRange, setSummaryRange] = useState<"month" | "all">("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [expandedGrado, setExpandedGrado] = useState<string | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const gradosDisponibles = useMemo(() => [...grados].sort((a, b) => a.numero - b.numero), [grados]);

  const toggleGrado = (id: string) => {
    setSelectedGrados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const seleccionarTodos = () => {
    setSelectedGrados(new Set(gradosDisponibles.map(g => g.id)));
  };

  const limpiarSeleccion = () => {
    setSelectedGrados(new Set());
  };

  const loadData = useCallback(async () => {
    if (selectedGrados.size === 0) return;
    setLoading(true);
    setError("");
    try {
      const gradoIds = Array.from(selectedGrados).join(",");
      let url = `/api/asistencia/resumen-multigrado?gradoIds=${gradoIds}&incluirFechas=true`;
      if (summaryRange === "month") {
        url += `&mes=${selectedMonth}`;
      } else {
        url += `&anual=true&año=${selectedYear}`;
      }
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar datos");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedGrados, summaryRange, selectedMonth, selectedYear]);

  useEffect(() => {
    if (selectedGrados.size > 0) loadData();
  }, [loadData]);

  const exportCSV = () => {
    if (!data) return;
    let csv = "Consolidado de Asistencia\n";
    csv += `Rango: ${summaryRange === "month" ? selectedMonth : "Anual " + selectedYear}\n\n`;
    for (const grado of data.grados) {
      csv += `\n${grado.gradoNumero}° "${grado.gradoSeccion}"\n`;
      csv += "N°,Estudiante,Asistencias,Tardanzas,Ausencias,Justificadas,Total\n";
      grado.resumen.forEach((r: ResumenEstudiante) => {
        csv += `${r.numero},${r.nombre},${r.asistencias},${r.tardanzas},${r.ausencias},${r.justificadas},${r.total}\n`;
      });
    }
    csv += `\nCONSOLIDADO GENERAL\n`;
    csv += `Total Estudiantes,${data.consolidado.totalEstudiantes}\n`;
    csv += `Total Asistencias,${data.consolidado.totalAsistencias}\n`;
    csv += `Total Ausencias,${data.consolidado.totalAusencias}\n`;
    csv += `Total Tardanzas,${data.consolidado.totalTardanzas}\n`;
    csv += `Total Justificadas,${data.consolidado.totalJustificadas}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `asistencia_consolidada_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const exportPDF = () => {
    if (!data) return;
    const year = summaryRange === "month" ? selectedMonth.split('-')[0] : selectedYear;
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const periodo = summaryRange === "month"
      ? `${monthNames[parseInt(selectedMonth.split('-')[1]) - 1]} ${selectedMonth.split('-')[0]}`
      : `Año ${selectedYear}`;

    let html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Consolidado de Asistencia</title>
<style>
  @page { size: letter landscape; margin: 10mm; }
  body { font-family: Arial, sans-serif; font-size: 8pt; color: #333; margin: 0; padding: 15px; }
  .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #1e293b; padding-bottom: 10px; }
  .header h1 { font-size: 13pt; margin: 0 0 3px 0; color: #1e293b; }
  .header h2 { font-size: 10pt; margin: 0 0 5px 0; font-weight: normal; color: #475569; }
  .grado-title { font-size: 11pt; font-weight: bold; color: #1b6b3a; margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 7.5pt; }
  th { background: #1e293b; color: white; padding: 4px 6px; text-align: center; font-size: 7pt; }
  td { padding: 3px 6px; border: 1px solid #cbd5e1; text-align: center; }
  td:first-child { font-weight: bold; }
  td:nth-child(2) { text-align: left; }
  tr:nth-child(even) { background: #f8fafc; }
  .consolidado { margin-top: 20px; padding: 10px; background: #f0fdfa; border: 1px solid #86efac; border-radius: 8px; }
  .consolidado h3 { font-size: 10pt; color: #166534; margin: 0 0 8px; }
  .consolidado-grid { display: flex; gap: 15px; flex-wrap: wrap; }
  .consolidado-item { text-align: center; padding: 8px 15px; background: white; border-radius: 6px; border: 1px solid #e2e8f0; min-width: 100px; }
  .consolidado-item .num { font-size: 14pt; font-weight: bold; color: #0f172a; }
  .consolidado-item .label { font-size: 7pt; color: #64748b; text-transform: uppercase; }
  .firmas { margin-top: 30px; display: flex; justify-content: space-between; }
  .firma { text-align: center; width: 45%; }
  .firma .linea { border-top: 1px solid #333; margin-top: 40px; padding-top: 5px; font-size: 8pt; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="header">
  <h1>Centro Escolar Católico San José de la Montaña</h1>
  <h2>Reporte Consolidado de Asistencia</h2>
  <p style="font-size:9pt;color:#64748b;">${periodo} · Generado: ${new Date().toLocaleDateString("es-SV")}</p>
</div>`;

    for (const grado of data.grados) {
      html += `<div class="grado-title">${grado.gradoNumero}° "${escapeHtml(grado.gradoSeccion)}" (${grado.totalEstudiantes} estudiantes)</div>`;
      html += `<table><thead><tr><th>N°</th><th>Estudiante</th><th>Asist.</th><th>Tard.</th><th>Aus.</th><th>Just.</th><th>Total</th></tr></thead><tbody>`;
      grado.resumen.forEach((r: ResumenEstudiante) => {
        html += `<tr><td>${r.numero}</td><td>${escapeHtml(r.nombre)}</td><td style="color:#059669;font-weight:bold;">${r.asistencias}</td><td style="color:#d97706;font-weight:bold;">${r.tardanzas}</td><td style="color:#dc2626;font-weight:bold;">${r.ausencias}</td><td style="color:#3b82f6;font-weight:bold;">${r.justificadas}</td><td style="font-weight:bold;">${r.total}</td></tr>`;
      });
      html += `</tbody></table>`;
    }

    html += `<div class="consolidado"><h3>📊 CONSOLIDADO GENERAL</h3><div class="consolidado-grid">
      <div class="consolidado-item"><div class="num">${data.consolidado.totalEstudiantes}</div><div class="label">Estudiantes</div></div>
      <div class="consolidado-item"><div class="num" style="color:#059669;">${data.consolidado.totalAsistencias}</div><div class="label">Asistencias</div></div>
      <div class="consolidado-item"><div class="num" style="color:#dc2626;">${data.consolidado.totalAusencias}</div><div class="label">Ausencias</div></div>
      <div class="consolidado-item"><div class="num" style="color:#d97706;">${data.consolidado.totalTardanzas}</div><div class="label">Tardanzas</div></div>
      <div class="consolidado-item"><div class="num" style="color:#3b82f6;">${data.consolidado.totalJustificadas}</div><div class="label">Justificadas</div></div>
    </div></div>`;

    html += `<div class="firmas"><div class="firma"><div class="linea">Firma del Docente Orientador</div></div><div class="firma"><div class="linea">Firma del Director</div></div></div>`;
    html += `</body></html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  };

  return (
    <div className="space-y-3">
      {/* Selector de grados */}
      <Card className={`shadow-sm border ${darkMode ? "bg-slate-950/40 backdrop-blur-md border-white/5" : "bg-white border-slate-200"}`}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className={`h-5 w-5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`} />
              <span className={`text-sm font-semibold ${darkMode ? "text-white" : "text-slate-700"}`}>Grados a incluir</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className={`h-8 text-xs ${darkMode ? "border-white/30 text-white hover:bg-white/10" : ""}`} onClick={seleccionarTodos}>Seleccionar Todos</Button>
              <Button size="sm" variant="outline" className={`h-8 text-xs ${darkMode ? "border-white/30 text-white hover:bg-white/10" : ""}`} onClick={limpiarSeleccion}>Limpiar</Button>
            </div>
          </div>
          <div className={`flex flex-wrap gap-1.5 mt-3 pt-3 border-t ${darkMode ? "border-white/10" : "border-slate-200"}`}>
            {gradosDisponibles.map(g => {
              const selected = selectedGrados.has(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => toggleGrado(g.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border transition-all duration-150 ${
                    selected
                      ? darkMode ? "bg-emerald-900/40 border-emerald-500 text-emerald-400 shadow-sm" : "bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm"
                      : darkMode ? "bg-muted border-white/20 text-slate-400 hover:border-white/40 hover:text-slate-300" : "bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-800"
                  }`}
                >
                  {g.numero}° &quot;{g.seccion}&quot;
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selectores de rango */}
      <Card className={`shadow-sm border ${darkMode ? "bg-slate-950/40 backdrop-blur-md border-white/5" : "bg-white border-slate-200"}`}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className={`flex p-0.5 rounded-md ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <Button size="sm" variant="ghost" className={`h-7 px-3 text-xs ${summaryRange === "all" ? (darkMode ? "bg-slate-700 shadow-sm font-bold text-white" : "bg-white shadow-sm font-bold") : (darkMode ? "text-slate-400" : "")}`} onClick={() => setSummaryRange("all")}>Anual</Button>
                <Button size="sm" variant="ghost" className={`h-7 px-3 text-xs ${summaryRange === "month" ? (darkMode ? "bg-slate-700 shadow-sm font-bold text-white" : "bg-white shadow-sm font-bold") : (darkMode ? "text-slate-400" : "")}`} onClick={() => setSummaryRange("month")}>Mensual</Button>
              </div>
              {summaryRange === "month" && (
                <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                  className={`flex h-8 rounded-md border px-2 text-xs font-medium ${darkMode ? 'bg-card border-white/30 text-white' : 'bg-white border-slate-200'}`} />
              )}
              {summaryRange === "all" && (
                <input type="number" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} min="2020" max="2030"
                  className={`flex h-8 rounded-md border px-2 text-xs font-medium w-20 ${darkMode ? 'bg-card border-white/30 text-white' : 'bg-white border-slate-200'}`} />
              )}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {selectedGrados.size > 0 && (
                <>
                  <Button size="sm" className="h-9 text-xs font-bold flex-1 sm:flex-initial" onClick={exportPDF} disabled={!data}>
                    <Download className="h-4 w-4 mr-1" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" className={`h-9 text-xs font-bold flex-1 sm:flex-initial ${darkMode ? "border-white/30 text-white hover:bg-white/10" : ""}`} onClick={exportCSV} disabled={!data}>
                    <Download className="h-4 w-4 mr-1" /> CSV
                  </Button>
                </>
              )}
              <Button size="sm" className={`h-9 text-xs font-bold flex-1 sm:flex-initial ${darkMode ? "bg-blue-700 hover:bg-blue-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`} onClick={loadData} disabled={selectedGrados.size === 0 || loading}>
                {loading ? "Cargando..." : "Generar Reporte"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenido */}
      {selectedGrados.size === 0 ? (
        <Card className={`shadow-sm border ${darkMode ? "bg-slate-950/40 backdrop-blur-md border-white/5" : "bg-white border-slate-200"}`}>
          <CardContent className="p-6 text-center">
            <CalendarDays className={`h-10 w-10 mx-auto mb-2 ${darkMode ? "text-slate-600" : "text-slate-300"}`} />
            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Selecciona los grados que deseas incluir y presiona &quot;Generar Reporte&quot;</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card className={`shadow-sm border ${darkMode ? "bg-slate-950/40 backdrop-blur-md border-white/5" : "bg-white border-slate-200"}`}>
          <CardContent className="p-4 space-y-3">
            <Skeleton className={`h-4 w-48 ${darkMode ? "bg-slate-700" : "bg-slate-200"}`} />
            <Skeleton className={`h-8 w-full ${darkMode ? "bg-slate-700" : "bg-slate-200"}`} />
            <Skeleton className={`h-8 w-full ${darkMode ? "bg-slate-700" : "bg-slate-200"}`} />
            <Skeleton className={`h-8 w-full ${darkMode ? "bg-slate-700" : "bg-slate-200"}`} />
          </CardContent>
        </Card>
      ) : error ? (
        <Card className={`shadow-sm border ${darkMode ? "bg-slate-950/40 backdrop-blur-md border-white/5" : "bg-white border-slate-200"}`}>
          <CardContent className="p-4 text-center text-red-500">{error}</CardContent>
        </Card>
      ) : data ? (
        <>
          {/* Consolidado General */}
          <Card className={`shadow-sm border ${darkMode ? "bg-emerald-950/30 backdrop-blur-md border-emerald-800/50" : "bg-emerald-50 border-emerald-200"}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className={`h-5 w-5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                <h3 className={`text-sm font-bold ${darkMode ? "text-emerald-400" : "text-emerald-800"}`}>CONSOLIDADO GENERAL</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: "Estudiantes", value: data.consolidado.totalEstudiantes, color: "text-slate-700 dark:text-slate-200" },
                  { label: "Asistencias", value: data.consolidado.totalAsistencias, color: "text-emerald-600 dark:text-emerald-400" },
                  { label: "Ausencias", value: data.consolidado.totalAusencias, color: "text-red-600 dark:text-red-400" },
                  { label: "Tardanzas", value: data.consolidado.totalTardanzas, color: "text-amber-600 dark:text-amber-400" },
                  { label: "Justificadas", value: data.consolidado.totalJustificadas, color: "text-blue-600 dark:text-blue-400" },
                ].map(item => (
                  <div key={item.label} className={`p-3 rounded-lg text-center ${darkMode ? "bg-slate-950/40 border border-white/10" : "bg-white border border-slate-200"}`}>
                    <div className={`text-xl sm:text-2xl font-bold ${item.color}`}>{item.value}</div>
                    <div className={`text-[10px] uppercase tracking-wider mt-1 ${darkMode ? "text-slate-500" : "text-slate-500"}`}>{item.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tablas por grado */}
          {data.grados.map(grado => (
            <Card key={grado.gradoId} className={`shadow-sm border overflow-hidden ${darkMode ? "bg-slate-950/40 backdrop-blur-md border-white/5" : "bg-white border-slate-200"}`}>
              <div
                className={`px-4 py-3 flex items-center justify-between cursor-pointer border-b ${darkMode ? "bg-slate-800/50 border-white/10 hover:bg-slate-800" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`}
                onClick={() => setExpandedGrado(expandedGrado === grado.gradoId ? null : grado.gradoId)}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>{grado.gradoNumero}° &quot;{grado.gradoSeccion}&quot;</span>
                  <Badge variant="outline" className={`text-[10px] ${darkMode ? "border-white/30 text-slate-300" : ""}`}>{grado.totalEstudiantes} estudiantes</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" />{grado.resumen.reduce((s, r) => s + r.asistencias, 0)}</span>
                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400"><XCircle className="h-3 w-3" />{grado.resumen.reduce((s, r) => s + r.ausencias, 0)}</span>
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"><Clock className="h-3 w-3" />{grado.resumen.reduce((s, r) => s + r.tardanzas, 0)}</span>
                  </div>
                  <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{expandedGrado === grado.gradoId ? "▲" : "▼"}</span>
                </div>
              </div>
              {expandedGrado === grado.gradoId && (
                <div className="overflow-x-auto">
                  <Table className="text-xs sm:text-sm font-medium">
                    <TableHeader>
                      <TableRow className={darkMode ? "bg-slate-800" : "bg-slate-50"}>
                        <TableHead className="w-10 text-center">N°</TableHead>
                        <TableHead className="min-w-[120px]">Estudiante</TableHead>
                        <TableHead className="text-center font-bold text-emerald-600">Asist.</TableHead>
                        <TableHead className="text-center font-bold text-amber-600">Tard.</TableHead>
                        <TableHead className="text-center font-bold text-red-600">Aus.</TableHead>
                        <TableHead className="text-center font-bold text-blue-600">Just.</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grado.resumen.map((r, idx) => (
                        <React.Fragment key={r.id}>
                          <TableRow
                            className={`cursor-pointer transition-colors ${idx % 2 === 0 ? "" : (darkMode ? "bg-white/[0.03]" : "bg-slate-50/30")} ${darkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-100"}`}
                            onClick={() => setExpandedStudent(expandedStudent === r.id ? null : r.id)}
                          >
                            <TableCell className={`text-center font-bold ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{r.numero}</TableCell>
                            <TableCell className={`font-semibold ${darkMode ? "text-white" : "text-slate-700"}`}>{r.nombre}</TableCell>
                            <TableCell className={`text-center font-medium ${darkMode ? "text-emerald-400" : "text-emerald-700"}`}>{r.asistencias}</TableCell>
                            <TableCell className={`text-center font-medium ${darkMode ? "text-amber-400" : "text-amber-700"}`}>{r.tardanzas}</TableCell>
                            <TableCell className={`text-center font-medium ${darkMode ? "text-red-400" : "text-red-700"}`}>{r.ausencias}</TableCell>
                            <TableCell className={`text-center font-medium ${darkMode ? "text-blue-400" : "text-blue-700"}`}>{r.justificadas}</TableCell>
                            <TableCell className={`text-center font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>{r.total}</TableCell>
                          </TableRow>
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          ))}
        </>
      ) : null}
    </div>
  );
}
