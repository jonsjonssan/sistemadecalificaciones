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

      // Obtener asistencia para todo el grado en el periodo (o año)
      const asistenciasGrado = await db.asistencia.findMany({
        where: {
          gradoId,
          // Si hay trimestre, podríamos filtrar por fechas, pero por ahora sumamos todo el año o filtramos por fecha si se definen rangos.
          // Como no hay rangos oficiales por trimestre en la DB, sumamos el histórico.
        }
      });

      // Agrupar por estudiante
      const boletasPorEstudiante = estudiantes.map((est) => {
        const califEstudiante = calificaciones.filter(
          (c) => c.estudianteId === est.id
        );
        
        const asistenciasEst = asistenciasGrado.filter(a => a.estudianteId === est.id);
        const inasistencias = asistenciasEst.filter(a => a.estado === "ausente").length;
        const justificaciones = asistenciasEst.filter(a => a.estado === "justificada").length;

        // Calcular promedio general
        const promediosValidos = califEstudiante
          .map((c) => c.promedioFinal)
          .filter((p): p is number => p !== null);
        
        const promedioGeneral = promediosValidos.length > 0
          ? promediosValidos.reduce((a, b) => a + b, 0) / promediosValidos.length
          : null;

        return {
          estudiante: est,
          calificaciones: califEstudiante.map(c => ({...c, asignatura: c.materia, materia: undefined})),
          promedioGeneral,
          asistencia: { inasistencias, justificaciones }
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

      const asistenciasEst = await db.asistencia.findMany({
        where: { estudianteId: estudianteId as string }
      });
      const inasistencias = asistenciasEst.filter(a => a.estado === "ausente").length;
      const justificaciones = asistenciasEst.filter(a => a.estado === "justificada").length;

      // Calcular promedio general
      const promediosValidos = calificaciones
        .map((c) => c.promedioFinal)
        .filter((p): p is number => p !== null);
      
      const promedioGeneral = promediosValidos.length > 0
        ? promediosValidos.reduce((a, b) => a + b, 0) / promediosValidos.length
        : null;

      return NextResponse.json({
        estudiante,
        calificaciones: calificaciones.map(c => ({...c, asignatura: c.materia, materia: undefined})),
        promedioGeneral,
        asistencia: { inasistencias, justificaciones }
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
