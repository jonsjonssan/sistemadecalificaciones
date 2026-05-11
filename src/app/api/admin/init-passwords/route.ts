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
    if (!["admin", "admin-directora", "admin-codirectora"].includes(sessionData.rol)) {
      return NextResponse.json({ error: "Solo administradores pueden ejecutar esta acción" }, { status: 403 });
    }

    const { passwordAdmin, passwordDocente } = await request.json();

    if (!passwordAdmin || !passwordDocente) {
      return NextResponse.json({ error: "Se requieren passwordAdmin y passwordDocente" }, { status: 400 });
    }

    const minLen = 8;
    if (passwordAdmin.length < minLen || passwordDocente.length < minLen) {
      return NextResponse.json({ error: `Las contraseñas deben tener al menos ${minLen} caracteres` }, { status: 400 });
    }

    const hashedAdmin = await bcrypt.hash(passwordAdmin, 10);
    const hashedDocente = await bcrypt.hash(passwordDocente, 10);

    await sql`UPDATE "Usuario" SET password = ${hashedAdmin}, "updatedAt" = NOW() WHERE rol = 'admin'`;
    await sql`UPDATE "Usuario" SET password = ${hashedDocente}, "updatedAt" = NOW() WHERE rol = 'docente'`;

    return NextResponse.json({ 
      message: "Contraseñas actualizadas correctamente",
      resumen: {
        adminActualizado: true,
        docenteActualizado: true
      }
    });
  } catch (error) {
    console.error("Error al inicializar contraseñas:", error);
    return NextResponse.json(
      { error: "Error al inicializar contraseñas" },
      { status: 500 }
    );
  }
}
