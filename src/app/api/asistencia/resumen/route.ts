import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gradoId = searchParams.get("gradoId");
    const trimestre = parseInt(searchParams.get("trimestre") || "1");
    const mes = searchParams.get("mes"); // Opcional: "2026-03"
    
    if (!gradoId) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    const whereClause: any = {
      estudiante: {
        gradoId: gradoId
      }
    };

    if (mes) {
      const [año, m] = mes.split('-').map(Number);
      const start = new Date(año, m - 1, 1);
      const end = new Date(año, m, 0, 23, 59, 59);
      whereClause.fecha = {
        gte: start,
        lte: end
      };
    }

    // Obtener todas las asistencias según el filtro
    const asistencias = await prisma.asistencia.findMany({
      where: whereClause,
      include: {
        estudiante: {
          select: { id: true, nombre: true, numero: true }
        }
      }
    });

    // Agrupar por estudiante
    const resumen: Record<string, { id: string, nombre: string, numero: number, ausencias: number, tardanzas: number, asistencias: number, total: number }> = {};

    asistencias.forEach(a => {
      const eid = a.estudianteId;
      if (!resumen[eid]) {
        resumen[eid] = { 
          id: eid, 
          nombre: a.estudiante.nombre, 
          numero: a.estudiante.numero,
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

    return NextResponse.json(Object.values(resumen).sort((a, b) => a.numero - b.numero));
  } catch (error) {
    console.error("Error en resumen asistencia:", error);
    return NextResponse.json({ error: "Error al calcular resumen de asistencia" }, { status: 500 });
  }
}
