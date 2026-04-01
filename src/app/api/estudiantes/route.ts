import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    if (!gradoId) {
      return NextResponse.json({ error: "gradoId requerido" }, { status: 400 });
    }

    const prisma = prisma;

    const where: any = { gradoId };
    const activos = searchParams.get("activos");
    if (activos === "true") where.activo = true;
    else if (activos === "false") where.activo = false;

    const estudiantes = await prisma.estudiante.findMany({
      where,
      orderBy: { numero: "asc" },
    });



    return NextResponse.json(estudiantes);
  } catch (error) {
    console.error("Error al obtener estudiantes:", error);
    return NextResponse.json({ error: "Error al obtener estudiantes", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const data = await request.json();
    const { nombre, gradoId } = data;

    if (!nombre || !gradoId) {
      return NextResponse.json({ error: "Nombre y grado son requeridos" }, { status: 400 });
    }

    const prisma = prisma;

    const ultimo = await prisma.estudiante.findFirst({
      where: { gradoId },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });

    const nuevoNumero = ultimo ? ultimo.numero + 1 : 1;

    const result = await prisma.estudiante.create({
      data: { numero: nuevoNumero, nombre, gradoId },
    });



    return NextResponse.json(result);
  } catch (error) {
    console.error("Error al crear estudiante:", error);
    return NextResponse.json({ error: "Error al crear estudiante", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { estudiantes, gradoId } = await request.json();

    if (!estudiantes || !Array.isArray(estudiantes)) {
      return NextResponse.json({ error: "Se requiere un array de nombres" }, { status: 400 });
    }

    const prisma = prisma;

    const ultimo = await prisma.estudiante.findFirst({
      where: { gradoId },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });

    const numeroInicial = ultimo ? ultimo.numero : 0;

    const creados: any[] = [];
    for (let i = 0; i < estudiantes.length; i++) {
      const result = await prisma.estudiante.create({
        data: { numero: numeroInicial + i + 1, nombre: estudiantes[i], gradoId },
      });
      creados.push(result);
    }



    return NextResponse.json({ message: `${creados.length} estudiantes creados`, estudiantes: creados });
  } catch (error) {
    console.error("Error al crear estudiantes:", error);
    return NextResponse.json({ error: "Error al crear estudiantes", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const prisma = prisma;

    await prisma.calificacion.deleteMany({ where: { estudianteId: id } });
    await prisma.asistencia.deleteMany({ where: { estudianteId: id } });
    await prisma.estudiante.delete({ where: { id } });



    return NextResponse.json({ message: "Estudiante eliminado" });
  } catch (error) {
    console.error("Error al eliminar estudiante:", error);
    return NextResponse.json({ error: "Error al eliminar estudiante", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
