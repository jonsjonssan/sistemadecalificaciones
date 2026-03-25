import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

// Listar materias
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gradoId = searchParams.get("gradoId");
    const todas = searchParams.get("todas");
    const año = searchParams.get("año") ? parseInt(searchParams.get("año")!) : null;

    // Obtener año actual de la configuración si no se especifica
    let añoActual = año;
    if (!añoActual) {
      const config = await db.configuracionSistema.findFirst();
      añoActual = config?.añoEscolar || 2026;
    }

    // Si se piden todas las materias con info de grado
    if (todas === "true") {
      const materias = await db.materia.findMany({
        where: {
          grado: {
            año: añoActual
          }
        },
        include: {
          grado: {
            select: {
              id: true,
              numero: true,
              seccion: true,
            },
          },
        },
        orderBy: [
          { grado: { numero: "asc" } },
          { nombre: "asc" },
        ],
      });
      return NextResponse.json(materias);
    }

    // Si se proporciona gradoId, filtrar por grado
    if (gradoId) {
      const materias = await db.materia.findMany({
        where: { gradoId },
        orderBy: { nombre: "asc" },
      });
      return NextResponse.json(materias);
    }

    // Por defecto, retornar todas del año actual
    const materias = await db.materia.findMany({
      where: {
        grado: {
          año: añoActual
        }
      },
      include: {
        grado: {
          select: {
            id: true,
            numero: true,
            seccion: true,
          },
        },
      },
      orderBy: [
        { grado: { numero: "asc" } },
        { nombre: "asc" },
      ],
    });
    return NextResponse.json(materias);
  } catch (error) {
    console.error("Error al obtener materias:", error);
    return NextResponse.json(
      { error: "Error al obtener materias" },
      { status: 500 }
    );
  }
}
