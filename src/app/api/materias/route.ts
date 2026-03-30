import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";

async function getUsuarioSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  return JSON.parse(session.value);
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

    let materias;
    if (todas === "true") {
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
        grado: {
          id: m.grado_id,
          numero: m.grado_numero,
          seccion: m.grado_seccion
        }
      }));
      return NextResponse.json(formatted);
    }

    if (gradoId) {
      materias = await sql`
        SELECT * FROM "Materia" 
        WHERE "gradoId" = ${gradoId}
        ORDER BY nombre
      `;
      return NextResponse.json(materias);
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
      grado: {
        id: m.grado_id,
        numero: m.grado_numero,
        seccion: m.grado_seccion
      }
    }));
    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error al obtener materias:", error);
    return NextResponse.json({ error: "Error al obtener materias" }, { status: 500 });
  }
}
