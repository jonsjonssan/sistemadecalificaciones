import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fechaParam = searchParams.get("fecha");
    const gradoId = searchParams.get("gradoId");
    const materiaId = searchParams.get("materiaId");

    if (!fechaParam || !gradoId) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    const fecha = new Date(fechaParam);
    if (isNaN(fecha.getTime())) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }

    const prisma = prisma;

    const startOfDay = new Date(fecha);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(fecha);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const where: any = {
      estudiante: { gradoId },
      fecha: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    if (materiaId) {
      where.materiaId = materiaId;
    } else {
      where.materiaId = null;
    }

    const asistencias = await prisma.asistencia.findMany({
      where,
      include: {
        estudiante: { select: { id: true, nombre: true, numero: true } },
      },
      orderBy: { estudiante: { numero: "asc" } },
    });



    const formatted = asistencias.map((a: any) => ({
      id: a.id,
      estudianteId: a.estudianteId,
      fecha: a.fecha,
      estado: a.estado,
      gradoId: a.gradoId,
      materiaId: a.materiaId,
      estudiante: {
        id: a.estudiante.id,
        nombre: a.estudiante.nombre,
        numero: a.estudiante.numero,
      },
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error obteniendo asistencia:", error);
    return NextResponse.json({ error: "Error del servidor al obtener asistencia", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
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

    const startOfDay = new Date(fecha);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(fecha);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const prisma = prisma;

    const resultados: any[] = [];
    for (const record of asistencias) {
      const { estudianteId, estado } = record;

      const matId = materiaId || null;

      const existente = await prisma.asistencia.findFirst({
        where: {
          estudianteId,
          fecha: {
            gte: startOfDay,
            lte: endOfDay,
          },
          gradoId,
          materiaId: matId,
        },
      });

      if (existente) {
        const updated = await prisma.asistencia.update({
          where: { id: existente.id },
          data: { estado },
          include: {
            estudiante: { select: { id: true, nombre: true, numero: true } },
          },
        });
        resultados.push(updated);
      } else {
        const nuevo = await prisma.asistencia.create({
          data: {
            estudianteId,
            fecha: startOfDay,
            estado,
            gradoId,
            materiaId: matId,
          },
          include: {
            estudiante: { select: { id: true, nombre: true, numero: true } },
          },
        });
        resultados.push(nuevo);
      }
    }



    return NextResponse.json({ success: true, guardados: resultados.length });
  } catch (error) {
    console.error("Error guardando asistencia:", error);
    return NextResponse.json({ error: "Error del servidor al guardar asistencia", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaParam = searchParams.get("fecha");
    const gradoId = searchParams.get("gradoId");
    const materiaId = searchParams.get("materiaId");

    if (!fechaParam || !gradoId) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    const fecha = new Date(fechaParam);
    if (isNaN(fecha.getTime())) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }

    const startOfDay = new Date(fecha);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(fecha);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const prisma = prisma;

    const where: any = {
      fecha: {
        gte: startOfDay,
        lte: endOfDay,
      },
      gradoId,
    };

    if (materiaId) {
      where.materiaId = materiaId;
    } else {
      where.materiaId = null;
    }

    const deleted = await prisma.asistencia.deleteMany({ where });



    return NextResponse.json({ success: true, eliminados: deleted.count });
  } catch (error) {
    console.error("Error eliminando asistencia:", error);
    return NextResponse.json({ error: "Error del servidor al eliminar asistencia", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
