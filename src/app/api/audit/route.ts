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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const accion = searchParams.get("accion");
    const usuarioId = searchParams.get("usuarioId");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const skip = (page - 1) * limit;

    try {
      await sql`DELETE FROM "AuditLog" WHERE "createdAt" < NOW() - INTERVAL '14 days'`;
    } catch (cleanupError) {
      console.error("[audit] Cleanup error:", cleanupError);
    }

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (accion) {
      conditions.push(`a.accion = $${paramIndex}`);
      params.push(accion);
      paramIndex++;
    }
    if (usuarioId) {
      conditions.push(`a."usuarioId" = $${paramIndex}`);
      params.push(usuarioId);
      paramIndex++;
    }
    if (fechaDesde) {
      conditions.push(`a."createdAt" >= $${paramIndex}::date`);
      params.push(fechaDesde);
      paramIndex++;
    }
    if (fechaHasta) {
      conditions.push(`a."createdAt" <= $${paramIndex}::date + INTERVAL '1 day'`);
      params.push(fechaHasta);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const logsQuery = `
      SELECT a.*, u.nombre as "usuario_nombre"
      FROM "AuditLog" a
      JOIN "Usuario" u ON a."usuarioId" = u.id
      ${whereClause}
      ORDER BY a."createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const countQuery = `
      SELECT COUNT(*) FROM "AuditLog" a
      ${whereClause}
    `;

    const [logs, countResult] = await Promise.all([
      sql.unsafe(logsQuery),
      sql.unsafe(countQuery)
    ]);
    const total = parseInt((countResult as unknown as any[])[0]?.count || "0");

    const formattedLogs = (logs as unknown as any[]).map((l: any) => ({
      id: l.id,
      usuarioId: l.usuarioId,
      accion: l.accion,
      entidad: l.entidad,
      entidadId: l.entidadId,
      detalles: l.detalles,
      grado: l.grado,
      ip: l.ip,
      userAgent: l.userAgent,
      createdAt: l.createdAt,
      usuario: {
        id: l.usuarioId,
        nombre: l.usuario_nombre
      }
    }));

    return NextResponse.json({
      logs: formattedLogs,
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
    const { accion, entidad, entidadId, detalles, grado } = data;

    if (!accion || !entidad) {
      return NextResponse.json({ error: "accion y entidad son requeridos" }, { status: 400 });
    }

    const headers = Object.fromEntries(request.headers.entries());
    const ip = headers["x-forwarded-for"] || headers["x-real-ip"] || "unknown";
    const userAgent = headers["user-agent"] || "unknown";

    const detallesStr = detalles ? JSON.stringify(detalles) : null;

    const result = await sql`
      INSERT INTO "AuditLog" ("id", "usuarioId", "accion", "entidad", "entidadId", "detalles", "grado", "ip", "userAgent", "createdAt")
      VALUES (gen_random_uuid()::text, ${session.id}, ${accion}, ${entidad}, ${entidadId || null}, ${detallesStr}, ${grado || null}, ${ip}, ${userAgent}, NOW())
      RETURNING *
    `;

    const usuario = await sql`SELECT id, nombre FROM "Usuario" WHERE id = ${session.id}`;

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
