import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";

export const revalidate = 300;

async function getUsuarioSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  return verifySession(session.value);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gradoId = searchParams.get("gradoId");
    const todas = searchParams.get("todas");
    const año = searchParams.get("año") ? parseInt(searchParams.get("año")!) : 2026;

    const isAdminUser = ["admin", "admin-directora", "admin-codirectora"].includes(session.rol);
    const materiasArr = (session.asignaturasAsignadas || []) as Array<{ id: string }>;
    const materiaIdsAsignadas = materiasArr.map(m => m.id);

    let materias;
    if (todas === "true") {
      if (!isAdminUser && materiaIdsAsignadas.length === 0) {
        return NextResponse.json([]);
      }
      materias = await sql`
        SELECT m.*, g.id as grado_id, g.numero as grado_numero, g.seccion as grado_seccion
        FROM "Materia" m
        JOIN "Grado" g ON m."gradoId" = g.id
        WHERE g.año = ${año}
        ORDER BY g.numero, m.nombre
      `;
      const formatted = materias.map((m: any) => ({
        id: m.id,
        nombre: m.nombre,
        gradoId: m.gradoId,
        grado: { id: m.grado_id, numero: m.grado_numero, seccion: m.grado_seccion }
      }));
      return NextResponse.json(formatted);
    }

    if (gradoId) {
      if (!isAdminUser && materiaIdsAsignadas.length === 0) {
        return NextResponse.json([]);
      }
      materias = await sql`
        SELECT * FROM "Materia"
        WHERE "gradoId" = ${gradoId}
        ORDER BY nombre
      `;
      return NextResponse.json(materias);
    }

    if (!isAdminUser && materiaIdsAsignadas.length === 0) {
      return NextResponse.json([]);
    }
    materias = await sql`
      SELECT m.*, g.id as grado_id, g.numero as grado_numero, g.seccion as grado_seccion
      FROM "Materia" m
      JOIN "Grado" g ON m."gradoId" = g.id
      WHERE g.año = ${año}
      ORDER BY g.numero, m.nombre
    `;
    const formatted = materias.map((m: any) => ({
      id: m.id,
      nombre: m.nombre,
      gradoId: m.gradoId,
      grado: { id: m.grado_id, numero: m.grado_numero, seccion: m.grado_seccion }
    }));
    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error al obtener materias:", error);
    return NextResponse.json({ error: "Error al obtener materias" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!["admin", "admin-directora", "admin-codirectora"].includes(session.rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const data = await request.json();
    const { nombre, gradoId } = data;

    if (!nombre || !gradoId) {
      return NextResponse.json({ error: "Nombre y grado son requeridos" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO "Materia" (nombre, "gradoId", "createdAt", "updatedAt")
      VALUES (${nombre}, ${gradoId}, NOW(), NOW())
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error al crear materia:", error);
    return NextResponse.json({ error: "Error al crear materia" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!["admin", "admin-directora", "admin-codirectora"].includes(session.rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const data = await request.json();
    const { id, nombre } = data;

    if (!id || !nombre) {
      return NextResponse.json({ error: "ID y nombre son requeridos" }, { status: 400 });
    }

    await sql`
      UPDATE "Materia" SET nombre = ${nombre}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({ message: "Materia actualizada" });
  } catch (error) {
    console.error("Error al actualizar materia:", error);
    return NextResponse.json({ error: "Error al actualizar materia" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!["admin", "admin-directora", "admin-codirectora"].includes(session.rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    await sql`DELETE FROM "Materia" WHERE id = ${id}`;

    return NextResponse.json({ message: "Materia eliminada" });
  } catch (error) {
    console.error("Error al eliminar materia:", error);
    return NextResponse.json({ error: "Error al eliminar materia" }, { status: 500 });
  }
}
