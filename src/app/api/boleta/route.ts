import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estudianteId = searchParams.get("estudianteId");
    const gradoId = searchParams.get("gradoId");
    const trimestre = searchParams.get("trimestre");

    if (!estudianteId && !gradoId) {
      return NextResponse.json(
        { error: "Se requiere estudianteId o gradoId" },
        { status: 400 }
      );
    }

    // Obtener información del estudiante y su grado
    let estudiante;
    if (estudianteId) {
      estudiante = await db.estudiante.findUnique({
        where: { id: estudianteId },
        include: { grado: { include: { docente: true } } },
      });
    }

    // Obtener todas las calificaciones
    const where: Record<string, unknown> = {};
    if (estudianteId) where.estudianteId = estudianteId;
    if (trimestre) where.trimestre = parseInt(trimestre);

    let calificaciones;

    if (gradoId && !estudianteId) {
      // Boletas de todos los estudiantes del grado
      const estudiantes = await db.estudiante.findMany({
        where: { gradoId },
        include: { grado: { include: { docente: true } } },
        orderBy: { numero: "asc" },
      });

      calificaciones = await db.calificacion.findMany({
        where: {
          estudiante: { gradoId },
          ...(trimestre ? { trimestre: parseInt(trimestre) } : {}),
        },
        include: {
          estudiante: { include: { grado: { include: { docente: true } } } },
          materia: true,
        },
      });

      // Agrupar por estudiante
      const boletasPorEstudiante = estudiantes.map((est) => {
        const califEstudiante = calificaciones.filter(
          (c) => c.estudianteId === est.id
        );
        
        // Calcular promedio general
        const promediosValidos = califEstudiante
          .map((c) => c.promedioFinal)
          .filter((p): p is number => p !== null);
        
        const promedioGeneral = promediosValidos.length > 0
          ? promediosValidos.reduce((a, b) => a + b, 0) / promediosValidos.length
          : null;

        return {
          estudiante: est,
          calificaciones: califEstudiante,
          promedioGeneral,
        };
      });

      return NextResponse.json(boletasPorEstudiante);
    } else {
      // Boleta de un solo estudiante
      calificaciones = await db.calificacion.findMany({
        where,
        include: {
          estudiante: { include: { grado: { include: { docente: true } } } },
          materia: true,
        },
        orderBy: { materia: { nombre: "asc" } },
      });

      // Calcular promedio general
      const promediosValidos = calificaciones
        .map((c) => c.promedioFinal)
        .filter((p): p is number => p !== null);
      
      const promedioGeneral = promediosValidos.length > 0
        ? promediosValidos.reduce((a, b) => a + b, 0) / promediosValidos.length
        : null;

      return NextResponse.json({
        estudiante,
        calificaciones,
        promedioGeneral,
      });
    }
  } catch (error) {
    console.error("Error al generar boleta:", error);
    return NextResponse.json(
      { error: "Error al generar boleta" },
      { status: 500 }
    );
  }
}
