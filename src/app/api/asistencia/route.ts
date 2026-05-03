import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-middleware";

function canAccessGrado(session: any, gradoId: string): boolean {
  if (["admin", "admin-directora", "admin-codirectora"].includes(session.rol)) return true;
  return session.asignaturasAsignadas?.some((m: any) => m.gradoId === gradoId) ?? false;
}

export async function GET(req: Request) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    const fechaParam = searchParams.get("fecha");
    const gradoId = searchParams.get("gradoId");
    const materiaId = searchParams.get("materiaId");

    if (!fechaParam || !gradoId) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    if (!canAccessGrado(session, gradoId)) {
      return NextResponse.json({ error: "No tiene acceso a este grado" }, { status: 403 });
    }

    const fecha = new Date(fechaParam);
    if (isNaN(fecha.getTime())) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }

    const startOfDay = new Date(fecha);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(fecha);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const where: any = {
      gradoId,
      estudiante: { gradoId },
      fecha: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };
    if (materiaId) {
      where.materiaId = materiaId;
    }

    const asistCount = await db.asistencia.count({ where });
    console.log("GET asistencia - fecha:", fechaParam, "gradoId:", gradoId, "materiaId:", materiaId, "where:", JSON.stringify(where), "count:", asistCount);

    const asistencias = await db.asistencia.findMany({
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
  const { session, error: authError } = await requireSession();
  if (authError) return authError;
  try {
    const body = await req.json();
    const { asistencias, fecha: fechaStr, gradoId, materiaId } = body;

    if (!asistencias || !Array.isArray(asistencias) || !fechaStr || !gradoId) {
      return NextResponse.json({ error: "Datos de asistencia inválidos" }, { status: 400 });
    }

    if (!canAccessGrado(session, gradoId)) {
      return NextResponse.json({ error: "No tiene acceso a este grado" }, { status: 403 });
    }

    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }

    const startOfDay = new Date(fecha);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const resultados: any[] = [];

    // Transacción atómica: upsert evita duplicados garantizado por el constraint único en BD
    await db.$transaction(async (tx) => {
      for (const record of asistencias) {
        const { estudianteId, estado } = record;

        const result = await tx.asistencia.upsert({
          where: {
            estudianteId_fecha_gradoId: {
              estudianteId,
              fecha: startOfDay,
              gradoId,
            },
          },
          update: { estado },
          create: {
            estudianteId,
            fecha: startOfDay,
            estado,
            gradoId,
            ...(materiaId ? { materiaId } : {}),
          },
          include: {
            estudiante: { select: { id: true, nombre: true, numero: true } },
          },
        });

        resultados.push(result);
      }
    });

    return NextResponse.json({
      success: true,
      guardados: resultados.length,
      mensaje: `${resultados.length} registros guardados`
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
  const { session, error: authError } = await requireSession();
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    const fechaParam = searchParams.get("fecha");
    const gradoId = searchParams.get("gradoId");
    const materiaId = searchParams.get("materiaId");
    const estudianteId = searchParams.get("estudianteId");

    if (!fechaParam || !gradoId) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    if (!canAccessGrado(session, gradoId)) {
      return NextResponse.json({ error: "No tiene acceso a este grado" }, { status: 403 });
    }

    const fecha = new Date(fechaParam);
    if (isNaN(fecha.getTime())) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }

    const startOfDay = new Date(fecha);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(fecha);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const where: any = {
      fecha: {
        gte: startOfDay,
        lte: endOfDay,
      },
      gradoId,
    };
    if (materiaId) {
      where.materiaId = materiaId;
    }
    if (estudianteId) {
      where.estudianteId = estudianteId;
    }

    console.log("DELETE where clause:", JSON.stringify(where, null, 2));

    const deleted = await db.asistencia.deleteMany({ where });

    return NextResponse.json({ success: true, eliminados: deleted.count });
  } catch (error) {
    console.error("Error eliminando asistencia:", error);
    return NextResponse.json({ error: "Error del servidor al eliminar asistencia", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
