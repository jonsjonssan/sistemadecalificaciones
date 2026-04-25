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
    const { passwordActual, passwordNuevo } = await request.json();

    if (!passwordActual || !passwordNuevo) {
      return NextResponse.json({ error: "Contraseña actual y nueva son requeridas" }, { status: 400 });
    }

    if (passwordNuevo.length < 6) {
      return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const usuario = await sql`SELECT * FROM "Usuario" WHERE id = ${sessionData.id}`;

    if (usuario.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const passwordValida = await bcrypt.compare(passwordActual, usuario[0].password);
    if (!passwordValida) {
      return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(passwordNuevo, 10);

    await sql`
      UPDATE "Usuario" SET password = ${hashedPassword}, "updatedAt" = NOW()
      WHERE id = ${sessionData.id}
    `;

    return NextResponse.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    return NextResponse.json(
      { error: "Error al cambiar contraseña" },
      { status: 500 }
    );
  }
}
