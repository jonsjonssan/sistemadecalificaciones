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
    console.error("[audit] Error parsing session:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session || session.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Auto-borrar logs mayores a 5 dias
    try {
      await sql`DELETE FROM "AuditLog" WHERE "createdAt" < NOW() - INTERVAL '5 days'`;
    } catch (cleanupError) {
      console.error("[audit] Cleanup error:", cleanupError);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const usuarioId = searchParams.get("usuarioId");
    const accion = searchParams.get("accion");
    const entidad = searchParams.get("entidad");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");

    const skip = (page - 1) * limit;

    let whereClauses: string[] = [];
    if (usuarioId) whereClauses.push(`a."usuarioId" = '${usuarioId}'`);
    if (accion) whereClauses.push(`a.accion = '${accion}'`);
    if (entidad) whereClauses.push(`a.entidad = '${entidad}'`);
    if (fechaDesde) whereClauses.push(`a."createdAt" >= '${fechaDesde}'`);
    if (fechaHasta) whereClauses.push(`a."createdAt" <= '${fechaHasta}'`);

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const logsQuery = `
      SELECT a.*, u.nombre as "usuario_nombre", u.email as "usuario_email", u.rol as "usuario_rol"
      FROM "AuditLog" a
      JOIN "Usuario" u ON a."usuarioId" = u.id
      ${whereSql}
      ORDER BY a."createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const totalQuery = `
      SELECT COUNT(*) FROM "AuditLog" a
      ${whereSql}
    `;

    const [logsRaw, totalRaw] = await Promise.all([
      sql.unsafe(logsQuery),
      sql.unsafe(totalQuery)
    ]);

    const logs = (logsRaw as any[]).map((l: any) => ({
      id: l.id,
      usuarioId: l.usuarioId,
      accion: l.accion,
      entidad: l.entidad,
      entidadId: l.entidadId,
      detalles: l.detalles,
      ip: l.ip,
      userAgent: l.userAgent,
      createdAt: l.createdAt,
      usuario: {
        id: l.usuarioId,
        nombre: l.usuario_nombre,
        email: l.usuario_email,
        rol: l.usuario_rol
      }
    }));

    const total = parseInt((totalRaw as any[])[0]?.count || "0");

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("[audit] GET Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error al obtener logs", details: errMsg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const data = await request.json();
    const { accion, entidad, entidadId, detalles } = data;

    if (!accion || !entidad) {
      return NextResponse.json({ error: "accion y entidad son requeridos" }, { status: 400 });
    }

    const headers = Object.fromEntries(request.headers.entries());
    const ip = headers["x-forwarded-for"] || headers["x-real-ip"] || "unknown";
    const userAgent = headers["user-agent"] || "unknown";

    const detallesStr = detalles ? JSON.stringify(detalles) : null;

    const result = await sql`
      INSERT INTO "AuditLog" ("id", "usuarioId", "accion", "entidad", "entidadId", "detalles", "ip", "userAgent", "createdAt")
      VALUES (gen_random_uuid()::text, ${session.id}, ${accion}, ${entidad}, ${entidadId || null}, ${detallesStr}, ${ip}, ${userAgent}, NOW())
      RETURNING *
    `;

    const usuario = await sql`SELECT id, nombre, email, rol FROM "Usuario" WHERE id = ${session.id}`;

    const log = {
      ...result[0],
      usuario: usuario[0]
    };

    return NextResponse.json(log);
  } catch (error) {
    console.error("[audit] POST Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error al crear log", details: errMsg }, { status: 500 });
  }
}
