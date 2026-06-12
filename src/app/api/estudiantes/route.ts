import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { isAdmin } from "@/utils/roleHelpers";

async function getUsuarioSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  return verifySession(session.value);
}

function canAccessGrado(session: any, gradoId: string): boolean {
  if (isAdmin(session.rol)) return true;
  if (session.asignaturasAsignadas?.some((m: any) => m.gradoId === gradoId)) return true;
  if (session.gradosAsignados?.some((g: any) => g.id === gradoId)) return true;
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({
        error: "Sesión no encontrada",
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para acceder a esta información"
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gradoId = searchParams.get("gradoId");
    const activos = searchParams.get("activos");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");

    if (!gradoId) {
      return NextResponse.json({
        error: "Grado no especificado",
        code: "MISSING_GRADO",
        message: "Selecciona un grado para ver los estudiantes"
      }, { status: 400 });
    }

    if (!canAccessGrado(session, gradoId)) {
      return NextResponse.json({
        error: "No tiene acceso a este grado",
        code: "GRADO_FORBIDDEN",
        message: "No tienes permiso para ver los estudiantes de este grado."
      }, { status: 403 });
    }

    let where: any = {};
    if (gradoId) where.gradoId = gradoId;
    if (activos === "true") where.activo = true;
    if (activos === "false") where.activo = false;

    const query = {
      where,
      orderBy: [{ orden: "asc" as const }, { numero: "asc" as const }],
    };

    // Pagination support (optional, backward compatible)
    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const [estudiantes, total] = await Promise.all([
        db.estudiante.findMany({
          ...query,
          skip,
          take: limitNum,
        }),
        db.estudiante.count({ where }),
      ]);

      return NextResponse.json({
        estudiantes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    }

    // Backward compatibility: return all records
    const estudiantes = await db.estudiante.findMany(query);
    return NextResponse.json(estudiantes);
  } catch (error) {
    console.error("[estudiantes/GET] Error:", error);
    return NextResponse.json({
      error: "Error al cargar estudiantes",
      code: "ESTUDIANTES_LOAD_ERROR",
      message: "Hubo un problema al obtener la lista de estudiantes. Intenta de nuevo."
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!isAdmin(session.rol) && session.rol !== "docente") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const data = await request.json();
    const { nombre, gradoId } = data;
    const escuelaId = (session as any).escuelaId || '';

    if (!nombre || !gradoId) {
      return NextResponse.json({ error: "Nombre y grado son requeridos" }, { status: 400 });
    }

    if (!canAccessGrado(session, gradoId)) {
      return NextResponse.json({ error: "No tiene acceso a este grado" }, { status: 403 });
    }

    const grado = await db.grado.findUnique({ where: { id: gradoId } });
    if (!grado) {
      return NextResponse.json({ error: "El grado seleccionado no existe" }, { status: 400 });
    }

    // Atomic auto-increment using transaction to prevent race conditions
    const estudiante = await db.$transaction(async (tx) => {
      const max = await tx.estudiante.aggregate({
        where: { gradoId },
        _max: { numero: true },
      });
      const nuevoNumero = (max._max.numero ?? 0) + 1;
      return tx.estudiante.create({
        data: {
          numero: nuevoNumero,
          nombre,
          email: data.email || null,
          gradoId,
          escuelaId,
          activo: true,
        },
      });
    });

    return NextResponse.json(estudiante);
  } catch (error) {
    console.error("Error al crear estudiante:", error);
    return NextResponse.json({ error: "Error al crear estudiante" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!isAdmin(session.rol) && session.rol !== "docente") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { estudiantes, gradoId } = await request.json();
    const escuelaId = (session as any).escuelaId || '';

    if (!estudiantes || !Array.isArray(estudiantes)) {
      return NextResponse.json({ error: "Se requiere un array de nombres" }, { status: 400 });
    }

    if (!gradoId) {
      return NextResponse.json({ error: "Grado es requerido" }, { status: 400 });
    }

    if (!canAccessGrado(session, gradoId)) {
      return NextResponse.json({ error: "No tiene acceso a este grado" }, { status: 403 });
    }

    const grado = await db.grado.findUnique({ where: { id: gradoId } });
    if (!grado) {
      return NextResponse.json({ error: "El grado seleccionado no existe" }, { status: 400 });
    }

    // Atomic auto-increment using transaction to prevent race conditions
    const creados = await db.$transaction(async (tx) => {
      const max = await tx.estudiante.aggregate({
        where: { gradoId },
        _max: { numero: true },
      });
      const numeroInicial = max._max.numero ?? 0;

      return Promise.all(
        estudiantes.map((item: { nombre: string; email?: string }, i: number) =>
          tx.estudiante.create({
            data: {
              numero: numeroInicial + i + 1,
              nombre: item.nombre,
              email: item.email || null,
              gradoId,
              escuelaId,
              activo: true,
            },
          })
        )
      );
    });

    return NextResponse.json({ message: `${creados.length} estudiantes creados`, estudiantes: creados });
  } catch (error) {
    console.error("Error al crear estudiantes:", error);
    return NextResponse.json({ error: "Error al crear estudiantes" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!isAdmin(session.rol)) {
      return NextResponse.json({ error: "Solo administradores pueden eliminar estudiantes" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    // Validar que el estudiante pertenece a un grado al que el admin tiene acceso (si es docente-admin, aunque aquí solo admins)
    const estudiante = await db.estudiante.findUnique({ where: { id }, select: { gradoId: true } });
    if (!estudiante) {
      return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
    }
    if (!canAccessGrado(session, estudiante.gradoId)) {
      return NextResponse.json({ error: "No tiene acceso a este grado" }, { status: 403 });
    }

    await db.$transaction([
      db.calificacion.deleteMany({ where: { estudianteId: id } }),
      db.asistencia.deleteMany({ where: { estudianteId: id } }),
      db.estudiante.delete({ where: { id } }),
    ]);

    return NextResponse.json({ message: "Estudiante eliminado" });
  } catch (error) {
    console.error("Error al eliminar estudiante:", error);
    return NextResponse.json({ error: "Error al eliminar estudiante" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!isAdmin(session.rol)) {
      return NextResponse.json({ error: "Solo administradores pueden reordenar" }, { status: 403 });
    }

    const { ordenes } = await request.json();

    if (!ordenes || !Array.isArray(ordenes)) {
      return NextResponse.json({ error: "Se requiere un array de ordenes" }, { status: 400 });
    }

    // Verify all students belong to accessible grades
    const ids = ordenes.map((o: { id: string }) => o.id);
    const estudiantes = await db.estudiante.findMany({
      where: { id: { in: ids } },
      select: { id: true, gradoId: true },
    });
    for (const est of estudiantes) {
      if (!canAccessGrado(session, est.gradoId)) {
        return NextResponse.json({ error: "No autorizado para reordenar estudiantes de este grado" }, { status: 403 });
      }
    }

    await db.$transaction(
      ordenes.map((item: { id: string; orden: number }) =>
        db.estudiante.update({
          where: { id: item.id },
          data: { orden: item.orden },
        })
      )
    );

    return NextResponse.json({ message: "Orden actualizado" });
  } catch (error) {
    console.error("Error al reordenar estudiantes:", error);
    return NextResponse.json({ error: "Error al reordenar estudiantes" }, { status: 500 });
  }
}
