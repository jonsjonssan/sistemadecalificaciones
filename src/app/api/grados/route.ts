import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

// Listar grados
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener el año de la query o usar la configuración del sistema
    const { searchParams } = new URL(request.url);
    let año = searchParams.get("año") ? parseInt(searchParams.get("año")!) : null;
    
    // Si no se especifica año, obtener el año actual de la configuración
    if (!año) {
      const config = await db.configuracionSistema.findFirst();
      año = config?.añoEscolar || 2026;
    }

    const grados = await db.grado.findMany({
      where: { año },
      include: {
        docente: {
          select: { id: true, nombre: true, email: true },
        },
        _count: {
          select: { estudiantes: true, materias: true },
        },
      },
      orderBy: [{ numero: "asc" }, { seccion: "asc" }],
    });

    return NextResponse.json(grados);
  } catch (error) {
    console.error("Error al obtener grados:", error);
    return NextResponse.json(
      { error: "Error al obtener grados" },
      { status: 500 }
    );
  }
}

// Crear grado
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuario = JSON.parse(session.value);
    if (usuario.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden crear grados" }, { status: 403 });
    }

    const { numero, seccion, año, docenteId } = await request.json();

    if (!numero || numero < 2 || numero > 9) {
      return NextResponse.json(
        { error: "El grado debe estar entre 2 y 9" },
        { status: 400 }
      );
    }

    const grado = await db.grado.create({
      data: {
        numero,
        seccion: seccion || "A",
        año: año || 2026,
        docenteId,
      },
      include: { docente: true },
    });

    // Crear las 7 materias por defecto
    const materiasNombres = [
      "Comunicación",
      "Números y Formas",
      "Ciencia y Tecnología",
      "Ciudadanía y Valores",
      "Artes",
      "Desarrollo Corporal",
      "Educación en la Fe",
    ];

    for (const nombre of materiasNombres) {
      const materia = await db.materia.create({
        data: { nombre, gradoId: grado.id },
      });
      
      // Crear configuración para cada trimestre
      for (let trimestre = 1; trimestre <= 3; trimestre++) {
        await db.configActividad.create({
          data: {
            materiaId: materia.id,
            trimestre,
            numActividadesCotidianas: 4,
            numActividadesIntegradoras: 1,
            tieneExamen: true,
            porcentajeAC: 35.0,
            porcentajeAI: 35.0,
            porcentajeExamen: 30.0,
          },
        });
      }
    }

    return NextResponse.json(grado);
  } catch (error) {
    console.error("Error al crear grado:", error);
    return NextResponse.json(
      { error: "Error al crear grado" },
      { status: 500 }
    );
  }
}
