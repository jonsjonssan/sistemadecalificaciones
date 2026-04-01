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

    // Always filter by Calificacion entity
    const logs = await sql`
      SELECT a.*, u.nombre as "usuario_nombre", u.email as "usuario_email", u.rol as "usuario_rol"
      FROM "AuditLog" a
      JOIN "Usuario" u ON a."usuarioId" = u.id
      WHERE a.entidad = 'Calificacion'
      ORDER BY a."createdAt" DESC
      LIMIT 100
    `;

    const totalResult = await sql`
      SELECT COUNT(*) FROM "AuditLog" a
      WHERE a.entidad = 'Calificacion'
    `;
    const total = parseInt(totalResult[0]?.count || "0");

    const formattedLogs = (logs as any[]).map((l: any) => ({
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

    return NextResponse.json({
      logs: formattedLogs,
      total,
      page: 1,
      totalPages: Math.ceil(total / 100)
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
