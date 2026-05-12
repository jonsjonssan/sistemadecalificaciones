import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";

async function getUsuarioSession() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session) return null;
    const parsed = verifySession(session.value);
    if (!parsed || !parsed.id) return null;
    return parsed;
  } catch (error) {
    console.error("[historial-calificaciones] Error parsing session:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const calificacionId = searchParams.get("calificacionId");
    const tipoCampo = searchParams.get("tipoCampo");

    if (!calificacionId) {
      return NextResponse.json({ error: "calificacionId es requerido" }, { status: 400 });
    }

    const where: any = { calificacionId };
    if (tipoCampo) {
      where.tipoCampo = tipoCampo;
    }

    let maxHist = 10;
    try {
      const configHist = await db.$queryRaw<{ maxHistorialCelda: number | null }[]>`
        SELECT "maxHistorialCelda" FROM "ConfiguracionSistema" LIMIT 1
      `;
      maxHist = configHist[0]?.maxHistorialCelda ?? 10;
    } catch {
      maxHist = 10;
    }

    const historial = await db.historialCalificacion.findMany({
      where,
      include: {
        usuario: { select: { id: true, nombre: true } },
        calificacion: {
          include: {
            estudiante: { select: { nombre: true } },
            materia: { select: { nombre: true } },
            notasActividad: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: maxHist,
    });

    // Obtener valor actual de la celda según tipoCampo
    let valorActual: number | null = null;
    const calif = historial[0]?.calificacion;
    if (calif) {
      if (tipoCampo === "examenTrimestral") {
        valorActual = calif.examenTrimestral ?? null;
      } else if (tipoCampo === "recuperacion") {
        valorActual = calif.recuperacion ?? null;
      } else if (tipoCampo?.startsWith("cotidiana_") || tipoCampo?.startsWith("integradora_")) {
        const [tipo, numStr] = tipoCampo.split("_");
        const numeroActividad = parseInt(numStr, 10);
        const nota = calif.notasActividad?.find(
          (n: any) => n.tipo === tipo && n.numeroActividad === numeroActividad
        );
        valorActual = nota?.nota ?? null;
      } else if (tipoCampo === "calificacionAC") {
        valorActual = calif.calificacionAC ?? null;
      } else if (tipoCampo === "calificacionAI") {
        valorActual = calif.calificacionAI ?? null;
      } else if (tipoCampo === "promedioFinal") {
        valorActual = calif.promedioFinal ?? null;
      }
    }

    const formatted = historial.map((h: any) => ({
      id: h.id,
      calificacionId: h.calificacionId,
      usuarioId: h.usuarioId,
      usuarioNombre: h.usuario?.nombre || "Desconocido",
      tipoCampo: h.tipoCampo,
      valorAnterior: h.valorAnterior,
      valorNuevo: h.valorNuevo,
      descripcion: h.descripcion,
      estudianteNombre: h.calificacion?.estudiante?.nombre,
      materiaNombre: h.calificacion?.materia?.nombre,
      trimestre: h.calificacion?.trimestre,
      createdAt: h.createdAt,
    }));

    return NextResponse.json({ historial: formatted, valorActual });
  } catch (error) {
    console.error("[historial-calificaciones] GET Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error al obtener historial", details: errMsg }, { status: 500 });
  }
}
