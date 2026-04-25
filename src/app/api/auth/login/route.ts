import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { createAuditLog } from "@/lib/audit";
import { signSession } from "@/lib/session";

// Simple in-memory rate limiter for login attempts
// Limits: 5 attempts per minute per IP
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxAttempts = 5;

  const attempt = loginAttempts.get(ip);

  if (!attempt || now > attempt.resetTime) {
    // Reset or create new window
    loginAttempts.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetIn: windowMs };
  }

  if (attempt.count >= maxAttempts) {
    const resetIn = attempt.resetTime - now;
    return { allowed: false, remaining: 0, resetIn };
  }

  attempt.count++;
  return { allowed: true, remaining: maxAttempts - attempt.count, resetIn: attempt.resetTime - now };
}

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const headers = Object.fromEntries(request.headers.entries());
    const ip = headers["x-forwarded-for"]?.split(",")[0] || headers["x-real-ip"] || "unknown";

    // Check rate limit
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      const resetInSec = Math.ceil(rateLimit.resetIn / 1000);
      return NextResponse.json(
        {
          error: `Demasiados intentos de login. Intenta de nuevo en ${resetInSec} segundos.`,
          resetIn: resetInSec
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimit.resetIn / 1000).toString(),
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.ceil(rateLimit.resetIn / 1000).toString(),
          }
        }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 });
    }

    const usuario = await sql`
      SELECT * FROM "Usuario" WHERE email = ${email}
    `;

    if (usuario.length === 0) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const hashMatch = await bcrypt.compare(password, usuario[0].password);
    const plaintextMatch = password === usuario[0].password;

    if (!hashMatch && !plaintextMatch) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    if (plaintextMatch && !hashMatch) {
      const hashed = await bcrypt.hash(password, 10);
      await sql`UPDATE "Usuario" SET password = ${hashed} WHERE id = ${usuario[0].id}`;
    }

    if (!usuario[0].activo) {
      return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
    }

    // Obtener las materias asignadas
    const materiasAsignadas = await sql`
      SELECT m.id, m.nombre, m."gradoId", gr.numero as grado_numero, gr.seccion as grado_seccion
      FROM "DocenteMateria" dm
      JOIN "Materia" m ON dm."materiaId" = m.id
      JOIN "Grado" gr ON m."gradoId" = gr.id
      WHERE dm."docenteId" = ${usuario[0].id}
    `;

    const cookieStore = await cookies();

    const userData = {
      id: usuario[0].id,
      email: usuario[0].email,
      nombre: usuario[0].nombre,
      rol: usuario[0].rol,
      gradosAsignados: [], // Ya no se usa - todos los docentes usan materias asignadas
      asignaturasAsignadas: materiasAsignadas.map((m: any) => ({
        id: m.id,
        nombre: m.nombre,
        gradoId: m.gradoId,
        gradoNumero: m.grado_numero,
        gradoSeccion: m.grado_seccion
      }))
    };

    console.log("[auth/login] User data to save in session:", JSON.stringify(userData));

    cookieStore.set("session", signSession(userData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 horas - sesión más corta
    });

    // Registrar login en audit log y sesiones
    try {
      const headers = Object.fromEntries(request.headers.entries());
      const ip = headers["x-forwarded-for"] || headers["x-real-ip"] || "unknown";
      const userAgent = headers["user-agent"] || "unknown";

      await createAuditLog({
        usuarioId: usuario[0].id,
        accion: "LOGIN",
        entidad: "Usuario",
        entidadId: usuario[0].id,
        detalles: JSON.stringify({ email: usuario[0].email, nombre: usuario[0].nombre }),
      });

      await sql`
        INSERT INTO "LoginSession" ("id", "usuarioId", "ip", "userAgent", "loginAt")
        VALUES (gen_random_uuid()::text, ${usuario[0].id}, ${ip}, ${userAgent}, NOW())
      `;
    } catch (auditError) {
      console.error("[auth/login] Error creating audit log:", auditError);
    }

    return NextResponse.json({ usuario: userData });
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}