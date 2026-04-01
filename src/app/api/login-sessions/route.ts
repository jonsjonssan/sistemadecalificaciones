import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";

async function getUsuarioSession() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session) return null;
    const parsed = JSON.parse(session.value);
    if (!parsed || !parsed.id) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session || session.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const usuarioId = searchParams.get("usuarioId");

    const skip = (page - 1) * limit;

    let whereClause = "";
    if (usuarioId) {
      whereClause = `WHERE s."usuarioId" = '${usuarioId}'`;
    }

    const sessionsQuery = `
      SELECT s.*, u.nombre as "usuario_nombre", u.email as "usuario_email", u.rol as "usuario_rol"
      FROM "LoginSession" s
      JOIN "Usuario" u ON s."usuarioId" = u.id
      ${whereClause}
      ORDER BY s."loginAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const totalQuery = `
      SELECT COUNT(*) FROM "LoginSession" s
      ${whereClause}
    `;

    const [sessionsRaw, totalRaw] = await Promise.all([
      sql.unsafe(sessionsQuery),
      sql.unsafe(totalQuery)
    ]);

    const sessions = (sessionsRaw as any[]).map((s: any) => ({
      id: s.id,
      usuarioId: s.usuarioId,
      ip: s.ip,
      userAgent: s.userAgent,
      loginAt: s.loginAt,
      logoutAt: s.logoutAt,
      isActive: s.isActive,
      usuario: {
        id: s.usuarioId,
        nombre: s.usuario_nombre,
        email: s.usuario_email,
        rol: s.usuario_rol
      }
    }));

    const total = parseInt((totalRaw as any[])[0]?.count || "0");

    return NextResponse.json({
      sessions,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("[login-sessions] GET Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error al obtener sesiones", details: errMsg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { usuarioId } = data;

    if (!usuarioId) {
      return NextResponse.json({ error: "usuarioId es requerido" }, { status: 400 });
    }

    const headers = Object.fromEntries(request.headers.entries());
    const ip = headers["x-forwarded-for"] || headers["x-real-ip"] || "unknown";
    const userAgent = headers["user-agent"] || "unknown";

    const result = await sql`
      INSERT INTO "LoginSession" ("id", "usuarioId", "ip", "userAgent", "loginAt")
      VALUES (gen_random_uuid()::text, ${usuarioId}, ${ip}, ${userAgent}, NOW())
      RETURNING *
    `;

    const usuario = await sql`SELECT id, nombre, email, rol FROM "Usuario" WHERE id = ${usuarioId}`;

    const sessionData = {
      ...result[0],
      usuario: usuario[0]
    };

    return NextResponse.json(sessionData);
  } catch (error) {
    console.error("[login-sessions] POST Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error al crear sesión", details: errMsg }, { status: 500 });
  }
}
