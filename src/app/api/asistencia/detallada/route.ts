import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gradoId = searchParams.get("gradoId");
    const estudianteId = searchParams.get("estudianteId");
    const mes = searchParams.get("mes");
    const anual = searchParams.get("anual") === "true";

    if (!gradoId) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    let startDate: string | undefined;
    let endDate: string | undefined;

    if (anual) {
      const año = new Date().getFullYear();
      startDate = new Date(año, 0, 1).toISOString();
      endDate = new Date(año, 11, 31, 23, 59, 59).toISOString();
    } else if (mes) {
      const [año, m] = mes.split('-').map(Number);
      startDate = new Date(año, m - 1, 1).toISOString();
      endDate = new Date(año, m, 0, 23, 59, 59).toISOString();
    }

    // Obtener estudiantes del grado
    const estudiantes = await sql`
      SELECT id, numero, nombre FROM "Estudiante" 
      WHERE "gradoId" = ${gradoId} AND activo = true
      ORDER BY numero
    `;

    // Si se solicita un estudiante específico, filtrar
    const estudiantesFiltrados = estudianteId
      ? estudiantes.filter((e: any) => e.id === estudianteId)
      : estudiantes;

    // Para cada estudiante, obtener su asistencia
    const resultado: any[] = [];

    for (const est of estudiantesFiltrados) {
      let asistenciaQuery;
      if (startDate && endDate) {
        asistenciaQuery = await sql`
          SELECT fecha, estado
          FROM "Asistencia"
          WHERE "estudianteId" = ${est.id} AND fecha >= ${startDate} AND fecha <= ${endDate}
          ORDER BY fecha ASC
        `;
      } else {
        asistenciaQuery = await sql`
          SELECT fecha, estado
          FROM "Asistencia"
          WHERE "estudianteId" = ${est.id}
          ORDER BY fecha ASC
        `;
      }

      // Convertir a formato útil
      const asistenciaPorDia: Record<string, string> = {};
      asistenciaQuery.forEach((a: any) => {
        const fechaStr = new Date(a.fecha).toISOString().split('T')[0];
        asistenciaPorDia[fechaStr] = a.estado;
      });

      resultado.push({
        id: est.id,
        numero: est.numero,
        nombre: est.nombre,
        asistenciaPorDia
      });
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error en asistencia-detallada:", error);
    return NextResponse.json({ error: "Error al obtener asistencia detallada" }, { status: 500 });
  }
}
