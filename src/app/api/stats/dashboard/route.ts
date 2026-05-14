import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trimestre = parseInt(searchParams.get("trimestre") || "1");
    const gradoId = searchParams.get("gradoId");

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const session = verifySession(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const isAdminRole = ["admin", "admin-directora", "admin-codirectora"].includes(session.rol);

    let gradosFiltrados;

    if (gradoId) {
      if (!isAdminRole) {
        const gradosAsignados = session.asignaturasAsignadas?.map((m: any) => m.gradoId) || [];
        if (!gradosAsignados.includes(gradoId)) {
          return NextResponse.json({ error: "No tiene acceso a este grado" }, { status: 403 });
        }
      }

      gradosFiltrados = await sql`
        SELECT g.*,
          (SELECT COUNT(*) FROM "Estudiante" e WHERE e."gradoId" = g.id) as estudiantes_count,
          (SELECT COUNT(*) FROM "Materia" m WHERE m."gradoId" = g.id) as materias_count
        FROM "Grado" g
        WHERE g.id = ${gradoId}
        ORDER BY g.numero, g.seccion
      `;
    } else {
      if (!isAdminRole) {
        const gradosAsignados = session.asignaturasAsignadas?.map((m: any) => m.gradoId) || [];
        const gradosUnicos = [...new Set(gradosAsignados)];
        if (gradosUnicos.length === 0) {
          return NextResponse.json([]);
        }
        gradosFiltrados = await sql`
          SELECT g.*,
            (SELECT COUNT(*) FROM "Estudiante" e WHERE e."gradoId" = g.id) as estudiantes_count,
            (SELECT COUNT(*) FROM "Materia" m WHERE m."gradoId" = g.id) as materias_count
          FROM "Grado" g
          WHERE g.id = ANY(${gradosUnicos}::text[])
          ORDER BY g.numero, g.seccion
        `;
      } else {
        gradosFiltrados = await sql`
          SELECT g.*,
            (SELECT COUNT(*) FROM "Estudiante" e WHERE e."gradoId" = g.id) as estudiantes_count,
            (SELECT COUNT(*) FROM "Materia" m WHERE m."gradoId" = g.id) as materias_count
          FROM "Grado" g
          ORDER BY g.numero, g.seccion
        `;
      }
    }

    const statsPorGrado = await Promise.all(gradosFiltrados.map(async (grado: any) => {
      const calificaciones = await sql`
        SELECT c.*, e.nombre as estudiante_nombre, e.numero as estudiante_numero, m.id as materia_id, m.nombre as materia_nombre
        FROM "Calificacion" c
        JOIN "Estudiante" e ON c."estudianteId" = e.id
        JOIN "Materia" m ON c."materiaId" = m.id
        WHERE c.trimestre = ${trimestre} AND e."gradoId" = ${grado.id}
      `;

      let sumAC = 0, countAC = 0;
      let sumAI = 0, countAI = 0;
      let sumEx = 0, countEx = 0;

      const studentAverages: Record<string, { id: string, nombre: string, numero: number, suma: number, cuenta: number }> = {};
      const materiaAverages: Record<string, { id: string, nombre: string, suma: number, cuenta: number }> = {};

      calificaciones.forEach((c: any) => {
        if (c.calificacionAC !== null) { sumAC += Number(c.calificacionAC); countAC++; }
        if (c.calificacionAI !== null) { sumAI += Number(c.calificacionAI); countAI++; }
        if (c.examenTrimestral !== null) { sumEx += Number(c.examenTrimestral); countEx++; }

        if (!studentAverages[c.estudianteId]) {
          studentAverages[c.estudianteId] = {
            id: c.estudianteId,
            nombre: c.estudiante_nombre,
            numero: c.estudiante_numero,
            suma: 0,
            cuenta: 0
          };
        }

        if (c.promedioFinal !== null) {
          studentAverages[c.estudianteId].suma += Number(c.promedioFinal);
          studentAverages[c.estudianteId].cuenta++;
        }

        if (c.materia_id && c.promedioFinal !== null) {
          if (!materiaAverages[c.materia_id]) {
            materiaAverages[c.materia_id] = { id: c.materia_id, nombre: c.materia_nombre, suma: 0, cuenta: 0 };
          }
          materiaAverages[c.materia_id].suma += Number(c.promedioFinal);
          materiaAverages[c.materia_id].cuenta++;
        }
      });

      const umbralCondicionado = 4.5;
      const umbralAprobado = 6.5;

      const estudianteEstado: Record<string, string> = {};

      calificaciones.forEach((c: any) => {
        const tieneNotas = c.calificacionAC !== null || c.calificacionAI !== null || c.examenTrimestral !== null;
        if (!tieneNotas || c.promedioFinal === null) return;
        const baseProm = Number(c.promedioFinal) - (c.recuperacion !== null ? Number(c.recuperacion) : 0);
        let materiaEstado = 'APROBADO';
        if (baseProm < umbralCondicionado) materiaEstado = 'REPROBADO';
        else if (baseProm < umbralAprobado && c.recuperacion !== null) materiaEstado = 'CONDICIONADO';
        else if (baseProm < umbralAprobado) materiaEstado = 'CONDICIONADO';

        const actual = estudianteEstado[c.estudianteId];
        if (!actual || (materiaEstado === 'REPROBADO') || (materiaEstado === 'CONDICIONADO' && actual === 'APROBADO')) {
          estudianteEstado[c.estudianteId] = materiaEstado;
        }
      });

      const ranking = Object.values(studentAverages)
        .filter(s => s.cuenta > 0)
        .map(s => ({
          id: s.id,
          nombre: s.nombre,
          numero: s.numero,
          promedio: s.suma / s.cuenta,
          estado: estudianteEstado[s.id] || 'APROBADO'
        }))
        .sort((a: any, b: any) => b.promedio - a.promedio);

      return {
        gradoId: grado.id,
        nombre: `${grado.numero}° "${grado.seccion}"`,
        numero: grado.numero,
        seccion: grado.seccion,
        promedios: {
          cotidiana: countAC > 0 ? sumAC / countAC : null,
          integradora: countAI > 0 ? sumAI / countAI : null,
          examen: countEx > 0 ? sumEx / countEx : null
        },
        topEstudiantes: ranking.slice(0, 10),
        alertas: ranking.slice(-10).reverse(),
        materias: Object.values(materiaAverages).map((m: any) => ({
          id: m.id,
          nombre: m.nombre,
          promedio: m.cuenta > 0 ? Math.round((m.suma / m.cuenta) * 100) / 100 : null
        }))
      };
    }));

    return NextResponse.json(statsPorGrado);
  } catch (error) {
    console.error("Error en dashboard stats:", error);
    return NextResponse.json({ error: "Error al calcular estadísticas" }, { status: 500 });
  }
}
