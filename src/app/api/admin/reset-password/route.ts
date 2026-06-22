import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { isAdmin } from "@/utils/roleHelpers";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sessionData = verifySession(session.value);
    if (!sessionData) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }
    if (!isAdmin(sessionData.rol)) {
      return NextResponse.json({ error: "Solo administradores pueden restablecer contraseñas" }, { status: 403 });
    }

    const escuelaId = sessionData.escuelaId;
    if (!escuelaId) {
      return NextResponse.json({ error: "Sesión sin escuela asignada" }, { status: 400 });
    }

    const { usuarioId, nuevaPassword } = await request.json();

    if (!usuarioId || !nuevaPassword) {
      return NextResponse.json({ error: "ID de usuario y nueva contraseña son requeridos" }, { status: 400 });
    }

    if (nuevaPassword.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    }

    // Verificar que el usuario objetivo pertenece a la misma escuela
    const targetUser = await sql`
      SELECT id, "escuelaId" FROM "Usuario" WHERE id = ${usuarioId} LIMIT 1
    `;
    if (targetUser.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    if (targetUser[0].escuelaId !== escuelaId) {
      return NextResponse.json({ error: "No tiene permiso sobre usuarios de otra escuela" }, { status: 403 });
    }

    const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

    await sql`
      UPDATE "Usuario" SET password = ${hashedPassword}, "updatedAt" = NOW()
      WHERE id = ${usuarioId} AND "escuelaId" = ${escuelaId}
    `;

    // Invalidar cache de sesión del usuario afectado
    const { invalidateSessionCache } = await import("@/lib/api-middleware");
    invalidateSessionCache(usuarioId);

    return NextResponse.json({ message: "Contraseña restablecida correctamente" });
  } catch (error) {
    console.error("Error al restablecer contraseña:", error);
    return NextResponse.json(
      { error: "Error al restablecer contraseña" },
      { status: 500 }
    );
  }
}
