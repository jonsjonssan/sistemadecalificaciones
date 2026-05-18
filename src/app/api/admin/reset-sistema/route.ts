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
    if (!sessionData) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }

    if (sessionData.rol !== "admin") {
      return NextResponse.json({ error: "Permiso denegado. Solo administradores pueden realizar esta acción." }, { status: 403 });
    }

    // Wrap all operations in a single transaction for atomicity
    await db.$transaction(async (tx) => {
      await tx.calificacion.deleteMany({});
      await tx.notaActividad.deleteMany({});
      await tx.historialCalificacion.deleteMany({});
      await tx.asistencia.deleteMany({});
      await tx.observacionBoleta.deleteMany({});
      await tx.estudiante.deleteMany({});
      await tx.docenteMateria.deleteMany({});
      await tx.recuperacionAnual.deleteMany({});

      // Clear grade tutors
      await tx.grado.updateMany({
        data: {
          docenteId: null,
        },
      });

      // Increment the school year
      const config = await tx.configuracionSistema.findFirst();
      if (config) {
        await tx.configuracionSistema.update({
          where: { id: config.id },
          data: {
            añoEscolar: config.añoEscolar + 1,
          },
        });
      }
    });

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
