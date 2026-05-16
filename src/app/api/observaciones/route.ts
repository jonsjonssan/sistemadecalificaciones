import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-middleware";

type AsistenciaManualData = {
  asistencias: string;
  inasistencias: string;
  tardanzas: string;
  justificadas: string;
  totalDias: string;
  observaciones: string;
};

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

    const registros = await db.observacionBoleta.findMany({ where });

    const map: Record<string, AsistenciaManualData> = {};
    registros.forEach(r => {
      map[r.estudianteId] = {
        asistencias: r.asistencias ?? "",
        inasistencias: r.inasistencias ?? "",
        tardanzas: r.tardanzas ?? "",
        justificadas: r.justificadas ?? "",
        totalDias: r.totalDias ?? "",
        observaciones: r.observaciones ?? "",
      };
    });

    return NextResponse.json(map);
  } catch (error) {
    console.error("Error obteniendo datos de asistencia manual:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { estudianteId, gradoId, trimestre, año, asistencias, inasistencias, tardanzas, justificadas, totalDias, observaciones } = body;

    if (!estudianteId || !gradoId || trimestre == null || año == null) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const data = {
      asistencias: asistencias ?? "",
      inasistencias: inasistencias ?? "",
      tardanzas: tardanzas ?? "",
      justificadas: justificadas ?? "",
      totalDias: totalDias ?? "",
      observaciones: observaciones ?? "",
    };

    const result = await db.observacionBoleta.upsert({
      where: {
        estudianteId_gradoId_trimestre_año: {
          estudianteId,
          gradoId,
          trimestre: parseInt(trimestre),
          año: parseInt(año),
        },
      },
      update: data,
      create: {
        estudianteId,
        gradoId,
        trimestre: parseInt(trimestre),
        año: parseInt(año),
        ...data,
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error guardando datos de asistencia manual:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
