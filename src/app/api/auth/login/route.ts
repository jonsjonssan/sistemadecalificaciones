import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 });
    }

    const usuario = await sql`
      SELECT * FROM "Usuario" WHERE email = ${email}
    `;

    if (usuario.length === 0 || usuario[0].password !== password) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    if (!usuario[0].activo) {
      return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
    }

    const cookieStore = await cookies();
    cookieStore.set("session", JSON.stringify({
      id: usuario[0].id,
      email: usuario[0].email,
      nombre: usuario[0].nombre,
      rol: usuario[0].rol,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });

    return NextResponse.json({
      usuario: {
        id: usuario[0].id,
        email: usuario[0].email,
        nombre: usuario[0].nombre,
        rol: usuario[0].rol,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
