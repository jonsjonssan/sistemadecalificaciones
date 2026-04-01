import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/lib/neon";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session) {
      return NextResponse.json({ usuario: null });
    }

    const sessionData = JSON.parse(session.value);

    console.log("[auth/me] Session from cookie:", JSON.stringify(sessionData));

    const usuarioCompleto = await sql`
      SELECT u.*,
             COALESCE(
               json_agg(
                 DISTINCT jsonb_build_object(
                   'id', g.id,
                   'numero', g.numero,
                   'seccion', g.seccion
                 )
               ) FILTER (WHERE g.id IS NOT NULL), '[]'
             ) as gradosComoTutor,
             COALESCE(
               json_agg(
                 DISTINCT jsonb_build_object(
                   'id', m.id,
                   'nombre', m.nombre,
                   'gradoId', m."gradoId",
                   'gradoNumero', gr.numero,
                   'gradoSeccion', gr.seccion
                 )
               ) FILTER (WHERE m.id IS NOT NULL), '[]'
             ) as materiasAsignadas
      FROM "Usuario" u
      LEFT JOIN "Grado" g ON g."docenteId" = u.id
      LEFT JOIN "DocenteMateria" dm ON dm."docenteId" = u.id
      LEFT JOIN "Materia" m ON dm."materiaId" = m.id
      LEFT JOIN "Grado" gr ON m."gradoId" = gr.id
      WHERE u.id = ${sessionData.id}
      GROUP BY u.id
    `;

    if (usuarioCompleto.length === 0) {
      return NextResponse.json({ usuario: null });
    }

    const u = usuarioCompleto[0];
    const usuario = {
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      rol: u.rol,
      gradosAsignados: u.gradosComoTutor || [],
      asignaturasAsignadas: u.materiasAsignadas?.map((m: any) => ({
        id: m.id,
        nombre: m.nombre,
        gradoId: m.gradoId,
        gradoNumero: m.gradoNumero
      })) || []
    };

    return NextResponse.json({ usuario });
  } catch {
    return NextResponse.json({ usuario: null });
  }
}
