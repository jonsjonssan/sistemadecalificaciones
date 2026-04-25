import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { requireAdmin } from "@/lib/api-middleware";

export async function GET(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    const usuario = await sql`
      SELECT id, email, nombre, rol, activo
      FROM "Usuario" 
      WHERE email = ${email}
    `;

    if (usuario.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const usuarioId = usuario[0].id;

    const gradosTutor = await sql`
      SELECT g.id, g.numero, g.seccion
      FROM "Grado" g
      WHERE g."docenteId" = ${usuarioId}
    `;

    const materiasAsignadas = await sql`
      SELECT m.id, m.nombre, m."gradoId", gr.numero as grado_numero
      FROM "DocenteMateria" dm
      JOIN "Materia" m ON dm."materiaId" = m.id
      JOIN "Grado" gr ON m."gradoId" = gr.id
      WHERE dm."docenteId" = ${usuarioId}
    `;

    return NextResponse.json({
      usuario: usuario[0],
      gradosComoTutor: gradosTutor,
      materiasAsignadas: materiasAsignadas
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}