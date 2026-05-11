import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";

export async function DELETE(request: NextRequest) {
  try {
    const confirm = request.headers.get("x-confirm-reset");
    if (confirm !== "true") {
      return NextResponse.json({ error: "Se requiere confirmación. Envía el header X-Confirm-Reset: true" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sessionData = verifySession(session.value);

    // Solo el administrador puede resetear el sistema
    if (sessionData.rol !== "admin") {
      return NextResponse.json({ error: "Permiso denegado. Solo administradores pueden realizar esta acción." }, { status: 403 });
    }

    // 1. Eliminar todas las calificaciones
    await db.calificacion.deleteMany({});

    // 2. Eliminar toda la asistencia
    await db.asistencia.deleteMany({});

    // 3. Eliminar todos los estudiantes
    await db.estudiante.deleteMany({});

    // 4. Eliminar asignaciones de materias (grados 6-9)
    await db.docenteMateria.deleteMany({});

    // 5. Limpiar tutores de los grados (grados 2-5)
    await db.grado.updateMany({
      data: {
        // No hay docenteId en Grado - se maneja por DocenteMateria
      }
    });

    // 5. Opcionalmente: Incrementar el año escolar en la configuración
    const config = await db.configuracionSistema.findFirst();
    if (config) {
      await db.configuracionSistema.update({
        where: { id: config.id },
        data: {
          añoEscolar: config.añoEscolar + 1
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Sistema reiniciado exitosamente para el próximo año escolar."
    });
  } catch (error) {
    console.error("Error al resetear el sistema:", error);
    return NextResponse.json(
      { error: "Error al resetear el sistema" },
      { status: 500 }
    );
  }
}
