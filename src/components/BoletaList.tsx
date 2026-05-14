"use client";

import { useState, useEffect } from "react";
import { Printer, FileText, ChevronUp, ChevronDown, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { escapeHtml } from "@/lib/utils/index";
import type { Estudiante, Asignatura, Grado, Calificacion } from "@/types";
export default function BoletaList({ estudiantes, calificaciones, materias, grado, trimestre, expandedBoleta, setExpandedBoleta, darkMode, configuracion, paperSize, incluirAsistencia = true, mostrarRecuperacion = true, porcentajes, incluirAsistenciaManual = false }: { estudiantes: Estudiante[]; calificaciones: Calificacion[]; materias: Asignatura[]; grado?: Grado; trimestre: number; expandedBoleta: string | null; setExpandedBoleta: (id: string | null) => void; darkMode: boolean; configuracion?: { nombreDirectora?: string; umbralCondicionado?: number; umbralAprobado?: number }; paperSize?: "letter" | "a4"; incluirAsistencia?: boolean; mostrarRecuperacion?: boolean; porcentajes?: { ac: number; ai: number; ex: number }; incluirAsistenciaManual?: boolean; }) {
  const [resumenAsistencia, setResumenAsistencia] = useState<any[]>([]);
  const [todasCalificaciones, setTodasCalificaciones] = useState<Calificacion[]>([]);
  const [resumenAsistenciaAnual, setResumenAsistenciaAnual] = useState<any[]>([]);
  const [recuperacionesAnuales, setRecuperacionesAnuales] = useState<Map<string, number>>(new Map());
  const [loadingAsistencia, setLoadingAsistencia] = useState(true);
  const [loadingAnual, setLoadingAnual] = useState(true);

  const uc = configuracion?.umbralCondicionado ?? 4.5;
  const ua = configuracion?.umbralAprobado ?? 6.5;
  const pctAC = (porcentajes?.ac ?? 35) / 100;
  const pctAI = (porcentajes?.ai ?? 35) / 100;
  const pctEx = (porcentajes?.ex ?? 30) / 100;

  const paperStyles = paperSize === "a4"
    ? { pageAt: `@page { size: a4; margin: 10mm; }`, fontSize: "10pt" }
    : { pageAt: `@page { size: letter; margin: 15mm; }`, fontSize: "11pt" };

  useEffect(() => {
    const fetchAsistencia = async () => {
      if (!grado?.id) return;
      setLoadingAsistencia(true);
      try {
        const res = await fetch(`/api/asistencia/resumen?gradoId=${grado.id}&trimestre=${trimestre}`, { credentials: "include" });
        if (res.ok) setResumenAsistencia(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoadingAsistencia(false); }
    };
    fetchAsistencia();
  }, [grado?.id, trimestre]);

  useEffect(() => {
    const fetchDatosAnuales = async () => {
      if (!grado?.id) return;
      setLoadingAnual(true);
      try {
        const resCal = await fetch(`/api/calificaciones?gradoId=${grado.id}&boleta=true`, { credentials: "include" });
        if (resCal.ok) setTodasCalificaciones(await resCal.json());

        const resAsist = await fetch(`/api/asistencia/resumen?gradoId=${grado.id}&anual=true`, { credentials: "include" });
        if (resAsist.ok) setResumenAsistenciaAnual(await resAsist.json());

        const resRec = await fetch(`/api/recuperacion-anual?gradoId=${grado.id}&año=${grado.año || new Date().getFullYear()}`, { credentials: "include" });
        if (resRec.ok) {
          const data: Array<{ estudianteId: string; materiaId: string; nota: number }> = await resRec.json();
          const map = new Map<string, number>();
          for (const r of data) map.set(`${r.estudianteId}-${r.materiaId}`, r.nota);
          setRecuperacionesAnuales(map);
        }
      } catch (e) { console.error(e); }
      finally { setLoadingAnual(false); }
    };
    fetchDatosAnuales();
  }, [grado?.id, grado?.año]);

  const getCalifs = (id: string) => todasCalificaciones.length > 0
    ? todasCalificaciones.filter(c => c.estudianteId === id && c.trimestre === trimestre)
    : calificaciones.filter(c => c.estudianteId === id && c.trimestre === trimestre);
  const calcProm = (c: Calificacion[]) => {
    const notas = materias.map(m => {
      const cal = c.find(x => x.materiaId === m.id);
      if (!cal || cal.promedioFinal === null || cal.promedioFinal === undefined) return null;
      return cal.promedioFinal;
    }).filter((x): x is number => x !== null && x !== undefined && !isNaN(x));
    return notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
  };

  const getTrimestreRomano = (t: number) => {
    const romanos = ['I', 'II', 'III'];
    return romanos[t - 1] || t.toString();
  };

  const getEstadoFinal = (promedio: number | null) => {
    if (promedio === null) return 'PENDIENTE';
    if (promedio < uc) return 'REPROBADO';
    if (promedio < ua) return 'CONDICIONADO';
    return 'APROBADO';
  };

  const entero = (val: number | null | undefined): string => val != null ? Math.round(val).toString() : '-';

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'REPROBADO': return '#dc2626';
      case 'CONDICIONADO': return '#d97706';
      case 'APROBADO': return '#059669';
      default: return '#666';
    }
  };

  const getAsistInfo = (id: string) => resumenAsistencia.find(r => r.id === id) || { asistencias: 0, ausencias: 0, tardanzas: 0, total: 0 };

  const imprimir = async (id: string) => {
    const est = estudiantes.find(e => e.id === id);
    if (!est) return;
    const califs = getCalifs(id);

    const prom = calcProm(califs);
    const estadoFinal = getEstadoFinal(prom);
    const año = grado?.año || new Date().getFullYear();
    const fechaImpresion = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });

    // Obtener nombre del docente orientador
    const docenteOrientador = escapeHtml(grado?.docente?.nombre || '_______________________________');
    const nombreDirectora = escapeHtml(configuracion?.nombreDirectora || '_______________________________');

    // Crear tabla de asignaturas
    let tablaAsignaturas = materias.map(m => {
      const c = califs.find(x => x.materiaId === m.id);
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
        ${mostrarRecuperacion ? `<td>${recupVal}</td>` : ''}
        <td style="font-weight:bold">${notaFinal}</td>
        <td style="font-weight:bold;color:${getEstadoColor(estadoLabel)}">${estadoLabel}</td>
      </tr>`;
    }).join('');

    const asist = getAsistInfo(id);

    const bloqueAsistencia = incluirAsistencia ? `
    <div class="seccion-asistencia">
      <div class="seccion-asistencia-header">
        <span>RESUMEN DE ASISTENCIA</span>
        <span>Período: Trimestre ${getTrimestreRomano(trimestre)}</span>
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
    </div>` : '';

    const bloqueAsistenciaManual = incluirAsistenciaManual ? `
    <div class="seccion-asistencia" style="margin-top:15px;page-break-inside:avoid;">
      <div class="seccion-asistencia-header" style="background:#0d9488;color:#fff;padding:6px 10px;font-weight:bold;font-size:9pt;display:flex;justify-content:space-between;">
        <span>REGISTRO DE ASISTENCIA</span>
        <span style="font-weight:normal;font-size:8pt;">para llenar manualmente</span>
      </div>
      <div class="asistencia-grid" style="grid-template-columns:repeat(5,1fr);padding:8px;">
        <div class="asistencia-item" style="text-align:center;">
          <div class="n" style="font-size:14pt;font-weight:bold;border-bottom:2px solid #333;min-height:28px;padding:4px;">&nbsp;</div>
          <div class="l" style="font-size:8pt;color:#555;text-transform:uppercase;margin-top:2px;">Asistencias</div>
        </div>
        <div class="asistencia-item" style="text-align:center;">
          <div class="n" style="font-size:14pt;font-weight:bold;border-bottom:2px solid #333;min-height:28px;padding:4px;">&nbsp;</div>
          <div class="l" style="font-size:8pt;color:#555;text-transform:uppercase;margin-top:2px;">Inasistencias</div>
        </div>
        <div class="asistencia-item" style="text-align:center;">
          <div class="n" style="font-size:14pt;font-weight:bold;border-bottom:2px solid #333;min-height:28px;padding:4px;">&nbsp;</div>
          <div class="l" style="font-size:8pt;color:#555;text-transform:uppercase;margin-top:2px;">Tardanzas</div>
        </div>
        <div class="asistencia-item" style="text-align:center;">
          <div class="n" style="font-size:14pt;font-weight:bold;border-bottom:2px solid #333;min-height:28px;padding:4px;">&nbsp;</div>
          <div class="l" style="font-size:8pt;color:#555;text-transform:uppercase;margin-top:2px;">Justificadas</div>
        </div>
        <div class="asistencia-item" style="text-align:center;">
          <div class="n" style="font-size:14pt;font-weight:bold;border-bottom:2px solid #333;min-height:28px;padding:4px;">&nbsp;</div>
          <div class="l" style="font-size:8pt;color:#555;text-transform:uppercase;margin-top:2px;">Total Días</div>
        </div>
      </div>
    </div>` : '';

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Boleta de Calificaciones - ${escapeHtml(est.nombre)}</title>
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
    
    .resumen { display: flex; justify-content: space-between; margin: 20px 0; padding: 10px; background: #f0fdf4; border: 2px solid #059669; border-radius: 4px; }
    .resumen-item { text-align: center; }
    .resumen-item .valor { font-size: 16pt; font-weight: bold; color: #059669; }
    .resumen-item.reprobado .valor { color: #dc2626; }
    .resumen-item.condicionado .valor { color: #d97706; }
    .resumen-item .etiqueta { font-size: 9pt; color: #666; }
    
    .seccion-asistencia { margin: 15px 0; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
    .seccion-asistencia-header { background: #f8fafc; padding: 6px 10px; border-bottom: 1px solid #ddd; font-weight: bold; font-size: 9pt; display: flex; justify-content: space-between; }
    .asistencia-grid { display: grid; grid-template-columns: repeat(4, 1fr); padding: 10px; text-align: center; }
    .asistencia-item .n { font-size: 12pt; font-weight: bold; }
    .asistencia-item .l { font-size: 8pt; color: #666; text-transform: uppercase; }
    .asistencia-asist { color: #059669; }
    .asistencia-aus { color: #dc2626; }
    .asistencia-tard { color: #d97706; }
    
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
  <div class="boleta">
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
      <h3>Boleta de Calificaciones - Trimestre ${getTrimestreRomano(trimestre)}</h3>
    </div>

    <div class="info-estudiante">
      <div>
        <p><span class="label">Estudiante:</span> ${escapeHtml(est.nombre)}</p>
        ${est.email ? `<p><span class="label">Correo:</span> ${escapeHtml(est.email)}</p>` : ''}
        <p><span class="label">Grado:</span> ${grado?.numero}° Grado "${grado?.seccion}"</p>
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
          ${mostrarRecuperacion ? '<th style="width: 10%">Recup.</th>' : ''}
          <th style="width: 12%">Promedio<br>Final</th>
          <th style="width: 13%">Estado</th>
        </tr>
      </thead>
      <tbody>
        ${tablaAsignaturas}
      </tbody>
    </table>

    ${bloqueAsistencia}

    ${bloqueAsistenciaManual}

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
        <div class="valor">${getTrimestreRomano(trimestre)} Trimestre</div>
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

  const imprimirTodas = async () => {
    if (!estudiantes.length) return;

    let allBoletasHtml = '';
    const año = grado?.año || new Date().getFullYear();
    const fechaImpresion = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });

    // Obtener nombre del docente orientador
    const docenteOrientador = escapeHtml(grado?.docente?.nombre || '_______________________________');
    const nombreDirectora = escapeHtml(configuracion?.nombreDirectora || '_______________________________');

    for (const est of estudiantes) {
      const califs = getCalifs(est.id);
      const prom = calcProm(califs);
      const estadoFinal = getEstadoFinal(prom);
      const asist = getAsistInfo(est.id);

      let tablaAsignaturas = materias.map(m => {
        const c = califs.find(x => x.materiaId === m.id);
        const promFinal = c?.promedioFinal !== null && c?.promedioFinal !== undefined ? c.promedioFinal : null;
        const recupVal = c?.recuperacion !== null && c?.recuperacion !== undefined ? c.recuperacion.toFixed(2) : '-';
        const notaFinal = promFinal !== null ? entero(promFinal) : '-';
        const estadoLabel = promFinal !== null
          ? (promFinal < uc ? 'REPROBADO' : promFinal < ua ? 'CONDICIONADO' : 'APROBADO')
          : '-';
        return "<tr>" +
          "<td style=\"text-align:left;padding:6px 8px\">" + escapeHtml(m.nombre) + "</td>" +
          "<td>" + (c?.calificacionAC != null ? (c.calificacionAC * pctAC).toFixed(2) : '-') + "</td>" +
          "<td>" + (c?.calificacionAI != null ? (c.calificacionAI * pctAI).toFixed(2) : '-') + "</td>" +
          "<td>" + (c?.examenTrimestral != null ? (c.examenTrimestral * pctEx).toFixed(2) : '-') + "</td>" +
          (mostrarRecuperacion ? "<td>" + recupVal + "</td>" : "") +
          "<td style=\"font-weight:bold\">" + notaFinal + "</td>" +
          "<td style=\"font-weight:bold;color:" + getEstadoColor(estadoLabel) + "\">" + estadoLabel + "</td>" +
          "</tr>";
      }).join('');

      const bloqueAsistenciaTodas = incluirAsistencia ? `
        <div class="seccion-asistencia">
          <div class="seccion-asistencia-header">
            <span>RESUMEN DE ASISTENCIA</span>
            <span>Período: Trimestre ${getTrimestreRomano(trimestre)}</span>
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
        </div>` : '';

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
          <h3>Boleta de Calificaciones - Trimestre ${getTrimestreRomano(trimestre)}</h3>
        </div>

        <div class="info-estudiante">
          <div>
        <p><span class="label">Estudiante:</span> ${escapeHtml(est.nombre)}</p>
        ${est.email ? `<p><span class="label">Correo:</span> ${escapeHtml(est.email)}</p>` : ''}
        <p><span class="label">Grado:</span> ${grado?.numero}° Grado "${escapeHtml(grado?.seccion || "")}"</p>
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
              ${mostrarRecuperacion ? '<th style="width: 10%">Recup.</th>' : ''}
              <th style="width: 12%">Promedio<br>Final</th>
              <th style="width: 13%">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${tablaAsignaturas}
          </tbody>
        </table>

        ${bloqueAsistenciaTodas}

        ${incluirAsistenciaManual ? `
        <div class="seccion-asistencia" style="margin-top:15px;page-break-inside:avoid;">
          <div class="seccion-asistencia-header" style="background:#0d9488;color:#fff;padding:6px 10px;font-weight:bold;font-size:9pt;display:flex;justify-content:space-between;">
            <span>REGISTRO DE ASISTENCIA</span>
            <span style="font-weight:normal;font-size:8pt;">para llenar manualmente</span>
          </div>
          <div class="asistencia-grid" style="grid-template-columns:repeat(5,1fr);padding:8px;">
            <div class="asistencia-item" style="text-align:center;">
              <div class="n" style="font-size:14pt;font-weight:bold;border-bottom:2px solid #333;min-height:28px;padding:4px;">&nbsp;</div>
              <div class="l" style="font-size:8pt;color:#555;text-transform:uppercase;margin-top:2px;">Asistencias</div>
            </div>
            <div class="asistencia-item" style="text-align:center;">
              <div class="n" style="font-size:14pt;font-weight:bold;border-bottom:2px solid #333;min-height:28px;padding:4px;">&nbsp;</div>
              <div class="l" style="font-size:8pt;color:#555;text-transform:uppercase;margin-top:2px;">Inasistencias</div>
            </div>
            <div class="asistencia-item" style="text-align:center;">
              <div class="n" style="font-size:14pt;font-weight:bold;border-bottom:2px solid #333;min-height:28px;padding:4px;">&nbsp;</div>
              <div class="l" style="font-size:8pt;color:#555;text-transform:uppercase;margin-top:2px;">Tardanzas</div>
            </div>
            <div class="asistencia-item" style="text-align:center;">
              <div class="n" style="font-size:14pt;font-weight:bold;border-bottom:2px solid #333;min-height:28px;padding:4px;">&nbsp;</div>
              <div class="l" style="font-size:8pt;color:#555;text-transform:uppercase;margin-top:2px;">Justificadas</div>
            </div>
            <div class="asistencia-item" style="text-align:center;">
              <div class="n" style="font-size:14pt;font-weight:bold;border-bottom:2px solid #333;min-height:28px;padding:4px;">&nbsp;</div>
              <div class="l" style="font-size:8pt;color:#555;text-transform:uppercase;margin-top:2px;">Total Días</div>
            </div>
          </div>
        </div>` : ''}

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
            <div class="valor">${getTrimestreRomano(trimestre)} Trimestre</div>
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

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Boletas de Calificaciones - ${grado?.numero}° ${grado?.seccion}</title>
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
    
    .resumen { display: flex; justify-content: space-between; margin: 20px 0; padding: 10px; background: #f0fdf4; border: 2px solid #059669; border-radius: 4px; }
    .resumen-item { text-align: center; }
    .resumen-item .valor { font-size: 16pt; font-weight: bold; color: #059669; }
    .resumen-item.reprobado .valor { color: #dc2626; }
    .resumen-item .etiqueta { font-size: 9pt; color: #666; }
    
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
  };

  const imprimirAnual = async (id: string) => {
    const est = estudiantes.find(e => e.id === id);
    if (!est) return;

    const año = grado?.año || new Date().getFullYear();
    const fechaImpresion = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });
    const asistAnual = resumenAsistenciaAnual.find(r => r.id === id) || { asistencias: 0, ausencias: 0, tardanzas: 0, total: 0 };

    // Obtener nombre del docente orientador
    const docenteOrientador = escapeHtml(grado?.docente?.nombre || '_______________________________');
    const nombreDirectora = escapeHtml(configuracion?.nombreDirectora || '_______________________________');

    // Filtrar calificaciones de este estudiante para todo el año
    const califsEst = todasCalificaciones.filter(c => c.estudianteId === id);

    let tablaAsignaturas = materias.map(m => {
      const c1 = califsEst.find(c => c.materiaId === m.id && c.trimestre === 1);
      const c2 = califsEst.find(c => c.materiaId === m.id && c.trimestre === 2);
      const c3 = califsEst.find(c => c.materiaId === m.id && c.trimestre === 3);

      const n1 = c1?.promedioFinal;
      const n2 = c2?.promedioFinal;
      const n3 = c3?.promedioFinal;

      const notasValidas = [n1, n2, n3].filter((n): n is number => n !== null && n !== undefined);
      const promAnual = notasValidas.length ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length : null;
      const estado = promAnual !== null ? (promAnual < uc ? 'REPROBADO' : promAnual < ua ? 'CONDICIONADO' : 'APROBADO') : '-';

      return `<tr>
        <td style="text-align:left;padding:6px 8px">${escapeHtml(m.nombre)}</td>
        <td>${n1 != null ? n1.toFixed(2) : '-'}</td>
        <td>${n2 != null ? n2.toFixed(2) : '-'}</td>
        <td>${n3 != null ? n3.toFixed(2) : '-'}</td>
        <td style="font-weight:bold">${promAnual !== null ? promAnual.toFixed(2) : '-'}</td>
        <td style="font-weight:bold;color:${getEstadoColor(estado)}">${estado}</td>
      </tr>`;
    }).join('');

    const promGralAnual = () => {
      const notasFinales = materias.map(m => {
        const califs = califsEst.filter(c => c.materiaId === m.id);
        const sums = califs.map(c => c.promedioFinal).filter((n): n is number => n !== null && n !== undefined);
        return sums.length ? sums.reduce((a, b) => a + b, 0) / sums.length : null;
      }).filter((n): n is number => n !== null);
      return notasFinales.length ? notasFinales.reduce((a, b) => a + b, 0) / notasFinales.length : null;
    };

    const pFinal = promGralAnual();

    const bloqueAsistenciaAnual = incluirAsistencia ? `
    <div class="seccion-asistencia">
      <div class="seccion-asistencia-header">RESUMEN DE ASISTENCIA ANUAL (TOTAL ACUMULADO)</div>
      <div class="asistencia-grid">
        <div class="asistencia-item"><div class="n" style="color:#059669">${asistAnual.asistencias}</div><div class="l">Asistencias</div></div>
        <div class="asistencia-item"><div class="n" style="color:#dc2626">${asistAnual.ausencias}</div><div class="l">Inasistencias</div></div>
        <div class="asistencia-item"><div class="n" style="color:#d97706">${asistAnual.tardanzas}</div><div class="l">Tardanzas</div></div>
        <div class="asistencia-item"><div class="n">${asistAnual.total}</div><div class="l">Total Días</div></div>
      </div>
    </div>` : '';

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Boleta Anual Consolidada - ${est.nombre}</title>
  <style>
    ${paperStyles.pageAt}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; font-size: ${paperStyles.fontSize}; line-height: 1.4; color: #333; }
    .boleta { max-width: 190mm; margin: 0 auto; padding: 5mm; }
    .header { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 15px; }
    .logo { width: 100px; height: 100px; object-fit: contain; }
    .header-text { text-align: center; flex: 1; }
    .header-text h1 { font-size: 13pt; font-weight: bold; margin-bottom: 3px; text-transform: uppercase; }
    .titulo-boleta { text-align: center; background: #1e293b; color: white; padding: 8px; margin: 15px 0; border: 1px solid #333; }
    .info-estudiante { display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; }
    .info-estudiante .label { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th, td { border: 1px solid #333; padding: 6px; text-align: center; }
    th { background: #e5e7eb; font-weight: bold; font-size: 9pt; }
    .resumen-anual { display: flex; justify-content: space-between; margin: 20px 0; padding: 15px; background: #f8fafc; border: 2px solid #1e293b; }
    .resumen-item .valor { font-size: 18pt; font-weight: bold; }
    .seccion-asistencia { margin: 15px 0; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
    .seccion-asistencia-header { background: #f8fafc; padding: 6px 10px; border-bottom: 1px solid #ddd; font-weight: bold; font-size: 9pt; }
    .asistencia-grid { display: grid; grid-template-columns: repeat(4, 1fr); padding: 10px; text-align: center; }
    .asistencia-item .n { font-size: 12pt; font-weight: bold; }
    .asistencia-item .l { font-size: 8pt; color: #666; }
    .firmas { display: flex; justify-content: space-between; margin-top: 50px; }
    .firma { text-align: center; width: 45%; border-top: 1px solid #333; padding-top: 5px; }
  </style>
</head>
<body>
  <div class="boleta">
    <div class="header">
      <img src="${window.location.origin}/0.png" alt="Logo" class="logo">
      <div class="header-text">
        <h1>Centro Escolar Católico San José de la Montaña</h1>
        <p>Código: 88125 | San Salvador</p>
      </div>
      <img src="${window.location.origin}/0.png" alt="Logo" class="logo">
    </div>
    <div class="titulo-boleta">
      <h3>BOLETA DE CALIFICACIONES CONSOLIDADA - ANUAL</h3>
    </div>
    <div class="info-estudiante">
      <div>
        <p><span class="label">Estudiante:</span> ${escapeHtml(est.nombre)}</p>
        ${est.email ? `<p><span class="label">Correo:</span> ${escapeHtml(est.email)}</p>` : ''}
        <p><span class="label">Grado:</span> ${grado?.numero}° Grado "${grado?.seccion}"</p>
      </div>
      <div style="text-align: right;">
        <p><span class="label">Año Lectivo:</span> ${año}</p>
        <p><span class="label">N° Lista:</span> ${est.numero}</p>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 35%">Asignatura</th>
          <th style="width: 12%">Trim. I</th>
          <th style="width: 12%">Trim. II</th>
          <th style="width: 12%">Trim. III</th>
          <th style="width: 14%">Promedio Anual</th>
          <th style="width: 15%">Resultado</th>
        </tr>
      </thead>
      <tbody>
        ${tablaAsignaturas}
      </tbody>
    </table>
    ${bloqueAsistenciaAnual}
    <div class="resumen-anual">
      <div class="resumen-item">
        <div class="valor" style="color:#1e293b">${pFinal !== null ? pFinal.toFixed(2) : 'N/A'}</div>
        <div class="etiqueta">PROMEDIO FINAL ANUAL</div>
      </div>
      <div class="resumen-item">
        <div class="valor" style="color:${pFinal ? getEstadoColor(pFinal < uc ? 'REPROBADO' : pFinal < ua ? 'CONDICIONADO' : 'APROBADO') : '#dc2626'}">${pFinal ? (pFinal < uc ? 'REPROBADO' : pFinal < ua ? 'CONDICIONADO' : 'APROBADO') : 'REPROBADO'}</div>
        <div class="etiqueta">ESTADO FINAL</div>
      </div>
    </div>
    <div class="firmas">
      <div class="firma">
        <p>${docenteOrientador}</p>
        <p>Firma del Docente Orientador</p>
      </div>
      <div class="firma">
        <p>${nombreDirectora}</p>
        <p>Firma de la Directora</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  const imprimirTodasAnual = async () => {
    if (!estudiantes.length) return;

    let allBoletasHtml = '';
    const año = grado?.año || new Date().getFullYear();
    const fechaImpresion = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });

    // Obtener nombre del docente orientador
    const docenteOrientador = escapeHtml(grado?.docente?.nombre || '_______________________________');
    const nombreDirectora = escapeHtml(configuracion?.nombreDirectora || '_______________________________');

    for (const est of estudiantes) {
      const asistAnual = resumenAsistenciaAnual.find(r => r.id === est.id) || { asistencias: 0, ausencias: 0, tardanzas: 0, total: 0 };
      const califsEst = todasCalificaciones.filter(c => c.estudianteId === est.id);

      let tablaAsignaturas = materias.map(m => {
        const c1 = califsEst.find(c => c.materiaId === m.id && c.trimestre === 1);
        const c2 = califsEst.find(c => c.materiaId === m.id && c.trimestre === 2);
        const c3 = califsEst.find(c => c.materiaId === m.id && c.trimestre === 3);
        const n1 = c1?.promedioFinal, n2 = c2?.promedioFinal, n3 = c3?.promedioFinal;
        const notasValidas = [n1, n2, n3].filter((n): n is number => n !== null && n !== undefined);
        const promAnual = notasValidas.length ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length : null;
      const estado = promAnual !== null ? (promAnual < uc ? 'REPROBADO' : promAnual < ua ? 'CONDICIONADO' : 'APROBADO') : '-';
        return `<tr><td style="text-align:left;padding:6px 8px">${escapeHtml(m.nombre)}</td><td>${n1 != null ? n1.toFixed(2) : '-'}</td><td>${n2 != null ? n2.toFixed(2) : '-'}</td><td>${n3 != null ? n3.toFixed(2) : '-'}</td><td style="font-weight:bold">${promAnual !== null ? promAnual.toFixed(2) : '-'}</td><td style="font-weight:bold;color:${getEstadoColor(estado)}">${estado}</td></tr>`;
      }).join('');

      const notasFinales = materias.map(m => {
        const califs = califsEst.filter(c => c.materiaId === m.id);
        const sums = califs.map(c => c.promedioFinal).filter((n): n is number => n !== null && n !== undefined);
        return sums.length ? sums.reduce((a, b) => a + b, 0) / sums.length : null;
      }).filter((n): n is number => n !== null);
      const pFinal = notasFinales.length ? notasFinales.reduce((a, b) => a + b, 0) / notasFinales.length : null;

      const bloqueAsistenciaTodasAnual = incluirAsistencia ? `
        <div class="seccion-asistencia">
          <div class="seccion-asistencia-header">RESUMEN DE ASISTENCIA ANUAL (TOTAL ACUMULADO)</div>
          <div class="asistencia-grid">
            <div class="asistencia-item"><div class="n" style="color:#059669">${asistAnual.asistencias}</div><div class="l">Asistencias</div></div>
            <div class="asistencia-item"><div class="n" style="color:#dc2626">${asistAnual.ausencias}</div><div class="l">Inasistencias</div></div>
            <div class="asistencia-item"><div class="n" style="color:#d97706">${asistAnual.tardanzas}</div><div class="l">Tardanzas</div></div>
            <div class="asistencia-item"><div class="n">${asistAnual.total}</div><div class="l">Total Días</div></div>
          </div>
        </div>` : '';

      allBoletasHtml += `
      <div class="boleta" style="page-break-after: always;">
        <div class="header">
          <img src="${window.location.origin}/0.png" alt="Logo" class="logo">
          <div class="header-text"><h1>Centro Escolar Católico San José de la Montaña</h1><p>Código: 88125 | San Salvador</p></div>
          <img src="${window.location.origin}/0.png" alt="Logo" class="logo">
        </div>
        <div class="titulo-boleta"><h3>BOLETA DE CALIFICACIONES CONSOLIDADA - ANUAL</h3></div>
        <div class="info-estudiante">
          <div><p><span class="label">Estudiante:</span> ${escapeHtml(est.nombre)}</p>${est.email ? `<p><span class="label">Correo:</span> ${escapeHtml(est.email)}</p>` : ''}<p><span class="label">Grado:</span> ${grado?.numero}° Grado "${grado?.seccion}"</p></div>
          <div style="text-align: right;"><p><span class="label">Año Lectivo:</span> ${año}</p><p><span class="label">N° Lista:</span> ${est.numero}</p></div>
        </div>
        <table>
          <thead><tr><th style="width: 35%">Asignatura</th><th style="width: 12%">Trim. I</th><th style="width: 12%">Trim. II</th><th style="width: 12%">Trim. III</th><th style="width: 14%">Promedio Anual</th><th style="width: 15%">Resultado</th></tr></thead>
          <tbody>${tablaAsignaturas}</tbody>
        </table>
        ${bloqueAsistenciaTodasAnual}
        <div class="resumen-anual">
          <div class="resumen-item"><div class="valor" style="color:#1e293b">${pFinal !== null ? pFinal.toFixed(2) : 'N/A'}</div><div class="etiqueta">PROMEDIO FINAL ANUAL</div></div>
          <div class="resumen-item"><div class="valor" style="color:${pFinal ? getEstadoColor(pFinal < uc ? 'REPROBADO' : pFinal < ua ? 'CONDICIONADO' : 'APROBADO') : '#dc2626'}">${pFinal ? (pFinal < uc ? 'REPROBADO' : pFinal < ua ? 'CONDICIONADO' : 'APROBADO') : 'REPROBADO'}</div><div class="etiqueta">ESTADO FINAL</div></div>
        </div>
        <div class="firmas">
          <div class="firma"><p>${docenteOrientador}</p><p>Firma del Docente Orientador</p></div>
          <div class="firma"><p>${nombreDirectora}</p><p>Firma de la Directora</p></div>
        </div>
      </div>`;
    }

    const html = "<!DOCTYPE html><html><head><title>Boletas Consolidadas - " + (grado?.numero || "") + "\u00B0 " + (grado?.seccion || "") + "</title>" +
    "<style>" +
    "  " + paperStyles.pageAt +
    "  * { margin: 0; padding: 0; box-sizing: border-box; }" +
    "  body { font-family: 'Times New Roman', serif; font-size: " + paperStyles.fontSize + "; line-height: 1.4; color: #333; }" +
    "  .boleta { max-width: 190mm; margin: 0 auto; padding: 5mm; }" +
    "  .header { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 15px; }" +
    "  .logo { width: 100px; height: 100px; object-fit: contain; }" +
    "  .header-text { text-align: center; flex: 1; }" +
    "  .header-text h1 { font-size: 13pt; font-weight: bold; margin-bottom: 3px; text-transform: uppercase; }" +
    "  .titulo-boleta { text-align: center; background: #1e293b; color: white; padding: 8px; margin: 15px 0; border: 1px solid #333; }" +
    "  .info-estudiante { display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; }" +
    "  .info-estudiante .label { font-weight: bold; }" +
    "  table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }" +
    "  th, td { border: 1px solid #333; padding: 6px; text-align: center; }" +
    "  th { background: #e5e7eb; font-weight: bold; font-size: 9pt; }" +
    "  .resumen-anual { display: flex; justify-content: space-between; margin: 20px 0; padding: 15px; background: #f8fafc; border: 2px solid #1e293b; }" +
    "  .resumen-item .valor { font-size: 18pt; font-weight: bold; }" +
    "  .seccion-asistencia { margin: 15px 0; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }" +
    "  .seccion-asistencia-header { background: #f8fafc; padding: 6px 10px; border-bottom: 1px solid #ddd; font-weight: bold; font-size: 9pt; }" +
    "  .asistencia-grid { display: grid; grid-template-columns: repeat(4, 1fr); padding: 10px; text-align: center; }" +
    "  .asistencia-item .n { font-size: 12pt; font-weight: bold; }" +
    "  .asistencia-item .l { font-size: 8pt; color: #666; }" +
    "  .firmas { display: flex; justify-content: space-between; margin-top: 50px; }" +
    "  .firma { text-align: center; width: 45%; border-top: 1px solid #333; padding-top: 5px; }" +
    "  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }" +
    "  </style></head><body>" + allBoletasHtml + "</body></html>";

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  const imprimirAnualConRecuperacion = async (id: string) => {
    const est = estudiantes.find(e => e.id === id);
    if (!est) return;

    const año = grado?.año || new Date().getFullYear();
    const fechaImpresion = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });
    const asistAnual = resumenAsistenciaAnual.find(r => r.id === id) || { asistencias: 0, ausencias: 0, tardanzas: 0, total: 0 };

    const docenteOrientador = escapeHtml(grado?.docente?.nombre || '_______________________________');
    const nombreDirectora = escapeHtml(configuracion?.nombreDirectora || '_______________________________');

    const califsEst = todasCalificaciones.filter(c => c.estudianteId === id);

    let tablaAsignaturas = materias.map(m => {
      const c1 = califsEst.find(c => c.materiaId === m.id && c.trimestre === 1);
      const c2 = califsEst.find(c => c.materiaId === m.id && c.trimestre === 2);
      const c3 = califsEst.find(c => c.materiaId === m.id && c.trimestre === 3);

      const n1 = c1?.promedioFinal;
      const n2 = c2?.promedioFinal;
      const n3 = c3?.promedioFinal;

      const notasValidas = [n1, n2, n3].filter((n): n is number => n !== null && n !== undefined);
      const promAnual = notasValidas.length ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length : null;
      const recupAnual = recuperacionesAnuales.get(`${id}-${m.id}`) ?? null;
      const promFinalConRecup = promAnual !== null && recupAnual !== null ? Math.max(promAnual, recupAnual) : promAnual;
      const estado = promFinalConRecup !== null ? (promFinalConRecup < uc ? 'REPROBADO' : promFinalConRecup < ua ? 'CONDICIONADO' : 'APROBADO') : '-';

      return `<tr>
        <td style="text-align:left;padding:6px 8px">${escapeHtml(m.nombre)}</td>
        <td>${n1 != null ? n1.toFixed(2) : '-'}</td>
        <td>${n2 != null ? n2.toFixed(2) : '-'}</td>
        <td>${n3 != null ? n3.toFixed(2) : '-'}</td>
        <td style="font-weight:bold">${promAnual !== null ? promAnual.toFixed(2) : '-'}</td>
        <td>${recupAnual !== null ? recupAnual.toFixed(2) : '-'}</td>
        <td style="font-weight:bold">${promFinalConRecup !== null ? promFinalConRecup.toFixed(2) : '-'}</td>
        <td style="font-weight:bold;color:${getEstadoColor(estado)}">${estado}</td>
      </tr>`;
    }).join('');

    const notasFinales = materias.map(m => {
      const califs = califsEst.filter(c => c.materiaId === m.id);
      const sums = califs.map(c => c.promedioFinal).filter((n): n is number => n !== null && n !== undefined);
      const promAnual = sums.length ? sums.reduce((a, b) => a + b, 0) / sums.length : null;
      const recupAnual = recuperacionesAnuales.get(`${id}-${m.id}`) ?? null;
        return promAnual !== null && recupAnual !== null ? Math.max(promAnual, recupAnual) : promAnual;
    }).filter((n): n is number => n !== null);
    const pFinal = notasFinales.length ? notasFinales.reduce((a, b) => a + b, 0) / notasFinales.length : null;

    const bloqueAsistenciaAnual = incluirAsistencia ? `
    <div class="seccion-asistencia">
      <div class="seccion-asistencia-header">RESUMEN DE ASISTENCIA ANUAL (TOTAL ACUMULADO)</div>
      <div class="asistencia-grid">
        <div class="asistencia-item"><div class="n" style="color:#059669">${asistAnual.asistencias}</div><div class="l">Asistencias</div></div>
        <div class="asistencia-item"><div class="n" style="color:#dc2626">${asistAnual.ausencias}</div><div class="l">Inasistencias</div></div>
        <div class="asistencia-item"><div class="n" style="color:#d97706">${asistAnual.tardanzas}</div><div class="l">Tardanzas</div></div>
        <div class="asistencia-item"><div class="n">${asistAnual.total}</div><div class="l">Total Días</div></div>
      </div>
    </div>` : '';

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Boleta Anual con Recuperación - ${est.nombre}</title>
  <style>
    ${paperStyles.pageAt}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; font-size: ${paperStyles.fontSize}; line-height: 1.4; color: #333; }
    .boleta { max-width: 190mm; margin: 0 auto; padding: 5mm; }
    .header { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 15px; }
    .logo { width: 100px; height: 100px; object-fit: contain; }
    .header-text { text-align: center; flex: 1; }
    .header-text h1 { font-size: 13pt; font-weight: bold; margin-bottom: 3px; text-transform: uppercase; }
    .titulo-boleta { text-align: center; background: #1e293b; color: white; padding: 8px; margin: 15px 0; border: 1px solid #333; }
    .info-estudiante { display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; }
    .info-estudiante .label { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th, td { border: 1px solid #333; padding: 5px; text-align: center; }
    th { background: #e5e7eb; font-weight: bold; font-size: 9pt; }
    .resumen-anual { display: flex; justify-content: space-between; margin: 20px 0; padding: 15px; background: #f8fafc; border: 2px solid #1e293b; }
    .resumen-item .valor { font-size: 18pt; font-weight: bold; }
    .seccion-asistencia { margin: 15px 0; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
    .seccion-asistencia-header { background: #f8fafc; padding: 6px 10px; border-bottom: 1px solid #ddd; font-weight: bold; font-size: 9pt; }
    .asistencia-grid { display: grid; grid-template-columns: repeat(4, 1fr); padding: 10px; text-align: center; }
    .asistencia-item .n { font-size: 12pt; font-weight: bold; }
    .asistencia-item .l { font-size: 8pt; color: #666; }
    .firmas { display: flex; justify-content: space-between; margin-top: 50px; }
    .firma { text-align: center; width: 45%; border-top: 1px solid #333; padding-top: 5px; }
  </style>
</head>
<body>
  <div class="boleta">
    <div class="header">
      <img src="${window.location.origin}/0.png" alt="Logo" class="logo">
      <div class="header-text">
        <h1>Centro Escolar Católico San José de la Montaña</h1>
        <p>Código: 88125 | San Salvador</p>
      </div>
      <img src="${window.location.origin}/0.png" alt="Logo" class="logo">
    </div>
    <div class="titulo-boleta">
      <h3>BOLETA ANUAL CON RECUPERACIÓN</h3>
    </div>
    <div class="info-estudiante">
      <div>
        <p><span class="label">Estudiante:</span> ${escapeHtml(est.nombre)}</p>
        ${est.email ? `<p><span class="label">Correo:</span> ${escapeHtml(est.email)}</p>` : ''}
        <p><span class="label">Grado:</span> ${grado?.numero}° Grado "${grado?.seccion}"</p>
      </div>
      <div style="text-align: right;">
        <p><span class="label">Año Lectivo:</span> ${año}</p>
        <p><span class="label">N° Lista:</span> ${est.numero}</p>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 28%">Asignatura</th>
          <th style="width: 10%">Trim. I</th>
          <th style="width: 10%">Trim. II</th>
          <th style="width: 10%">Trim. III</th>
          <th style="width: 12%">Prom. Anual</th>
          <th style="width: 10%">Recup.</th>
          <th style="width: 10%">Prom. Final</th>
          <th style="width: 10%">Resultado</th>
        </tr>
      </thead>
      <tbody>
        ${tablaAsignaturas}
      </tbody>
    </table>
    ${bloqueAsistenciaAnual}
    <div class="resumen-anual">
      <div class="resumen-item">
        <div class="valor" style="color:#1e293b">${pFinal !== null ? pFinal.toFixed(2) : 'N/A'}</div>
        <div class="etiqueta">PROMEDIO FINAL ANUAL</div>
      </div>
      <div class="resumen-item">
        <div class="valor" style="color:${pFinal ? getEstadoColor(pFinal < uc ? 'REPROBADO' : pFinal < ua ? 'CONDICIONADO' : 'APROBADO') : '#dc2626'}">${pFinal ? (pFinal < uc ? 'REPROBADO' : pFinal < ua ? 'CONDICIONADO' : 'APROBADO') : 'REPROBADO'}</div>
        <div class="etiqueta">ESTADO FINAL</div>
      </div>
    </div>
    <div class="firmas">
      <div class="firma">
        <p>${docenteOrientador}</p>
        <p>Firma del Docente Orientador</p>
      </div>
      <div class="firma">
        <p>${nombreDirectora}</p>
        <p>Firma de la Directora</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  const imprimirTodasAnualConRecuperacion = async () => {
    if (!estudiantes.length) return;

    let allBoletasHtml = '';
    const año = grado?.año || new Date().getFullYear();
    const fechaImpresion = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });

    const docenteOrientador = escapeHtml(grado?.docente?.nombre || '_______________________________');
    const nombreDirectora = escapeHtml(configuracion?.nombreDirectora || '_______________________________');

    for (const est of estudiantes) {
      const asistAnual = resumenAsistenciaAnual.find(r => r.id === est.id) || { asistencias: 0, ausencias: 0, tardanzas: 0, total: 0 };
      const califsEst = todasCalificaciones.filter(c => c.estudianteId === est.id);

      let tablaAsignaturas = materias.map(m => {
        const c1 = califsEst.find(c => c.materiaId === m.id && c.trimestre === 1);
        const c2 = califsEst.find(c => c.materiaId === m.id && c.trimestre === 2);
        const c3 = califsEst.find(c => c.materiaId === m.id && c.trimestre === 3);
        const n1 = c1?.promedioFinal, n2 = c2?.promedioFinal, n3 = c3?.promedioFinal;
        const notasValidas = [n1, n2, n3].filter((n): n is number => n !== null && n !== undefined);
        const promAnual = notasValidas.length ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length : null;
        const recupAnual = recuperacionesAnuales.get(`${est.id}-${m.id}`) ?? null;
        const promFinalConRecup = promAnual !== null && recupAnual !== null ? Math.max(promAnual, recupAnual) : promAnual;
        const estado = promFinalConRecup !== null ? (promFinalConRecup < uc ? 'REPROBADO' : promFinalConRecup < ua ? 'CONDICIONADO' : 'APROBADO') : '-';
        return `<tr><td style="text-align:left;padding:6px 8px">${escapeHtml(m.nombre)}</td><td>${n1 != null ? n1.toFixed(2) : '-'}</td><td>${n2 != null ? n2.toFixed(2) : '-'}</td><td>${n3 != null ? n3.toFixed(2) : '-'}</td><td style="font-weight:bold">${promAnual !== null ? promAnual.toFixed(2) : '-'}</td><td>${recupAnual !== null ? recupAnual.toFixed(2) : '-'}</td><td style="font-weight:bold">${promFinalConRecup !== null ? promFinalConRecup.toFixed(2) : '-'}</td><td style="font-weight:bold;color:${getEstadoColor(estado)}">${estado}</td></tr>`;
      }).join('');

      const notasFinales = materias.map(m => {
        const califs = califsEst.filter(c => c.materiaId === m.id);
        const sums = califs.map(c => c.promedioFinal).filter((n): n is number => n !== null && n !== undefined);
        const promAnual = sums.length ? sums.reduce((a, b) => a + b, 0) / sums.length : null;
        const recupAnual = recuperacionesAnuales.get(`${est.id}-${m.id}`) ?? null;
      return promAnual !== null && recupAnual !== null ? Math.max(promAnual, recupAnual) : promAnual;
      }).filter((n): n is number => n !== null);
      const pFinal = notasFinales.length ? notasFinales.reduce((a, b) => a + b, 0) / notasFinales.length : null;

      const bloqueAsistenciaTodasAnual = incluirAsistencia ? `
        <div class="seccion-asistencia">
          <div class="seccion-asistencia-header">RESUMEN DE ASISTENCIA ANUAL (TOTAL ACUMULADO)</div>
          <div class="asistencia-grid">
            <div class="asistencia-item"><div class="n" style="color:#059669">${asistAnual.asistencias}</div><div class="l">Asistencias</div></div>
            <div class="asistencia-item"><div class="n" style="color:#dc2626">${asistAnual.ausencias}</div><div class="l">Inasistencias</div></div>
            <div class="asistencia-item"><div class="n" style="color:#d97706">${asistAnual.tardanzas}</div><div class="l">Tardanzas</div></div>
            <div class="asistencia-item"><div class="n">${asistAnual.total}</div><div class="l">Total Días</div></div>
          </div>
        </div>` : '';

      allBoletasHtml += `
      <div class="boleta" style="page-break-after: always;">
        <div class="header">
          <img src="${window.location.origin}/0.png" alt="Logo" class="logo">
          <div class="header-text"><h1>Centro Escolar Católico San José de la Montaña</h1><p>Código: 88125 | San Salvador</p></div>
          <img src="${window.location.origin}/0.png" alt="Logo" class="logo">
        </div>
        <div class="titulo-boleta"><h3>BOLETA ANUAL CON RECUPERACIÓN</h3></div>
        <div class="info-estudiante">
          <div><p><span class="label">Estudiante:</span> ${escapeHtml(est.nombre)}</p>${est.email ? `<p><span class="label">Correo:</span> ${escapeHtml(est.email)}</p>` : ''}<p><span class="label">Grado:</span> ${grado?.numero}° Grado "${grado?.seccion}"</p></div>
          <div style="text-align: right;"><p><span class="label">Año Lectivo:</span> ${año}</p><p><span class="label">N° Lista:</span> ${est.numero}</p></div>
        </div>
        <table>
          <thead><tr><th style="width: 28%">Asignatura</th><th style="width: 10%">Trim. I</th><th style="width: 10%">Trim. II</th><th style="width: 10%">Trim. III</th><th style="width: 12%">Prom. Anual</th><th style="width: 10%">Recup.</th><th style="width: 10%">Prom. Final</th><th style="width: 10%">Resultado</th></tr></thead>
          <tbody>${tablaAsignaturas}</tbody>
        </table>
        ${bloqueAsistenciaTodasAnual}
        <div class="resumen-anual">
          <div class="resumen-item"><div class="valor" style="color:#1e293b">${pFinal !== null ? pFinal.toFixed(2) : 'N/A'}</div><div class="etiqueta">PROMEDIO FINAL ANUAL</div></div>
          <div class="resumen-item"><div class="valor" style="color:${pFinal ? getEstadoColor(pFinal < uc ? 'REPROBADO' : pFinal < ua ? 'CONDICIONADO' : 'APROBADO') : '#dc2626'}">${pFinal ? (pFinal < uc ? 'REPROBADO' : pFinal < ua ? 'CONDICIONADO' : 'APROBADO') : 'REPROBADO'}</div><div class="etiqueta">ESTADO FINAL</div></div>
        </div>
        <div class="firmas">
          <div class="firma"><p>${docenteOrientador}</p><p>Firma del Docente Orientador</p></div>
          <div class="firma"><p>${nombreDirectora}</p><p>Firma de la Directora</p></div>
        </div>
      </div>`;
    }

    const html = "<!DOCTYPE html><html><head><title>Boletas Anuales con Recuperación - " + (grado?.numero || "") + "° " + (grado?.seccion || "") + "</title>" +
    "<style>" +
    "  " + paperStyles.pageAt +
    "  * { margin: 0; padding: 0; box-sizing: border-box; }" +
    "  body { font-family: 'Times New Roman', serif; font-size: " + paperStyles.fontSize + "; line-height: 1.4; color: #333; }" +
    "  .boleta { max-width: 190mm; margin: 0 auto; padding: 5mm; }" +
    "  .header { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 15px; }" +
    "  .logo { width: 100px; height: 100px; object-fit: contain; }" +
    "  .header-text { text-align: center; flex: 1; }" +
    "  .header-text h1 { font-size: 13pt; font-weight: bold; margin-bottom: 3px; text-transform: uppercase; }" +
    "  .titulo-boleta { text-align: center; background: #1e293b; color: white; padding: 8px; margin: 15px 0; border: 1px solid #333; }" +
    "  .info-estudiante { display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; }" +
    "  .info-estudiante .label { font-weight: bold; }" +
    "  table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }" +
    "  th, td { border: 1px solid #333; padding: 5px; text-align: center; }" +
    "  th { background: #e5e7eb; font-weight: bold; font-size: 9pt; }" +
    "  .resumen-anual { display: flex; justify-content: space-between; margin: 20px 0; padding: 15px; background: #f8fafc; border: 2px solid #1e293b; }" +
    "  .resumen-item .valor { font-size: 18pt; font-weight: bold; }" +
    "  .seccion-asistencia { margin: 15px 0; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }" +
    "  .seccion-asistencia-header { background: #f8fafc; padding: 6px 10px; border-bottom: 1px solid #ddd; font-weight: bold; font-size: 9pt; }" +
    "  .asistencia-grid { display: grid; grid-template-columns: repeat(4, 1fr); padding: 10px; text-align: center; }" +
    "  .asistencia-item .n { font-size: 12pt; font-weight: bold; }" +
    "  .asistencia-item .l { font-size: 8pt; color: #666; }" +
    "  .firmas { display: flex; justify-content: space-between; margin-top: 50px; }" +
    "  .firma { text-align: center; width: 45%; border-top: 1px solid #333; padding-top: 5px; }" +
    "  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }" +
    "  </style></head><body>" + allBoletasHtml + "</body></html>";

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  const descargarWord = async (id: string) => {
    const est = estudiantes.find(e => e.id === id);
    if (!est) return;
    const califs = getCalifs(id);
    const prom = calcProm(califs);
    const estadoFinal = getEstadoFinal(prom);
    const año = grado?.año || new Date().getFullYear();
    const fechaImpresion = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });
    const docenteOrientador = escapeHtml(grado?.docente?.nombre || '_______________________________');
    const nombreDirectora = escapeHtml(configuracion?.nombreDirectora || '_______________________________');
    const asist = getAsistInfo(id);

    let tablaAsignaturas = materias.map(m => {
      const c = califs.find(x => x.materiaId === m.id);
      const promFinal = c?.promedioFinal !== null && c?.promedioFinal !== undefined ? c.promedioFinal : null;
      const recupVal = c?.recuperacion !== null && c?.recuperacion !== undefined ? c.recuperacion.toFixed(2) : '-';
      const notaFinal = promFinal !== null ? entero(promFinal) : '-';
      const estadoLabel = promFinal !== null ? (promFinal < uc ? 'REPROBADO' : promFinal < ua ? 'CONDICIONADO' : 'APROBADO') : '-';
      return `<tr>
        <td style="text-align:left;padding:6px 8px">${escapeHtml(m.nombre)}</td>
        <td>${c?.calificacionAC != null ? (c.calificacionAC * pctAC).toFixed(2) : '-'}</td>
        <td>${c?.calificacionAI != null ? (c.calificacionAI * pctAI).toFixed(2) : '-'}</td>
        <td>${c?.examenTrimestral != null ? (c.examenTrimestral * pctEx).toFixed(2) : '-'}</td>
        ${mostrarRecuperacion ? `<td>${recupVal}</td>` : ''}
        <td style="font-weight:bold">${notaFinal}</td>
        <td style="font-weight:bold;color:${getEstadoColor(estadoLabel)}">${estadoLabel}</td>
      </tr>`;
    }).join('');

    const htmlWord = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="UTF-8"><title>Boleta - ${escapeHtml(est.nombre)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  @page { size: letter; margin: 2cm; }
  body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.15; color: #000; }
  .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 15px; }
  .header-logo { width: 80px; height: 80px; }
  .header-text { text-align: center; flex: 1; }
  .header h1 { font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 0; }
  .header h2 { font-size: 10pt; font-weight: normal; margin: 2px 0; }
  .titulo-boleta { text-align: center; background: #f3f4f6; padding: 6px; margin: 15px 0; border: 1px solid #000; }
  .titulo-boleta h3 { font-size: 12pt; text-transform: uppercase; margin: 0; }
  .info-estudiante { margin-bottom: 15px; }
  .info-estudiante p { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  th, td { border: 1px solid #000; padding: 4px 6px; text-align: center; }
  th { background: #e5e7eb; font-weight: bold; font-size: 9pt; }
  td { font-size: 10pt; }
  .resumen { margin: 20px 0; padding: 8px; border: 2px solid #000; }
  .resumen-item { display: inline-block; width: 30%; text-align: center; }
  .observaciones { margin: 15px 0; padding: 10px; border: 1px solid #000; min-height: 80px; }
  .firmas { margin-top: 50px; }
  .firma { display: inline-block; width: 45%; text-align: center; border-top: 1px solid #000; padding-top: 5px; }
  .pie { margin-top: 30px; text-align: center; font-size: 8pt; border-top: 1px solid #ccc; padding-top: 10px; }
</style></head>
<body>
  <div class="header">
    <img src="${window.location.origin}/0.png" alt="Logo" class="header-logo" onerror="this.style.display='none'">
    <div class="header-text">
      <h1>Centro Escolar Católico San José de la Montaña</h1>
      <h2>Código: 88125 | San Salvador</h2>
    </div>
    <img src="${window.location.origin}/0.png" alt="Logo" class="header-logo" onerror="this.style.display='none'">
  </div>
  <div class="titulo-boleta"><h3>Boleta de Calificaciones - Trimestre ${getTrimestreRomano(trimestre)}</h3></div>
  <div class="info-estudiante">
    <p><b>Estudiante:</b> ${escapeHtml(est.nombre)}</p>
    <p><b>Grado:</b> ${grado?.numero}° Grado "${grado?.seccion}" &nbsp;&nbsp; <b>Año:</b> ${año} &nbsp;&nbsp; <b>N° Lista:</b> ${est.numero}</p>
  </div>
  <table>
    <thead><tr><th>Asignatura</th><th>Prom. A.C.</th><th>Prom. A.I.</th><th>Examen</th>${mostrarRecuperacion ? '<th>Recup.</th>' : ''}<th>Prom. Final</th><th>Estado</th></tr></thead>
    <tbody>${tablaAsignaturas}</tbody>
  </table>
  ${incluirAsistencia ? `<p><b>Asistencia:</b> Asistencias: ${asist.asistencias} | Inasistencias: ${asist.ausencias} | Tardanzas: ${asist.tardanzas} | Total: ${asist.total}</p>` : ''}
  ${incluirAsistenciaManual ? `
  <div style="margin:15px 0;padding:10px;border:2px solid #0d9488;border-radius:4px;">
    <div style="font-weight:bold;font-size:11pt;margin-bottom:8px;color:#0d9488;">REGISTRO DE ASISTENCIA <span style="font-weight:normal;font-size:8pt;color:#555;">(para llenar manualmente)</span></div>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="border:1px solid #333;padding:8px 4px;text-align:center;width:20%;background:#f0fdfa;"><b style="font-size:9pt;text-transform:uppercase;">Asistencias</b><br><span style="font-size:16pt;line-height:2;">&nbsp;</span></td>
        <td style="border:1px solid #333;padding:8px 4px;text-align:center;width:20%;background:#fef2f2;"><b style="font-size:9pt;text-transform:uppercase;">Inasistencias</b><br><span style="font-size:16pt;line-height:2;">&nbsp;</span></td>
        <td style="border:1px solid #333;padding:8px 4px;text-align:center;width:20%;background:#fffbeb;"><b style="font-size:9pt;text-transform:uppercase;">Tardanzas</b><br><span style="font-size:16pt;line-height:2;">&nbsp;</span></td>
        <td style="border:1px solid #333;padding:8px 4px;text-align:center;width:20%;background:#eff6ff;"><b style="font-size:9pt;text-transform:uppercase;">Justificadas</b><br><span style="font-size:16pt;line-height:2;">&nbsp;</span></td>
        <td style="border:1px solid #333;padding:8px 4px;text-align:center;width:20%;background:#f8fafc;"><b style="font-size:9pt;text-transform:uppercase;">Total Días</b><br><span style="font-size:16pt;line-height:2;">&nbsp;</span></td>
      </tr>
    </table>
  </div>` : ''}
  <div class="resumen">
    <div class="resumen-item"><b>Promedio General:</b> ${prom !== null ? entero(prom) : 'N/A'}</div>
    <div class="resumen-item"><b>Estado:</b> ${estadoFinal}</div>
    <div class="resumen-item"><b>Período:</b> ${getTrimestreRomano(trimestre)} Trimestre</div>
  </div>
  <div class="observaciones">
    <p><b>Observaciones:</b></p>
    <p style="min-height:60px;">&nbsp;</p>
  </div>
  <div class="firmas">
    <div class="firma"><p>${docenteOrientador}</p><p>Firma del Docente Orientador</p></div>
    <div class="firma"><p>${nombreDirectora}</p><p>Firma de la Directora</p></div>
  </div>
  <div class="pie">
    <p>Fecha de impresión: ${fechaImpresion} | Código: 88125 | San Salvador</p>
  </div>
</body></html>`;

    const blob = new Blob([htmlWord], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Boleta_${est.nombre.replace(/\s+/g, '_')}_T${getTrimestreRomano(trimestre)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-1.5">
      {(loadingAsistencia || loadingAnual) && (
        <div className="space-y-2 mb-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className={`shadow-sm ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
              <div className="p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className={`h-3 w-5 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <Skeleton className={`h-3 w-36 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <Skeleton className={`h-4 w-16 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className={`h-6 w-14 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <Skeleton className={`h-6 w-14 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <Skeleton className={`h-4 w-4 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {(estudiantes || []).map(est => {
        const califs = getCalifs(est.id), prom = calcProm(califs), open = expandedBoleta === est.id;
        return (
          <Card key={est.id} className={`shadow-sm ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
            <div className={`p-2.5 flex items-center justify-between cursor-pointer ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`} onClick={() => setExpandedBoleta(open ? null : est.id)}>
              <div className="flex items-center gap-2"><span className={`text-xs w-5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{est.numero}</span><span className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-white' : ''}`}>{est.nombre}</span><Badge variant={prom !== null && prom >= ua ? "default" : prom !== null && prom >= uc ? "secondary" : "destructive"} className={`text-[10px] h-5 ${prom !== null && prom >= ua ? (darkMode ? 'bg-teal-600' : 'bg-teal-600') : prom !== null && prom >= uc ? (darkMode ? 'bg-amber-600' : 'bg-amber-600') : ''}`}>Prom: {prom !== null ? prom.toFixed(2) : "N/A"}</Badge></div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" title="Anual con Recuperación" className={`h-6 px-2 text-xs ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} onClick={e => { e.stopPropagation(); imprimirAnualConRecuperacion(est.id); }}>
                  <FileText className="h-3.5 w-3.5 mr-1" />Anual + Recup.
                </Button>
                <Button size="sm" variant="ghost" title="Consolidado Anual" className={`h-6 px-2 text-xs ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} onClick={e => { e.stopPropagation(); imprimirAnual(est.id); }}>
                  <FileText className="h-3.5 w-3.5 mr-1" />Anual
                </Button>
                <Button size="sm" variant="ghost" title="Imprimir Trimestre" className={`h-6 px-2 text-xs ${darkMode ? 'text-slate-300' : ''}`} onClick={e => { e.stopPropagation(); imprimir(est.id); }}>
                  <Printer className="h-3 w-3 mr-1" />Boleta
                </Button>
                <Button size="sm" variant="ghost" title="Descargar Word" className={`h-6 px-2 text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} onClick={e => { e.stopPropagation(); descargarWord(est.id); }}>
                  <Download className="h-3 w-3 mr-1" />Word
                </Button>
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
            {open && <div className={`border-t p-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50'}`}><Table className="text-xs"><TableHeader><TableRow className={`h-7 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}><TableHead>Asignatura</TableHead><TableHead className="text-center">Prom. A.C.</TableHead><TableHead className="text-center">Prom. A.I.</TableHead><TableHead className="text-center">Examen</TableHead>{mostrarRecuperacion && <TableHead className="text-center">Recup.</TableHead>}<TableHead className="text-center font-bold">Promedio</TableHead></TableRow></TableHeader><TableBody>{materias.map(m => { const c = califs.find(x => x.materiaId === m.id); const estadoMat = c?.promedioFinal !== null && c?.promedioFinal !== undefined ? (c.promedioFinal < uc ? 'REPROBADO' : c.promedioFinal < ua ? 'CONDICIONADO' : 'APROBADO') : 'PENDIENTE'; return <TableRow key={m.id} className={`h-7 ${darkMode ? 'border-slate-700' : ''}`}><TableCell className={`font-medium ${darkMode ? 'text-white' : ''}`}>{m.nombre}</TableCell><TableCell className="text-center">{c?.calificacionAC != null ? (c.calificacionAC * pctAC).toFixed(2) : "-"}</TableCell><TableCell className="text-center">{c?.calificacionAI != null ? (c.calificacionAI * pctAI).toFixed(2) : "-"}</TableCell><TableCell className="text-center">{c?.examenTrimestral != null ? (c.examenTrimestral * pctEx).toFixed(2) : "-"}</TableCell>{mostrarRecuperacion && <TableCell className="text-center">{c?.recuperacion !== null && c?.recuperacion !== undefined ? c.recuperacion.toFixed(2) : "-"}</TableCell>}<TableCell className="text-center"><Badge variant={c?.promedioFinal !== null && c?.promedioFinal !== undefined && c.promedioFinal >= ua ? "default" : c?.promedioFinal !== null && c?.promedioFinal !== undefined && c.promedioFinal >= uc ? "secondary" : "destructive"} className={`text-[10px] ${c?.promedioFinal !== null && c?.promedioFinal !== undefined && c.promedioFinal >= ua ? 'bg-teal-600' : c?.promedioFinal !== null && c?.promedioFinal !== undefined && c.promedioFinal >= uc ? 'bg-amber-600' : ''}`}>{c?.promedioFinal !== null && c?.promedioFinal !== undefined ? c.promedioFinal.toFixed(2) : "-"}</Badge></TableCell></TableRow>; })}</TableBody></Table></div>}
          </Card>
        );
      })}
    </div>
  );
}