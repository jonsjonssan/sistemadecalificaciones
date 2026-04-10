import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
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
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");

    const prisma = new PrismaClient();

    const where: any = {};
    if (accion) where.accion = accion;
    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) where.createdAt.gte = new Date(fechaDesde);
      if (fechaHasta) where.createdAt.lte = new Date(fechaHasta + "T23:59:59.999Z");
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { usuario: { select: { id: true, nombre: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    await prisma.$disconnect();

    const formattedLogs = logs.map((l: any) => {
      let detalles = {};
      try { detalles = JSON.parse(l.detalles || "{}"); } catch { /* ignore */ }
      return {
        id: l.id,
        usuarioId: l.usuarioId,
        accion: l.accion,
        entidad: l.entidad,
        detalles: l.detalles,
        grado: (detalles as any).grado || null,
        createdAt: l.createdAt,
        usuario: l.usuario,
      };
    });

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
    const { accion, entidad, entidadId, detalles } = data;

    if (!accion || !entidad) {
      return NextResponse.json({ error: "accion y entidad son requeridos" }, { status: 400 });
    }

    const prisma = new PrismaClient();

    const log = await prisma.auditLog.create({
      data: {
        usuarioId: session.id,
        accion,
        entidad,
        entidadId,
        detalles: typeof detalles === "string" ? detalles : JSON.stringify(detalles),
      },
      include: { usuario: { select: { id: true, nombre: true } } },
    });

    await prisma.$disconnect();

    return NextResponse.json(log);
  } catch (error) {
    console.error("[audit] POST Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error al crear log", details: errMsg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session || session.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const olderThan = searchParams.get("olderThan");

    const prisma = new PrismaClient();

    const where: any = {};
    if (olderThan) {
      where.createdAt = { lt: new Date(olderThan) };
    }

    const deleted = await prisma.auditLog.deleteMany({ where });

    await prisma.$disconnect();

    return NextResponse.json({ deleted: deleted.count });
  } catch (error) {
    console.error("[audit] DELETE Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error al borrar logs", details: errMsg }, { status: 500 });
  }
}
