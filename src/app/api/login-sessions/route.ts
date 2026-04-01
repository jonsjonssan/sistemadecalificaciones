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
    const where: any = {};
    if (usuarioId) where.usuarioId = usuarioId;

    const [sessions, total] = await Promise.all([
      db.loginSession.findMany({
        where,
        orderBy: { loginAt: "desc" },
        skip,
        take: limit,
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true }
          }
        }
      }),
      db.loginSession.count({ where })
    ]);

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

    const session = await db.loginSession.create({
      data: {
        usuarioId,
        ip,
        userAgent
      },
      include: {
        usuario: {
          select: { id: true, nombre: true, email: true, rol: true }
        }
      }
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error("[login-sessions] POST Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error al crear sesión", details: errMsg }, { status: 500 });
  }
}
