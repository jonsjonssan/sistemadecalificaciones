"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, FileSpreadsheet, Download, Loader2, Lock, ChevronDown } from "lucide-react";
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
  actividadesExamen: (number | null)[];
  calificacionAC: number | null;
  calificacionAI: number | null;
  examenTrimestral: number | null;
  promedioFinal: number | null;
  recuperacion: number | null;
  config: {
    numActividadesCotidianas: number;
    numActividadesIntegradoras: number;
    tieneExamen: boolean;
    numExamenes: number;
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
                    <FileText className="h-4 w-4 text-status-error" />
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
      const numEX = (config?.tieneExamen ? (config?.numExamenes ?? 1) : 0);
      const tieneExamen = config?.tieneExamen ?? true;

      const estudiantes = grado.estudiantes || [];
      const califMap = new Map(califsMateria.map((c) => [c.estudianteId, c]));

      const head = ["N°", "Estudiante", ...Array(numAC).fill("AC"), "Prom AC", ...Array(numAI).fill("AI"), "Prom AI"];
      if (tieneExamen) {
        head.push(...Array(numEX).fill("EX"), "Prom EX");
      }
      head.push("Prom Final");

      const pctAC = (config?.porcentajeAC ?? 35) / 100;
      const pctAI = (config?.porcentajeAI ?? 35) / 100;
      const pctEx = (config?.porcentajeExamen ?? 30) / 100;
      const body = estudiantes.map((est) => {
        const calif = califMap.get(est.id);
        const getNotas = (notas: (number | null)[] | undefined, count: number): string[] => {
          const arr: string[] = [];
          for (let i = 0; i < count; i++) {
            arr.push(notas && i < notas.length ? formatValor(notas[i]) : "");
          }
          return arr;
        };
        const acs = getNotas(calif?.actividadesCotidianas, numAC);
        const ais = getNotas(calif?.actividadesIntegradoras, numAI);
        const exs = getNotas(calif?.actividadesExamen, numEX);
        const promAC = calif?.calificacionAC != null ? (calif.calificacionAC * pctAC).toFixed(2) : "";
        const promAI = calif?.calificacionAI != null ? (calif.calificacionAI * pctAI).toFixed(2) : "";
        const promEX = calif?.examenTrimestral != null ? (calif.examenTrimestral * pctEx).toFixed(2) : "";
        const promFinal = calif?.promedioFinal != null ? calif.promedioFinal.toFixed(2) : "";
        const row = [String(est.numero), est.nombre, ...acs, promAC, ...ais, promAI];
        if (tieneExamen) {
          row.push(...exs, promEX);
        }
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

      // Calculate stats for chart
      const aprobados = body.filter(r => {
        const lastVal = r[r.length - 1];
        return lastVal !== "" && parseFloat(lastVal as string) >= 6.5;
      }).length;
      const condicionados = body.filter(r => {
        const lastVal = r[r.length - 1];
        return lastVal !== "" && parseFloat(lastVal as string) >= 4.5 && parseFloat(lastVal as string) < 6.5;
      }).length;
      const reprobados = body.filter(r => {
        const lastVal = r[r.length - 1];
        return lastVal !== "" && parseFloat(lastVal as string) < 4.5;
      }).length;
      const totalChart = aprobados + condicionados + reprobados;

      // Draw mini chart below table
      const finalY = (pdfDoc.lastAutoTable?.finalY ?? 32) + 4;
      const pw = pdfDoc.internal.pageSize.getWidth();
      const ph = pdfDoc.internal.pageSize.getHeight();
      const chartStartY = finalY + 2;
      const barH = 5;
      const chartW = pw - 28;

      // Check if there is enough space; if not, add a new page
      let currentY = chartStartY;
      if (currentY + barH + 14 > ph - 15) {
        doc.addPage();
        currentY = 30;
        doc.setFontSize(7);
        doc.text(`${gradoLabel} - ${materia.nombre} (gráfico)`, pw / 2, 10, { align: "center" });
      }

      // Title
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text("Distribución de estudiantes:", 14, currentY - 1);

      // Stacked bar
      let barX = 14;
      if (aprobados > 0) {
        doc.setFillColor(29, 98, 74);
        doc.roundedRect(barX, currentY, (aprobados / (totalChart || 1)) * chartW, barH, 1, 1, "F");
        doc.setFontSize(6);
        doc.setTextColor(255);
        if ((aprobados / (totalChart || 1)) * chartW > 10) doc.text(`${aprobados}`, barX + 1.5, currentY + barH / 2 + 1.5);
        barX += (aprobados / (totalChart || 1)) * chartW;
      }
      if (condicionados > 0) {
        doc.setFillColor(132, 108, 62);
        doc.roundedRect(barX, currentY, (condicionados / (totalChart || 1)) * chartW, barH, 1, 1, "F");
        doc.setFontSize(6);
        doc.setTextColor(255);
        if ((condicionados / (totalChart || 1)) * chartW > 10) doc.text(`${condicionados}`, barX + 1.5, currentY + barH / 2 + 1.5);
        barX += (condicionados / (totalChart || 1)) * chartW;
      }
      if (reprobados > 0) {
        doc.setFillColor(112, 64, 64);
        doc.roundedRect(barX, currentY, (reprobados / (totalChart || 1)) * chartW, barH, 1, 1, "F");
        doc.setFontSize(6);
        doc.setTextColor(255);
        if ((reprobados / (totalChart || 1)) * chartW > 10) doc.text(`${reprobados}`, barX + 1.5, currentY + barH / 2 + 1.5);
      }
      doc.setDrawColor(180);
      doc.setLineWidth(0.2);
      doc.roundedRect(14, currentY, chartW, barH, 1, 1, "S");
      doc.setLineWidth(0.1);

      // Legend below bar
      const legY = currentY + barH + 3;
      let lx = 14;
      if (aprobados > 0) {
        doc.setFillColor(29, 98, 74); doc.rect(lx, legY, 3, 3, "F");
        doc.setFontSize(6); doc.setTextColor(100);
        doc.text(`Aprobados: ${aprobados}`, lx + 4.5, legY + 2.5);
        lx += 32;
      }
      if (condicionados > 0) {
        doc.setFillColor(132, 108, 62); doc.rect(lx, legY, 3, 3, "F");
        doc.setFontSize(6); doc.setTextColor(100);
        doc.text(`Condicionados: ${condicionados}`, lx + 4.5, legY + 2.5);
        lx += 36;
      }
      if (reprobados > 0) {
        doc.setFillColor(239, 68, 68); doc.rect(lx, legY, 3, 3, "F");
        doc.setFontSize(6); doc.setTextColor(100);
        doc.text(`Reprobados: ${reprobados}`, lx + 4.5, legY + 2.5);
      }

      // Track if we added an extra blank page from the loop
      if (body.length > 0) {
        doc.addPage();
        pageNum++;
      }
    }
  }

  // Check if we need to remove the blank page created by the last addPage
  const totalPagesBefore = pdfDoc.internal.getNumberOfPages();
  // The last page is blank; we'll reuse it for the summary or create a fresh one

  // Summary chart page
  const pageWidth = pdfDoc.internal.pageSize.getWidth();
  const pageHeight = pdfDoc.internal.pageSize.getHeight();
  let chartY = 25;

  // Try to reuse the blank last page if it's truly empty
  // (the last addPage() created it, so it should be blank)
  // We just stay on the current page and draw

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Resumen General por Grado", 14, chartY);
  chartY += 8;

  const chartW = pageWidth - 28;
  const chartH = 6;

  for (const grado of gradosOrdenados) {
    const califsGrado = (data.datos || []).filter(c => c.gradoId === grado.id);
    const aprobados = califsGrado.filter(c => c.promedioFinal !== null && c.promedioFinal >= 6.5).length;
    const condicionados = califsGrado.filter(c => c.promedioFinal !== null && c.promedioFinal >= 4.5 && c.promedioFinal < 6.5).length;
    const reprobados = califsGrado.filter(c => c.promedioFinal !== null && c.promedioFinal < 4.5).length;
    const total = aprobados + condicionados + reprobados;

    // Check if we need a new page
    if (chartY + chartH + 20 > pageHeight - 15) {
      doc.addPage();
      chartY = 25;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Resumen General por Grado (cont.)", 14, chartY);
      chartY += 8;
    }

    // Grade label
    doc.setFontSize(8);
    doc.setTextColor(40);
    doc.text(`${getGradoLabel(grado.numero, grado.seccion)}`, 14, chartY - 3);

    // Stacked bar
    const barY = chartY;
    let bx = 14;
    if (aprobados > 0) {
      doc.setFillColor(29, 98, 74);
      doc.roundedRect(bx, barY, (aprobados / (total || 1)) * chartW, chartH, 1, 1, "F");
      doc.setFontSize(6);
      doc.setTextColor(255);
      if ((aprobados / (total || 1)) * chartW > 10) doc.text(`${aprobados}`, bx + 1.5, barY + chartH / 2 + 1.5);
      bx += (aprobados / (total || 1)) * chartW;
    }
    if (condicionados > 0) {
      doc.setFillColor(132, 108, 62);
      doc.roundedRect(bx, barY, (condicionados / (total || 1)) * chartW, chartH, 1, 1, "F");
      doc.setFontSize(6);
      doc.setTextColor(255);
      if ((condicionados / (total || 1)) * chartW > 10) doc.text(`${condicionados}`, bx + 1.5, barY + chartH / 2 + 1.5);
      bx += (condicionados / (total || 1)) * chartW;
    }
    if (reprobados > 0) {
      doc.setFillColor(112, 64, 64);
      doc.roundedRect(bx, barY, (reprobados / (total || 1)) * chartW, chartH, 1, 1, "F");
      doc.setFontSize(6);
      doc.setTextColor(255);
      if ((reprobados / (total || 1)) * chartW > 10) doc.text(`${reprobados}`, bx + 1.5, barY + chartH / 2 + 1.5);
    }
    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.roundedRect(14, barY, chartW, chartH, 1, 1, "S");
    doc.setLineWidth(0.1);

    // Legend inline
    const legY = barY + chartH + 4;
    let lx = 14;
    doc.setFontSize(6);
    doc.setTextColor(100);
    if (aprobados > 0) {
      doc.setFillColor(16, 185, 129); doc.rect(lx, legY, 2.5, 2.5, "F");
      doc.text(`Aprob:${aprobados}`, lx + 4, legY + 2);
      lx += 28;
    }
    if (condicionados > 0) {
      doc.setFillColor(245, 158, 11); doc.rect(lx, legY, 2.5, 2.5, "F");
      doc.text(`Cond:${condicionados}`, lx + 4, legY + 2);
      lx += 28;
    }
    if (reprobados > 0) {
      doc.setFillColor(239, 68, 68); doc.rect(lx, legY, 2.5, 2.5, "F");
      doc.text(`Reprob:${reprobados}`, lx + 4, legY + 2);
    }

    // Percentage bar label (right-aligned)
    doc.setFontSize(6);
    doc.setTextColor(140);
    const pctA = total > 0 ? ((aprobados / total) * 100).toFixed(0) : "0";
    const pctC = total > 0 ? ((condicionados / total) * 100).toFixed(0) : "0";
    const pctR = total > 0 ? ((reprobados / total) * 100).toFixed(0) : "0";
    doc.text(`${pctA}% | ${pctC}% | ${pctR}%`, pageWidth - 45, legY + 2);

    chartY = legY + 9;
  }

  // Clean up: remove the duplicate last page only if it's truly blank
  const finalTotalPages = pdfDoc.internal.getNumberOfPages();
  if (finalTotalPages > 1 && finalTotalPages > totalPagesBefore) {
    // The summary chart created a new page - that's fine
    // But we might have an extra blank page before it
    // Check the page before the summary
    const pageBeforeSummary = totalPagesBefore;
    if (pageBeforeSummary > 1) {
      // Check if the page before the summary page has content
      // We can't easily check, so we skip deletion
    }
  }

  doc.save(`calificaciones_completas_T${data.trimestre}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

async function generarExcel(data: ApiResponse) {
  const XLSX = await import("xlsx");

  const gradosOrdenados = [...(data.grados || [])].sort((a, b) => a.numero - b.numero);
  const wb = XLSX.utils.book_new();

  for (const grado of gradosOrdenados) {
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
      const numEX = (config?.tieneExamen ? (config?.numExamenes ?? 1) : 0);
      const tieneExamen = config?.tieneExamen ?? true;

      for (let i = 1; i <= numAC; i++) {
        headers.push(`${materia.nombre} AC${i}`);
      }
      if (numAI > 0) headers.push(`${materia.nombre} Prom AC`);
      for (let i = 1; i <= numAI; i++) {
        headers.push(`${materia.nombre} AI${i}`);
      }
      headers.push(`${materia.nombre} Prom AI`);
      if (tieneExamen) {
        for (let i = 1; i <= numEX; i++) {
          headers.push(`${materia.nombre} EX${i}`);
        }
        headers.push(`${materia.nombre} Prom EX`);
      }
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
        const numEX = (config?.tieneExamen ? (config?.numExamenes ?? 1) : 0);
        const tieneExamen = config?.tieneExamen ?? true;

        const pctAC_x = (config?.porcentajeAC ?? 35) / 100;
        const pctAI_x = (config?.porcentajeAI ?? 35) / 100;
        const pctEx_x = (config?.porcentajeExamen ?? 30) / 100;
        for (let i = 0; i < numAC; i++) {
          row.push(calif?.actividadesCotidianas[i] ?? "");
        }
        row.push(calif?.calificacionAC != null ? +(calif.calificacionAC * pctAC_x).toFixed(2) : "");
        for (let i = 0; i < numAI; i++) {
          row.push(calif?.actividadesIntegradoras[i] ?? "");
        }
        row.push(calif?.calificacionAI != null ? +(calif.calificacionAI * pctAI_x).toFixed(2) : "");
        if (tieneExamen) {
          for (let i = 0; i < numEX; i++) {
            row.push((calif?.actividadesExamen ?? [])[i] ?? "");
          }
          row.push(calif?.examenTrimestral != null ? +(calif.examenTrimestral * pctEx_x).toFixed(2) : "");
        }
        row.push(calif?.promedioFinal != null ? +(calif.promedioFinal).toFixed(2) : "");
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
    h1 { font-size: 16pt; text-align: center; color: #1d624a; margin-bottom: 2px; }
    h2 { font-size: 12pt; text-align: center; color: #333; margin-top: 0; font-weight: normal; }
    .subtitle { text-align: center; font-size: 9pt; color: #666; margin-bottom: 15px; }
    .grado-title { font-size: 13pt; font-weight: bold; color: #1d624a; margin-top: 20px; margin-bottom: 5px; border-bottom: 2px solid #1d624a; padding-bottom: 3px; }
    .materia-title { font-size: 11pt; font-weight: bold; margin-top: 12px; margin-bottom: 4px; color: #444; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 8pt; }
    th { background-color: #1d624a; color: white; padding: 4px 3px; text-align: center; font-weight: bold; }
    td { padding: 3px; border: 1px solid #ccc; text-align: center; }
    td:first-child { text-align: center; font-weight: bold; width: 25px; }
    td:nth-child(2) { text-align: left; }
    tr:nth-child(even) { background-color: #f0fdfa; }
    .footer { text-align: center; font-size: 8pt; color: #999; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 5px; }
    .chart-section { margin-top: 25px; }
    .chart-grado { margin-bottom: 18px; }
    .chart-title { font-size: 13pt; font-weight: bold; color: #1d624a; margin-bottom: 10px; border-bottom: 2px solid #1d624a; padding-bottom: 3px; }
    .chart-grado-label { font-size: 10pt; font-weight: bold; color: #444; margin-bottom: 4px; }
    .chart-bar-container { width: 100%; height: 18px; border-radius: 4px; overflow: hidden; display: flex; border: 1px solid #bbb; }
    .chart-segment { height: 100%; display: inline-block; font-size: 7pt; color: #fff; text-align: center; line-height: 18px; font-weight: bold; }
    .chart-legend { margin-top: 4px; font-size: 8pt; color: #555; }
    .chart-legend-item { display: inline-block; margin-right: 18px; }
    .legend-square { display: inline-block; width: 9px; height: 9px; margin-right: 3px; vertical-align: middle; }
    .chart-pct { font-size: 7.5pt; color: #888; text-align: right; margin-top: 2px; }
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
      const numEX = (config?.tieneExamen ? (config?.numExamenes ?? 1) : 0);
      const tieneExamen = config?.tieneExamen ?? true;

      html += `<table><thead><tr><th>N°</th><th>Estudiante</th>`;
      for (let i = 1; i <= numAC; i++) html += `<th>AC${i}</th>`;
      html += `<th>Prom AC</th>`;
      for (let i = 1; i <= numAI; i++) html += `<th>AI${i}</th>`;
      html += `<th>Prom AI</th>`;
      if (tieneExamen) {
        for (let i = 1; i <= numEX; i++) html += `<th>EX${i}</th>`;
        html += `<th>Prom EX</th>`;
      }
      html += `<th>Prom Final</th></tr></thead><tbody>`;

      const estudiantes = grado.estudiantes || [];
      const califMap = new Map(califsMateria.map((c) => [c.estudianteId, c]));

      const pctAC_w = (config?.porcentajeAC ?? 35) / 100;
      const pctAI_w = (config?.porcentajeAI ?? 35) / 100;
      const pctEx_w = (config?.porcentajeExamen ?? 30) / 100;
      for (const est of estudiantes) {
        const calif = califMap.get(est.id);
        html += `<tr><td>${est.numero}</td><td>${escHtml(est.nombre)}</td>`;
        for (let i = 0; i < numAC; i++) {
          html += `<td>${formatValor(calif?.actividadesCotidianas[i] ?? null)}</td>`;
        }
        html += `<td>${calif?.calificacionAC != null ? (calif.calificacionAC * pctAC_w).toFixed(2) : ""}</td>`;
        for (let i = 0; i < numAI; i++) {
          html += `<td>${formatValor(calif?.actividadesIntegradoras[i] ?? null)}</td>`;
        }
        html += `<td>${calif?.calificacionAI != null ? (calif.calificacionAI * pctAI_w).toFixed(2) : ""}</td>`;
        if (tieneExamen) {
          for (let i = 0; i < numEX; i++) {
            html += `<td>${formatValor((calif?.actividadesExamen ?? [])[i] ?? null)}</td>`;
          }
          html += `<td>${calif?.examenTrimestral != null ? (calif.examenTrimestral * pctEx_w).toFixed(2) : ""}</td>`;
        }
        html += `<td><strong>${calif?.promedioFinal != null ? calif.promedioFinal.toFixed(2) : ""}</strong></td>`;
        html += `</tr>`;
      }

      html += `</tbody></table>`;
    }
  }

  // --- Resumen General por Grado (bar charts) ---
  html += `<div class="chart-section"><div class="chart-title">Resumen General por Grado</div>`;
  for (const grado of gradosOrdenados) {
    const califsGrado = (data.datos || []).filter(c => c.gradoId === grado.id);
    const aprobados = califsGrado.filter(c => c.promedioFinal !== null && c.promedioFinal >= 6.5).length;
    const condicionados = califsGrado.filter(c => c.promedioFinal !== null && c.promedioFinal >= 4.5 && c.promedioFinal < 6.5).length;
    const reprobados = califsGrado.filter(c => c.promedioFinal !== null && c.promedioFinal < 4.5).length;
    const total = aprobados + condicionados + reprobados;
    if (total === 0) continue;

    const pctA = ((aprobados / total) * 100).toFixed(0);
    const pctC = ((condicionados / total) * 100).toFixed(0);
    const pctR = ((reprobados / total) * 100).toFixed(0);

    html += `<div class="chart-grado">`;
    html += `<div class="chart-grado-label">${getGradoLabel(grado.numero, grado.seccion)}</div>`;
    html += `<div class="chart-bar-container">`;
    if (aprobados > 0) html += `<div class="chart-segment" style="width:${pctA}%;background:#1d624a;">${aprobados}</div>`;
    if (condicionados > 0) html += `<div class="chart-segment" style="width:${pctC}%;background:#846c3e;">${condicionados}</div>`;
    if (reprobados > 0) html += `<div class="chart-segment" style="width:${pctR}%;background:#704040;">${reprobados}</div>`;
    html += `</div>`;
    html += `<div class="chart-legend">`;
    if (aprobados > 0) html += `<span class="chart-legend-item"><span class="legend-square" style="background:#1d624a;"></span>Aprobados: ${aprobados}</span>`;
    if (condicionados > 0) html += `<span class="chart-legend-item"><span class="legend-square" style="background:#846c3e;"></span>Condicionados: ${condicionados}</span>`;
    if (reprobados > 0) html += `<span class="chart-legend-item"><span class="legend-square" style="background:#704040;"></span>Reprobados: ${reprobados}</span>`;
    html += `</div>`;
    html += `<div class="chart-pct">${pctA}% Aprobados | ${pctC}% Condicionados | ${pctR}% Reprobados</div>`;
    html += `</div>`;
  }
  html += `</div>`;

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
