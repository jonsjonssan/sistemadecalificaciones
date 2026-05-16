import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-middleware";

export async function GET(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const gradoId = searchParams.get("gradoId");
    const trimestre = searchParams.get("trimestre");
    const año = searchParams.get("año");

    if (!gradoId || !trimestre || !año) {
      return NextResponse.json({ error: "Faltan parámetros: gradoId, trimestre, año" }, { status: 400 });
    }

    const where: any = { gradoId, trimestre: parseInt(trimestre), año: parseInt(año) };

    const observaciones = await db.observacionBoleta.findMany({
      where,
      select: { estudianteId: true, observaciones: true },
    });

    const map: Record<string, string> = {};
    observaciones.forEach(o => { map[o.estudianteId] = o.observaciones; });

    return NextResponse.json(map);
  } catch (error) {
    console.error("Error obteniendo observaciones:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { estudianteId, gradoId, trimestre, año, observaciones } = body;

    if (!estudianteId || !gradoId || trimestre == null || año == null) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const result = await db.observacionBoleta.upsert({
      where: {
        estudianteId_gradoId_trimestre_año: {
          estudianteId,
          gradoId,
          trimestre: parseInt(trimestre),
          año: parseInt(año),
        },
      },
      update: { observaciones: observaciones ?? "" },
      create: {
        estudianteId,
        gradoId,
        trimestre: parseInt(trimestre),
        año: parseInt(año),
        observaciones: observaciones ?? "",
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error guardando observacion:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
