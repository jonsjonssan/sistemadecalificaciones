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
    let año = searchParams.get("año") ? parseInt(searchParams.get("año")!) : 2026;

    const configResult = await sql`SELECT "añoEscolar" FROM "ConfiguracionSistema" LIMIT 1`;
    if (configResult.length > 0 && !searchParams.get("año")) {
      año = configResult[0].añoEscolar;
    }

    const grados = await sql`
      SELECT g.*, 
             d.id as docente_id, d.nombre as docente_nombre, d.email as docente_email,
             (SELECT COUNT(*) FROM "Estudiante" e WHERE e."gradoId" = g.id) as estudiantes_count,
             (SELECT COUNT(*) FROM "Materia" m WHERE m."gradoId" = g.id) as materias_count
      FROM "Grado" g
      LEFT JOIN "Usuario" d ON g."docenteId" = d.id
      WHERE g.año = ${año}
      ORDER BY g.numero, g.seccion
    `;

    const formatted = grados.map((g: any) => ({
      id: g.id,
      numero: g.numero,
      seccion: g.seccion,
      año: g.año,
      docenteId: g.docenteId,
      docente: g.docente_id ? {
        id: g.docente_id,
        nombre: g.docente_nombre,
        email: g.docente_email
      } : null,
      _count: {
        estudiantes: parseInt(g.estudiantes_count) || 0,
        materias: parseInt(g.materias_count) || 0
      }
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error al obtener grados:", error);
    return NextResponse.json({ error: "Error al obtener grados" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuario = JSON.parse(session.value);
    if (usuario.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden crear grados" }, { status: 403 });
    }

    const { numero, seccion, año, docenteId } = await request.json();

    if (!numero || numero < 2 || numero > 9) {
      return NextResponse.json({ error: "El grado debe estar entre 2 y 9" }, { status: 400 });
    }

    const gradoResult = await sql`
      INSERT INTO "Grado" (numero, seccion, año, "docenteId")
      VALUES (${numero}, ${seccion || "A"}, ${año || 2026}, ${docenteId})
      RETURNING *
    `;
    const grado = gradoResult[0];

    const materiasNombres = [
      "Comunicación",
      "Números y Formas",
      "Ciencia y Tecnología",
      "Ciudadanía y Valores",
      "Artes",
      "Desarrollo Corporal",
      "Educación en la Fe",
    ];

    for (const nombre of materiasNombres) {
      const materiaResult = await sql`
        INSERT INTO "Materia" (nombre, "gradoId")
        VALUES (${nombre}, ${grado.id})
        RETURNING *
      `;
      const materia = materiaResult[0];
      
      for (let trimestre = 1; trimestre <= 3; trimestre++) {
        await sql`
          INSERT INTO "ConfigActividad" (
            "materiaId", trimestre, 
            "numActividadesCotidianas", "numActividadesIntegradoras", 
            "tieneExamen", "porcentajeAC", "porcentajeAI", "porcentajeExamen"
          ) VALUES (
            ${materia.id}, ${trimestre},
            4, 1, true, 35.0, 35.0, 30.0
          )
        `;
      }
    }

    const gradoConDocente = await sql`
      SELECT g.*, d.id as docente_id, d.nombre as docente_nombre, d.email as docente_email
      FROM "Grado" g
      LEFT JOIN "Usuario" d ON g."docenteId" = d.id
      WHERE g.id = ${grado.id}
    `;

    return NextResponse.json(gradoConDocente[0]);
  } catch (error) {
    console.error("Error al crear grado:", error);
    return NextResponse.json({ error: "Error al crear grado" }, { status: 500 });
  }
}
