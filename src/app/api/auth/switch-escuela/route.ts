import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, signSession } from "@/lib/session";
import { sql } from "@/lib/neon";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return NextResponse.json({ error: "No hay sesión activa" }, { status: 401 });
    }

    const session = verifySession(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }

    if (session.rol !== "superadmin") {
      return NextResponse.json({ error: "Solo el superadministrador puede cambiar de escuela" }, { status: 403 });
    }

    const { escuelaId } = await request.json();

    if (!escuelaId) {
      return NextResponse.json({ error: "ID de escuela requerido" }, { status: 400 });
    }

    const escuelaRows = await sql`
      SELECT id, nombre, codigo, logo, "colorPrimario"
      FROM "Escuela"
      WHERE id = ${escuelaId} AND activo = true
    `;

    if (escuelaRows.length === 0) {
      return NextResponse.json({ error: "Escuela no encontrada o inactiva" }, { status: 404 });
    }

    const escuela = escuelaRows[0];

    const updatedSession = {
      ...session,
      escuelaId: escuela.id,
      escuela: {
        id: escuela.id,
        nombre: escuela.nombre,
        codigo: escuela.codigo,
        logo: escuela.logo,
        colorPrimario: escuela.colorPrimario,
      },
    };

    const isSecure = request.headers.get("x-forwarded-proto") === "https" || process.env.NODE_ENV === "production";

    cookieStore.set("session", signSession(updatedSession), {
      httpOnly: true,
      secure: isSecure,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return NextResponse.json({
      success: true,
      usuario: updatedSession,
    });
  } catch (error) {
    console.error("[auth/switch-escuela] ERROR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
