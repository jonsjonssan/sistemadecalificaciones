import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sessionData = verifySession(session.value);
    if (sessionData.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden restablecer contraseñas" }, { status: 403 });
    }

    const { usuarioId, nuevaPassword } = await request.json();

    if (!usuarioId || !nuevaPassword) {
      return NextResponse.json({ error: "ID de usuario y nueva contraseña son requeridos" }, { status: 400 });
    }

    if (nuevaPassword.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

    await sql`
      UPDATE "Usuario" SET password = ${hashedPassword}, "updatedAt" = NOW()
      WHERE id = ${usuarioId}
    `;

    return NextResponse.json({ message: "Contraseña restablecida correctamente" });
  } catch (error) {
    console.error("Error al restablecer contraseña:", error);
    return NextResponse.json(
      { error: "Error al restablecer contraseña" },
      { status: 500 }
    );
  }
}
