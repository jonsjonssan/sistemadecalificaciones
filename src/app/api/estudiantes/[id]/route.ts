import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/session";

async function getUsuarioSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  return verifySession(session.value);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden editar estudiantes" }, { status: 403 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const body = await request.json();
    const { nombre, email } = body;

    const updateData: any = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (email !== undefined) updateData.email = email || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No hay datos para actualizar" }, { status: 400 });
    }

    const estudiante = await db.estudiante.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(estudiante);
  } catch (error) {
    console.error("Error al actualizar estudiante:", error);
    return NextResponse.json({ error: "Error al actualizar estudiante" }, { status: 500 });
  }
}
