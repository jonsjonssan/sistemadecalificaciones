import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gradoId = searchParams.get("gradoId");
    const mes = searchParams.get("mes");
    const trimestre = searchParams.get("trimestre");
    
    if (!gradoId) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    let startDate: string | undefined;
    let endDate: string | undefined;
    
    if (trimestre) {
      const t = parseInt(trimestre);
      const año = new Date().getFullYear();
      let startMonth: number, endMonth: number;
      if (t === 1) { startMonth = 1; endMonth = 4; }
      else if (t === 2) { startMonth = 5; endMonth = 8; }
      else { startMonth = 9; endMonth = 12; }
      startDate = new Date(año, startMonth - 1, 1).toISOString();
      endDate = new Date(año, endMonth, 0, 23, 59, 59).toISOString();
    } else if (mes) {
      const [año, m] = mes.split('-').map(Number);
      startDate = new Date(año, m - 1, 1).toISOString();
      endDate = new Date(año, m, 0, 23, 59, 59).toISOString();
    }

    let asistencia;
    if (startDate && endDate) {
      asistencia = await sql`
        SELECT a.estado, a."estudianteId", e.nombre as estudiante_nombre, e.numero as estudiante_numero
        FROM "Asistencia" a
        JOIN "Estudiante" e ON a."estudianteId" = e.id
        WHERE e."gradoId" = ${gradoId} AND a.fecha >= ${startDate} AND a.fecha <= ${endDate}
      `;
    } else {
      asistencia = await sql`
        SELECT a.estado, a."estudianteId", e.nombre as estudiante_nombre, e.numero as estudiante_numero
        FROM "Asistencia" a
        JOIN "Estudiante" e ON a."estudianteId" = e.id
        WHERE e."gradoId" = ${gradoId}
      `;
    }

    const resumen: Record<string, { id: string, nombre: string, numero: number, ausencias: number, tardanzas: number, asistencias: number, total: number }> = {};

    asistencia.forEach((a: any) => {
      const eid = a.estudianteId;
      if (!resumen[eid]) {
        resumen[eid] = { 
          id: eid, 
          nombre: a.estudiante_nombre, 
          numero: a.estudiante_numero,
          ausencias: 0, 
          tardanzas: 0, 
          asistencias: 0, 
          total: 0 
        };
      }
      
      resumen[eid].total++;
      if (a.estado === "ausente") resumen[eid].ausencias++;
      else if (a.estado === "tarde") resumen[eid].tardanzas++;
      else if (a.estado === "presente") resumen[eid].asistencias++;
    });

    return NextResponse.json(Object.values(resumen).sort((a: any, b: any) => a.numero - b.numero));
  } catch (error) {
    console.error("Error en resumen asistencia:", error);
    return NextResponse.json({ error: "Error al calcular resumen de asistencia" }, { status: 500 });
  }
}
