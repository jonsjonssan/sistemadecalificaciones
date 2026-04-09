import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

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

    const prisma = new PrismaClient();

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

    await prisma.$disconnect();

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

    const prisma = new PrismaClient();

    const resultados: any[] = [];
    let actualizados = 0;
    let creados = 0;

    for (const record of asistencias) {
      const { estudianteId, estado } = record;
      const matId = materiaId || null;

      try {
        // Usar upsert con la restricción única para evitar duplicados
        const resultado = await prisma.asistencia.upsert({
          where: {
            unica_asistencia_dia: {
              estudianteId,
              fecha: startOfDay,
              gradoId,
              materiaId: matId,
            }
          },
          update: {
            estado,
          },
          create: {
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

        // Determinar si fue actualización o creación
        const esNuevo = (Date.now() - resultado.createdAt.getTime()) < 2000;
        if (esNuevo) {
          creados++;
        } else {
          actualizados++;
        }

        resultados.push(resultado);
      } catch (error: any) {
        // Si hay error de restricción única, hacer update manual
        if (error.code === 'P2002' || error.code === 'P2025') {
          const existente = await prisma.asistencia.findFirst({
            where: {
              estudianteId,
              fecha: {
                gte: startOfDay,
                lte: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000),
              },
              gradoId,
              materiaId: matId,
            },
            orderBy: { createdAt: 'desc' }
          });

          if (existente) {
            const updated = await prisma.asistencia.update({
              where: { id: existente.id },
              data: { estado },
              include: {
                estudiante: { select: { id: true, nombre: true, numero: true } },
              },
            });
            actualizados++;
            resultados.push(updated);
          }
        } else {
          console.error("Error en upsert:", error);
          throw error;
        }
      }
    }

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      guardados: resultados.length,
      creados,
      actualizados,
      mensaje: `${creados} registros creados, ${actualizados} actualizados`
    });
  } catch (error) {
    console.error("Error guardando asistencia:", error);
    return NextResponse.json({
      error: "Error del servidor al guardar asistencia",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaParam = searchParams.get("fecha");
    const gradoId = searchParams.get("gradoId");
    const materiaId = searchParams.get("materiaId");
    const estudianteId = searchParams.get("estudianteId");

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

    const prisma = new PrismaClient();

    const where: any = {
      fecha: {
        gte: startOfDay,
        lte: endOfDay,
      },
      gradoId,
    };

    // Si se proporciona estudianteId, filtrar por ese estudiante
    if (estudianteId) {
      where.estudianteId = estudianteId;
    }

    // Manejar materiaId correctamente
    if (estudianteId) {
      // Si es borrado individual y se especifica materiaId, usarlo
      if (materiaId) {
        where.materiaId = materiaId;
      }
      // Si no se especifica materiaId en borrado individual, buscar todos
    } else {
      // Borrado masivo: filtrar por materiaId o null
      if (materiaId) {
        where.materiaId = materiaId;
      } else {
        where.materiaId = null;
      }
    }

    console.log("DELETE where clause:", JSON.stringify(where, null, 2));

    const deleted = await prisma.asistencia.deleteMany({ where });

    await prisma.$disconnect();

    return NextResponse.json({ success: true, eliminados: deleted.count });
  } catch (error) {
    console.error("Error eliminando asistencia:", error);
    return NextResponse.json({ error: "Error del servidor al eliminar asistencia", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
