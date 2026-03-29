import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

// Obtener configuración
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const materiaId = searchParams.get("materiaId");
    const gradoId = searchParams.get("gradoId");
    const trimestre = searchParams.get("trimestre");

    // Si se proporciona materiaId, obtener configuración específica
    if (materiaId && trimestre) {
      let config = await db.configActividad.findUnique({
        where: {
          materiaId_trimestre: {
            materiaId,
            trimestre: parseInt(trimestre),
          },
        },
      });

      // Si no existe, crear una configuración por defecto
      if (!config) {
        config = await db.configActividad.create({
          data: {
            materiaId,
            trimestre: parseInt(trimestre),
            numActividadesCotidianas: 4,
            numActividadesIntegradoras: 1,
            tieneExamen: true,
            porcentajeAC: 35.0,
            porcentajeAI: 35.0,
            porcentajeExamen: 30.0,
          },
        });
      }

      // Transformar al formato esperado por el frontend
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

    // Si se proporciona gradoId, obtener todas las configuraciones del grado
    if (gradoId && trimestre) {
      const materias = await db.materia.findMany({
        where: { gradoId },
        select: { id: true, nombre: true },
      });

      const materiaIds = materias.map(m => m.id);

      const configs = await db.configActividad.findMany({
        where: {
          materiaId: { in: materiaIds },
          trimestre: parseInt(trimestre),
        },
      });

      // Para cada materia sin configuración, crear una por defecto
      const result: any[] = [];
      for (const materia of materias) {
        const existingConfig = configs.find(c => c.materiaId === materia.id);
        if (existingConfig) {
          result.push({
            ...existingConfig,
            materiaNombre: materia.nombre,
          });
        } else {
          const newConfig = await db.configActividad.create({
            data: {
              materiaId: materia.id,
              trimestre: parseInt(trimestre),
              numActividadesCotidianas: 4,
              numActividadesIntegradoras: 1,
              tieneExamen: true,
              porcentajeAC: 35.0,
              porcentajeAI: 35.0,
              porcentajeExamen: 30.0,
            },
          });
          result.push({
            ...newConfig,
            materiaNombre: materia.nombre,
          });
        }
      }

      return NextResponse.json(result);
    }

    return NextResponse.json(null);
  } catch (error) {
    console.error("Error al obtener configuración:", error);
    return NextResponse.json(
      { error: "Error al obtener configuración" },
      { status: 500 }
    );
  }
}

// Crear o actualizar configuración
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const data = await request.json();
    const { materiaId, gradoId, aplicarATodasLasMateriasDelGrado, trimestre, numActividadesCotidianas, numActividadesIntegradoras, tieneExamen, porcentajeAC, porcentajeAI, porcentajeExamen } = data;

    if (!trimestre) return NextResponse.json({ error: "Trimestre es requerido" }, { status: 400 });

    const baseData = {
      trimestre: parseInt(String(trimestre)),
      numActividadesCotidianas: numActividadesCotidianas ?? 4,
      numActividadesIntegradoras: numActividadesIntegradoras ?? 1,
      tieneExamen: tieneExamen ?? true,
      porcentajeAC: porcentajeAC ?? 35.0,
      porcentajeAI: porcentajeAI ?? 35.0,
      porcentajeExamen: porcentajeExamen ?? 30.0,
    };

    if (aplicarATodasLasMateriasDelGrado && gradoId) {
      const materias = await db.materia.findMany({ where: { gradoId } });
      const updates = materias.map(m => db.configActividad.upsert({
        where: { materiaId_trimestre: { materiaId: m.id, trimestre: baseData.trimestre } },
        create: { materiaId: m.id, ...baseData },
        update: baseData
      }));
      await Promise.all(updates);
      return NextResponse.json({ success: true, count: materias.length });
    }

    if (!materiaId) return NextResponse.json({ error: "materiaId es requerido" }, { status: 400 });

    const config = await db.configActividad.upsert({
      where: { materiaId_trimestre: { materiaId, trimestre: baseData.trimestre } },
      create: { materiaId, ...baseData },
      update: baseData,
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error al guardar configuración:", error);
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
