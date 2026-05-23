"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, FileSpreadsheet, FileDown, Download, Loader2, Lock, ChevronDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type AvanceItem = {
  gradoId: string;
  gradoNumero: number;
  gradoSeccion: string;
  materiaId: string;
  materiaNombre: string;
  totalEstudiantes: number;
  conCalificaciones: number;
  porcentaje: number;
};

type GradoInfo = {
  id: string;
  numero: number;
  seccion: string;
  estudiantes: { id: string; nombre: string; numero: number }[];
  materias: { id: string; nombre: string }[];
};

type CalificacionData = {
  estudianteId: string;
  estudianteNombre: string;
  estudianteNumero: number;
  materiaId: string;
  materiaNombre: string;
  gradoId: string;
  trimestre: number;
  actividadesCotidianas: (number | null)[];
  actividadesIntegradoras: (number | null)[];
  calificacionAC: number | null;
  calificacionAI: number | null;
  examenTrimestral: number | null;
  promedioFinal: number | null;
  recuperacion: number | null;
  config: {
    numActividadesCotidianas: number;
    numActividadesIntegradoras: number;
    tieneExamen: boolean;
    porcentajeAC: number;
    porcentajeAI: number;
    porcentajeExamen: number;
  } | null;
};

type ApiResponse = {
  trimestre: number;
  progresoGlobal: number;
  habilitado: boolean;
  totalCombos: number;
  combosSuficientes: number;
  avance: AvanceItem[];
  grados: GradoInfo[];
  datos?: CalificacionData[];
};

const COUNTRY_CONFIG = {
  name: "CEC San José de la Montaña",
  documentTitle: "REPORTE DE CALIFICACIONES POR TRIMESTRE",
};

function formatValor(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return v.toFixed(1);
}

function getGradoLabel(gradoNumero: number, gradoSeccion: string): string {
  return `${gradoNumero}° "${gradoSeccion}"`;
}

export function DescargaCompletaButton({ darkMode }: { darkMode: boolean }) {
  const [trimestre, setTrimestre] = useState("1");
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/export/calificaciones-completas?trimestre=${trimestre}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setApiData(data))
      .catch(() => setApiData(null))
      .finally(() => setLoading(false));
  }, [trimestre]);

  const fetchData = useCallback(async (): Promise<ApiResponse> => {
    const res = await fetch(`/api/export/calificaciones-completas?trimestre=${trimestre}&data=true`, { credentials: "include" });
    return res.json();
  }, [trimestre]);

  const exportarPDF = useCallback(async () => {
    setExportando("pdf");
    try {
      const res = await fetchData();
      await generarPDF(res);
    } finally {
      setExportando(null);
    }
  }, [fetchData]);

  const exportarExcel = useCallback(async () => {
    setExportando("excel");
    try {
      const res = await fetchData();
      await generarExcel(res);
    } finally {
      setExportando(null);
    }
  }, [fetchData]);

  const exportarWord = useCallback(async () => {
    setExportando("word");
    try {
      const res = await fetchData();
      await generarWord(res);
    } finally {
      setExportando(null);
    }
  }, [fetchData]);

  const disabled = !apiData?.habilitado || loading || exportando !== null;
  const tooltipMsg = loading
    ? "Verificando avance..."
    : exportando !== null
    ? "Generando archivo..."
    : !apiData?.habilitado
    ? `Debe completar al menos el 33.33% del trimestre (actual: ${apiData?.progresoGlobal ?? 0}%)`
    : "Descargar calificaciones";

  return (
    <div className="flex items-center gap-2">
      <Select value={trimestre} onValueChange={setTrimestre} disabled={loading || exportando !== null}>
        <SelectTrigger className={`w-[90px] h-8 text-xs ${darkMode ? 'bg-card border-white/30' : ''}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Trimestre I</SelectItem>
          <SelectItem value="2">Trimestre II</SelectItem>
          <SelectItem value="3">Trimestre III</SelectItem>
        </SelectContent>
      </Select>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={disabled}>
                  <Button
                    size="sm"
                    disabled={disabled}
                    className={`h-8 text-xs gap-1 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : exportando ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : !apiData?.habilitado ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    <span>Descargar</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {apiData?.habilitado
                      ? `Progreso: ${apiData?.progresoGlobal}% (${apiData?.combosSuficientes}/${apiData?.totalCombos})`
                      : `Avance insuficiente (${apiData?.progresoGlobal ?? 0}%)`}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportarPDF} disabled={exportando !== null} className="gap-2 cursor-pointer">
                    <FileText className="h-4 w-4 text-red-500" />
                    <span>PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportarWord} disabled={exportando !== null} className="gap-2 cursor-pointer">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span>Word</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportarExcel} disabled={exportando !== null} className="gap-2 cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4 text-green-500" />
                    <span>Excel</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-[200px]">
            {tooltipMsg}
            {!loading && apiData && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                {apiData.combosSuficientes} de {apiData.totalCombos} combinaciones grado/asignatura con ≥33.33%
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

async function generarPDF(data: ApiResponse) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const gradosOrdenados = [...(data.grados || [])].sort((a, b) => a.numero - b.numero);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });

  doc.setFontSize(14);
  doc.text(COUNTRY_CONFIG.name, 14, 14);
  doc.setFontSize(11);
  doc.text(COUNTRY_CONFIG.documentTitle, 14, 21);
  doc.setFontSize(9);
  doc.text(`Trimestre: ${romanizar(data.trimestre)} - ${new Date().toLocaleDateString("es-ES")}`, 14, 28);

  const pdfDoc: any = doc;
  let pageNum = 1;
  for (const grado of gradosOrdenados) {
    const gradoLabel = getGradoLabel(grado.numero, grado.seccion);
    const materias = grado.materias || [];

    for (const materia of materias) {
      const califsMateria = (data.datos || []).filter(
        (c) => c.gradoId === grado.id && c.materiaId === materia.id
      );

      if (califsMateria.length === 0) continue;

      const config = califsMateria[0]?.config;
      const numAC = config?.numActividadesCotidianas ?? 4;
      const numAI = config?.numActividadesIntegradoras ?? 1;
      const tieneExamen = config?.tieneExamen ?? true;

      const estudiantes = grado.estudiantes || [];
      const califMap = new Map(califsMateria.map((c) => [c.estudianteId, c]));

      const head = ["N°", "Estudiante", ...Array(numAC).fill("AC"), "Prom AC", ...Array(numAI).fill("AI"), "Prom AI"];
      if (tieneExamen) head.push("Examen");
      head.push("Prom Final");

      const body = estudiantes.map((est) => {
        const calif = califMap.get(est.id);
        const acs = calif
          ? calif.actividadesCotidianas.map((n) => formatValor(n))
          : Array(numAC).fill("");
        const ais = calif
          ? calif.actividadesIntegradoras.map((n) => formatValor(n))
          : Array(numAI).fill("");
        const promAC = calif?.calificacionAC != null ? calif.calificacionAC.toFixed(1) : "";
        const promAI = calif?.calificacionAI != null ? calif.calificacionAI.toFixed(1) : "";
        const examen = calif?.examenTrimestral != null ? formatValor(calif.examenTrimestral) : "";
        const promFinal = calif?.promedioFinal != null ? calif.promedioFinal.toFixed(1) : "";
        const row = [String(est.numero), est.nombre, ...acs, promAC, ...ais, promAI];
        if (tieneExamen) row.push(examen);
        row.push(promFinal);
        return row;
      });

      autoTable(doc, {
        head: [head],
        body,
        startY: 32,
        styles: { fontSize: 6.5 },
        headStyles: { fillColor: [13, 148, 136], fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 50 },
        },
        didDrawPage: () => {
          doc.setFontSize(7);
          doc.text(
            `${gradoLabel} - ${materia.nombre}`,
            pdfDoc.internal.pageSize.getWidth() / 2,
            10,
            { align: "center" }
          );
          doc.text(`Pág. ${pageNum}`, pdfDoc.internal.pageSize.getWidth() - 14, 10, { align: "right" });
        },
      });

      if (body.length > 0) doc.addPage();
      pageNum++;
    }
  }

  // Add summary chart page
  doc.addPage();
  const chartWidth = 260;
  const chartHeight = 140;
  const chartX = 14;
  let chartY = 30;

  // Per-grade summary
  for (const grado of gradosOrdenados) {
    const califsGrado = (data.datos || []).filter(c => c.gradoId === grado.id);
    const estudiantesUnicos = new Set(califsGrado.map(c => c.estudianteId));
    const totalEst = estudiantesUnicos.size;
    const aprobados = califsGrado.filter(c => c.promedioFinal !== null && c.promedioFinal >= 6.5).length;
    const condicionados = califsGrado.filter(c => c.promedioFinal !== null && c.promedioFinal >= 4.5 && c.promedioFinal < 6.5).length;
    const reprobados = califsGrado.filter(c => c.promedioFinal !== null && c.promedioFinal < 4.5).length;
    const sinDatos = califsGrado.filter(c => c.promedioFinal === null).length;
    const total = aprobados + condicionados + reprobados;

    if (chartY > 180) { doc.addPage(); chartY = 30; }

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`${getGradoLabel(grado.numero, grado.seccion)} — A:${aprobados} C:${condicionados} R:${reprobados}`, chartX, chartY);
    chartY += 6;

    const barW = chartWidth / (total || 1);
    const barH = 14;
    if (aprobados > 0) {
      doc.setFillColor(16, 185, 129);
      doc.rect(chartX, chartY, (aprobados / (total || 1)) * chartWidth, barH, "F");
    }
    if (condicionados > 0) {
      doc.setFillColor(245, 158, 11);
      doc.rect(chartX + (aprobados / (total || 1)) * chartWidth, chartY, (condicionados / (total || 1)) * chartWidth, barH, "F");
    }
    if (reprobados > 0) {
      doc.setFillColor(239, 68, 68);
      doc.rect(chartX + ((aprobados + condicionados) / (total || 1)) * chartWidth, chartY, (reprobados / (total || 1)) * chartWidth, barH, "F");
    }
    doc.setDrawColor(0);
    doc.rect(chartX, chartY, chartWidth, barH, "S");

    doc.setFontSize(7);
    doc.setTextColor(100);
    // Legend: colored boxes
    const legendY = chartY + barH + 3;
    let lx = chartX;
    if (aprobados > 0) {
      doc.setFillColor(16, 185, 129); doc.rect(lx, legendY, 4, 4, "F");
      doc.text(`Aprobados: ${aprobados}`, lx + 6, legendY + 3);
      lx += 40;
    }
    if (condicionados > 0) {
      doc.setFillColor(245, 158, 11); doc.rect(lx, legendY, 4, 4, "F");
      doc.text(`Cond: ${condicionados}`, lx + 6, legendY + 3);
      lx += 35;
    }
    if (reprobados > 0) {
      doc.setFillColor(239, 68, 68); doc.rect(lx, legendY, 4, 4, "F");
      doc.text(`Reprobados: ${reprobados}`, lx + 6, legendY + 3);
    }

    chartY = legendY + 12;
  }

  const totalPages = pdfDoc.internal.getNumberOfPages();
  if (pdfDoc.lastAutoTable?.finalY && totalPages > 1) {
    pdfDoc.deletePage(totalPages);
  }

  doc.save(`calificaciones_completas_T${data.trimestre}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

async function generarExcel(data: ApiResponse) {
  const XLSX = await import("xlsx");

  const gradosOrdenados = [...(data.grados || [])].sort((a, b) => a.numero - b.numero);
  const wb = XLSX.utils.book_new();

  for (const grado of gradosOrdenados) {
    const gradoLabel = `Grado ${grado.numero}° ${grado.seccion}`;
    const sheetName = `${grado.numero}°${grado.seccion}`.substring(0, 31);
    const materias = grado.materias || [];
    const estudiantes = grado.estudiantes || [];

    const rows: any[][] = [];
    const headers: string[] = ["N°", "Estudiante"];

    for (const materia of materias) {
      const califs = (data.datos || []).filter((c) => c.gradoId === grado.id && c.materiaId === materia.id);
      const config = califs[0]?.config;
      const numAC = config?.numActividadesCotidianas ?? 4;
      const numAI = config?.numActividadesIntegradoras ?? 1;
      const tieneExamen = config?.tieneExamen ?? true;

      for (let i = 1; i <= numAC; i++) {
        headers.push(`${materia.nombre} AC${i}`);
      }
      if (numAI > 0) headers.push(`${materia.nombre} Prom AC`);
      for (let i = 1; i <= numAI; i++) {
        headers.push(`${materia.nombre} AI${i}`);
      }
      headers.push(`${materia.nombre} Prom AI`);
      if (tieneExamen) headers.push(`${materia.nombre} Examen`);
      headers.push(`${materia.nombre} Prom Final`);
    }

    rows.push(headers);

    for (const est of estudiantes) {
      const row: any[] = [est.numero, est.nombre];
      for (const materia of materias) {
        const califs = (data.datos || []).filter(
          (c) => c.estudianteId === est.id && c.materiaId === materia.id
        );
        const calif = califs[0];
        const config = calif?.config;
        const numAC = config?.numActividadesCotidianas ?? 4;
        const numAI = config?.numActividadesIntegradoras ?? 1;
        const tieneExamen = config?.tieneExamen ?? true;

        for (let i = 0; i < numAC; i++) {
          row.push(calif?.actividadesCotidianas[i] ?? "");
        }
        row.push(calif?.calificacionAC ?? "");
        for (let i = 0; i < numAI; i++) {
          row.push(calif?.actividadesIntegradoras[i] ?? "");
        }
        row.push(calif?.calificacionAI ?? "");
        if (tieneExamen) row.push(calif?.examenTrimestral ?? "");
        row.push(calif?.promedioFinal ?? "");
      }
      rows.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = headers.map((_, i) => ({ wch: i < 2 ? (i === 0 ? 5 : 30) : 10 }));
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  XLSX.writeFile(wb, `calificaciones_completas_T${data.trimestre}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function generarWord(data: ApiResponse) {
  const gradosOrdenados = [...(data.grados || [])].sort((a, b) => a.numero - b.numero);

  let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Calificaciones Trimestre ${romanizar(data.trimestre)}</title>
  <style>
    @page { margin: 1.5cm; }
    body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 10pt; color: #1a1a1a; }
    h1 { font-size: 16pt; text-align: center; color: #1b6b3a; margin-bottom: 2px; }
    h2 { font-size: 12pt; text-align: center; color: #333; margin-top: 0; font-weight: normal; }
    .subtitle { text-align: center; font-size: 9pt; color: #666; margin-bottom: 15px; }
    .grado-title { font-size: 13pt; font-weight: bold; color: #1b6b3a; margin-top: 20px; margin-bottom: 5px; border-bottom: 2px solid #1b6b3a; padding-bottom: 3px; }
    .materia-title { font-size: 11pt; font-weight: bold; margin-top: 12px; margin-bottom: 4px; color: #444; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 8pt; }
    th { background-color: #1b6b3a; color: white; padding: 4px 3px; text-align: center; font-weight: bold; }
    td { padding: 3px; border: 1px solid #ccc; text-align: center; }
    td:first-child { text-align: center; font-weight: bold; width: 25px; }
    td:nth-child(2) { text-align: left; }
    tr:nth-child(even) { background-color: #f0fdfa; }
    .footer { text-align: center; font-size: 8pt; color: #999; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 5px; }
  </style>
</head>
<body>
  <h1>${COUNTRY_CONFIG.name}</h1>
  <h2>${COUNTRY_CONFIG.documentTitle}</h2>
  <div class="subtitle">Trimestre ${romanizar(data.trimestre)} - Generado: ${new Date().toLocaleDateString("es-ES")}</div>`;

  for (const grado of gradosOrdenados) {
    const gradoLabel = getGradoLabel(grado.numero, grado.seccion);
    html += `<div class="grado-title">${gradoLabel}</div>`;

    for (const materia of grado.materias || []) {
      const califsMateria = (data.datos || []).filter(
        (c) => c.gradoId === grado.id && c.materiaId === materia.id
      );

      html += `<div class="materia-title">${materia.nombre}</div>`;

      const config = califsMateria[0]?.config;
      const numAC = config?.numActividadesCotidianas ?? 4;
      const numAI = config?.numActividadesIntegradoras ?? 1;
      const tieneExamen = config?.tieneExamen ?? true;

      html += `<table><thead><tr><th>N°</th><th>Estudiante</th>`;
      for (let i = 1; i <= numAC; i++) html += `<th>AC${i}</th>`;
      html += `<th>Prom AC</th>`;
      for (let i = 1; i <= numAI; i++) html += `<th>AI${i}</th>`;
      html += `<th>Prom AI</th>`;
      if (tieneExamen) html += `<th>Examen</th>`;
      html += `<th>Prom Final</th></tr></thead><tbody>`;

      const estudiantes = grado.estudiantes || [];
      const califMap = new Map(califsMateria.map((c) => [c.estudianteId, c]));

      for (const est of estudiantes) {
        const calif = califMap.get(est.id);
        html += `<tr><td>${est.numero}</td><td>${escHtml(est.nombre)}</td>`;
        for (let i = 0; i < numAC; i++) {
          html += `<td>${formatValor(calif?.actividadesCotidianas[i] ?? null)}</td>`;
        }
        html += `<td>${formatValor(calif?.calificacionAC ?? null)}</td>`;
        for (let i = 0; i < numAI; i++) {
          html += `<td>${formatValor(calif?.actividadesIntegradoras[i] ?? null)}</td>`;
        }
        html += `<td>${formatValor(calif?.calificacionAI ?? null)}</td>`;
        if (tieneExamen) html += `<td>${formatValor(calif?.examenTrimestral ?? null)}</td>`;
        html += `<td><strong>${formatValor(calif?.promedioFinal ?? null)}</strong></td>`;
        html += `</tr>`;
      }

      html += `</tbody></table>`;
    }
  }

  html += `<div class="footer">${COUNTRY_CONFIG.name} - Sistema de Calificaciones</div></body></html>`;

  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `calificaciones_completas_T${data.trimestre}_${new Date().toISOString().slice(0, 10)}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

function romanizar(n: number): string {
  const map: Record<number, string> = { 1: "I", 2: "II", 3: "III" };
  return map[n] || String(n);
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
