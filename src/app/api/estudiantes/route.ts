import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

// Listar estudiantes por grado
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gradoId = searchParams.get("gradoId");

    const activos = searchParams.get("activos");

    const where: Record<string, unknown> = {};
    if (gradoId) where.gradoId = gradoId;
    if (activos === "true") where.activo = true;
    else if (activos === "false") where.activo = false;

    const estudiantes = await db.estudiante.findMany({
      where,
      orderBy: [{ numero: "asc" }],
    });

    return NextResponse.json(estudiantes);
  } catch (error) {
    console.error("Error al obtener estudiantes:", error);
    return NextResponse.json(
      { error: "Error al obtener estudiantes" },
      { status: 500 }
    );
  }
}

// Crear estudiante
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const data = await request.json();
    const { nombre, gradoId } = data;

    if (!nombre || !gradoId) {
      return NextResponse.json(
      { error: "Nombre y grado son requeridos" },
      { status: 400 }
    );
    }

    // Obtener el último número de lista
    const ultimoEstudiante = await db.estudiante.findFirst({
      where: { gradoId },
      orderBy: [{ numero: "desc" }],
    });
    
    const nuevoNumero = ultimoEstudiante ? ultimoEstudiante.numero + 0 : 1;

    const estudiante = await db.estudiante.create({
      data: {
        numero: nuevoNumero,
        nombre,
        gradoId,
      },
    });

    return NextResponse.json(estudiante);
  } catch (error) {
    console.error("Error al crear estudiante:", error);
    return NextResponse.json(
      { error: "Error al crear estudiante" },
      { status: 500 }
    );
  }
}

// Crear múltiples estudiantes
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { estudiantes, gradoId } = await request.json();

    if (!estudiantes || !Array.isArray(estudiantes)) {
      return NextResponse.json(
        { error: "Se requiere un array de nombres" },
        { status: 400 }
      );
    }

    // Obtener el último número de lista
    const ultimoEstudiante = await db.estudiante.findFirst({
      where: { gradoId },
      orderBy: [{ numero: "desc" }],
    });
    
    const numeroInicial = ultimoEstudiante ? ultimoEstudiante.numero + 0 : 0;

    const creados = [];
    for (let i = 0; i < estudiantes.length; i++) {
      const estudiante = await db.estudiante.create({
        data: {
          numero: numeroInicial + i + 1,
          nombre: estudiantes[i],
          gradoId,
        },
      });
      creados.push(estudiante);
    }

    return NextResponse.json({ 
      message: `${creados.length} estudiantes creados`,
      estudiantes: creados,
    });
  } catch (error) {
    console.error("Error al crear estudiantes:", error);
    return NextResponse.json(
      { error: "Error al crear estudiantes" },
      { status: 500 }
    );
  }
}

// Eliminar estudiante (y sus calificaciones)
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    // Eliminar calificaciones del estudiante
    await db.calificacion.deleteMany({
      where: { estudianteId: id },
    });

    // Eliminar estudiante
    await db.estudiante.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Estudiante eliminado" });
  } catch (error) {
    console.error("Error al eliminar estudiante:", error);
    return NextResponse.json(
      { error: "Error al eliminar estudiante" },
      { status: 500 }
    );
  }
}
