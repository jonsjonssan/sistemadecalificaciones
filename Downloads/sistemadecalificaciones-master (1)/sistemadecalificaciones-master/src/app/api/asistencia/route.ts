import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { emitRealtimeEventAsync } from "@/lib/realtime/emit";

function uid() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 10) }

async function getUsuarioSession() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session) return null;
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}

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
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const resultados: any[] = [];
    let actualizados = 0;
    let creados = 0;

    for (const record of asistencias) {
      const { estudianteId, estado } = record;
      const matId = materiaId || null;

      // Buscar todos los registros existentes para este estudiante en esta fecha
      const existentes = await db.asistencia.findMany({
        where: {
          estudianteId,
          fecha: {
            gte: startOfDay,
            lte: endOfDay,
          },
          gradoId,
          materiaId: matId,
        },
        orderBy: { createdAt: 'desc' }
      });

      if (existentes.length > 0) {
        // Si hay múltiples duplicados, eliminar todos excepto el más reciente
        if (existentes.length > 1) {
          const idsAEliminar = existentes.slice(1).map(e => e.id);
          await db.asistencia.deleteMany({
            where: { id: { in: idsAEliminar } }
          });
        }

        // Actualizar el más reciente
        const updated = await db.asistencia.update({
          where: { id: existentes[0].id },
          data: { estado },
          include: {
            estudiante: { select: { id: true, nombre: true, numero: true } },
          },
        });
        actualizados++;
        resultados.push(updated);
      } else {
        // Crear nuevo registro
        const nuevo = await db.asistencia.create({
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
        creados++;
        resultados.push(nuevo);
      }
    }

    const session = await getUsuarioSession();
    const grado = await db.grado.findUnique({ where: { id: gradoId }, select: { numero: true, seccion: true } });

    if (session?.id) {
      try {
        await db.auditLog.create({
          data: {
            usuarioId: session.id,
            accion: "UPDATE",
            entidad: "Asistencia",
            detalles: JSON.stringify({
              grado: grado ? `${grado.numero}${grado.seccion}` : null,
              fecha: fechaStr,
              creados,
              actualizados,
            }),
          },
        });
      } catch (auditError) {
        console.error("[asistencia] Audit error:", auditError);
      }
    }

    emitRealtimeEventAsync({
      type: "activity",
      payload: {
        id: uid(),
        tipo: "asistencia",
        accion: "UPDATE",
        entidad: "Asistencia",
        usuario: { nombre: session?.nombre || "Sistema", email: session?.email || "", rol: session?.rol || "admin" },
        detalles: {
          grado: grado ? `${grado.numero}${grado.seccion}` : null,
          fecha: fechaStr,
          creados,
          actualizados,
        },
        fecha: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

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

    const deleted = await db.asistencia.deleteMany({ where });

    const session = await getUsuarioSession();
    const grado = await db.grado.findUnique({ where: { id: gradoId }, select: { numero: true, seccion: true } });

    if (session?.id) {
      try {
        await db.auditLog.create({
          data: {
            usuarioId: session.id,
            accion: "DELETE",
            entidad: "Asistencia",
            detalles: JSON.stringify({
              grado: grado ? `${grado.numero}${grado.seccion}` : null,
              fecha: fechaParam,
              eliminados: deleted.count,
            }),
          },
        });
      } catch (auditError) {
        console.error("[asistencia] Audit error:", auditError);
      }
    }

    emitRealtimeEventAsync({
      type: "activity",
      payload: {
        id: uid(),
        tipo: "asistencia",
        accion: "DELETE",
        entidad: "Asistencia",
        usuario: { nombre: session?.nombre || "Sistema", email: session?.email || "", rol: session?.rol || "admin" },
        detalles: {
          grado: grado ? `${grado.numero}${grado.seccion}` : null,
          fecha: fechaParam,
          eliminados: deleted.count,
        },
        fecha: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, eliminados: deleted.count });
  } catch (error) {
    console.error("Error eliminando asistencia:", error);
    return NextResponse.json({ error: "Error del servidor al eliminar asistencia", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
