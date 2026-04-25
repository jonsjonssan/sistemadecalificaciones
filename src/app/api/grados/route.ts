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
    let año = searchParams.get("año") ? parseInt(searchParams.get("año")!) : 2026;

    const configResult = await sql`SELECT "añoEscolar" FROM "ConfiguracionSistema" LIMIT 1`;
    if (configResult.length > 0 && !searchParams.get("año")) {
      año = configResult[0].añoEscolar;
    }

    const grados = await sql`
      SELECT g.id, g.numero, g.seccion, g.año, g."docenteId", g."createdAt", g."updatedAt",
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
      docenteId: g.docenteId || null,
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

    const usuario = session as any;
    const isAdmin = ["admin", "admin-directora", "admin-codirectora"].includes(usuario.rol);
    if (!isAdmin) {
      return NextResponse.json({ error: "Solo administradores pueden crear grados" }, { status: 403 });
    }

    const { numero, seccion, año } = await request.json();

    if (!numero || numero < 2 || numero > 9) {
      return NextResponse.json({ error: "El grado debe estar entre 2 y 9" }, { status: 400 });
    }

    const materia6ta = numero >= 7 ? "Educación Física y Deportes" : "Desarrollo Corporal";

    const materiasNombres = [
      "Comunicación",
      "Números y Formas",
      "Ciencia y Tecnología",
      "Ciudadanía y Valores",
      "Artes",
      materia6ta,
      "Educación en la Fe",
    ];

    const grado = await db.$transaction(async (tx: any) => {
      const nuevoGrado = await tx.grado.create({
        data: {
          numero,
          seccion: seccion || "A",
          año: año || 2026,
        },
      });

      for (const nombre of materiasNombres) {
        const materia = await tx.materia.create({
          data: {
            nombre,
            gradoId: nuevoGrado.id,
          },
        });

        for (let trimestre = 1; trimestre <= 3; trimestre++) {
          await tx.configActividad.create({
            data: {
              materiaId: materia.id,
              trimestre,
              numActividadesCotidianas: 4,
              numActividadesIntegradoras: 1,
              tieneExamen: true,
              porcentajeAC: 35.0,
              porcentajeAI: 35.0,
              porcentajeExamen: 30.0,
            },
          });
        }
      }

      return nuevoGrado;
    });

    return NextResponse.json(grado);
  } catch (error) {
    console.error("Error al crear grado:", error);
    return NextResponse.json({ error: "Error al crear grado" }, { status: 500 });
  }
}
