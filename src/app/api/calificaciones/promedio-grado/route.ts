import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";

async function getUsuarioSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  return verifySession(session.value);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gradoId = searchParams.get("gradoId");
    const trimestre = searchParams.get("trimestre");

    if (!gradoId || !trimestre) {
      return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 });
    }

    const calificaciones = await db.calificacion.findMany({
      where: {
        estudiante: { gradoId },
        trimestre: parseInt(trimestre),
      },
      select: { promedioFinal: true },
    });

    const promsValidos = calificaciones.filter(c => c.promedioFinal !== null);
    const promedio = promsValidos.length > 0
      ? Math.round((promsValidos.reduce((a, c) => a + (c.promedioFinal || 0), 0) / promsValidos.length) * 100) / 100
      : null;

    return NextResponse.json({ promedio, totalEstudiantes: promsValidos.length });
  } catch (error) {
    console.error("[calificaciones/promedio-grado] Error:", error);
    return NextResponse.json({ error: "Error al calcular promedio" }, { status: 500 });
  }
}