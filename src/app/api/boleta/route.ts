import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";

async function getUsuarioSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  return verifySession(session.value);
}

function canAccessGrado(session: any, gradoId: string): boolean {
  if (["admin", "admin-directora", "admin-codirectora"].includes(session.rol)) return true;
  return session.asignaturasAsignadas?.some((m: any) => m.gradoId === gradoId) ?? false;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estudianteId = searchParams.get("estudianteId");
    const gradoId = searchParams.get("gradoId");
    const trimestre = searchParams.get("trimestre");

    if (!estudianteId && !gradoId) {
      return NextResponse.json(
        { error: "Se requiere estudianteId o gradoId" },
        { status: 400 }
      );
    }

    if (gradoId && !canAccessGrado(session, gradoId)) {
      return NextResponse.json({ error: "No tiene acceso a este grado" }, { status: 403 });
    }

    if (estudianteId) {
      const est = await sql`SELECT "gradoId" FROM "Estudiante" WHERE id = ${estudianteId}`;
      if (est.length === 0) {
        return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
      }
      if (!canAccessGrado(session, est[0].gradoId)) {
        return NextResponse.json({ error: "No tiene acceso a este estudiante" }, { status: 403 });
      }
    }

    const trimestreNum = trimestre ? parseInt(trimestre, 10) : null;
    if (trimestre && (isNaN(trimestreNum!) || trimestreNum! < 1 || trimestreNum! > 3)) {
      return NextResponse.json({ error: "Trimestre inválido" }, { status: 400 });
    }

    if (estudianteId) {
      const estudiante = await sql`
        SELECT e.*, g.numero as grado_numero, g.seccion as grado_seccion, g.año as grado_año, g."docenteId",
               d.nombre as docente_nombre
        FROM "Estudiante" e
        JOIN "Grado" g ON e."gradoId" = g.id
        LEFT JOIN "Usuario" d ON g."docenteId" = d.id
        WHERE e.id = ${estudianteId}
      `;

      let calificaciones;
      if (trimestreNum) {
        calificaciones = await sql`
          SELECT c.*, m.nombre as materia_nombre
          FROM "Calificacion" c
          JOIN "Materia" m ON c."materiaId" = m.id
          WHERE c."estudianteId" = ${estudianteId} AND c.trimestre = ${trimestreNum}
          ORDER BY m.nombre
        `;
      } else {
        calificaciones = await sql`
          SELECT c.*, m.nombre as materia_nombre
          FROM "Calificacion" c
          JOIN "Materia" m ON c."materiaId" = m.id
          WHERE c."estudianteId" = ${estudianteId}
          ORDER BY m.nombre
        `;
      }

      const recuperacionesAnuales = await sql`
        SELECT * FROM "RecuperacionAnual"
        WHERE "estudianteId" = ${estudianteId}
          AND año = ${estudiante[0]?.grado_año || new Date().getFullYear()}
      `;
      const recuperacionPorMateria = new Map<string, number>();
      for (const r of recuperacionesAnuales) {
        recuperacionPorMateria.set(r.materiaId, r.nota);
      }

      const promediosValidos = calificaciones
        .map((c: any) => c.promedioFinal)
        .filter((p: number | null): p is number => p !== null);

      const promedioGeneral = promediosValidos.length > 0
        ? promediosValidos.reduce((a: number, b: number) => a + b, 0) / promediosValidos.length
        : null;

      return NextResponse.json({
        estudiante: estudiante[0],
        calificaciones: calificaciones.map((c: any) => ({
          id: c.id,
          materiaId: c.materiaId,
          materia: c.materia_nombre,
          trimestre: c.trimestre,
          promedioFinal: c.promedioFinal,
          calificacionAC: c.calificacionAC,
          calificacionAI: c.calificacionAI,
          examenTrimestral: c.examenTrimestral,
          recuperacion: c.recuperacion,
        })),
        recuperacionesAnuales: recuperacionesAnuales.map((r: any) => ({
          materiaId: r.materiaId,
          nota: r.nota,
        })),
        promedioGeneral,
      });
    }

    const estudiantes = await sql`
      SELECT e.*, g.numero as grado_numero, g.seccion as grado_seccion, g.año as grado_año, g."docenteId",
             d.nombre as docente_nombre
      FROM "Estudiante" e
      JOIN "Grado" g ON e."gradoId" = g.id
      LEFT JOIN "Usuario" d ON g."docenteId" = d.id
      WHERE e."gradoId" = ${gradoId}
      ORDER BY e.numero
    `;

    const estudianteIds = estudiantes.map((e: any) => e.id);

    let calificaciones;
    if (trimestreNum) {
      calificaciones = await sql`
        SELECT c.*, m.nombre as materia_nombre, c."estudianteId"
        FROM "Calificacion" c
        JOIN "Materia" m ON c."materiaId" = m.id
        WHERE c."estudianteId" IN (SELECT id FROM "Estudiante" WHERE "gradoId" = ${gradoId})
          AND c.trimestre = ${trimestreNum}
      `;
    } else {
      calificaciones = await sql`
        SELECT c.*, m.nombre as materia_nombre, c."estudianteId"
        FROM "Calificacion" c
        JOIN "Materia" m ON c."materiaId" = m.id
        WHERE c."estudianteId" IN (SELECT id FROM "Estudiante" WHERE "gradoId" = ${gradoId})
      `;
    }

    const año = estudiantes[0]?.grado_año || new Date().getFullYear();
    const recuperacionesAnuales = await sql`
      SELECT * FROM "RecuperacionAnual"
      WHERE "estudianteId" = ANY(${estudianteIds}::text[])
        AND año = ${año}
    `;
    const recuperacionPorEstudianteMateria = new Map<string, number>();
    for (const r of recuperacionesAnuales) {
      recuperacionPorEstudianteMateria.set(`${r.estudianteId}-${r.materiaId}`, r.nota);
    }

    const boletasPorEstudiante = estudiantes.map((est: any) => {
      const califEstudiante = calificaciones.filter((c: any) => c.estudianteId === est.id);

      const promediosValidos = califEstudiante
        .map((c: any) => c.promedioFinal)
        .filter((p: number | null): p is number => p !== null);

      const promedioGeneral = promediosValidos.length > 0
        ? promediosValidos.reduce((a: number, b: number) => a + b, 0) / promediosValidos.length
        : null;

      return {
        estudiante: est,
        calificaciones: califEstudiante.map((c: any) => ({
          id: c.id,
          materiaId: c.materiaId,
          materia: c.materia_nombre,
          trimestre: c.trimestre,
          promedioFinal: c.promedioFinal,
          recuperacionAnual: recuperacionPorEstudianteMateria.get(`${est.id}-${c.materiaId}`) ?? null,
        })),
        promedioGeneral,
      };
    });

    return NextResponse.json(boletasPorEstudiante);
  } catch (error) {
    console.error("Error al generar boleta:", error);
    return NextResponse.json(
      { error: "Error al generar boleta" },
      { status: 500 }
    );
  }
}
