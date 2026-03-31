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
    const materiaId = searchParams.get("materiaId");
    const gradoId = searchParams.get("gradoId");
    const trimestre = searchParams.get("trimestre");

    const prisma = new PrismaClient();

    if (materiaId && trimestre) {
      const trimestreNum = parseInt(trimestre);
      let config = await prisma.configActividad.findFirst({
        where: { materiaId, trimestre: trimestreNum },
      });

      if (!config) {
        config = await prisma.configActividad.create({
          data: {
            materiaId,
            trimestre: trimestreNum,
            numActividadesCotidianas: 4,
            numActividadesIntegradoras: 1,
            tieneExamen: true,
            porcentajeAC: 35.0,
            porcentajeAI: 35.0,
            porcentajeExamen: 30.0,
          },
        });
      }

      await prisma.$disconnect();

      return NextResponse.json({
        id: config.id,
        materiaId: config.materiaId,
        trimestre: config.trimestre,
        numActividadesCotidianas: config.numActividadesCotidianas,
        numActividadesIntegradoras: config.numActividadesIntegradoras,
        tieneExamen: config.tieneExamen,
        porcentajeAC: config.porcentajeAC,
        porcentajeAI: config.porcentajeAI,
        porcentajeExamen: config.porcentajeExamen,
      });
    }

    if (gradoId && trimestre) {
      const trimestreNum = parseInt(trimestre);
      const materias = await prisma.materia.findMany({
        where: { gradoId },
        select: { id: true, nombre: true },
      });

      const result: any[] = [];
      for (const materia of materias) {
        let config = await prisma.configActividad.findFirst({
          where: { materiaId: materia.id, trimestre: trimestreNum },
        });

        if (!config) {
          config = await prisma.configActividad.create({
            data: {
              materiaId: materia.id,
              trimestre: trimestreNum,
              numActividadesCotidianas: 4,
              numActividadesIntegradoras: 1,
              tieneExamen: true,
              porcentajeAC: 35.0,
              porcentajeAI: 35.0,
              porcentajeExamen: 30.0,
            },
          });
        }

        result.push({
          id: config.id,
          materiaId: config.materiaId,
          trimestre: config.trimestre,
          numActividadesCotidianas: config.numActividadesCotidianas,
          numActividadesIntegradoras: config.numActividadesIntegradoras,
          tieneExamen: config.tieneExamen,
          porcentajeAC: config.porcentajeAC,
          porcentajeAI: config.porcentajeAI,
          porcentajeExamen: config.porcentajeExamen,
          materiaNombre: materia.nombre,
        });
      }

      await prisma.$disconnect();

      return NextResponse.json(result);
    }

    await prisma.$disconnect();
    return NextResponse.json(null);
  } catch (error) {
    console.error("Error al obtener configuración:", error);
    return NextResponse.json({ error: "Error al obtener configuración", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const data = await request.json();
    const { materiaId, gradoId, aplicarATodasLasMateriasDelGrado, trimestre, numActividadesCotidianas, numActividadesIntegradoras, tieneExamen, porcentajeAC, porcentajeAI, porcentajeExamen } = data;

    if (!trimestre) return NextResponse.json({ error: "Trimestre es requerido" }, { status: 400 });

    const prisma = new PrismaClient();

    const trimestreNum = parseInt(String(trimestre));
    const baseData = {
      trimestre: trimestreNum,
      numActividadesCotidianas: numActividadesCotidianas ?? 4,
      numActividadesIntegradoras: numActividadesIntegradoras ?? 1,
      tieneExamen: tieneExamen ?? true,
      porcentajeAC: porcentajeAC ?? 35.0,
      porcentajeAI: porcentajeAI ?? 35.0,
      porcentajeExamen: porcentajeExamen ?? 30.0,
    };

    if (aplicarATodasLasMateriasDelGrado && gradoId) {
      const materias = await prisma.materia.findMany({
        where: { gradoId },
        select: { id: true },
      });

      for (const materia of materias) {
        await prisma.configActividad.upsert({
          where: {
            materiaId_trimestre: {
              materiaId: materia.id,
              trimestre: baseData.trimestre,
            },
          },
          update: baseData,
          create: { materiaId: materia.id, ...baseData },
        });
      }

      await prisma.$disconnect();
      return NextResponse.json({ success: true, count: materias.length });
    }

    if (!materiaId) return NextResponse.json({ error: "materiaId es requerido" }, { status: 400 });

    const result = await prisma.configActividad.upsert({
      where: {
        materiaId_trimestre: {
          materiaId,
          trimestre: baseData.trimestre,
        },
      },
      update: baseData,
      create: { materiaId, ...baseData },
    });

    await prisma.$disconnect();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error al guardar configuración:", error);
    return NextResponse.json({ error: "Error al guardar configuración", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
