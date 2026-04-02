import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

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
    const activos = searchParams.get("activos");

    let where: any = {};
    if (gradoId) where.gradoId = gradoId;
    if (activos === "true") where.activo = true;
    if (activos === "false") where.activo = false;

    const estudiantes = await prisma.estudiante.findMany({
      where,
      orderBy: { numero: "asc" },
    });

    return NextResponse.json(estudiantes);
  } catch (error) {
    console.error("Error al obtener estudiantes:", error);
    return NextResponse.json({ error: "Error al obtener estudiantes" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.rol !== "admin" && session.rol !== "docente") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const data = await request.json();
    const { nombre, gradoId } = data;

    if (!nombre || !gradoId) {
      return NextResponse.json({ error: "Nombre y grado son requeridos" }, { status: 400 });
    }

    const grado = await prisma.grado.findUnique({ where: { id: gradoId } });
    if (!grado) {
      return NextResponse.json({ error: "El grado seleccionado no existe" }, { status: 400 });
    }

    const ultimo = await prisma.estudiante.findFirst({
      where: { gradoId },
      orderBy: { numero: "desc" },
    });
    const nuevoNumero = ultimo ? ultimo.numero + 1 : 1;

    const estudiante = await prisma.estudiante.create({
      data: {
        numero: nuevoNumero,
        nombre,
        gradoId,
        activo: true,
      },
    });

    return NextResponse.json(estudiante);
  } catch (error) {
    console.error("Error al crear estudiante:", error);
    return NextResponse.json({ error: "Error al crear estudiante" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.rol !== "admin" && session.rol !== "docente") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { estudiantes, gradoId } = await request.json();

    if (!estudiantes || !Array.isArray(estudiantes)) {
      return NextResponse.json({ error: "Se requiere un array de nombres" }, { status: 400 });
    }

    if (!gradoId) {
      return NextResponse.json({ error: "Grado es requerido" }, { status: 400 });
    }

    const grado = await prisma.grado.findUnique({ where: { id: gradoId } });
    if (!grado) {
      return NextResponse.json({ error: "El grado seleccionado no existe" }, { status: 400 });
    }

    const ultimo = await prisma.estudiante.findFirst({
      where: { gradoId },
      orderBy: { numero: "desc" },
    });
    const numeroInicial = ultimo ? ultimo.numero : 0;

    const creados = await Promise.all(
      estudiantes.map((nombre: string, i: number) =>
        prisma.estudiante.create({
          data: {
            numero: numeroInicial + i + 1,
            nombre,
            gradoId,
            activo: true,
          },
        })
      )
    );

    return NextResponse.json({ message: `${creados.length} estudiantes creados`, estudiantes: creados });
  } catch (error) {
    console.error("Error al crear estudiantes:", error);
    return NextResponse.json({ error: "Error al crear estudiantes" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.rol !== "admin" && session.rol !== "docente") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    await prisma.calificacion.deleteMany({ where: { estudianteId: id } });
    await prisma.asistencia.deleteMany({ where: { estudianteId: id } });
    await prisma.estudiante.delete({ where: { id } });

    return NextResponse.json({ message: "Estudiante eliminado" });
  } catch (error) {
    console.error("Error al eliminar estudiante:", error);
    return NextResponse.json({ error: "Error al eliminar estudiante" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
