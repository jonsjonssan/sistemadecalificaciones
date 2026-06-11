import { escapeHtml } from "./utils/index";

export interface BoletaCSSOptions {
  paperSize: "a4" | "letter";
  fontSize?: string;
}

export interface BoletaHeaderOptions {
  schoolName?: string;
  subtitle?: string;
  codigo?: string;
  logoUrl?: string;
}

export function getPaperCSS(paperSize: "a4" | "letter"): string {
  return paperSize === "a4"
    ? `@page { size: a4; margin: 8mm; }`
    : `@page { size: letter; margin: 12mm; }`;
}

export function getBoletaCSS(paperSize: "a4" | "letter", fontSize: string = "9pt"): string {
  return `
    ${getPaperCSS(paperSize)}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; font-size: ${fontSize}; line-height: 1.3; color: #333; }
    .boleta { max-width: 195mm; margin: 0 auto; padding: 3mm; }

    .header { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 8px; border-bottom: 2px solid #333; padding-bottom: 8px; }
    .logo { width: 65px; height: 65px; object-fit: contain; }
    .header-text { text-align: center; flex: 1; }
    .header-text h1 { font-size: 11pt; font-weight: bold; margin-bottom: 1px; text-transform: uppercase; line-height: 1.3; }
    .header-text h2 { font-size: 9pt; font-weight: normal; margin-bottom: 1px; }
    .header-text .codigo { font-size: 7pt; color: #555; }

    .titulo-boleta { text-align: center; background: #f3f4f6; padding: 5px; margin: 8px 0; border: 1px solid #333; }
    .titulo-boleta h3 { font-size: 11pt; text-transform: uppercase; letter-spacing: 1px; }
    .titulo-boleta.dark { background: #1e293b; color: white; border-color: #1e293b; }

    .info-estudiante { display: flex; justify-content: space-between; margin-bottom: 8px; padding: 6px 8px; background: #fafafa; border: 1px solid #ddd; border-radius: 3px; }
    .info-estudiante p { margin: 2px 0; font-size: ${fontSize}; }
    .info-estudiante .label { font-weight: bold; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td { border: 1px solid #333; padding: 3px 5px; text-align: center; font-size: ${fontSize}; }
    th { background: #e5e7eb; font-weight: bold; font-size: 8pt; }

    .resumen { display: flex; justify-content: space-between; margin: 10px 0; padding: 6px 10px; background: #f4f6f2; border: 2px solid #1d624a; border-radius: 3px; }
    .resumen-item { text-align: center; }
    .resumen-item .valor { font-size: 13pt; font-weight: bold; color: #1d624a; }
    .resumen-item.reprobado .valor { color: #704040; }
    .resumen-item.condicionado .valor { color: #b8912a; }
    .resumen-item .etiqueta { font-size: 8pt; color: #666; }

    .seccion-asistencia { margin: 8px 0; border: 1px solid #ddd; border-radius: 3px; overflow: hidden; page-break-inside: avoid; }
    .seccion-asistencia-header { background: #f8fafc; padding: 4px 8px; border-bottom: 1px solid #ddd; font-weight: bold; font-size: 8pt; display: flex; justify-content: space-between; }
    .asistencia-grid { display: grid; grid-template-columns: repeat(5, 1fr); padding: 6px; text-align: center; }
    .asistencia-item .n { font-size: 11pt; font-weight: bold; }
    .asistencia-item .l { font-size: 7pt; color: #666; text-transform: uppercase; }
    .asistencia-asist { color: #1d624a; }
    .asistencia-aus { color: #704040; }
    .asistencia-tard { color: #b8912a; }

    .observaciones { margin: 8px 0; padding: 6px 8px; border: 1px solid #333; border-radius: 3px; min-height: 45px; page-break-inside: avoid; }

    .firmas { display: flex; justify-content: space-between; margin-top: 20px; padding-top: 10px; page-break-inside: avoid; }
    .firma { text-align: center; width: 45%; }
    .firma .linea { border-top: 1px solid #333; margin-top: 30px; padding-top: 3px; }
    .firma .nombre { font-weight: bold; font-size: 9pt; }
    .firma .cargo { font-size: 7pt; color: #555; }

    .pie { margin-top: 12px; text-align: center; font-size: 7pt; color: #666; border-top: 1px solid #ccc; padding-top: 6px; }
    .pie p { margin: 1px 0; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  `;
}

export function getBoletaHeaderHTML(logoUrl: string, options?: { subtitle?: string; codigo?: string }): string {
  const subtitle = options?.subtitle ?? "Centro Educativo Católico";
  const codigo = options?.codigo ?? "Código: 88125 | Departamento: 06-San Salvador | Municipio: 0614 San Salvador";
  return `
    <div class="header">
      <img src="${logoUrl}" alt="Logo" class="logo" onerror="this.style.display='none'">
      <div class="header-text">
        <h1>Centro Escolar Católico<br>SAN JOSÉ DE LA MONTAÑA</h1>
        <h2>${escapeHtml(subtitle)}</h2>
        <p class="codigo">${escapeHtml(codigo)}</p>
      </div>
      <img src="${logoUrl}" alt="Logo" class="logo" onerror="this.style.display='none'">
    </div>
  `;
}

export function getBoletaHeaderHTMLShort(logoUrl: string, codigo?: string): string {
  const cod = codigo ?? "Código: 88125 | San Salvador";
  return `
    <div class="header">
      <img src="${logoUrl}" alt="Logo" class="logo" onerror="this.style.display='none'">
      <div class="header-text">
        <h1>Centro Escolar Católico<br>SAN JOSÉ DE LA MONTAÑA</h1>
        <p class="codigo">${escapeHtml(cod)}</p>
      </div>
      <img src="${logoUrl}" alt="Logo" class="logo" onerror="this.style.display='none'">
    </div>
  `;
}
