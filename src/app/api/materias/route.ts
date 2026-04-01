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
    const todas = searchParams.get("todas");
    const año = searchParams.get("año") ? parseInt(searchParams.get("año")!) : 2026;

    const prisma = prisma;

    let materias;
    if (todas === "true") {
      materias = await prisma.materia.findMany({
        where: { grado: { año } },
        include: { grado: { select: { id: true, numero: true, seccion: true } } },
        orderBy: [{ grado: { numero: "asc" } }, { nombre: "asc" }],
      });
    } else if (gradoId) {
      materias = await prisma.materia.findMany({
        where: { gradoId },
        include: { grado: { select: { id: true, numero: true, seccion: true } } },
        orderBy: { nombre: "asc" },
      });
    } else {
      materias = await prisma.materia.findMany({
        where: { grado: { año } },
        include: { grado: { select: { id: true, numero: true, seccion: true } } },
        orderBy: [{ grado: { numero: "asc" } }, { nombre: "asc" }],
      });
    }



    return NextResponse.json(materias);
  } catch (error) {
    console.error("Error al obtener materias:", error);
    return NextResponse.json({ error: "Error al obtener materias", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
