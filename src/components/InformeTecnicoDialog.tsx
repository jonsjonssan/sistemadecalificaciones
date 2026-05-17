"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Printer, Download, Loader2 } from "lucide-react";
import { escapeHtml } from "@/lib/utils/index";

interface InformeTecnicoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  darkMode: boolean;
  usuario: { nombre: string; rol: string };
  configuracion: { añoEscolar: number; escuela: string; umbralAprobado?: number };
  stats: any[];
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
  stats,
  grados,
}: InformeTecnicoProps) {
  const [trimestre, setTrimestre] = useState("1");
  const [generando, setGenerando] = useState(false);

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

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe Técnico Pedagógico - ${TRIMESTRES.find(t => t.valor === trimestre)?.label} ${configuracion.añoEscolar}</title>
  <style>
    @page { size: letter; margin: 2cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; font-size: 11pt; line-height: 1.5; }
    .header { text-align: center; border-bottom: 3px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px; }
    .header h1 { font-size: 16pt; color: #0d9488; margin-bottom: 4px; }
    .header h2 { font-size: 13pt; color: #334155; font-weight: 500; }
    .header .subtitulo { font-size: 11pt; color: #64748b; margin-top: 4px; }
    .header .meta { font-size: 9pt; color: #94a3b8; margin-top: 8px; }
    .seccion { margin-bottom: 18px; page-break-inside: avoid; }
    .seccion-titulo { font-size: 12pt; font-weight: 700; color: #0f172a; border-left: 4px solid #0d9488; padding-left: 10px; margin-bottom: 10px; background: #f0fdfa; padding: 6px 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 14px; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
    .info-card .label { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-card .valor { font-size: 16pt; font-weight: 700; color: #0f172a; }
    .info-card .sub { font-size: 8pt; color: #94a3b8; }
    .tabla { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
    .tabla th { background: #0d9488; color: white; padding: 8px 10px; text-align: left; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.3px; }
    .tabla td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
    .tabla tr:nth-child(even) { background: #f8fafc; }
    .tabla .num { text-align: right; font-weight: 600; }
    .tabla .destacado { color: #059669; font-weight: 700; }
    .tabla .alerta { color: #dc2626; font-weight: 700; }
    .ciclo-header { font-size: 10pt; font-weight: 700; color: #0d9488; margin: 12px 0 6px; padding-bottom: 4px; border-bottom: 1px dashed #cbd5e1; }
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
        <div class="valor" style="color: ${Math.round(promGeneral) >= 5 ? '#059669' : '#dc2626'}">${promGeneral.toFixed(2)}</div>
        <div class="sub">Escala 0-10</div>
      </div>
    </div>
    <div class="info-grid">
      <div class="info-card">
        <div class="label">En Cuadro de Honor</div>
        <div class="valor" style="color: #059669">${totalHonor}</div>
        <div class="sub">Estudiantes destacados</div>
      </div>
      <div class="info-card">
        <div class="label">Estudiantes en Riesgo</div>
        <div class="valor" style="color: ${totalRiesgo > 0 ? '#dc2626' : '#059669'}">${totalRiesgo}</div>
        <div class="sub">Estudiantes con menor rendimiento</div>
      </div>
      <div class="info-card">
        <div class="label">Tasa de Aprobación</div>
        <div class="valor" style="color: #059669">${totalEstudiantes > 0 ? Math.round(((totalEstudiantes - totalRiesgo) / totalEstudiantes) * 100) : 0}%</div>
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
      <p style="font-size:10pt;font-weight:600;color:#0d9488;margin:8px 0 4px;">${escapeHtml(g.grado)}</p>
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

  <!-- 5. ANÁLISIS Y RECOMENDACIONES -->
  <div class="seccion">
    <div class="seccion-titulo">5. Análisis Didáctico-Pedagógico</div>
    <div class="observaciones">
      <h4>📋 Observaciones</h4>
      <ul>
        <li>El promedio general del sistema es de <strong>${promGeneral.toFixed(2)}</strong>, ${Math.round(promGeneral) >= 5 ? 'lo cual indica un rendimiento' : 'lo cual indica un rendimiento que requiere intervención'}.
        ${Math.round(promGeneral) >= 7 ? ' satisfactorio y dentro de los parámetros esperados.' : Math.round(promGeneral) >= (umbralAprobado ?? 5.0) ? ' aceptable pero con margen de mejora.' : ' por debajo del umbral de aprobación (' + (umbralAprobado ?? 5.0).toFixed(2) + ').'}</li>
        ${Math.round(pc.fin) < 5 ? `<li>El <strong>Primer Ciclo</strong> presenta un promedio de ${pc.fin.toFixed(2)}, por debajo del umbral. Se recomienda refuerzo pedagógico inmediato.</li>` : ''}
        ${Math.round(sc.fin) < 5 ? `<li>El <strong>Segundo Ciclo</strong> presenta un promedio de ${sc.fin.toFixed(2)}, por debajo del umbral. Se recomienda refuerzo pedagógico inmediato.</li>` : ''}
        ${Math.round(tc.fin) < 5 ? `<li>El <strong>Tercer Ciclo</strong> presenta un promedio de ${tc.fin.toFixed(2)}, por debajo del umbral. Se recomienda refuerzo pedagógico inmediato.</li>` : ''}
        ${totalRiesgo > 0 ? `<li>Se identificaron <strong>${totalRiesgo} estudiantes en riesgo</strong> que requieren planes de intervención individualizados.</li>` : ''}
        ${totalHonor > 0 ? `<li><strong>${totalHonor} estudiantes</strong> se encuentran en cuadro de honor, demostrando excelencia académica.</li>` : ''}
        <li>Se sugiere revisar las estrategias de evaluación en las áreas con menor rendimiento para optimizar los resultados del próximo trimestre.</li>
      </ul>
    </div>
  </div>

  <!-- FIRMAS -->
  <div class="firma-section">
    <div class="firma">
      <div class="linea"></div>
      <div class="nombre">${escapeHtml(usuario.nombre)}</div>
      <div class="cargo">${usuario.rol === 'admin-directora' ? 'Directora' : usuario.rol === 'admin-codirectora' ? 'Codirectora' : 'Administrador del Sistema'}</div>
    </div>
    <div class="firma">
      <div class="linea"></div>
      <div class="nombre">Coordinación Académica</div>
      <div class="cargo">Centro Escolar San José de la Montaña</div>
    </div>
  </div>

  <div class="footer">
    Documento generado automáticamente por el Sistema de Calificaciones · ${configuracion.añoEscolar} · Página 1 de 1
  </div>

  <div class="no-print" style="position:fixed;top:10px;right:10px;display:flex;gap:8px;">
    <button onclick="window.print()" style="padding:8px 16px;background:#0d9488;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">🖨️ Imprimir</button>
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
      <DialogContent className={`max-w-md ${darkMode ? 'bg-[#121923] border-slate-700' : ''}`}>
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
            <Label className={darkMode ? 'text-slate-400' : ''}>Seleccionar Trimestre</Label>
            <Select value={trimestre} onValueChange={setTrimestre}>
              <SelectTrigger className={darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIMESTRES.map(t => (
                  <SelectItem key={t.valor} value={t.valor}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-emerald-50 border-emerald-100'}`}>
            <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-emerald-800'}`}>
              📄 El informe incluirá:
            </p>
            <ul className={`text-xs mt-2 space-y-1 ${darkMode ? 'text-slate-400' : 'text-emerald-700'}`}>
              <li>• Resumen general del sistema</li>
              <li>• Rendimiento por ciclo (Primer, Segundo, Tercer)</li>
              <li>• Cuadro de Honor (estudiantes destacados)</li>
              <li>• Estudiantes en riesgo académico</li>
              <li>• Análisis y recomendaciones pedagógicas</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className={darkMode ? 'border-slate-600 text-slate-400' : ''}>
            Cancelar
          </Button>
          <Button size="sm" onClick={generarInforme} disabled={generando} className="bg-emerald-600 hover:bg-emerald-700">
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
