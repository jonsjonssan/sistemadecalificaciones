"use client";

import { useState } from "react";
import { Download, Loader2, FileText, ChevronDown } from "lucide-react";
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
import { CICLOS } from "@/lib/ciclos";
import { escapeHtml } from "@/lib/utils/index";

interface Grado {
  id: string;
  numero: number;
  seccion: string;
  año?: number;
  docente?: { nombre: string };
}

interface DescargaBoletasPorCicloProps {
  grados: Grado[];
  darkMode: boolean;
  configuracion?: {
    nombreDirectora?: string;
    umbralCondicionado?: number;
    umbralAprobado?: number;
  };
  paperSize?: "letter" | "a4";
}

type GradoData = {
  grado: Grado;
  estudiantes: { id: string; nombre: string; numero: number; email?: string }[];
  materias: { id: string; nombre: string }[];
  calificaciones: {
    estudianteId: string;
    materiaId: string;
    trimestre: number;
    promedioFinal: number | null;
    calificacionAC: number | null;
    calificacionAI: number | null;
    examenTrimestral: number | null;
    recuperacion: number | null;
  }[];
  asistencia: {
    id: string;
    asistencias: number;
    ausencias: number;
    tardanzas: number;
    justificadas: number;
    total: number;
  }[];
};

export function DescargaBoletasPorCiclo({ grados, darkMode, configuracion, paperSize = "letter" }: DescargaBoletasPorCicloProps) {
  const [trimestre, setTrimestre] = useState("1");
  const [exportando, setExportando] = useState(false);

  const uc = configuracion?.umbralCondicionado ?? 4.5;
  const ua = configuracion?.umbralAprobado ?? 6.5;
  const pctAC = 0.35;
  const pctAI = 0.35;
  const pctEx = 0.30;

  const paperStyles = paperSize === "a4"
    ? { pageAt: `@page { size: a4; margin: 10mm; }`, fontSize: "10pt" }
    : { pageAt: `@page { size: letter; margin: 15mm; }`, fontSize: "11pt" };

  const fetchGradoData = async (gradoId: string): Promise<GradoData | null> => {
    try {
      const grado = grados.find(g => g.id === gradoId);
      const añoParam = grado?.año ? `&año=${grado.año}` : '';
      const [estRes, matRes, calRes, asistRes] = await Promise.all([
        fetch(`/api/estudiantes?gradoId=${gradoId}&_=${Date.now()}`, { cache: "no-store", credentials: "include" }),
        fetch(`/api/materias?gradoId=${gradoId}&_=${Date.now()}`, { cache: "no-store", credentials: "include" }),
        fetch(`/api/calificaciones?gradoId=${gradoId}&_=${Date.now()}`, { cache: "no-store", credentials: "include" }),
        fetch(`/api/asistencia/resumen?gradoId=${gradoId}&trimestre=${trimestre}${añoParam}`, { credentials: "include" }),
      ]);

      if (!estRes.ok || !matRes.ok || !calRes.ok) return null;

      const [estData, matData, calData, asistData] = await Promise.all([
        estRes.json(),
        matRes.json(),
        calRes.json(),
        asistRes.ok ? asistRes.json() : [],
      ]);

      if (!grado) return null;

      return {
        grado,
        estudiantes: estData,
        materias: matData,
        calificaciones: Array.isArray(calData) ? calData : [],
        asistencia: Array.isArray(asistData) ? asistData : [],
      };
    } catch {
      return null;
    }
  };

  const getTrimestreRomano = (t: number) => {
    const romanos = ['I', 'II', 'III'];
    return romanos[t - 1] || t.toString();
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'REPROBADO': return '#704040';
      case 'CONDICIONADO': return '#846c3e';
      case 'APROBADO': return '#1d624a';
      default: return '#666';
    }
  };

  const entero = (val: number | null | undefined): string => val != null ? Math.round(val).toString() : '-';

  const generarBoletasHTML = async (gradosIds: string[], titulo: string) => {
    setExportando(true);
    try {
      const allData: GradoData[] = [];
      for (const gradoId of gradosIds) {
        const data = await fetchGradoData(gradoId);
        if (data) allData.push(data);
      }

      if (allData.length === 0) {
        alert("No se pudieron obtener datos de los grados seleccionados.");
        return;
      }

      const año = allData[0]?.grado.año || new Date().getFullYear();
      const fechaImpresion = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });
      const nombreDirectora = escapeHtml(configuracion?.nombreDirectora || '_______________________________');
      const trim = parseInt(trimestre);

      let allBoletasHtml = '';

      for (const data of allData) {
        const { grado, estudiantes, materias, calificaciones, asistencia } = data;
        const docenteOrientador = escapeHtml(grado.docente?.nombre || '_______________________________');

        const califsTrimestre = calificaciones.filter(c => c.trimestre === trim);

        for (const est of estudiantes) {
          const califsEst = califsTrimestre.filter(c => c.estudianteId === est.id);
          const promedios = materias.map(m => {
            const cal = califsEst.find(c => c.materiaId === m.id);
            return cal?.promedioFinal ?? null;
          }).filter((x): x is number => x !== null && x !== undefined && !isNaN(x));
          const prom = promedios.length ? promedios.reduce((a, b) => a + b, 0) / promedios.length : null;
          const estadoFinal = prom === null ? 'PENDIENTE' : prom < uc ? 'REPROBADO' : prom < ua ? 'CONDICIONADO' : 'APROBADO';

          const tablaAsignaturas = materias.map(m => {
            const c = califsEst.find(x => x.materiaId === m.id);
            const promFinal = c?.promedioFinal !== null && c?.promedioFinal !== undefined ? c.promedioFinal : null;
            const recupVal = c?.recuperacion !== null && c?.recuperacion !== undefined ? c.recuperacion.toFixed(2) : '-';
            const notaFinal = promFinal !== null ? entero(promFinal) : '-';
            const estadoLabel = promFinal !== null
              ? (promFinal < uc ? 'REPROBADO' : promFinal < ua ? 'CONDICIONADO' : 'APROBADO')
              : '-';
            return `<tr>
              <td style="text-align:left;padding:6px 8px">${escapeHtml(m.nombre)}</td>
              <td>${c?.calificacionAC != null ? (c.calificacionAC * pctAC).toFixed(2) : '-'}</td>
              <td>${c?.calificacionAI != null ? (c.calificacionAI * pctAI).toFixed(2) : '-'}</td>
              <td>${c?.examenTrimestral != null ? (c.examenTrimestral * pctEx).toFixed(2) : '-'}</td>
              <td>${recupVal}</td>
              <td style="font-weight:bold">${notaFinal}</td>
              <td style="font-weight:bold;color:${getEstadoColor(estadoLabel)}">${estadoLabel}</td>
            </tr>`;
          }).join('');

          const asist = asistencia.find(r => r.id === est.id) || { asistencias: 0, ausencias: 0, tardanzas: 0, justificadas: 0, total: 0 };

          const bloqueAsistencia = `
          <div class="seccion-asistencia">
            <div class="seccion-asistencia-header">
              <span>RESUMEN DE ASISTENCIA</span>
              <span>Período: Trimestre ${getTrimestreRomano(trim)}</span>
            </div>
            <div class="asistencia-grid">
              <div class="asistencia-item">
                <div class="n asistencia-asist">${asist.asistencias}</div>
                <div class="l">Asistencias</div>
              </div>
              <div class="asistencia-item">
                <div class="n asistencia-aus">${asist.ausencias}</div>
                <div class="l">Inasistencias</div>
              </div>
              <div class="asistencia-item">
                <div class="n asistencia-tard">${asist.tardanzas}</div>
                <div class="l">Tardanzas</div>
              </div>
              <div class="asistencia-item">
                <div class="n">${asist.justificadas || 0}</div>
                <div class="l">Justificadas</div>
              </div>
              <div class="asistencia-item">
                <div class="n">${asist.total}</div>
                <div class="l">Total Días</div>
              </div>
            </div>
          </div>`;

          allBoletasHtml += `
          <div class="boleta" style="page-break-after: always;">
            <div class="header">
              <img src="${window.location.origin}/0.png" alt="Logo" class="logo" onerror="this.style.display='none'">
              <div class="header-text">
                <h1>Centro Escolar Católico San José de la Montaña</h1>
                <h2>Centro Educativo Católico</h2>
                <p class="codigo">Código: 88125 | Departamento: 06-San Salvador | Municipio: 0614 San Salvador</p>
              </div>
              <img src="${window.location.origin}/0.png" alt="Logo" class="logo" onerror="this.style.display='none'">
            </div>

            <div class="titulo-boleta">
              <h3>Boleta de Calificaciones - Trimestre ${getTrimestreRomano(trim)}</h3>
            </div>

            <div class="info-estudiante">
              <div>
                <p><span class="label">Estudiante:</span> ${escapeHtml(est.nombre)}</p>
                ${est.email ? `<p><span class="label">Correo:</span> ${escapeHtml(est.email)}</p>` : ''}
                <p><span class="label">Grado:</span> ${grado.numero}° Grado "${escapeHtml(grado.seccion || '')}"</p>
              </div>
              <div style="text-align: right;">
                <p><span class="label">Año Lectivo:</span> ${año}</p>
                <p><span class="label">N° de Lista:</span> ${est.numero}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 32%">Asignatura</th>
                  <th style="width: 11%">Prom. A.C.<br><small>(35%)</small></th>
                  <th style="width: 11%">Prom. A.I.<br><small>(35%)</small></th>
                  <th style="width: 11%">Examen<br><small>(30%)</small></th>
                  <th style="width: 10%">Recup.</th>
                  <th style="width: 12%">Promedio<br>Final</th>
                  <th style="width: 13%">Estado</th>
                </tr>
              </thead>
              <tbody>
                ${tablaAsignaturas}
              </tbody>
            </table>

            ${bloqueAsistencia}

            <div class="resumen">
              <div class="resumen-item">
                <div class="valor">${prom !== null && prom !== undefined ? entero(prom) : 'N/A'}</div>
                <div class="etiqueta">Promedio General</div>
              </div>
              <div class="resumen-item ${estadoFinal === 'REPROBADO' ? 'reprobado' : estadoFinal === 'CONDICIONADO' ? 'condicionado' : ''}">
                <div class="valor">${estadoFinal}</div>
                <div class="etiqueta">Estado Final</div>
              </div>
              <div class="resumen-item">
                <div class="valor">${getTrimestreRomano(trim)} Trimestre</div>
                <div class="etiqueta">Período Evaluado</div>
              </div>
            </div>

            <div class="observaciones" style="margin:15px 0;padding:10px;border:1px solid #333;border-radius:4px;min-height:80px;">
              <div style="font-weight:bold;font-size:10pt;margin-bottom:4px;">Observaciones:</div>
              <div style="min-height:60px;font-size:10pt;color:#555;">&nbsp;</div>
            </div>

            <div class="firmas">
              <div class="firma">
                <div class="linea">
                  <p class="nombre">${docenteOrientador}</p>
                  <p class="cargo">Firma del Docente Orientador</p>
                </div>
              </div>
              <div class="firma">
                <div class="linea">
                  <p class="nombre">${nombreDirectora}</p>
                  <p class="cargo">Firma de la Directora</p>
                  <p class="cargo">Centro Escolar Católico San José de la Montaña</p>
                </div>
              </div>
            </div>

            <div class="pie">
              <p>Fecha de impresión: ${fechaImpresion}</p>
              <p>Código: 88125 | Departamento: 06-San Salvador | Municipio: 0614 San Salvador</p>
            </div>
          </div>`;
        }
      }

      const html = `<!DOCTYPE html>
<html>
<head>
  <title>${titulo}</title>
  <style>
    ${paperStyles.pageAt}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; font-size: ${paperStyles.fontSize}; line-height: 1.4; color: #333; }
    .boleta { max-width: 190mm; margin: 0 auto; padding: 5mm; }
    
    .header { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 15px; }
    .logo { width: 100px; height: 100px; object-fit: contain; }
    .header-text { text-align: center; flex: 1; }
    .header-text h1 { font-size: 13pt; font-weight: bold; margin-bottom: 3px; text-transform: uppercase; }
    .header-text h2 { font-size: 10pt; font-weight: normal; margin-bottom: 2px; }
    .header-text .codigo { font-size: 8pt; color: #555; }
    
    .titulo-boleta { text-align: center; background: #f3f4f6; padding: 8px; margin: 15px 0; border: 1px solid #333; }
    .titulo-boleta h3 { font-size: 12pt; text-transform: uppercase; letter-spacing: 1px; }
    
    .info-estudiante { display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px; background: #fafafa; border: 1px solid #ddd; border-radius: 4px; }
    .info-estudiante p { margin: 3px 0; }
    .info-estudiante .label { font-weight: bold; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th, td { border: 1px solid #333; padding: 5px 8px; text-align: center; }
    th { background: #e5e7eb; font-weight: bold; font-size: 9pt; }
    td { font-size: 10pt; }
    
    .resumen { display: flex; justify-content: space-between; margin: 20px 0; padding: 10px; background: #f4f6f2; border: 2px solid #1d624a; border-radius: 4px; }
    .resumen-item { text-align: center; }
    .resumen-item .valor { font-size: 16pt; font-weight: bold; color: #1d624a; }
    .resumen-item.reprobado .valor { color: #704040; }
    .resumen-item.condicionado .valor { color: #846c3e; }
    .resumen-item .etiqueta { font-size: 9pt; color: #666; }
    
    .seccion-asistencia { margin: 15px 0; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
    .seccion-asistencia-header { background: #f8fafc; padding: 6px 10px; border-bottom: 1px solid #ddd; font-weight: bold; font-size: 9pt; display: flex; justify-content: space-between; }
    .asistencia-grid { display: grid; grid-template-columns: repeat(5, 1fr); padding: 10px; text-align: center; }
    .asistencia-item .n { font-size: 12pt; font-weight: bold; }
    .asistencia-item .l { font-size: 8pt; color: #666; text-transform: uppercase; }
    .asistencia-asist { color: #1d624a; }
    .asistencia-aus { color: #704040; }
    .asistencia-tard { color: #846c3e; }
    
    .firmas { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
    .firma { text-align: center; width: 45%; }
    .firma .linea { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; }
    .firma .nombre { font-weight: bold; font-size: 10pt; }
    .firma .cargo { font-size: 8pt; color: #555; }
    
    .pie { margin-top: 30px; text-align: center; font-size: 8pt; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
    .pie p { margin: 2px 0; }
    
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  ${allBoletasHtml}
</body>
</html>`;

      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 500);
      }
    } finally {
      setExportando(false);
    }
  };

  const handleDescargarTodos = () => {
    const gradosIds = grados.filter(g => g.numero >= 2 && g.numero <= 9).map(g => g.id);
    generarBoletasHTML(gradosIds, `Boletas - Todos los Grados (2° a 9°) - Trimestre ${getTrimestreRomano(parseInt(trimestre))}`);
  };

  const handleDescargarCiclo = (cicloGrados: number[], cicloNombre: string) => {
    const gradosIds = grados.filter(g => cicloGrados.includes(g.numero)).map(g => g.id);
    generarBoletasHTML(gradosIds, `Boletas - ${cicloNombre} - Trimestre ${getTrimestreRomano(parseInt(trimestre))}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={trimestre} onValueChange={setTrimestre} disabled={exportando}>
        <SelectTrigger className={`w-[90px] h-8 text-xs ${darkMode ? 'bg-card border-white/30' : ''}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Trimestre I</SelectItem>
          <SelectItem value="2">Trimestre II</SelectItem>
          <SelectItem value="3">Trimestre III</SelectItem>
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={exportando}>
          <Button
            size="sm"
            disabled={exportando}
            className={`h-8 text-xs gap-1 ${exportando ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {exportando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>Boletas por Lote</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Descargar boletas en lote
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDescargarTodos} disabled={exportando} className="gap-2 cursor-pointer">
            <FileText className="h-4 w-4 text-blue-500" />
            <span>Todos los grados (2° a 9°)</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {CICLOS.map(ciclo => (
            <DropdownMenuItem
              key={ciclo.nombre}
              onClick={() => handleDescargarCiclo(ciclo.grados, ciclo.nombre)}
              disabled={exportando}
              className="gap-2 cursor-pointer"
            >
              <FileText className="h-4 w-4 text-primary" />
              <span>{ciclo.nombre} ({ciclo.grados[0]}° a {ciclo.grados[ciclo.grados.length - 1]}°)</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
