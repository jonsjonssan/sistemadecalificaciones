import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const usuarioId = searchParams.get("usuarioId");
    const accion = searchParams.get("accion");
    const entidad = searchParams.get("entidad");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");

    const skip = (page - 1) * limit;

    const where: any = {};
    if (usuarioId) where.usuarioId = usuarioId;
    if (accion) where.accion = accion;
    if (entidad) where.entidad = entidad;
    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) where.createdAt.gte = new Date(fechaDesde);
      if (fechaHasta) where.createdAt.lte = new Date(fechaHasta);
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true }
          }
        }
      }),
      db.auditLog.count({ where })
    ]);

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

    const log = await db.auditLog.create({
      data: {
        usuarioId: session.id,
        accion,
        entidad,
        entidadId: entidadId || null,
        detalles: detalles ? JSON.stringify(detalles) : null,
        ip,
        userAgent
      },
      include: {
        usuario: {
          select: { id: true, nombre: true, email: true, rol: true }
        }
      }
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error("[audit] POST Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error al crear log", details: errMsg }, { status: 500 });
  }
}
