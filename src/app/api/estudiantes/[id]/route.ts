import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/session";
import { z } from "zod";
import { isAdmin } from "@/utils/roleHelpers";

async function getUsuarioSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  return verifySession(session.value);
}

const patchSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(255).optional(),
  email: z.string().email("Email inválido").max(255).optional().or(z.literal("")),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!isAdmin(session.rol)) {
      return NextResponse.json({ error: "Solo administradores pueden editar estudiantes" }, { status: 403 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { nombre, email } = parsed.data;

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
