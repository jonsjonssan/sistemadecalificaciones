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
    const materiaId = searchParams.get("materiaId");
    const año = searchParams.get("año");

    if (!gradoId) {
      return NextResponse.json({ error: "Falta gradoId" }, { status: 400 });
    }

    const añoNum = año ? parseInt(año) : new Date().getFullYear();

    // Obtener IDs de estudiantes del grado para filtrar
    const estudiantesGrado = await db.estudiante.findMany({
      where: { gradoId },
      select: { id: true },
    });
    const estudianteIds = estudiantesGrado.map(e => e.id);

    const where: any = {
      año: añoNum,
      estudianteId: { in: estudianteIds },
    };
    if (materiaId) where.materiaId = materiaId;

    const recuperaciones = await db.recuperacionAnual.findMany({ where });

    return NextResponse.json(recuperaciones);
  } catch (error) {
    console.error("[recuperacion-anual/GET] Error:", error);
    return NextResponse.json({ error: "Error al cargar recuperaciones anuales" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const data = await request.json();
    const { estudianteId, materiaId, nota, año } = data;

    if (!estudianteId || !materiaId || nota === undefined || nota === null) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const notaNum = parseFloat(nota);
    if (isNaN(notaNum) || notaNum < 0 || notaNum > 10) {
      return NextResponse.json({ error: "La nota debe estar entre 0 y 10" }, { status: 400 });
    }

    const añoNum = año || new Date().getFullYear();

    const result = await db.recuperacionAnual.upsert({
      where: {
        estudianteId_materiaId_año: {
          estudianteId,
          materiaId,
          año: añoNum,
        },
      },
      update: { nota: notaNum },
      create: {
        estudianteId,
        materiaId,
        nota: notaNum,
        año: añoNum,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[recuperacion-anual/POST] Error:", error);
    return NextResponse.json({ error: "Error al guardar recuperación anual" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estudianteId = searchParams.get("estudianteId");
    const materiaId = searchParams.get("materiaId");
    const año = searchParams.get("año");

    if (!estudianteId || !materiaId || !año) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const añoNum = parseInt(año);

    await db.recuperacionAnual.deleteMany({
      where: {
        estudianteId,
        materiaId,
        año: añoNum,
      },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[recuperacion-anual/DELETE] Error:", error);
    return NextResponse.json({ error: "Error al eliminar recuperación anual" }, { status: 500 });
  }
}
