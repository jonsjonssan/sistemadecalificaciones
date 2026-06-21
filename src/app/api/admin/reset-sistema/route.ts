import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { isAdmin } from "@/utils/roleHelpers";
import { invalidateSessionCache } from "@/lib/api-middleware";

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
    if (!sessionData) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }

    if (!isAdmin(sessionData.rol)) {
      return NextResponse.json({ error: "Permiso denegado. Solo administradores pueden realizar esta acción." }, { status: 403 });
    }

    const escuelaId = (sessionData as any).escuelaId;
    if (!escuelaId) {
      return NextResponse.json({ error: "Sesión sin escuela asignada" }, { status: 400 });
    }

    // Wrap all operations in a single transaction - filtrado por escuelaId
    await db.$transaction(async (tx) => {
      await tx.calificacion.deleteMany({ where: { escuelaId } });
      await tx.notaActividad.deleteMany({ where: { calificacion: { escuelaId } } });
      await tx.historialCalificacion.deleteMany({ where: { escuelaId } });
      await tx.asistencia.deleteMany({ where: { escuelaId } });
      await tx.observacionBoleta.deleteMany({ where: { escuelaId } });
      await tx.estudiante.deleteMany({ where: { escuelaId } });
      await tx.docenteMateria.deleteMany({ where: { escuelaId } });
      await tx.recuperacionAnual.deleteMany({ where: { escuelaId } });

      // Clear grade tutors solo de esta escuela
      await tx.grado.updateMany({
        where: { escuelaId },
        data: { docenteId: null },
      });

      // Increment the school year solo de esta escuela
      const config = await tx.configuracionSistema.findFirst({ where: { escuelaId } });
      if (config) {
        await tx.configuracionSistema.update({
          where: { id: config.id },
          data: { añoEscolar: config.añoEscolar + 1 },
        });
      }
    });

    // Invalidar cache de sesiones de usuarios de esta escuela
    invalidateSessionCache((sessionData as any).id);

    return NextResponse.json({
      success: true,
      message: "Sistema reiniciado exitosamente para el próximo año escolar.",
    });
  } catch (error) {
    console.error("Error al resetear el sistema:", error);
    return NextResponse.json(
      { error: "Error al resetear el sistema" },
      { status: 500 }
    );
  }
}
