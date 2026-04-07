import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { OAuth2Client } from "google-auth-library";
import { cookies } from "next/headers";
import { createAuditLog } from "@/lib/audit";

// Inicializar cliente OAuth de Google
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

export async function POST(request: NextRequest) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json({ error: "Credencial de Google requerida" }, { status: 400 });
    }

    // Verificar el token ID de Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json({ error: "No se pudo verificar la identidad de Google" }, { status: 401 });
    }

    const googleEmail = payload.email.toLowerCase();
    const googleName = payload.name || googleEmail.split("@")[0];
    const googleId = payload.sub;

    // Buscar usuario por email en la base de datos
    const usuario = await sql`
      SELECT * FROM "Usuario" WHERE LOWER(email) = ${googleEmail}
    `;

    if (usuario.length === 0) {
      // Usuario NO registrado en el sistema
      return NextResponse.json({
        registrado: false,
        mensaje: "Tu cuenta no está registrada en el sistema. Solicita acceso al administrador.",
        email: googleEmail,
        nombre: googleName,
      }, { status: 403 });
    }

    // Usuario encontrado
    const userRecord = usuario[0];

    if (!userRecord.activo) {
      return NextResponse.json({ error: "Usuario inactivo. Contacta al administrador." }, { status: 403 });
    }

    // Vincular googleId si no lo tiene (Neon devuelve snake_case)
    if (!userRecord.google_id) {
      await sql`
        UPDATE "Usuario" SET "googleId" = ${googleId}, provider = 'google' WHERE id = ${userRecord.id}
      `;
    }

    // Obtener materias asignadas
    const materiasAsignadas = await sql`
      SELECT m.id, m.nombre, m."gradoId", gr.numero as grado_numero, gr.seccion as grado_seccion
      FROM "DocenteMateria" dm
      JOIN "Materia" m ON dm."materiaId" = m.id
      JOIN "Grado" gr ON m."gradoId" = gr.id
      WHERE dm."docenteId" = ${userRecord.id}
    `;

    const userData = {
      id: userRecord.id,
      email: userRecord.email,
      nombre: userRecord.nombre,
      rol: userRecord.rol,
      gradosAsignados: [],
      asignaturasAsignadas: materiasAsignadas.map((m: any) => ({
        id: m.id,
        nombre: m.nombre,
        gradoId: m.gradoId,
        gradoNumero: m.grado_numero,
        gradoSeccion: m.grado_seccion,
      })),
    };

    console.log("[auth/google] User data to save in session:", JSON.stringify(userData));

    // Crear sesión en cookie
    const cookieStore = await cookies();
    cookieStore.set("session", JSON.stringify(userData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 horas
    });

    // Registrar en audit log y sesiones
    try {
      const headers = Object.fromEntries(request.headers.entries());
      const ip = headers["x-forwarded-for"] || headers["x-real-ip"] || "unknown";
      const userAgent = headers["user-agent"] || "unknown";

      await createAuditLog({
        usuarioId: userRecord.id,
        accion: "LOGIN",
        entidad: "Usuario",
        entidadId: userRecord.id,
        detalles: JSON.stringify({ email: userRecord.email, nombre: userRecord.nombre, provider: "google" }),
      });

      await sql`
        INSERT INTO "LoginSession" ("id", "usuarioId", "ip", "userAgent", "loginAt")
        VALUES (gen_random_uuid()::text, ${userRecord.id}, ${ip}, ${userAgent}, NOW())
      `;
    } catch (auditError) {
      console.error("[auth/google] Error creating audit log:", auditError);
    }

    return NextResponse.json({
      registrado: true,
      usuario: userData,
    });
  } catch (error) {
    console.error("Error en login con Google:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
