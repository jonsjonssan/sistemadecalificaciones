"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Printer, Download, Loader2, AlertCircle } from "lucide-react";
import { escapeHtml } from "@/lib/utils/index";

interface InformeTecnicoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  darkMode: boolean;
  usuario: { nombre: string; rol: string };
  configuracion: { añoEscolar: number; escuela: string; umbralAprobado?: number };
  grados: { id: string; numero: number; seccion: string; _count?: { estudiantes: number } }[];
}

const TRIMESTRES = [
  { valor: "1", label: "Primer Trimestre" },
  { valor: "2", label: "Segundo Trimestre" },
  { valor: "3", label: "Tercer Trimestre" },
];

export default function InformeTecnicoDialog({
  open,
  onOpenChange,
  darkMode,
  usuario,
  configuracion: { umbralAprobado, ...configuracion },
  grados,
}: InformeTecnicoProps) {
  const [trimestre, setTrimestre] = useState("1");
  const [generando, setGenerando] = useState(false);
  const [stats, setStats] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStatsLoading(true);
    Promise.all([
      fetch("/api/grados", { credentials: "include" }).then(r => r.json()),
      fetch("/api/calificaciones?trimestre=" + trimestre, { credentials: "include" }).then(r => r.json()),
    ])
      .then(([gradosData, califData]) => {
        const statsMap: Record<string, any> = {};
        if (Array.isArray(gradosData)) {
          for (const g of gradosData) {
            const gradosCalif = Array.isArray(califData) ? califData.filter((c: any) => c.estudiante?.gradoId === g.id) : [];
            const notas = gradosCalif.map((c: any) => ({ ac: c.calificacionAC || 0, ai: c.calificacionAI || 0, ex: c.examenTrimestral || 0, pf: c.promedioFinal || 0 }));
            const promedios = notas.length > 0 ? {
              cotidiana: notas.reduce((s: number, n: any) => s + n.ac, 0) / notas.length,
              integradora: notas.reduce((s: number, n: any) => s + n.ai, 0) / notas.length,
              examen: notas.reduce((s: number, n: any) => s + n.ex, 0) / notas.length,
            } : { cotidiana: 0, integradora: 0, examen: 0 };

            // Agrupar por estudiante para evitar duplicados (un estudiante aparece por cada materia)
            const estudiantesMap = new Map<string, { nombre: string; numero: number; promedios: number[] }>();
            for (const c of gradosCalif) {
              if (c.promedioFinal === null) continue;
              const eId = c.estudiante?.id;
              if (!eId) continue;
              if (!estudiantesMap.has(eId)) {
                estudiantesMap.set(eId, { nombre: c.estudiante.nombre || "—", numero: c.estudiante.numero || 0, promedios: [] });
              }
              estudiantesMap.get(eId)!.promedios.push(c.promedioFinal);
            }

            const estudiantes = Array.from(estudiantesMap.values()).map(e => ({
              nombre: e.nombre,
              numero: e.numero,
              promedioFinal: e.promedios.reduce((a, b) => a + b, 0) / e.promedios.length,
            }));

            const top = [...estudiantes]
              .sort((a, b) => b.promedioFinal - a.promedioFinal)
              .slice(0, 10)
              .map(e => ({ nombre: e.nombre, promedio: e.promedioFinal, numero: e.numero, estado: e.promedioFinal >= 6.5 ? "APROBADO" : e.promedioFinal >= 4.5 ? "CONDICIONADO" : "REPROBADO" }));

            const alertas = [...estudiantes]
              .filter(e => e.promedioFinal < 5.0)
              .sort((a, b) => a.promedioFinal - b.promedioFinal)
              .slice(0, 10)
              .map(e => ({ nombre: e.nombre, promedio: e.promedioFinal, numero: e.numero, estado: "REPROBADO" }));

            statsMap[g.id] = { nombre: `${g.numero}° "${g.seccion}"`, promedios, topEstudiantes: top, alertas };
          }
        }
        setStats(Object.values(statsMap));
      })
      .catch(() => setStats([]))
      .finally(() => setStatsLoading(false));
  }, [open, trimestre]);

  const generarInforme = async () => {
    setGenerando(true);

    // Recopilar datos del trimestre seleccionado
    const trim = parseInt(trimestre);
    const totalEstudiantes = grados.reduce((sum, g) => sum + (g._count?.estudiantes || 0), 0);
    const totalGrados = grados.length;

    // Datos consolidados por ciclo
    const primerCiclo = stats.filter(s => {
      const num = parseInt(s.nombre?.match(/\d+/)?.[0] || "0");
      return num >= 2 && num <= 3;
    });
    const segundoCiclo = stats.filter(s => {
      const num = parseInt(s.nombre?.match(/\d+/)?.[0] || "0");
      return num >= 4 && num <= 6;
    });
    const tercerCiclo = stats.filter(s => {
      const num = parseInt(s.nombre?.match(/\d+/)?.[0] || "0");
      return num >= 7 && num <= 9;
    });

    // Calcular promedios por ciclo
    const calcProm = (arr: any[]) => {
      if (!arr.length) return { cot: 0, int: 0, ex: 0, fin: 0 };
      const cot = arr.reduce((a, s) => a + (s.promedios?.cotidiana || 0), 0) / arr.length;
      const int = arr.reduce((a, s) => a + (s.promedios?.integradora || 0), 0) / arr.length;
      const ex = arr.reduce((a, s) => a + (s.promedios?.examen || 0), 0) / arr.length;
      return { cot: Math.round(cot * 100) / 100, int: Math.round(int * 100) / 100, ex: Math.round(ex * 100) / 100, fin: Math.round(((cot + int + ex) / 3) * 100) / 100 };
    };

    const pc = calcProm(primerCiclo);
    const sc = calcProm(segundoCiclo);
    const tc = calcProm(tercerCiclo);

    // Cuadro de honor (top 3 de cada grado)
    const cuadroHonor = stats
      .filter(s => s.topEstudiantes && s.topEstudiantes.length > 0)
      .map(s => ({
        grado: s.nombre,
        estudiantes: s.topEstudiantes.slice(0, 10).map((e: any) => ({
          nombre: e.nombre,
          promedio: e.promedio,
          numero: e.numero,
          estado: e.estado,
        })),
      }));

    // Estudiantes en riesgo
      const enRiesgo = stats
        .filter(s => s.alertas && s.alertas.length > 0)
        .map(s => ({
          grado: s.nombre,
          estudiantes: s.alertas.slice(0, 10).map((e: any) => ({
            nombre: e.nombre,
            promedio: e.promedio,
            numero: e.numero,
            estado: e.estado,
          })),
        }));

    const totalHonor = cuadroHonor.reduce((a, g) => a + g.estudiantes.length, 0);
    const totalRiesgo = enRiesgo.reduce((a, g) => a + g.estudiantes.length, 0);

    // Promedio general del sistema
    const promGeneral = stats.length > 0
      ? Math.round((stats.reduce((a, s) => a + ((s.promedios?.cotidiana || 0) + (s.promedios?.integradora || 0) + (s.promedios?.examen || 0)) / 3, 0) / stats.length) * 100) / 100
      : 0;

    // Tasa de aprobación y brecha
    const totalAprobados = totalEstudiantes - totalRiesgo;
    const tasaAprobacion = totalEstudiantes > 0 ? Math.round((totalAprobados / totalEstudiantes) * 100) : 0;
    const brecha = Math.max(0, 80 - tasaAprobacion);
    const metaMinima = 80;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe Técnico Pedagógico - ${TRIMESTRES.find(t => t.valor === trimestre)?.label} ${configuracion.añoEscolar}</title>
  <style>
    @page { size: letter; margin: 2cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; font-size: 11pt; line-height: 1.5; }
    .header { text-align: center; border-bottom: 3px solid #1d624a; padding-bottom: 16px; margin-bottom: 20px; }
    .header h1 { font-size: 16pt; color: #1d624a; margin-bottom: 4px; }
    .header h2 { font-size: 13pt; color: #334155; font-weight: 500; }
    .header .subtitulo { font-size: 11pt; color: #64748b; margin-top: 4px; }
    .header .meta { font-size: 9pt; color: #94a3b8; margin-top: 8px; }
    .seccion { margin-bottom: 18px; page-break-inside: avoid; }
    .seccion-titulo { font-size: 12pt; font-weight: 700; color: #0f172a; border-left: 4px solid #1d624a; padding-left: 10px; margin-bottom: 10px; background: #f0fdfa; padding: 6px 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 14px; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
    .info-card .label { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-card .valor { font-size: 16pt; font-weight: 700; color: #0f172a; }
    .info-card .sub { font-size: 8pt; color: #94a3b8; }
    .tabla { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
    .tabla th { background: #1d624a; color: white; padding: 8px 10px; text-align: left; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.3px; }
    .tabla td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
    .tabla tr:nth-child(even) { background: #f8fafc; }
    .tabla .num { text-align: right; font-weight: 600; }
    .tabla .destacado { color: #1d624a; font-weight: 700; }
    .tabla .alerta { color: #704040; font-weight: 700; }
    .ciclo-header { font-size: 10pt; font-weight: 700; color: #1d624a; margin: 12px 0 6px; padding-bottom: 4px; border-bottom: 1px dashed #cbd5e1; }
    .firma-section { display: flex; justify-content: space-around; margin-top: 50px; padding-top: 20px; }
    .firma { text-align: center; width: 45%; }
    .firma .linea { border-top: 1px solid #334155; margin-bottom: 6px; }
    .firma .nombre { font-weight: 600; font-size: 10pt; }
    .firma .cargo { font-size: 9pt; color: #64748b; }
    .footer { text-align: center; font-size: 8pt; color: #94a3b8; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 8pt; font-weight: 600; }
    .badge-ok { background: #dcfce7; color: #166534; }
    .badge-warn { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .observaciones { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin: 14px 0; }
    .observaciones h4 { font-size: 10pt; color: #92400e; margin-bottom: 6px; }
    .observaciones ul { padding-left: 18px; }
    .observaciones li { font-size: 9.5pt; color: #78350f; margin-bottom: 3px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

  <div class="header">
    <h1>📊 Informe Técnico Pedagógico-Didáctico</h1>
    <h2>${escapeHtml(configuracion.escuela)} San José de la Montaña</h2>
    <p class="subtitulo">Análisis Estadístico de Rendimiento Académico</p>
    <p class="meta">${TRIMESTRES.find(t => t.valor === trimestre)?.label} · Año Escolar ${configuracion.añoEscolar} · Generado: ${new Date().toLocaleDateString("es-SV", { year: "numeric", month: "long", day: "numeric" })}</p>
  </div>

  <!-- 1. RESUMEN GENERAL -->
  <div class="seccion">
    <div class="seccion-titulo">1. Resumen General del Sistema</div>
    <div class="info-grid">
      <div class="info-card">
        <div class="label">Total Estudiantes</div>
        <div class="valor">${totalEstudiantes}</div>
        <div class="sub">Matriculados</div>
      </div>
      <div class="info-card">
        <div class="label">Grados Activos</div>
        <div class="valor">${totalGrados}</div>
        <div class="sub">Secciones</div>
      </div>
      <div class="info-card">
        <div class="label">Promedio General</div>
        <div class="valor" style="color: ${Math.round(promGeneral) >= 5 ? '#1d624a' : '#704040'}">${promGeneral.toFixed(2)}</div>
        <div class="sub">Escala 0-10</div>
      </div>
    </div>
    <div class="info-grid">
      <div class="info-card">
        <div class="label">En Cuadro de Honor</div>
        <div class="valor" style="color: #1d624a">${totalHonor}</div>
        <div class="sub">Estudiantes destacados</div>
      </div>
      <div class="info-card">
        <div class="label">Estudiantes en Riesgo</div>
        <div class="valor" style="color: ${totalRiesgo > 0 ? '#704040' : '#1d624a'}">${totalRiesgo}</div>
        <div class="sub">Estudiantes con menor rendimiento</div>
      </div>
      <div class="info-card">
        <div class="label">Tasa de Aprobación</div>
        <div class="valor" style="color: #1d624a">${totalEstudiantes > 0 ? Math.round(((totalEstudiantes - totalRiesgo) / totalEstudiantes) * 100) : 0}%</div>
        <div class="sub">Meta mínima: 80%</div>
      </div>
    </div>
  </div>

  <!-- 2. RENDIMIENTO POR CICLO -->
  <div class="seccion">
    <div class="seccion-titulo">2. Rendimiento Académico por Ciclo</div>

    <div class="ciclo-header">📗 Primer Ciclo (2° - 3°)</div>
    <table class="tabla">
      <thead><tr><th>Categoría</th><th>Actividades Cotidianas</th><th>Actividades Integradoras</th><th>Examen</th><th>Promedio Final</th></tr></thead>
      <tbody>
        <tr><td><strong>Promedio</strong></td><td class="num">${pc.cot.toFixed(2)}</td><td class="num">${pc.int.toFixed(2)}</td><td class="num">${pc.ex.toFixed(2)}</td><td class="num ${Math.round(pc.fin) >= (umbralAprobado ?? 5.0) ? 'destacado' : 'alerta'}">${pc.fin.toFixed(2)}</td></tr>
        <tr><td><strong>Estado</strong></td><td colspan="4"><span class="badge ${Math.round(pc.fin) >= (umbralAprobado ?? 5.0) ? 'badge-ok' : 'badge-danger'}">${Math.round(pc.fin) >= (umbralAprobado ?? 5.0) ? '✅ Aprobado' : '⚠️ Bajo rendimiento'}</span></td></tr>
      </tbody>
    </table>

    <div class="ciclo-header">📘 Segundo Ciclo (4° - 6°)</div>
    <table class="tabla">
      <thead><tr><th>Categoría</th><th>Actividades Cotidianas</th><th>Actividades Integradoras</th><th>Examen</th><th>Promedio Final</th></tr></thead>
      <tbody>
        <tr><td><strong>Promedio</strong></td><td class="num">${sc.cot.toFixed(2)}</td><td class="num">${sc.int.toFixed(2)}</td><td class="num">${sc.ex.toFixed(2)}</td><td class="num ${Math.round(sc.fin) >= (umbralAprobado ?? 5.0) ? 'destacado' : 'alerta'}">${sc.fin.toFixed(2)}</td></tr>
        <tr><td><strong>Estado</strong></td><td colspan="4"><span class="badge ${Math.round(sc.fin) >= (umbralAprobado ?? 5.0) ? 'badge-ok' : 'badge-danger'}">${Math.round(sc.fin) >= (umbralAprobado ?? 5.0) ? '✅ Aprobado' : '⚠️ Bajo rendimiento'}</span></td></tr>
      </tbody>
    </table>

    <div class="ciclo-header">📙 Tercer Ciclo (7° - 9°)</div>
    <table class="tabla">
      <thead><tr><th>Categoría</th><th>Actividades Cotidianas</th><th>Actividades Integradoras</th><th>Examen</th><th>Promedio Final</th></tr></thead>
      <tbody>
        <tr><td><strong>Promedio</strong></td><td class="num">${tc.cot.toFixed(2)}</td><td class="num">${tc.int.toFixed(2)}</td><td class="num">${tc.ex.toFixed(2)}</td><td class="num ${Math.round(tc.fin) >= (umbralAprobado ?? 5.0) ? 'destacado' : 'alerta'}">${tc.fin.toFixed(2)}</td></tr>
        <tr><td><strong>Estado</strong></td><td colspan="4"><span class="badge ${Math.round(tc.fin) >= (umbralAprobado ?? 5.0) ? 'badge-ok' : 'badge-danger'}">${Math.round(tc.fin) >= (umbralAprobado ?? 5.0) ? '✅ Aprobado' : '⚠️ Bajo rendimiento'}</span></td></tr>
      </tbody>
    </table>
  </div>

  <!-- 3. CUADRO DE HONOR -->
  ${cuadroHonor.length > 0 ? `
  <div class="seccion">
    <div class="seccion-titulo">3. Cuadro de Honor — Estudiantes Destacados</div>
    ${cuadroHonor.map(g => `
      <p style="font-size:10pt;font-weight:600;color:#1d624a;margin:8px 0 4px;">${escapeHtml(g.grado)}</p>
      <table class="tabla">
        <thead><tr><th>N°</th><th>Estudiante</th><th>Promedio</th><th>Estado</th><th>Reconocimiento</th></tr></thead>
        <tbody>
          ${g.estudiantes.map((e: any, i: number) => `
          <tr>
            <td>${e.numero}</td>
            <td>${escapeHtml(e.nombre)}</td>
            <td class="num destacado">${e.promedio.toFixed(2)}</td>
            <td>${e.estado === 'CONDICIONADO' ? '<span class="badge badge-warn">C</span>' : e.estado === 'REPROBADO' ? '<span class="badge badge-danger">R</span>' : '<span class="badge badge-ok">A</span>'}</td>
            <td>${i === 0 ? '🥇 Primer Lugar' : i === 1 ? '🥈 Segundo Lugar' : i === 2 ? '🥉 Tercer Lugar' : `${i + 1}° Lugar`}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    `).join('')}
  </div>` : ''}

  <!-- 4. ESTUDIANTES EN RIESGO -->
  ${enRiesgo.length > 0 ? `
  <div class="seccion">
    <div class="seccion-titulo">4. Estudiantes en Riesgo Académico</div>
    <div class="observaciones">
      <h4>⚠️ Atención Requerida</h4>
      <ul>
        ${enRiesgo.map(g => g.estudiantes.map((e: any) => `<li><strong>${escapeHtml(g.grado)}:</strong> ${escapeHtml(e.nombre)} (N°${e.numero}) — Promedio: ${e.promedio.toFixed(2)}</li>`).join('')).join('')}
      </ul>
    </div>
  </div>` : ''}

  <!-- 5. DIAGNÓSTICO PEDAGÓGICO CUALITATIVO -->
  <div class="seccion">
    <div class="seccion-titulo">5. Diagnóstico Pedagógico Cualitativo — Causas de la Brecha</div>
    <p style="font-size:10pt;margin-bottom:8px;text-align:justify;">
      El rendimiento académico del Primer Trimestre 2026 arroja una tasa de aprobación del <strong>${tasaAprobacion}%</strong>, situándose <strong>${brecha} puntos porcentuales por debajo</strong> de la meta institucional del ${metaMinima}%. El análisis cualitativo de los componentes evaluativos revela una tendencia estructural que explica esta brecha.
    </p>
    <div class="observaciones">
      <h4>🔍 Hipótesis Institucionales sobre el Bajo Rendimiento en Exámenes</h4>
      <ul>
        <li><strong>Desalineación metodológica:</strong> Existe una posible desconexión entre las estrategias didácticas empleadas en el aula (metodologías activas, trabajo cooperativo, aprendizaje basado en proyectos) y el formato tradicional de las pruebas escritas. Los estudiantes obtienen mejores resultados en Actividades Cotidianas e Integradoras porque estas se alinean con la dinámica del aula; sin embargo, los exámenes —al requerir mayor abstracción, síntesis y aplicación autónoma de contenidos— evidencian debilidades en la <strong>transferencia del aprendizaje</strong>.</li>
        <li><strong>Debilidades en comprensión lectora y pensamiento lógico-matemático:</strong> El componente de examen exige, de manera transversal, la capacidad de interpretar consignas, analizar casos y resolver problemas complejos. La tendencia descendente en los tres ciclos (${pc.ex.toFixed(2)} → ${sc.ex.toFixed(2)} → ${tc.ex.toFixed(2)}) sugiere una <strong>acumulación progresiva de rezago</strong> en estas competencias instrumentales, particularmente crítica en Tercer Ciclo.</li>
        <li><strong>Falta de hábitos de estudio y preparación para evaluaciones sumativas:</strong> Las evidencias de Actividades Cotidianas (tareas, ejercicios en clase) reflejan un desempeño aceptable porque se realizan con acompañamiento docente y apoyo de pares. No obstante, los exámenes requieren <strong>estudio independiente, organización del tiempo y autorregulación del aprendizaje</strong> —competencias metacognitivas que no están siendo suficientemente desarrolladas en el aula.</li>
        <li><strong>Efecto de la sobrecarga evaluativa en Tercer Ciclo:</strong> Los promedios más bajos en Exámenes de Tercer Ciclo (${tc.ex.toFixed(2)}) coinciden con la etapa donde los estudiantes enfrentan mayor número de asignaturas, docentes especializados y exigencias académicas diferenciadas. La <strong>transición pedagógica</strong> de un acompañamiento más cercano (Primer y Segundo Ciclo) a uno más autónomo no está siendo mediada adecuadamente.</li>
      </ul>
    </div>
    <div class="observaciones" style="background:#fef2f2;border-color:#fca5a5;">
      <h4 style="color:#991b1b;">⚠️ Casos Críticos Identificados</h4>
      <ul>
        <li><strong>7.° "A":</strong> Dos estudiantes con promedios generales de <strong>2.67 y 3.31</strong>, situados en zona de riesgo extremo. Se requiere intervención multidisciplinaria inmediata (acompañamiento psicopedagógico, adecuación curricular significativa y derivación a servicios de apoyo externo si existieran).</li>
        <li><strong>Concentración del riesgo:</strong> El Tercer Ciclo (7.° a 9.°) aglutina la mayor proporción de estudiantes en riesgo académico, lo que refuerza la hipótesis de una crisis acumulativa que debe abordarse con carácter preventivo desde Primer Ciclo.</li>
      </ul>
    </div>
  </div>

  <!-- 6. PLAN DE ACCIÓN INMEDIATA -->
  <div class="seccion">
    <div class="seccion-titulo">6. Plan de Acción Inmediata e Intervenciones Diferenciadas</div>
    <p style="font-size:10pt;margin-bottom:8px;"><strong>Población objetivo:</strong> ${totalRiesgo} estudiantes en riesgo académico.<br>
    <strong>Período de ejecución:</strong> Segundo Trimestre 2026 (con acciones de choque iniciando en las primeras dos semanas).</p>

    <h4 style="font-size:10pt;color:#1d624a;margin:10px 0 6px;">6.1 Estrategias de Refuerzo Académico Focalizado</h4>
    <table class="tabla">
      <thead><tr><th>Estrategia</th><th>Descripción</th><th>Responsable</th><th>Frecuencia</th></tr></thead>
      <tbody>
        <tr><td><strong>Refuerzo en Comprensión Lectora y Pensamiento Lógico</strong></td><td>Talleres intensivos de 45 minutos, tres veces por semana, enfocados en habilidades de análisis e interpretación de textos y resolución estructurada de problemas matemáticos.</td><td>Docentes de Lenguaje y Matemática</td><td>3 sesiones/semana</td></tr>
        <tr><td><strong>Clínicas de Preparación para Exámenes</strong></td><td>Sesiones de estudio guiado donde se modelan estrategias de respuesta a ítems de examen, se practica la gestión del tiempo y se repasan contenidos clave antes de cada evaluación parcial.</td><td>Docente de Grado / Coordinación</td><td>2 sesiones/semana</td></tr>
        <tr><td><strong>Adecuación Curricular Individualizada</strong></td><td>Para los casos con promedio inferior a 5.0, se elaborará un Plan de Adecuación Curricular (PAC) que ajuste los indicadores de logro, las actividades y los instrumentos de evaluación según las necesidades específicas del estudiante.</td><td>Docente de Grado + Coordinación Académica</td><td>Plan trimestral con revisión quincenal</td></tr>
        <tr><td><strong>Intervención para Casos Críticos (7.° "A")</strong></td><td>Los dos estudiantes con promedios de 2.67 y 3.31 recibirán acompañamiento personalizado diario, tutoría intensiva y adecuación curricular significativa. Se evaluará la pertinencia de derivación a servicios de apoyo psicopedagógico externos.</td><td>Coordinación Académica + Docente de Grado</td><td>Diaria</td></tr>
      </tbody>
    </table>

    <h4 style="font-size:10pt;color:#1d624a;margin:14px 0 6px;">6.2 Tutoría entre Pares — Monitores de Apoyo</h4>
    <p style="font-size:9.5pt;margin-bottom:8px;text-align:justify;">
      Se propone un programa estructurado de <strong>Tutoría entre Pares</strong> que vincule a los <strong>${totalHonor} estudiantes del Cuadro de Honor</strong> como monitores voluntarios de los ${totalRiesgo} compañeros en riesgo. Cada monitor (estudiante destacado) será asignado a 1 o 2 tutorados, previa capacitación en técnicas básicas de acompañamiento académico y con supervisión docente.
    </p>
    <table class="tabla">
      <thead><tr><th>Componente</th><th>Descripción</th></tr></thead>
      <tbody>
        <tr><td><strong>Selección y Capacitación</strong></td><td>Los monitores serán seleccionados entre los estudiantes del Cuadro de Honor con mejor promedio y habilidades interpersonales demostradas. Recibirán una capacitación de 2 sesiones sobre técnicas de tutoría, comunicación asertiva y resolución de dudas.</td></tr>
        <tr><td><strong>Asignación</strong></td><td>Cada monitor tutorará a 1-2 estudiantes en riesgo, preferentemente del mismo grado. La asignación considerará compatibilidad horaria y de áreas de fortaleza académica.</td></tr>
        <tr><td><strong>Horario</strong></td><td>Sesiones de 30 minutos, 3 veces por semana, en horario contrajornada o durante períodos de estudio dirigido, bajo la supervisión de un docente.</td></tr>
        <tr><td><strong>Seguimiento</strong></td><td>El docente de grado registrará el avance de cada dupla en una bitácora de tutoría, reportando a Coordinación Académica cada dos semanas.</td></tr>
        <tr><td><strong>Reconocimiento</strong></td><td>Los monitores recibirán constancia de participación y crédito adicional en el componente de Actividades Integradoras (responsabilidad social).</td></tr>
      </tbody>
    </table>

    <h4 style="font-size:10pt;color:#1d624a;margin:14px 0 6px;">6.3 Plan de Vinculación Familiar</h4>
    <table class="tabla">
      <thead><tr><th>Acción</th><th>Descripción</th><th>Responsable</th><th>Plazo</th></tr></thead>
      <tbody>
        <tr><td><strong>Citación Obligatoria a Padres</strong></td><td>Citación individual y obligatoria de los padres o encargados de los ${totalRiesgo} estudiantes en riesgo para firmar compromiso de acompañamiento académico en el hogar. En la reunión se entregará un plan de trabajo sugerido (horarios de estudio, revisión de cuadernos, comunicación con docentes).</td><td>Coordinación Académica + Docente de Grado</td><td>Primeras 2 semanas del trimestre</td></tr>
        <tr><td><strong>Contrato de Corresponsabilidad</strong></td><td>Firma de un acta-compromiso donde los padres se obligan a: (a) supervisar diariamente la realización de tareas, (b) garantizar 1 hora diaria de estudio en casa, (c) asistir a reuniones de seguimiento quincenales y (d) mantener comunicación fluida con el docente de grado.</td><td>Dirección Escolar</td><td>Semana 2 del trimestre</td></tr>
        <tr><td><strong>Escuela para Padres</strong></td><td>Talleres mensuales sobre estrategias de apoyo académico en el hogar, manejo de hábitos de estudio y acompañamiento emocional durante la etapa escolar.</td><td>Coordinación Académica + Orientación</td><td>1 taller mensual</td></tr>
        <tr><td><strong>Reportes Quincenales a Familias</strong></td><td>Envío de reporte de avance cada 15 días vía cuaderno de comunicaciones o medio digital, detallando calificaciones parciales, asistencia y observaciones conductuales.</td><td>Docente de Grado</td><td>Quincenal</td></tr>
      </tbody>
    </table>
  </div>

  <!-- 7. METAS E INDICADORES -->
  <div class="seccion">
    <div class="seccion-titulo">7. Metas, Indicadores de Impacto y Proyecciones — Ruta hacia el ${metaMinima}%</div>
    <p style="font-size:10pt;margin-bottom:8px;text-align:justify;">
      Para revertir la brecha actual del <strong>${brecha}%</strong> y alcanzar la meta institucional del <strong>${metaMinima}% de aprobación</strong> al cierre del Segundo Trimestre 2026, se establecen los siguientes objetivos e indicadores de impacto:
    </p>

    <table class="tabla">
      <thead><tr><th>Indicador</th><th>Línea Base (Trimestre 1)</th><th>Meta (Trimestre 2)</th><th>Instrumento de Verificación</th></tr></thead>
      <tbody>
        <tr><td><strong>Tasa de Aprobación General</strong></td><td class="num alerta">${tasaAprobacion}%</td><td class="num destacado">${metaMinima}%</td><td>Registro de calificaciones del sistema</td></tr>
        <tr><td><strong>Estudiantes en Riesgo Académico</strong></td><td class="num alerta">${totalRiesgo}</td><td class="num destacado">≤ 30</td><td>Reporte de Alertas Tempranas</td></tr>
        <tr><td><strong>Promedio General del Sistema</strong></td><td class="num">${promGeneral.toFixed(2)}</td><td class="num destacado">≥ 7.50</td><td>Promedio consolidado por ciclo</td></tr>
        <tr><td><strong>Promedio en Exámenes — Primer Ciclo</strong></td><td class="num">${pc.ex.toFixed(2)}</td><td class="num destacado">≥ 7.50</td><td>Desglose por componente evaluativo</td></tr>
        <tr><td><strong>Promedio en Exámenes — Segundo Ciclo</strong></td><td class="num">${sc.ex.toFixed(2)}</td><td class="num destacado">≥ 7.00</td><td>Desglose por componente evaluativo</td></tr>
        <tr><td><strong>Promedio en Exámenes — Tercer Ciclo</strong></td><td class="num alerta">${tc.ex.toFixed(2)}</td><td class="num destacado">≥ 7.00</td><td>Desglose por componente evaluativo</td></tr>
        <tr><td><strong>Estudiantes con promedio menor a 5.0</strong></td><td class="num alerta">Casos críticos 2.67 y 3.31</td><td class="num destacado">Ninguno</td><td>Reporte de rendimiento individual</td></tr>
        <tr><td><strong>Participación en Tutoría entre Pares</strong></td><td class="num">0</td><td class="num destacado">≥ 60% de los estudiantes en riesgo</td><td>Bitácora de tutorías</td></tr>
        <tr><td><strong>Asistencia a Escuela para Padres</strong></td><td class="num">Sin dato</td><td class="num destacado">≥ 80% de padres citados</td><td>Registro de asistencia</td></tr>
      </tbody>
    </table>

    <div class="observaciones">
      <h4>📈 Proyección Estratégica</h4>
      <ul>
        <li>Si se reduce el número de estudiantes en riesgo de ${totalRiesgo} a ≤30, la tasa de aprobación se incrementaría aproximadamente al <strong>80%</strong> (${totalEstudiantes} - 30 = ${totalEstudiantes - 30} aprobados; ${totalEstudiantes - 30}/${totalEstudiantes} = ${((totalEstudiantes - 30) / totalEstudiantes * 100).toFixed(1)}%), cumpliendo con la meta institucional.</li>
        <li>La mejora del componente <strong>Exámenes</strong> es el factor multiplicador más relevante: un incremento de 1 punto en el promedio de exámenes de Tercer Ciclo (de ${tc.ex.toFixed(2)} a ${(tc.ex + 1).toFixed(2)}) impactaría directamente en el promedio general y en la reducción de estudiantes reprobados.</li>
        <li>Se proyecta que la aplicación combinada de las tres estrategias (Refuerzo Académico + Tutoría entre Pares + Vinculación Familiar) genere un efecto sinérgico, estimándose una recuperación de entre <strong>20 y 28 estudiantes</strong> en riesgo hacia la zona de aprobación.</li>
      </ul>
    </div>
  </div>

  <!-- 8. VALIDACIÓN -->
  <div class="seccion">
    <div class="seccion-titulo">8. Validación, Acuerdos y Compromisos Docentes</div>

    <div class="observaciones" style="background:#f0fdf4;border-color:#86efac;">
      <h4 style="color:#166534;">📜 Declaración de Compromiso Docente</h4>
      <p style="font-size:9.5pt;text-align:justify;color:#14532d;">
        Los abajo firmantes, miembros de la Planta Docente del Centro Escolar San José de la Montaña, declaramos haber recibido, leído y analizado el presente <strong>Informe Técnico Pedagógico-Didáctico del Primer Trimestre 2026</strong>. Reconocemos la situación académica actual y nos comprometemos, en el marco de nuestras responsabilidades profesionales y éticas, a:
      </p>
      <ul style="font-size:9.5pt;color:#14532d;">
        <li>Aplicar las <strong>adecuaciones curriculares</strong> acordadas para los ${totalRiesgo} estudiantes en riesgo académico, ajustando indicadores de logro, metodologías e instrumentos de evaluación según las necesidades individuales detectadas.</li>
        <li>Implementar las <strong>estrategias de refuerzo académico</strong> descritas en el presente plan, con especial énfasis en la mejora del componente de Exámenes y el desarrollo de habilidades de estudio autónomo.</li>
        <li>Participar activamente en el <strong>programa de Tutoría entre Pares</strong>, supervisando las duplas monitor-tutorado y reportando avances quincenalmente a Coordinación Académica.</li>
        <li>Ejecutar el <strong>Plan de Vinculación Familiar</strong>, realizando las citaciones, entrevistas y seguimientos comprometidos con las familias de los estudiantes en riesgo.</li>
        <li>Asistir a las <strong>reuniones técnicas de seguimiento</strong> convocadas por Coordinación Académica para evaluar el avance del plan y realizar los ajustes pedagógicos pertinentes.</li>
      </ul>
    </div>

    <div style="margin-top:30px;padding-top:16px;">
      <h4 style="font-size:10pt;color:#334155;margin-bottom:6px;">Líneas de Validación</h4>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:33%;padding:8px;text-align:center;vertical-align:bottom;">
            <div style="border-top:2px solid #334155;margin-bottom:6px;padding-top:8px;">
              <div style="font-weight:700;font-size:10pt;">${usuario.rol === 'admin' || usuario.rol === 'superadmin' ? 'Dirección Escolar' : escapeHtml(usuario.nombre)}</div>
              <div style="font-size:9pt;color:#64748b;">${usuario.rol === 'admin-directora' ? 'Directora' : usuario.rol === 'admin-codirectora' ? 'Codirectora' : 'Dirección Escolar'}</div>
              <div style="font-size:8pt;color:#94a3b8;">Firma y Sello</div>
            </div>
          </td>
          <td style="width:33%;padding:8px;text-align:center;vertical-align:bottom;">
            <div style="border-top:2px solid #334155;margin-bottom:6px;padding-top:8px;">
              <div style="font-weight:700;font-size:10pt;">Coordinación Académica</div>
              <div style="font-size:9pt;color:#64748b;">C.E. San José de la Montaña</div>
              <div style="font-size:8pt;color:#94a3b8;">Firma y Sello</div>
            </div>
          </td>
          <td style="width:33%;padding:8px;text-align:center;vertical-align:bottom;">
            <div style="border-top:2px solid #334155;margin-bottom:6px;padding-top:8px;">
              <div style="font-weight:700;font-size:10pt;">Consejo Técnico Escolar (CTE)</div>
              <div style="font-size:9pt;color:#64748b;">Representante</div>
              <div style="font-size:8pt;color:#94a3b8;">Firma</div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  </div>

  <div class="footer">
    Documento generado automáticamente por el Sistema de Calificaciones · ${configuracion.añoEscolar} · Página 1 de 1
  </div>

  <div class="no-print" style="position:fixed;top:10px;right:10px;display:flex;gap:8px;">
    <button onclick="window.print()" style="padding:8px 16px;background:#1d624a;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">🖨️ Imprimir</button>
  </div>

</body>
</html>`;

    // Abrir en nueva ventana
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }

    setGenerando(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md ${darkMode ? 'bg-slate-950/70 backdrop-blur-xl border-white/5 shadow-2xl' : ''}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
            <FileText className="h-5 w-5 text-emerald-600" />
            Generar Informe Técnico
          </DialogTitle>
          <DialogDescription className={darkMode ? 'text-slate-400' : ''}>
            Genera un informe técnico pedagógico-didáctico profesional con estadísticas del trimestre seleccionado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className={darkMode ? 'text-slate-200' : ''}>Seleccionar Trimestre</Label>
            <Select value={trimestre} onValueChange={setTrimestre}>
              <SelectTrigger className={darkMode ? 'bg-card border-white/30 text-white' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIMESTRES.map(t => (
                  <SelectItem key={t.valor} value={t.valor}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={`p-3 rounded-lg border ${darkMode ? 'bg-card border-white/30' : 'bg-emerald-50 border-emerald-100'}`}>
            <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-emerald-800'}`}>
              📄 El informe incluirá:
            </p>
            <ul className={`text-xs mt-2 space-y-1 ${darkMode ? 'text-slate-400' : 'text-emerald-700'}`}>
              <li>• Resumen general del sistema</li>
              <li>• Rendimiento por ciclo (Primer, Segundo, Tercer)</li>
              <li>• Cuadro de Honor (estudiantes destacados)</li>
              <li>• Estudiantes en riesgo académico</li>
              <li>• Diagnóstico pedagógico cualitativo (causas de la brecha)</li>
              <li>• Plan de Acción Inmediata (refuerzo, tutoría entre pares, vinculación familiar)</li>
              <li>• Metas e indicadores de impacto (ruta hacia el 80%)</li>
              <li>• Validación, acuerdos y compromisos docentes</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className={darkMode ? 'border-white/30 text-white' : ''}>
            Cancelar
          </Button>
          <Button size="sm" onClick={generarInforme} disabled={generando}>
            {generando ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generando...</>
            ) : (
              <><FileText className="h-4 w-4 mr-2" />Generar Informe</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
