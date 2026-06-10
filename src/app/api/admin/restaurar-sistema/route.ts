import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { verifySession } from "@/lib/session";
import { isAdmin } from "@/utils/roleHelpers";
import bcrypt from "bcryptjs";
import { generateSecurePassword } from "@/lib/security";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sessionData = verifySession(session.value);
    if (!isAdmin(sessionData.rol)) {
      return NextResponse.json({ error: "Solo administradores pueden ejecutar esta acción" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const accion = searchParams.get("accion");

    if (accion === "restaurar") {
      const tempPassword = generateSecurePassword(16);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      await sql`
        UPDATE "Usuario" SET password = ${hashedPassword}, rol = 'docente', activo = true
        WHERE email != 'jonathan.araujo.mendoza@clases.edu.sv'
      `;

      await sql`
        UPDATE "Usuario" SET rol = 'admin', password = ${hashedPassword}
        WHERE email = 'jonathan.araujo.mendoza@clases.edu.sv'
      `;

      return NextResponse.json({ 
        message: "Sistema restaurado. Las contraseñas han sido restablecidas.",
        adminEmail: "jonathan.araujo.mendoza@clases.edu.sv",
        tempPassword: process.env.NODE_ENV === "development" ? tempPassword : undefined
      });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
