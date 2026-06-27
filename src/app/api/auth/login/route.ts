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

// Periodic cleanup to prevent memory leaks
const LOGIN_RATE_LIMIT_CLEANUP = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts.entries()) {
    if (now > entry.resetTime) {
      loginAttempts.delete(key);
    }
  }
}, LOGIN_RATE_LIMIT_CLEANUP);

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

    const { email, password, escuelaId } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 });
    }

    // Buscar usuario por email (sin filtrar por escuela todavía)
    const usuarios = await sql`
      SELECT id, email, nombre, rol, activo, password, "escuelaId" FROM "Usuario" WHERE LOWER(email) = LOWER(${email})
    `;

    if (usuarios.length === 0) {
      // Timing-safe: comparar contra un hash dummy para evitar enumeración por tiempo
      await bcrypt.compare(password, "$2a$10$timing.safe.dummy.hash.for.constant.time.compare");
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const usuario = usuarios[0];
    const esSuperadmin = usuario.rol === "superadmin";

    // Solo el superadmin puede iniciar sesión sin escuela; los demás usuarios deben seleccionar una
    if (!esSuperadmin && !escuelaId) {
      return NextResponse.json({ error: "Debe seleccionar una escuela" }, { status: 400 });
    }

    // Si no es superadmin, validar que la escuela seleccionada coincida con la del usuario
    if (!esSuperadmin && usuario.escuelaId !== escuelaId) {
      await bcrypt.compare(password, "$2a$10$timing.safe.dummy.hash.for.constant.time.compare");
      return NextResponse.json({ error: "Credenciales inválidas o usuario no pertenece a esta escuela" }, { status: 401 });
    }

    const hashMatch = await bcrypt.compare(password, usuario.password);

    if (!hashMatch) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    if (!usuario.activo) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    // Obtener las materias asignadas
    const materiasAsignadas = await sql`
      SELECT m.id, m.nombre, m."gradoId", gr.numero as grado_numero, gr.seccion as grado_seccion
      FROM "DocenteMateria" dm
      JOIN "Materia" m ON dm."materiaId" = m.id
      JOIN "Grado" gr ON m."gradoId" = gr.id
      WHERE dm."docenteId" = ${usuario.id}
    `;

    // Obtener datos de la escuela (solo para usuarios que no son superadmin)
    let escuela: any = null;
    if (!esSuperadmin && escuelaId) {
      const escuelaRows = await sql`
        SELECT id, nombre, codigo, logo, "colorPrimario" FROM "Escuela" WHERE id = ${escuelaId}
      `;
      escuela = escuelaRows[0] || null;
    }

    const userData: any = {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      escuelaId: esSuperadmin ? undefined : usuario.escuelaId,
      escuela: esSuperadmin ? undefined : escuela,
      gradosAsignados: [],
      asignaturasAsignadas: materiasAsignadas.map((m: any) => ({
        id: m.id,
        nombre: m.nombre,
        gradoId: m.gradoId,
        gradoNumero: m.grado_numero,
        gradoSeccion: m.grado_seccion
      }))
    };

    const isSecure = request.headers.get("x-forwarded-proto") === "https" || process.env.NODE_ENV === "production";

    // Registrar login en audit log y sesiones ANTES de firmar la cookie
    try {
      const headers = Object.fromEntries(request.headers.entries());
      const ip = headers["x-forwarded-for"] || headers["x-real-ip"] || "unknown";
      const userAgent = headers["user-agent"] || "unknown";

      await createAuditLog({
        usuarioId: usuario.id,
        escuelaId: esSuperadmin ? undefined : escuelaId,
        accion: "LOGIN",
        entidad: "Usuario",
        entidadId: usuario.id,
        detalles: JSON.stringify({ email: usuario.email, nombre: usuario.nombre }),
      });

      const sessionResult = await sql`
        INSERT INTO "LoginSession" ("id", "usuarioId", "escuelaId", "ip", "userAgent", "loginAt")
        VALUES (gen_random_uuid()::text, ${usuario.id}, ${esSuperadmin ? null : escuelaId}, ${ip}, ${userAgent}, NOW())
        RETURNING id
      `;

      userData.sessionId = sessionResult[0]?.id;
    } catch (auditError) {
      console.error("[auth/login] Error creating audit log:", auditError);
    }

    // Firmar cookie DESPUES de añadir sessionId para que logout pueda revocarla
    const cookieStore = await cookies();
    cookieStore.set("session", signSession(userData), {
      httpOnly: true,
      secure: isSecure,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return NextResponse.json({ usuario: userData });
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}