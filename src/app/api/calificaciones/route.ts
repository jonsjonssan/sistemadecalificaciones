import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";

async function getUsuarioSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  return JSON.parse(session.value);
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
    const trimestre = searchParams.get("trimestre");
    const estudianteId = searchParams.get("estudianteId");

    if (session.rol === "docente") {
      const materiasAsignadasIds = session.asignaturasAsignadas?.map((m: any) => m.id) || [];
      const gradosAsignadosIds = session.asignaturasAsignadas?.map((m: any) => m.gradoId) || [];
      
      if (materiaId && !materiasAsignadasIds.includes(materiaId)) {
        return NextResponse.json({ error: "No autorizado para esta materia" }, { status: 403 });
      }
      if (gradoId && !gradosAsignadosIds.includes(gradoId)) {
        return NextResponse.json({ error: "No autorizado para este grado" }, { status: 403 });
      }
    }

    const prisma = new PrismaClient();

    let calificaciones: any[] = [];
    if (materiaId && trimestre && gradoId) {
      calificaciones = await prisma.calificacion.findMany({
        where: {
          estudiante: { gradoId },
          materiaId,
          trimestre: parseInt(trimestre),
        },
        include: {
          estudiante: { select: { id: true, numero: true, nombre: true, gradoId: true } },
          materia: { select: { id: true, nombre: true } },
        },
        orderBy: { estudiante: { numero: "asc" } },
      });
    } else if (estudianteId) {
      calificaciones = await prisma.calificacion.findMany({
        where: { estudianteId },
        include: {
          estudiante: { select: { id: true, numero: true, nombre: true, gradoId: true } },
          materia: { select: { id: true, nombre: true } },
        },
        orderBy: { estudiante: { numero: "asc" } },
      });
    } else if (gradoId) {
      calificaciones = await prisma.calificacion.findMany({
        where: {
          estudiante: { gradoId },
        },
        include: {
          estudiante: { select: { id: true, numero: true, nombre: true, gradoId: true } },
          materia: { select: { id: true, nombre: true } },
        },
        orderBy: { estudiante: { numero: "asc" } },
      });
    }

    await prisma.$disconnect();
    return NextResponse.json(calificaciones);
  } catch (error) {
    console.error("Error al obtener calificaciones:", error);
    return NextResponse.json({ error: "Error al obtener calificaciones", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const data = await request.json();
    const {
      estudianteId,
      materiaId,
      trimestre,
      actividadesCotidianas,
      actividadesIntegradoras,
      examenTrimestral,
      recuperacion,
    } = data;

    if (!estudianteId || !materiaId || !trimestre) {
      return NextResponse.json({ error: "Estudiante, materia y trimestre son requeridos" }, { status: 400 });
    }

    let acNotas: (number | null)[] = [];
    let aiNotas: (number | null)[] = [];
    
    if (actividadesCotidianas) {
      try {
        acNotas = typeof actividadesCotidianas === 'string' 
          ? JSON.parse(actividadesCotidianas) 
          : actividadesCotidianas;
      } catch { acNotas = []; }
    }
    
    if (actividadesIntegradoras) {
      try {
        aiNotas = typeof actividadesIntegradoras === 'string' 
          ? JSON.parse(actividadesIntegradoras) 
          : actividadesIntegradoras;
      } catch { aiNotas = []; }
    }

    const notasValidasAC = acNotas.filter((n): n is number => n !== null && n !== undefined);
    const calificacionAC = notasValidasAC.length > 0 ? notasValidasAC.reduce((a, b) => a + b, 0) / notasValidasAC.length : null;

    const notasValidasAI = aiNotas.filter((n): n is number => n !== null && n !== undefined);
    const calificacionAI = notasValidasAI.length > 0 ? notasValidasAI.reduce((a, b) => a + b, 0) / notasValidasAI.length : null;

    const prisma = new PrismaClient();

    const config = await prisma.configActividad.findFirst({
      where: { materiaId, trimestre: parseInt(String(trimestre)) },
    });

    let promedioFinal: number | null = null;
    if (config) {
      const porcAC = config.porcentajeAC / 100;
      const porcAI = config.porcentajeAI / 100;
      const porcExam = config.tieneExamen ? config.porcentajeExamen / 100 : 0;
      
      const tieneNotas = calificacionAC !== null || calificacionAI !== null || examenTrimestral !== null;
      if (tieneNotas) {
        const suma = (calificacionAC ?? 0) * porcAC + (calificacionAI ?? 0) * porcAI + ((examenTrimestral ?? 0)) * porcExam;
        promedioFinal = isNaN(suma) ? null : suma;
        if (recuperacion !== null && recuperacion !== undefined) {
          promedioFinal = Math.min(10, (promedioFinal ?? 0) + recuperacion);
        }
      }
    } else {
      const tieneNotas = calificacionAC !== null || calificacionAI !== null || examenTrimestral !== null;
      if (tieneNotas) {
        const suma = (calificacionAC ?? 0) * 0.35 + (calificacionAI ?? 0) * 0.30 + ((examenTrimestral ?? 0)) * 0.35;
        promedioFinal = isNaN(suma) ? null : suma;
        if (recuperacion !== null && recuperacion !== undefined) {
          promedioFinal = Math.min(10, (promedioFinal ?? 0) + recuperacion);
        }
      }
    }

    const examenVal = (examenTrimestral !== undefined && examenTrimestral !== null && !isNaN(examenTrimestral)) ? examenTrimestral : null;
    const recupVal = (recuperacion !== undefined && recuperacion !== null && !isNaN(recuperacion)) ? recuperacion : null;
    const acFinal = (calificacionAC !== null && !isNaN(calificacionAC)) ? calificacionAC : null;
    const aiFinal = (calificacionAI !== null && !isNaN(calificacionAI)) ? calificacionAI : null;
    const promFinal = (promedioFinal !== null && !isNaN(promedioFinal)) ? promedioFinal : null;

    const result = await prisma.calificacion.upsert({
      where: {
        estudianteId_materiaId_trimestre: {
          estudianteId,
          materiaId,
          trimestre: parseInt(String(trimestre)),
        },
      },
      update: {
        actividadesCotidianas: JSON.stringify(acNotas),
        calificacionAC: acFinal,
        actividadesIntegradoras: JSON.stringify(aiNotas),
        calificacionAI: aiFinal,
        examenTrimestral: examenVal,
        promedioFinal: promFinal,
        recuperacion: recupVal,
      },
      create: {
        estudianteId,
        materiaId,
        trimestre: parseInt(String(trimestre)),
        actividadesCotidianas: JSON.stringify(acNotas),
        calificacionAC: acFinal,
        actividadesIntegradoras: JSON.stringify(aiNotas),
        calificacionAI: aiFinal,
        examenTrimestral: examenVal,
        promedioFinal: promFinal,
        recuperacion: recupVal,
      },
      include: {
        estudiante: { select: { id: true, numero: true, nombre: true, gradoId: true } },
        materia: { select: { id: true, nombre: true } },
      },
    });

    await prisma.$disconnect();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error al guardar calificación:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error al guardar calificación", details: errMsg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session || session.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estudianteId = searchParams.get("estudianteId");
    const materiaId = searchParams.get("materiaId");
    const trimestre = searchParams.get("trimestre");
    const gradoId = searchParams.get("gradoId");

    const prisma = new PrismaClient();

    if (estudianteId && materiaId && trimestre) {
      const deleted = await prisma.calificacion.deleteMany({
        where: { estudianteId, materiaId, trimestre: parseInt(trimestre) }
      });
      await prisma.$disconnect();
      return NextResponse.json({ deleted: deleted.count });
    }

    if (gradoId && materiaId && trimestre) {
      const deleted = await prisma.calificacion.deleteMany({
        where: {
          estudiante: { gradoId },
          materiaId,
          trimestre: parseInt(trimestre)
        }
      });
      await prisma.$disconnect();
      return NextResponse.json({ borradas: deleted.count });
    }

    await prisma.$disconnect();
    return NextResponse.json({ error: "Parámetros insuficientes" }, { status: 400 });
  } catch (error) {
    console.error("Error al borrar calificaciones:", error);
    return NextResponse.json({ error: "Error al borrar" }, { status: 500 });
  }
}
