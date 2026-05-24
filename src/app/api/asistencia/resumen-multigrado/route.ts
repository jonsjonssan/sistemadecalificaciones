import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { requireSession } from "@/lib/api-middleware";

export async function GET(req: Request) {
  const { error: authError } = await requireSession();
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    const gradoIdsParam = searchParams.get("gradoIds");
    const mes = searchParams.get("mes");
    const anual = searchParams.get("anual") === "true";
    const incluirFechas = searchParams.get("incluirFechas") === "true";

    if (!gradoIdsParam) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    const gradoIds = gradoIdsParam.split(",").filter(Boolean);
    if (gradoIds.length === 0) {
      return NextResponse.json({ error: "Debe especificar al menos un grado" }, { status: 400 });
    }

    let año: number;
    const añoParam = searchParams.get("año");
    if (añoParam) {
      año = parseInt(añoParam);
    } else {
      const configResult = await sql`SELECT "añoEscolar" FROM "ConfiguracionSistema" LIMIT 1`;
      año = configResult.length > 0 ? configResult[0].añoEscolar : new Date().getFullYear();
    }

    let startDate: string | undefined;
    let endDate: string | undefined;

    if (anual) {
      startDate = new Date(año, 0, 1).toISOString();
      endDate = new Date(año, 11, 31, 23, 59, 59).toISOString();
    } else if (mes) {
      const [añoMes, m] = mes.split('-').map(Number);
      startDate = new Date(añoMes, m - 1, 1).toISOString();
      endDate = new Date(añoMes, m, 0, 23, 59, 59).toISOString();
    }

    const gradosInfo = await sql`
      SELECT id, numero, seccion FROM "Grado"
      WHERE id = ANY(${gradoIds})
      ORDER BY numero
    `;

    const resultados: any[] = [];
    let consolidado = { totalEstudiantes: 0, totalAsistencias: 0, totalAusencias: 0, totalTardanzas: 0, totalJustificadas: 0 };

    for (const grado of gradosInfo) {
      const estudiantes = await sql`
        SELECT id, numero, nombre FROM "Estudiante"
        WHERE "gradoId" = ${grado.id} AND activo = true
        ORDER BY numero
      `;

      let asistenciaRows: any[];
      if (startDate && endDate) {
        asistenciaRows = await sql`
          SELECT DISTINCT ON (a."estudianteId", a.fecha::date)
            a.estado, a.fecha, a."estudianteId", e.nombre as estudiante_nombre, e.numero as estudiante_numero
          FROM "Asistencia" a
          JOIN "Estudiante" e ON a."estudianteId" = e.id
          WHERE a."gradoId" = ${grado.id} AND e.activo = true AND a.fecha >= ${startDate} AND a.fecha <= ${endDate}
          ORDER BY a."estudianteId", a.fecha::date, a.fecha DESC
        `;
      } else {
        asistenciaRows = await sql`
          SELECT DISTINCT ON (a."estudianteId", a.fecha::date)
            a.estado, a.fecha, a."estudianteId", e.nombre as estudiante_nombre, e.numero as estudiante_numero
          FROM "Asistencia" a
          JOIN "Estudiante" e ON a."estudianteId" = e.id
          WHERE a."gradoId" = ${grado.id} AND e.activo = true
          ORDER BY a."estudianteId", a.fecha::date, a.fecha DESC
        `;
      }

      const resumen: Record<string, any> = {};
      asistenciaRows.forEach((a: any) => {
        const eid = a.estudianteId;
        if (!resumen[eid]) {
          resumen[eid] = {
            id: eid, nombre: a.estudiante_nombre, numero: a.estudiante_numero,
            asistencias: 0, ausencias: 0, tardanzas: 0, justificadas: 0, total: 0,
            fechasPresente: [], fechasAusente: [], fechasTardanza: [], fechasJustificada: [],
          };
        }
        resumen[eid].total++;
        const fechaStr = new Date(a.fecha).toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
        if (a.estado === "presente") { resumen[eid].asistencias++; if (incluirFechas) resumen[eid].fechasPresente.push(fechaStr); }
        else if (a.estado === "ausente") { resumen[eid].ausencias++; if (incluirFechas) resumen[eid].fechasAusente.push(fechaStr); }
        else if (a.estado === "tarde") { resumen[eid].tardanzas++; if (incluirFechas) resumen[eid].fechasTardanza.push(fechaStr); }
        else if (a.estado === "justificada") { resumen[eid].justificadas++; if (incluirFechas) resumen[eid].fechasJustificada.push(fechaStr); }
      });

      const estudiantesArray = Object.values(resumen).sort((a: any, b: any) => a.numero - b.numero);
      const sumaAsistencias = estudiantesArray.reduce((s: number, r: any) => s + r.asistencias, 0);
      const sumaAusencias = estudiantesArray.reduce((s: number, r: any) => s + r.ausencias, 0);
      const sumaTardanzas = estudiantesArray.reduce((s: number, r: any) => s + r.tardanzas, 0);
      const sumaJustificadas = estudiantesArray.reduce((s: number, r: any) => s + r.justificadas, 0);

      consolidado.totalEstudiantes += estudiantes.length;
      consolidado.totalAsistencias += sumaAsistencias;
      consolidado.totalAusencias += sumaAusencias;
      consolidado.totalTardanzas += sumaTardanzas;
      consolidado.totalJustificadas += sumaJustificadas;

      resultados.push({
        gradoId: grado.id,
        gradoNumero: grado.numero,
        gradoSeccion: grado.seccion,
        totalEstudiantes: estudiantes.length,
        resumen: estudiantesArray,
      });
    }

    return NextResponse.json({ grados: resultados, consolidado });
  } catch (error) {
    console.error("Error en resumen multigrado:", error);
    return NextResponse.json({ error: "Error al calcular resumen multigrado" }, { status: 500 });
  }
}
