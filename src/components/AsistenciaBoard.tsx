"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarIcon, Save, RefreshCw, CheckCircle2, XCircle, Clock, CalendarDays, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Grado { id: string; numero: number; seccion: string; }
interface Asignatura { id: string; nombre: string; gradoId: string; }
interface Estudiante { id: string; numero: number; nombre: string; activo: boolean; }
interface AsistenciaRecord { id?: string; estudianteId: string; estado: string; }
interface ResumenAsistencia {
  id: string;
  nombre: string;
  numero: number;
  ausencias: number;
  tardanzas: number;
  asistencias: number;
  total: number;
  fechasPresente?: string[];
  fechasAusente?: string[];
  fechasTardanza?: string[];
}

interface AsistenciaBoardProps {
  grados: Grado[];
  asignaturas: Asignatura[];
  estudiantes: Estudiante[];
  gradoInicial?: string;
  asignaturaInicial?: string;
  isAdmin?: boolean;
}

export default function AsistenciaBoard({ grados, asignaturas, estudiantes, gradoInicial = "", asignaturaInicial = "", isAdmin = false }: AsistenciaBoardProps) {
  const { resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === "dark";
  const { toast } = useToast();
  const [gradoId, setGradoId] = useState<string>(gradoInicial);
  const [asignaturaId, setAsignaturaId] = useState<string>(asignaturaInicial);
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);

  const [asistencias, setAsistencias] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [resumen, setResumen] = useState<ResumenAsistencia[]>([]);
  const [view, setView] = useState<"pass" | "summary">("pass");
  const [summaryRange, setSummaryRange] = useState<"month" | "all">("all");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedYear] = useState<string>(new Date().getFullYear().toString());
  const [asistenciaDetallada, setAsistenciaDetallada] = useState<Record<string, Record<string, string>>>({});

  const initializeAttendance = useCallback(() => {
    const initial: Record<string, string> = {};
    estudiantes.filter(e => e.activo).forEach(est => {
      initial[est.id] = "presente";
    });
    return initial;
  }, [estudiantes]);

  const loadAsistencia = useCallback(async () => {
    if (!gradoId || !fecha) return;
    setLoading(true);
    try {
      let url = `/api/asistencia?gradoId=${gradoId}&fecha=${fecha}T00:00:00.000Z`;
      if (asignaturaId) url += `&materiaId=${asignaturaId}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const loadedAsistencias: Record<string, string> = { ...initializeAttendance() };
        data.forEach((a: any) => {
          loadedAsistencias[a.estudianteId] = a.estado;
        });
        setAsistencias(loadedAsistencias);
      } else {
        setAsistencias(initializeAttendance());
      }
    } catch {
      toast({ title: "Error cargar asistencia", variant: "destructive" });
      setAsistencias(initializeAttendance());
    } finally {
      setLoading(false);
    }
  }, [gradoId, asignaturaId, fecha, initializeAttendance, toast]);

  const loadResumen = async () => {
    if (!gradoId) return;
    setLoading(true);
    try {
      let url = `/api/asistencia/resumen?gradoId=${gradoId}&incluirFechas=true`;
      if (summaryRange === "month") {
        url += `&mes=${selectedMonth}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        setResumen(await res.json());
      }

      // Cargar asistencia detallada por estudiante
      let urlDetallada = `/api/asistencia/detallada?gradoId=${gradoId}`;
      if (summaryRange === "month") {
        urlDetallada += `&mes=${selectedMonth}`;
      } else {
        urlDetallada += `&anual=true`;
      }
      const resDetallada = await fetch(urlDetallada);
      if (resDetallada.ok) {
        const data = await resDetallada.json();
        const detalladaMap: Record<string, Record<string, string>> = {};
        data.forEach((est: any) => {
          detalladaMap[est.id] = est.asistenciaPorDia;
        });
        setAsistenciaDetallada(detalladaMap);
      }
    } catch (error) {
      console.error("Error loading summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!resumen.length) return;
    const grado = grados.find(g => g.id === gradoId);
    let csv = `Resumen de Asistencia - ${grado?.numero}° ${grado?.seccion}\n`;
    csv += "N°,Estudiante,Asistencias,Tardanzas,Ausencias,Total\n";
    resumen.forEach(r => {
      csv += `${r.numero},${r.nombre},${r.asistencias},${r.tardanzas},${r.ausencias},${r.total}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `asistencia_${grado?.numero}${grado?.seccion}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const downloadPDFMensual = (estudianteId?: string) => {
    if (!gradoId) return;
    const grado = grados.find(g => g.id === gradoId);
    const [year, month] = selectedMonth.split('-');
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const monthName = monthNames[parseInt(month) - 1];
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    // Obtener todos los estudiantes del grado
    const estudiantesList = estudiantes.sort((a, b) => a.numero - b.numero);

    // Obtener asistencia de todos los estudiantes
    const asistenciaTodos: Record<string, Record<string, string>> = {};
    estudiantesList.forEach(est => {
      asistenciaTodos[est.id] = asistenciaDetallada[est.id] || {};
    });

    // Generar headers de columnas (fechas)
    let headersHTML = '<th style="width: 35%; text-align: left; padding: 4px 6px; background: #1e293b; color: white; font-size: 8pt; border: 1px solid #475569;">Estudiante</th>';
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(parseInt(year), parseInt(month) - 1, day);
      const dayOfWeek = date.getDay();
      const dayName = dayNames[dayOfWeek];
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      headersHTML += `<th style="width: ${daysInMonth > 20 ? '28px' : '32px'}; text-align: center; padding: 4px 2px; background: ${isWeekend ? '#f1f5f9' : '#1e293b'}; color: ${isWeekend ? '#94a3b8' : 'white'}; font-size: 7pt; border: 1px solid #475569;">${day}<br>${dayName}</th>`;
    }
    headersHTML += '<th style="width: 28px; text-align: center; padding: 4px 2px; background: #059669; color: white; font-size: 7pt; border: 1px solid #475569;">P</th>';
    headersHTML += '<th style="width: 28px; text-align: center; padding: 4px 2px; background: #dc2626; color: white; font-size: 7pt; border: 1px solid #475569;">A</th>';
    headersHTML += '<th style="width: 28px; text-align: center; padding: 4px 2px; background: #3b82f6; color: white; font-size: 7pt; border: 1px solid #475569;">J</th>';
    headersHTML += '<th style="width: 28px; text-align: center; padding: 4px 2px; background: #d97706; color: white; font-size: 7pt; border: 1px solid #475569;">T</th>';

    // Generar filas de estudiantes
    let rowsHTML = '';
    estudiantesList.forEach((est, idx) => {
      const asistenciaEst = asistenciaTodos[est.id] || {};
      let totalP = 0, totalA = 0, totalJ = 0, totalT = 0;

      let cellsHTML = `<td style="padding: 4px 6px; border: 1px solid #cbd5e1; font-size: 8pt; background: ${idx % 2 === 0 ? '#f8fafc' : 'white'}; font-weight: 500;">${est.numero}. ${est.nombre}</td>`;

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(parseInt(year), parseInt(month) - 1, day);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const dateKey = `${year}-${month}-${String(day).padStart(2, '0')}`;
        const estado = asistenciaEst[dateKey];

        if (isWeekend) {
          cellsHTML += '<td style="text-align: center; padding: 3px 2px; border: 1px solid #cbd5e1; background: #f1f5f9; font-size: 7pt; color: #94a3b8;">-</td>';
        } else if (estado === 'presente') {
          cellsHTML += '<td style="text-align: center; padding: 3px 2px; border: 1px solid #cbd5e1; background: #dcfce7; color: #059669; font-weight: bold; font-size: 7pt;">PRE</td>';
          totalP++;
        } else if (estado === 'ausente') {
          cellsHTML += '<td style="text-align: center; padding: 3px 2px; border: 1px solid #cbd5e1; background: #fee2e2; color: #dc2626; font-weight: bold; font-size: 7pt;">AUS</td>';
          totalA++;
        } else if (estado === 'justificada') {
          cellsHTML += '<td style="text-align: center; padding: 3px 2px; border: 1px solid #cbd5e1; background: #dbeafe; color: #3b82f6; font-weight: bold; font-size: 7pt;">JUS</td>';
          totalJ++;
        } else if (estado === 'tarde') {
          cellsHTML += '<td style="text-align: center; padding: 3px 2px; border: 1px solid #cbd5e1; background: #fef3c7; color: #d97706; font-weight: bold; font-size: 7pt;">TAR</td>';
          totalT++;
        } else {
          cellsHTML += '<td style="text-align: center; padding: 3px 2px; border: 1px solid #cbd5e1; font-size: 7pt; color: #94a3b8;">-</td>';
        }
      }

      cellsHTML += `<td style="text-align: center; padding: 3px 2px; border: 1px solid #cbd5e1; background: #dcfce7; color: #059669; font-weight: bold; font-size: 8pt;">${totalP}</td>`;
      cellsHTML += `<td style="text-align: center; padding: 3px 2px; border: 1px solid #cbd5e1; background: #fee2e2; color: #dc2626; font-weight: bold; font-size: 8pt;">${totalA}</td>`;
      cellsHTML += `<td style="text-align: center; padding: 3px 2px; border: 1px solid #cbd5e1; background: #dbeafe; color: #3b82f6; font-weight: bold; font-size: 8pt;">${totalJ}</td>`;
      cellsHTML += `<td style="text-align: center; padding: 3px 2px; border: 1px solid #cbd5e1; background: #fef3c7; color: #d97706; font-weight: bold; font-size: 8pt;">${totalT}</td>`;

      rowsHTML += `<tr>${cellsHTML}</tr>`;
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Asistencia Mensual - ${grado?.numero}° ${grado?.seccion}</title>
  <style>
    @page { size: letter landscape; margin: 10mm; }
    body { font-family: Arial, sans-serif; font-size: 9pt; color: #333; margin: 0; padding: 15px; }
    .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #1e293b; padding-bottom: 10px; }
    .header h1 { font-size: 14pt; margin: 0 0 3px 0; color: #1e293b; }
    .header h2 { font-size: 11pt; margin: 0 0 5px 0; font-weight: normal; color: #475569; }
    .info-section { margin-bottom: 15px; display: flex; justify-content: space-between; }
    .info-section p { margin: 3px 0; font-size: 9pt; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    .firmas { margin-top: 30px; display: flex; justify-content: space-between; }
    .firma { text-align: center; width: 45%; }
    .firma .linea { border-top: 1px solid #333; margin-top: 40px; padding-top: 5px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Centro Escolar Católico San José de la Montaña</h1>
    <h2>Control de Asistencia Mensual - ${monthName} ${year}</h2>
  </div>

  <div class="info-section">
    <div>
      <p><strong>Grado y Sección:</strong> ${grado?.numero}° "${grado?.seccion}"</p>
      <p><strong>Director:</strong> Centro Escolar</p>
    </div>
    <div style="text-align: right;">
      <p><strong>Docente Orientador:</strong> ___________________________</p>
      <p><strong>Total Estudiantes:</strong> ${estudiantesList.length}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>${headersHTML}</tr>
    </thead>
    <tbody>
      ${rowsHTML}
    </tbody>
  </table>

  <div class="firmas">
    <div class="firma">
      <div class="linea">
        <p style="font-size: 9pt; margin: 0;">Firma del Docente Orientador</p>
      </div>
    </div>
    <div class="firma">
      <div class="linea">
        <p style="font-size: 9pt; margin: 0;">Firma del Director</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  };

  const downloadPDFAnual = (estudianteId?: string) => {
    if (!gradoId) return;
    const grado = grados.find(g => g.id === gradoId);
    const year = selectedYear;
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Si es para un estudiante específico
    const estudiante = estudianteId ? estudiantes.find(e => e.id === estudianteId) : null;
    const asistenciaEst = estudianteId ? (asistenciaDetallada[estudianteId] || {}) : {};

    // Calcular resumen por mes
    const resumenPorMes = monthNames.map((_, m) => {
      let p = 0, a = 0, pe = 0;
      for (let d = 1; d <= daysInMonths[m]; d++) {
        const dateKey = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const estado = asistenciaEst[dateKey];
        if (estado === 'presente') p++;
        else if (estado === 'ausente') a++;
        else if (estado === 'justificada' || estado === 'tarde') pe++;
      }
      return { p, a, pe };
    });

    const totalAnual = resumenPorMes.reduce((acc, r) => ({ p: acc.p + r.p, a: acc.a + r.a, pe: acc.pe + r.pe }), { p: 0, a: 0, pe: 0 });

    // Generar filas del calendario (1-31)
    let calendarRows = '';
    for (let day = 1; day <= 31; day++) {
      calendarRows += `<tr><td style="text-align:center;font-weight:bold;">${day}</td>`;
      for (let m = 0; m < 12; m++) {
        if (day > daysInMonths[m]) {
          calendarRows += `<td style="text-align:center;color:#ccc;">N/A</td>`;
        } else {
          const dateKey = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const estado = asistenciaEst[dateKey];
          let cellContent = '';
          let cellColor = '';
          if (estado === 'presente') { cellContent = 'P'; cellColor = '#059669'; }
          else if (estado === 'ausente') { cellContent = 'A'; cellColor = '#dc2626'; }
          else if (estado === 'justificada' || estado === 'tarde') { cellContent = 'Pe'; cellColor = '#d97706'; }
          calendarRows += `<td style="text-align:center;color:${cellColor};font-weight:bold;">${cellContent}</td>`;
        }
      }
      calendarRows += `</tr>`;
    }

    // Filas de resumen por mes
    let summaryRows = '';
    monthNames.forEach((m, i) => {
      summaryRows += `<tr><td>${m}</td><td style="text-align:center;">${resumenPorMes[i].p || '-'}</td><td style="text-align:center;">${resumenPorMes[i].a || '-'}</td><td style="text-align:center;">${resumenPorMes[i].pe || '-'}</td></tr>`;
    });
    summaryRows += `<tr style="font-weight:bold;background:#f0f0f0;"><td>TOTAL ANUAL</td><td style="text-align:center;">${totalAnual.p}</td><td style="text-align:center;">${totalAnual.a}</td><td style="text-align:center;">${totalAnual.pe}</td></tr>`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Asistencia Anual - ${estudiante ? estudiante.nombre : grado?.numero + '° ' + grado?.seccion}</title>
  <style>
    @page { size: letter landscape; margin: 10mm; }
    body { font-family: Arial, sans-serif; font-size: 8pt; color: #333; margin: 0; padding: 15px; }
    .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 8px; }
    .header h1 { font-size: 12pt; margin: 0 0 3px 0; }
    .header h2 { font-size: 10pt; margin: 0; font-weight: normal; }
    .info-section { margin-bottom: 15px; }
    .info-section p { margin: 3px 0; display: inline-block; margin-right: 30px; }
    .info-section strong { display: inline-block; width: 150px; }
    .calendar-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 7pt; }
    .calendar-table th, .calendar-table td { border: 1px solid #333; padding: 2px; text-align: center; }
    .calendar-table th { background: #f0f0f0; font-weight: bold; }
    .calendar-table th.month { writing-mode: vertical-rl; text-orientation: mixed; height: 60px; }
    .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    .summary-table th, .summary-table td { border: 1px solid #333; padding: 4px 8px; }
    .summary-table th { background: #f0f0f0; }
    .firmas { margin-top: 30px; display: flex; justify-content: space-between; }
    .firma { text-align: center; width: 45%; }
    .firma .linea { border-top: 1px solid #333; margin-top: 40px; padding-top: 5px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Centro Escolar Católico San José de la Montaña</h1>
    <h2>Registro de Asistencia Anual</h2>
  </div>

  <div class="info-section">
    <p><strong>Grado y Sección:</strong> ${grado?.numero}° "${grado?.seccion}"</p>
    ${estudiante ? `<p><strong>Estudiante:</strong> ${estudiante.nombre}</p>` : ''}
    <p><strong>Director:</strong> Centro Escolar</p>
    <p><strong>Nombre del docente orientador:</strong> ___________________________</p>
    <p><strong>Año Escolar:</strong> ${year}</p>
  </div>

  <p style="margin: 10px 0;"><strong>Opciones de Estado:</strong> P = Presente | A = Ausente | J = Justificada | T = Tarde | - = Fin de semana / Asueto</p>

  <table class="calendar-table">
    <thead>
      <tr>
        <th style="width: 30px;">Día</th>
        ${monthNames.map(m => `<th class="month">${m}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${calendarRows}
    </tbody>
  </table>

  <p style="font-size: 7pt; color: #666; margin: 5px 0;">(Nota: Tacha o sombrea las casillas de los días 31 en los meses que tienen 30 días, y los días 29, 30 y 31 de febrero)</p>

  <table class="summary-table">
    <thead>
      <tr>
        <th>Mes</th>
        <th>Total Presente (P)</th>
        <th>Total Ausente (A)</th>
        <th>Total Justificada (J)</th>
        <th>Total Tardanza (T)</th>
      </tr>
    </thead>
    <tbody>
      ${summaryRows}
    </tbody>
  </table>

  <div class="firmas">
    <div class="firma">
      <div class="linea">
        <p>Firma del Docente Orientador</p>
        <p>Fecha: __/__/${year}</p>
      </div>
    </div>
    <div class="firma">
      <div class="linea">
        <p>Firma del Director</p>
        <p>Fecha: __/__/${year}</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  };

  useEffect(() => {
    if (view === "summary") loadResumen();
  }, [view, gradoId, summaryRange, selectedMonth]);

  useEffect(() => {
    setGradoId(gradoInicial);
  }, [gradoInicial]);

  useEffect(() => {
    if (asignaturas.some(m => m.id === asignaturaInicial)) {
      setAsignaturaId(asignaturaInicial);
    } else if (asignaturas.length > 0) {
      setAsignaturaId(asignaturas[0].id);
    }
  }, [asignaturaInicial, asignaturas]);

  useEffect(() => {
    if (estudiantes.length > 0) {
      loadAsistencia();
    } else {
      setAsistencias({});
    }
  }, [estudiantes, loadAsistencia]);

  const handleEstadoChange = (estudianteId: string, estado: string) => {
    setAsistencias(prev => ({ ...prev, [estudianteId]: estado }));
  };

  const handleSave = async () => {
    if (!gradoId || !fecha) return;
    setSaving(true);

    const records = Object.entries(asistencias).map(([estudianteId, estado]) => ({
      estudianteId,
      estado
    }));

    try {
      const res = await fetch("/api/asistencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asistencias: records,
          fecha: `${fecha}T00:00:00.000Z`,
          gradoId,
          materiaId: asignaturaId || null
        })
      });

      if (res.ok) {
        toast({ title: "Asistencia guardada correctamente" });
      } else {
        const data = await res.json();
        toast({ title: data.error || "Error al guardar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de red al guardar asistencia", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!gradoId || !fecha) return;
    if (!confirm(`¿Eliminar la asistencia del ${fecha} para este grado? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      const params = new URLSearchParams({ fecha: `${fecha}T00:00:00.000Z`, gradoId });
      if (asignaturaId) params.set("materiaId", asignaturaId);
      const res = await fetch(`/api/asistencia?${params.toString()}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        toast({ title: `${data.eliminados} registros eliminados` });
        setAsistencias(initializeAttendance());
        loadAsistencia();
      } else {
        const data = await res.json();
        toast({ title: data.error || "Error al eliminar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de red al eliminar asistencia", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const activeStudents = estudiantes.filter(e => e.activo);
  const presentCount = Object.values(asistencias).filter(e => e === "presente").length;
  const absentCount = Object.values(asistencias).filter(e => e === "ausente").length;
  const justifiedCount = Object.values(asistencias).filter(e => e === "justificada").length;

  return (
    <Card className={`shadow-sm ${darkMode ? 'bg-[#1e293b] border-slate-700' : 'border-teal-100'}`}>
      <CardHeader className={`pb-3 border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              <CalendarDays className="h-5 w-5 text-teal-600" />
              Control de Asistencia
            </CardTitle>
            <CardDescription className={`text-sm font-medium ${darkMode ? 'text-slate-400' : ''}`}>Registro y visualización histórica</CardDescription>
          </div>
          <div className={`flex p-1 rounded-lg gap-1 self-start sm:self-center ${darkMode ? 'bg-slate-700' : 'bg-slate-200/50'}`}>
            <Button
              variant={view === "pass" ? "default" : "ghost"}
              size="sm"
              className={`h-9 text-sm px-4 ${view === "pass" ? (darkMode ? "bg-slate-600 text-white shadow-sm hover:bg-slate-500" : "bg-white text-slate-800 shadow-sm hover:bg-white") : (darkMode ? "text-slate-400" : "text-slate-500")}`}
              onClick={() => setView("pass")}
            >
              Pasar Lista
            </Button>
            <Button
              variant={view === "summary" ? "default" : "ghost"}
              size="sm"
              className={`h-9 text-sm px-4 ${view === "summary" ? (darkMode ? "bg-slate-600 text-white shadow-sm hover:bg-slate-500" : "bg-white text-slate-800 shadow-sm hover:bg-white") : (darkMode ? "text-slate-400" : "text-slate-500")}`}
              onClick={() => setView("summary")}
            >
              Resumen
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {view === "pass" ? (
          <>
            <div className={`flex flex-wrap items-end gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50'}`}>
              <div className="flex-1 min-w-[150px] sm:min-w-[200px]">
                <Label className={`text-xs sm:text-sm font-bold mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Grado</Label>
                <Select value={gradoId} onValueChange={setGradoId}>
                  <SelectTrigger className={`h-10 text-xs sm:text-sm font-medium ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white'}`}>
                    <SelectValue placeholder="Seleccione Grado" />
                  </SelectTrigger>
                  <SelectContent>
                    {grados.map(g => (
                      <SelectItem key={g.id} value={g.id} className="text-xs sm:text-sm font-medium">
                        {g.numero}° "{g.seccion}"
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[150px] sm:min-w-[200px]">
                <Label className={`text-xs sm:text-sm font-bold mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Asignatura (Opcional)</Label>
                <Select value={asignaturaId || "ninguna"} onValueChange={(v) => setAsignaturaId(v === "ninguna" ? "" : v)}>
                  <SelectTrigger className={`h-10 text-xs sm:text-sm font-medium ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white'}`}>
                    <SelectValue placeholder="General / Tutor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={"ninguna"} className="text-xs sm:text-sm font-medium italic">Asistencia General</SelectItem>
                    {asignaturas.map(m => (
                      <SelectItem key={m.id} value={m.id} className="text-xs sm:text-sm font-medium">
                        {m.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[100px] sm:min-w-[120px] flex-1 sm:flex-none">
                <Label className={`text-xs sm:text-sm font-bold mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Fecha</Label>
                <input
                  type="date"
                  className={`flex h-10 w-full rounded-md border px-3 py-1 text-xs sm:text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 ${darkMode ? 'bg-slate-800 border-slate-600 text-white focus-visible:ring-slate-400' : 'bg-white border-slate-200 focus-visible:ring-slate-950'}`}
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <Button
                className={`h-10 text-white w-full sm:w-auto px-6 font-bold text-xs sm:text-sm ${darkMode ? 'bg-teal-600 hover:bg-teal-500' : 'bg-teal-600 hover:bg-teal-700'}`}
                onClick={handleSave}
                disabled={saving || activeStudents.length === 0}
              >
                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {saving ? "Guardando..." : "Guardar Lista"}
              </Button>
              {isAdmin && (
                <Button
                  className={`h-10 text-white w-full sm:w-auto px-4 font-bold text-xs sm:text-sm ${darkMode ? 'bg-red-700 hover:bg-red-600' : 'bg-red-600 hover:bg-red-700'}`}
                  onClick={handleDelete}
                  disabled={deleting || activeStudents.length === 0}
                >
                  {deleting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  {deleting ? "Eliminando..." : "Borrar"}
                </Button>
              )}
            </div>

            <div className="flex gap-2 text-xs sm:text-sm font-medium flex-wrap">
              <Badge variant="outline" className={`py-0.5 ${darkMode ? 'bg-green-900/40 text-green-400 border-green-800' : 'bg-green-50 text-green-700 border-green-200'}`}>
                Presentes: {presentCount}
              </Badge>
              <Badge variant="outline" className={`py-0.5 ${darkMode ? 'bg-red-900/40 text-red-400 border-red-800' : 'bg-red-50 text-red-700 border-red-200'}`}>
                Ausentes: {absentCount}
              </Badge>
              <Badge variant="outline" className={`py-0.5 ${darkMode ? 'bg-amber-900/40 text-amber-400 border-amber-800' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                Justificados: {justifiedCount}
              </Badge>
            </div>

            {loading ? (
              <div className={`rounded-md border overflow-hidden table-scroll-container relative ${darkMode ? 'border-slate-700' : ''}`}>
                <Table className="text-xs sm:text-sm font-medium">
                  <TableHeader className={darkMode ? 'bg-slate-800' : 'bg-slate-50'}>
                    <TableRow>
                      <TableHead className="w-10 text-center">N°</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-[150px]">Estudiante</TableHead>
                      <TableHead className="w-[160px] sm:w-[300px] text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <TableRow key={`skeleton-${idx}`} className={idx % 2 === 0 ? (darkMode ? 'bg-[#1e293b]' : '') : (darkMode ? 'bg-slate-800/50' : 'bg-slate-50/50')}>
                        <TableCell className="text-center"><Skeleton className={`h-4 w-6 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></TableCell>
                        <TableCell><Skeleton className={`h-4 w-40 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></TableCell>
                        <TableCell className="text-center"><Skeleton className={`h-8 w-32 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : activeStudents.length === 0 ? (
              <div className={`py-12 text-center ${darkMode ? 'text-slate-400 bg-slate-800/50' : 'text-slate-500 bg-slate-50'} rounded-lg border border-dashed ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                Seleccione un grado para tomar asistencia.
              </div>
            ) : (
              <div className={`rounded-md border overflow-hidden table-scroll-container relative ${darkMode ? 'border-slate-700' : ''}`}>
                <Table className="text-xs sm:text-sm font-medium">
                  <TableHeader className={darkMode ? 'bg-slate-800' : 'bg-slate-50'}>
                    <TableRow>
                      <TableHead className="w-10 text-center sticky-col left-0 z-20 shadow-right">N°</TableHead>
                      <TableHead className="sticky-col left-10 z-20 shadow-right min-w-[120px] sm:min-w-[150px]">Estudiante</TableHead>
                      <TableHead className="w-[160px] sm:w-[300px] text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeStudents.map((est, idx) => {
                      const estado = asistencias[est.id] || "presente";
                      const evenRow = idx % 2 === 0;
                      const rowBg = evenRow ? (darkMode ? 'bg-[#1e293b]' : '') : (darkMode ? 'bg-slate-800/50' : 'bg-slate-50/50');
                      const stickyBg = evenRow ? (darkMode ? 'bg-[#1e293b]' : 'bg-white') : (darkMode ? 'bg-slate-800/50' : 'bg-slate-50/50');

                      return (
                        <TableRow key={est.id} className={`${rowBg} ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100/50'} transition-colors`}>
                          <TableCell className={`text-center font-bold sticky-col left-0 z-10 shadow-right ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} style={{ backgroundColor: stickyBg }}>
                            {est.numero}
                          </TableCell>
                          <TableCell className={`font-semibold sticky-col left-10 z-10 shadow-right whitespace-nowrap ${darkMode ? 'text-white' : ''}`} style={{ backgroundColor: stickyBg }}>
                            {est.nombre}
                          </TableCell>
                          <TableCell>
                            <div className={`flex justify-center p-1 rounded-lg w-full max-w-[160px] sm:max-w-[280px] mx-auto border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100/50 border-slate-200'}`}>
                              <button
                                onClick={() => handleEstadoChange(est.id, "presente")}
                                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md transition-all text-[10px] sm:text-sm font-bold ${estado === "presente"
                                  ? (darkMode ? "bg-slate-700 text-green-400 shadow-sm ring-1 ring-green-700" : "bg-white text-green-700 shadow-sm ring-1 ring-green-200")
                                  : (darkMode ? "text-slate-500 hover:text-slate-300 hover:bg-slate-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50")
                                  }`}
                              >
                                <CheckCircle2 className={`h-4 w-4 sm:h-5 sm:w-5 ${estado === "presente" ? "text-green-500" : ""}`} />
                                <span className="hidden sm:inline">Presente</span>
                                <span className="sm:hidden">P</span>
                              </button>

                              <button
                                onClick={() => handleEstadoChange(est.id, "ausente")}
                                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md transition-all text-[10px] sm:text-sm font-bold ${estado === "ausente"
                                  ? (darkMode ? "bg-slate-700 text-red-400 shadow-sm ring-1 ring-red-700" : "bg-white text-red-700 shadow-sm ring-1 ring-red-200")
                                  : (darkMode ? "text-slate-500 hover:text-slate-300 hover:bg-slate-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50")
                                  }`}
                              >
                                <XCircle className={`h-4 w-4 sm:h-5 sm:w-5 ${estado === "ausente" ? "text-red-500" : ""}`} />
                                <span className="hidden sm:inline">Ausente</span>
                                <span className="sm:hidden">A</span>
                              </button>

                              <button
                                onClick={() => handleEstadoChange(est.id, "justificada")}
                                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md transition-all text-[10px] sm:text-sm font-bold ${estado === "justificada"
                                  ? (darkMode ? "bg-slate-700 text-amber-400 shadow-sm ring-1 ring-amber-700" : "bg-white text-amber-700 shadow-sm ring-1 ring-amber-200")
                                  : (darkMode ? "text-slate-500 hover:text-slate-300 hover:bg-slate-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50")
                                  }`}
                              >
                                <Clock className={`h-4 w-4 sm:h-5 sm:w-5 ${estado === "justificada" ? "text-amber-500" : ""}`} />
                                <span className="hidden sm:inline">Justificada</span>
                                <span className="sm:hidden">J</span>
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <Label className={`text-xs sm:text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Rango:</Label>
                  <div className={`flex p-0.5 rounded-md ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <Button
                      size="sm" variant="ghost"
                      className={`h-7 px-3 text-xs ${summaryRange === "all" ? (darkMode ? "bg-slate-700 shadow-sm font-bold text-white" : "bg-white shadow-sm font-bold") : (darkMode ? "text-slate-400" : "")}`}
                      onClick={() => setSummaryRange("all")}
                    >
                      Año
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className={`h-7 px-3 text-xs ${summaryRange === "month" ? (darkMode ? "bg-slate-700 shadow-sm font-bold text-white" : "bg-white shadow-sm font-bold") : (darkMode ? "text-slate-400" : "")}`}
                      onClick={() => setSummaryRange("month")}
                    >
                      Mes
                    </Button>
                  </div>
                </div>
                {summaryRange === "month" && (
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className={`flex h-7 rounded-md border px-2 text-xs font-medium ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200'}`}
                  />
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button size="sm" variant="outline" className={`h-9 text-xs font-bold flex-1 sm:flex-initial ${darkMode ? 'border-blue-700 text-blue-400 hover:bg-blue-900/30' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}`} onClick={downloadPDFMensual} disabled={!gradoId}>
                  <Download className="h-4 w-4 mr-2" /> PDF Mes
                </Button>
                <Button size="sm" variant="outline" className={`h-9 text-xs font-bold flex-1 sm:flex-initial ${darkMode ? 'border-purple-700 text-purple-400 hover:bg-purple-900/30' : 'border-purple-200 text-purple-700 hover:bg-purple-50'}`} onClick={downloadPDFAnual} disabled={!gradoId}>
                  <Download className="h-4 w-4 mr-2" /> PDF Año
                </Button>
                <Button size="sm" variant="outline" className={`h-9 text-xs font-bold flex-1 sm:flex-initial ${darkMode ? 'border-teal-700 text-teal-400 hover:bg-teal-900/30' : 'border-teal-200 text-teal-700 hover:bg-teal-50'}`} onClick={exportCSV} disabled={!gradoId}>
                  <Download className="h-4 w-4 mr-2" /> CSV
                </Button>
              </div>
            </div>

            <div className={`rounded-xl border overflow-hidden table-scroll-container ${darkMode ? 'border-slate-700' : ''}`}>
              <Table className="text-xs sm:text-sm font-medium">
                <TableHeader>
                  <TableRow className={darkMode ? 'bg-slate-800' : 'bg-slate-50'}>
                    <TableHead className="w-10 text-center">N°</TableHead>
                    <TableHead className="min-w-[120px] sm:min-w-[140px]">Estudiante</TableHead>
                    <TableHead className="text-center font-bold text-teal-600">Asist.</TableHead>
                    <TableHead className="text-center font-bold text-amber-600">Tard.</TableHead>
                    <TableHead className="text-center font-bold text-red-600">Aus.</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center w-24">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <TableRow key={`skeleton-${idx}`} className={idx % 2 === 0 ? (darkMode ? 'bg-[#1e293b]' : '') : (darkMode ? 'bg-slate-800/50' : 'bg-slate-50/50')}>
                        <TableCell className="text-center"><Skeleton className={`h-4 w-6 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></TableCell>
                        <TableCell><Skeleton className={`h-4 w-40 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></TableCell>
                        <TableCell className="text-center"><Skeleton className={`h-4 w-8 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></TableCell>
                        <TableCell className="text-center"><Skeleton className={`h-4 w-8 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></TableCell>
                        <TableCell className="text-center"><Skeleton className={`h-4 w-8 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></TableCell>
                        <TableCell className="text-center"><Skeleton className={`h-4 w-8 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></TableCell>
                        <TableCell className="text-center"><Skeleton className={`h-4 w-16 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></TableCell>
                      </TableRow>
                    ))
                  ) : resumen.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className={`text-center py-8 italic text-xs sm:text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        Sin registros
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {resumen.map((r, idx) => {
                        const isExpanded = expandedStudent === r.id;
                        return (
                          <React.Fragment key={r.id}>
                            <TableRow
                              className={`h-10 cursor-pointer transition-colors ${idx % 2 === 0 ? '' : (darkMode ? 'bg-slate-800/30' : 'bg-slate-50/30')} ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'}`}
                              onClick={() => setExpandedStudent(isExpanded ? null : r.id)}
                            >
                              <TableCell className={`text-center font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{r.numero}</TableCell>
                              <TableCell className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-700'}`}>
                                <div className="flex items-center gap-2">
                                  {r.nombre}
                                  {(r.fechasPresente?.length || r.fechasAusente?.length || r.fechasTardanza?.length) && (
                                    <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                      {isExpanded ? '▲' : '▼'}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-teal-700 font-medium">{r.asistencias}</TableCell>
                              <TableCell className="text-center text-amber-700 font-medium">{r.tardanzas}</TableCell>
                              <TableCell className="text-center text-red-700 font-medium">{r.ausencias}</TableCell>
                              <TableCell className="text-center font-bold">{r.total}</TableCell>
                              <TableCell className="text-center">
                                <div className="flex gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                                  <Button size="sm" variant="ghost" className={`h-6 px-1 text-[10px] ${darkMode ? 'text-blue-400 hover:bg-blue-900/30' : 'text-blue-600 hover:bg-blue-50'}`} onClick={() => downloadPDFMensual(r.id)} title="PDF Mensual">
                                    <Download className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className={`h-6 px-1 text-[10px] ${darkMode ? 'text-purple-400 hover:bg-purple-900/30' : 'text-purple-600 hover:bg-purple-50'}`} onClick={() => downloadPDFAnual(r.id)} title="PDF Anual">
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow className={darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}>
                                <TableCell colSpan={7} className="py-4 px-4">
                                  <div className="space-y-4">
                                    {r.fechasPresente && r.fechasPresente.length > 0 && (
                                      <div className={`rounded-lg p-3 ${darkMode ? 'bg-teal-900/20 border border-teal-800/50' : 'bg-teal-50 border border-teal-200'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                          <span className={`font-semibold text-sm ${darkMode ? 'text-teal-400' : 'text-teal-700'}`}>✓ Asistencias</span>
                                          <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-teal-900/40 text-teal-300' : 'bg-teal-100 text-teal-700'}`}>{r.fechasPresente.length} días</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                                          {r.fechasPresente.map((fecha, i) => (
                                            <span key={i} className={`px-2 py-1 rounded text-xs font-mono ${darkMode ? 'bg-teal-900/40 text-teal-300 border border-teal-700/30' : 'bg-white text-teal-700 border border-teal-200 shadow-sm'}`}>{fecha}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {r.fechasTardanza && r.fechasTardanza.length > 0 && (
                                      <div className={`rounded-lg p-3 ${darkMode ? 'bg-amber-900/20 border border-amber-800/50' : 'bg-amber-50 border border-amber-200'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                          <span className={`font-semibold text-sm ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>⏰ Tardanzas</span>
                                          <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>{r.fechasTardanza.length} días</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                                          {r.fechasTardanza.map((fecha, i) => (
                                            <span key={i} className={`px-2 py-1 rounded text-xs font-mono ${darkMode ? 'bg-amber-900/40 text-amber-300 border border-amber-700/30' : 'bg-white text-amber-700 border border-amber-200 shadow-sm'}`}>{fecha}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {r.fechasJustificada && r.fechasJustificada.length > 0 && (
                                      <div className={`rounded-lg p-3 ${darkMode ? 'bg-blue-900/20 border border-blue-800/50' : 'bg-blue-50 border border-blue-200'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                          <span className={`font-semibold text-sm ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>📋 Justificadas</span>
                                          <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>{r.fechasJustificada.length} días</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                                          {r.fechasJustificada.map((fecha, i) => (
                                            <span key={i} className={`px-2 py-1 rounded text-xs font-mono ${darkMode ? 'bg-blue-900/40 text-blue-300 border border-blue-700/30' : 'bg-white text-blue-700 border border-blue-200 shadow-sm'}`}>{fecha}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {r.fechasAusente && r.fechasAusente.length > 0 && (
                                      <div className={`rounded-lg p-3 ${darkMode ? 'bg-red-900/20 border border-red-800/50' : 'bg-red-50 border border-red-200'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                          <span className={`font-semibold text-sm ${darkMode ? 'text-red-400' : 'text-red-700'}`}>✗ Ausencias</span>
                                          <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700'}`}>{r.fechasAusente.length} días</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                                          {r.fechasAusente.map((fecha, i) => (
                                            <span key={i} className={`px-2 py-1 rounded text-xs font-mono ${darkMode ? 'bg-red-900/40 text-red-300 border border-red-700/30' : 'bg-white text-red-700 border border-red-200 shadow-sm'}`}>{fecha}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {(!r.fechasPresente?.length && !r.fechasTardanza?.length && !r.fechasAusente?.length) && (
                                      <p className={`italic text-center py-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No hay fechas registradas</p>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
