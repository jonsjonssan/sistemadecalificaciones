import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fechaParam = searchParams.get("fecha");
    const fechaInicioParam = searchParams.get("fechaInicio");
    const fechaFinParam = searchParams.get("fechaFin");
    const gradoId = searchParams.get("gradoId");
    const materiaId = searchParams.get("materiaId");

    const whereClause: any = {};
    if (gradoId) whereClause.gradoId = gradoId;
    if (materiaId) whereClause.materiaId = materiaId;

    if (fechaParam) {
      const fecha = new Date(fechaParam);
      if (isNaN(fecha.getTime())) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
      whereClause.fecha = fecha;
    } else if (fechaInicioParam && fechaFinParam) {
      const inicio = new Date(fechaInicioParam);
      const fin = new Date(fechaFinParam);
      if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
        return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
      }
      whereClause.fecha = {
        gte: inicio,
        lte: fin
      };
    } else if (!gradoId) {
      return NextResponse.json({ error: "Faltan parámetros de búsqueda (fecha o rango + gradoId)" }, { status: 400 });
    }

    const asistencias = await prisma.asistencia.findMany({
      where: whereClause,
      include: {
        estudiante: {
          select: { id: true, nombre: true, numero: true }
        }
      },
      orderBy: { fecha: 'asc' }
    });

    return NextResponse.json(asistencias);
  } catch (error) {
    console.error("Error obteniendo asistencia:", error);
    return NextResponse.json({ error: "Error del servidor al obtener asistencia" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { asistencias, fecha: fechaStr, gradoId, materiaId } = body;

    if (!asistencias || !Array.isArray(asistencias) || !fechaStr || !gradoId) {
      return NextResponse.json({ error: "Datos de asistencia inválidos" }, { status: 400 });
    }

    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }

    // Guardar o actualizar asistenias en lote
    const resultados: any[] = [];
    for (const record of asistencias) {
      const { estudianteId, estado } = record;
      
      const existente = await prisma.asistencia.findFirst({
        where: {
          estudianteId,
          fecha,
          gradoId,
          materiaId: materiaId || null
        }
      });

      if (existente) {
        const actualizado = await prisma.asistencia.update({
          where: { id: existente.id },
          data: { estado }
        });
        resultados.push(actualizado);
      } else {
        const nuevo = await prisma.asistencia.create({
          data: {
            estudianteId,
            fecha,
            estado,
            gradoId,
            materiaId: materiaId || null
          }
        });
        resultados.push(nuevo);
      }
    }

    return NextResponse.json({ success: true, guardados: resultados.length });
  } catch (error) {
    console.error("Error guardando asistencia:", error);
    return NextResponse.json({ error: "Error del servidor al guardar asistencia" }, { status: 500 });
  }
}
