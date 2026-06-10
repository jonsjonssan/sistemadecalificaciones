import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { isAdmin } from "@/utils/roleHelpers";

async function calcularStatsGrado(grado: any, trimestre: number) {
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
  const materiaStudentAverages: Record<string, Record<string, { id: string, nombre: string, numero: number, suma: number, cuenta: number }>> = {};

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

      // Per-subject student tracking
      if (!materiaStudentAverages[c.materia_id]) {
        materiaStudentAverages[c.materia_id] = {};
      }
      if (!materiaStudentAverages[c.materia_id][c.estudianteId]) {
        materiaStudentAverages[c.materia_id][c.estudianteId] = {
          id: c.estudianteId,
          nombre: c.estudiante_nombre,
          numero: c.estudiante_numero,
          suma: 0,
          cuenta: 0
        };
      }
      materiaStudentAverages[c.materia_id][c.estudianteId].suma += Number(c.promedioFinal);
      materiaStudentAverages[c.materia_id][c.estudianteId].cuenta++;
    }
  });

  const configRows = await sql`SELECT "umbralCondicionado", "umbralAprobado" FROM "ConfiguracionSistema" LIMIT 1`;
  const cfg = configRows?.[0] || {};
  const umbralCondicionado = Number(cfg.umbralCondicionado) || 4.5;
  const umbralAprobado = Number(cfg.umbralAprobado) || 6.5;

  const estudianteEstado: Record<string, string> = {};
  const materiaEstudianteEstado: Record<string, Record<string, string>> = {};

  calificaciones.forEach((c: any) => {
    const tieneNotas = c.calificacionAC !== null || c.calificacionAI !== null || c.examenTrimestral !== null;
    if (!tieneNotas || c.promedioFinal === null) return;
    const tieneRecup = c.recuperacion !== null && c.recuperacion !== undefined && Number(c.recuperacion) > 0;
    const baseProm = Number(c.promedioFinal) - (tieneRecup ? Number(c.recuperacion) : 0);
    let materiaEstado = 'APROBADO';
    if (baseProm < umbralCondicionado) materiaEstado = 'REPROBADO';
    else if (baseProm < umbralAprobado) materiaEstado = 'CONDICIONADO';

    const actual = estudianteEstado[c.estudianteId];
    if (!actual || (materiaEstado === 'REPROBADO') || (materiaEstado === 'CONDICIONADO' && actual === 'APROBADO')) {
      estudianteEstado[c.estudianteId] = materiaEstado;
    }

    // Per-subject estado
    if (c.materia_id) {
      if (!materiaEstudianteEstado[c.materia_id]) {
        materiaEstudianteEstado[c.materia_id] = {};
      }
      const actualMateria = materiaEstudianteEstado[c.materia_id][c.estudianteId];
      if (!actualMateria || (materiaEstado === 'REPROBADO') || (materiaEstado === 'CONDICIONADO' && actualMateria === 'APROBADO')) {
        materiaEstudianteEstado[c.materia_id][c.estudianteId] = materiaEstado;
      }
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

  const topIds = new Set(ranking.slice(0, 10).map(s => s.id));

  // Compute per-subject rankings
  const materiasConRanking = Object.values(materiaAverages).map((m: any) => {
    const subjectStudents = materiaStudentAverages[m.id] || {};
    const subjectRanking = Object.values(subjectStudents)
      .filter((s: any) => s.cuenta > 0)
      .map((s: any) => ({
        id: s.id,
        nombre: s.nombre,
        numero: s.numero,
        promedio: s.suma / s.cuenta,
        estado: materiaEstudianteEstado[m.id]?.[s.id] || estudianteEstado[s.id] || 'APROBADO'
      }))
      .sort((a: any, b: any) => b.promedio - a.promedio);

    const subjectTopIds = new Set(subjectRanking.slice(0, 10).map((s: any) => s.id));
    return {
      id: m.id,
      nombre: m.nombre,
      promedio: m.cuenta > 0 ? Math.round((m.suma / m.cuenta) * 100) / 100 : null,
      topEstudiantes: subjectRanking.slice(0, 10),
      alertas: subjectRanking.filter((s: any) => !subjectTopIds.has(s.id)).slice(-10).reverse(),
      todosEstudiantes: subjectRanking
    };
  });

  return {
    promedios: {
      cotidiana: countAC > 0 ? sumAC / countAC : null,
      integradora: countAI > 0 ? sumAI / countAI : null,
      examen: countEx > 0 ? sumEx / countEx : null
    },
    topEstudiantes: ranking.slice(0, 10),
    alertas: ranking.filter(s => !topIds.has(s.id)).slice(-10).reverse(),
    materias: materiasConRanking,
    todosEstudiantes: ranking
  };
}

function combinarStats(statsArray: any[]) {
  const overallStudentAverages: Record<string, { id: string, nombre: string, numero: number, suma: number, cuenta: number }> = {};
  const overallMateriaAverages: Record<string, { id: string, nombre: string, suma: number, cuenta: number }> = {};
  const overallMateriaStudentAverages: Record<string, Record<string, { id: string, nombre: string, numero: number, suma: number, cuenta: number }>> = {};
  const overallEstudianteEstado: Record<string, string> = {};
  const overallMateriaEstudianteEstado: Record<string, Record<string, string>> = {};

  let sumAC = 0, countAC = 0;
  let sumAI = 0, countAI = 0;
  let sumEx = 0, countEx = 0;

  for (const stats of statsArray) {
    if (stats.promedios.cotidiana !== null) { sumAC += stats.promedios.cotidiana; countAC++; }
    if (stats.promedios.integradora !== null) { sumAI += stats.promedios.integradora; countAI++; }
    if (stats.promedios.examen !== null) { sumEx += stats.promedios.examen; countEx++; }

    const allStudents = stats.todosEstudiantes || [...stats.topEstudiantes, ...stats.alertas];
    for (const est of allStudents) {
      if (!overallStudentAverages[est.id]) {
        overallStudentAverages[est.id] = { id: est.id, nombre: est.nombre, numero: est.numero, suma: 0, cuenta: 0 };
      }
      overallStudentAverages[est.id].suma += est.promedio;
      overallStudentAverages[est.id].cuenta++;
      const actual = overallEstudianteEstado[est.id];
      if (!actual || (est.estado === 'REPROBADO') || (est.estado === 'CONDICIONADO' && actual === 'APROBADO')) {
        overallEstudianteEstado[est.id] = est.estado;
      }
    }

    for (const m of stats.materias) {
      if (!overallMateriaAverages[m.id]) {
        overallMateriaAverages[m.id] = { id: m.id, nombre: m.nombre, suma: 0, cuenta: 0 };
      }
      if (m.promedio !== null) {
        overallMateriaAverages[m.id].suma += m.promedio;
        overallMateriaAverages[m.id].cuenta++;
      }

      const allSubjectStudents = m.todosEstudiantes || [...m.topEstudiantes, ...m.alertas];
      for (const est of allSubjectStudents) {
        if (!overallMateriaStudentAverages[m.id]) {
          overallMateriaStudentAverages[m.id] = {};
        }
        if (!overallMateriaStudentAverages[m.id][est.id]) {
          overallMateriaStudentAverages[m.id][est.id] = { id: est.id, nombre: est.nombre, numero: est.numero, suma: 0, cuenta: 0 };
        }
        overallMateriaStudentAverages[m.id][est.id].suma += est.promedio;
        overallMateriaStudentAverages[m.id][est.id].cuenta++;
        const actualMateria = overallMateriaEstudianteEstado[m.id]?.[est.id];
        if (!actualMateria || (est.estado === 'REPROBADO') || (est.estado === 'CONDICIONADO' && actualMateria === 'APROBADO')) {
          if (!overallMateriaEstudianteEstado[m.id]) {
            overallMateriaEstudianteEstado[m.id] = {};
          }
          overallMateriaEstudianteEstado[m.id][est.id] = est.estado;
        }
      }
    }
  }

  const ranking = Object.values(overallStudentAverages)
    .filter((s: any) => s.cuenta > 0)
    .map((s: any) => ({
      id: s.id,
      nombre: s.nombre,
      numero: s.numero,
      promedio: s.suma / s.cuenta,
      estado: overallEstudianteEstado[s.id] || 'APROBADO'
    }))
    .sort((a: any, b: any) => b.promedio - a.promedio);

  const topIds = new Set(ranking.slice(0, 10).map((s: any) => s.id));

  const materiasConRanking = Object.values(overallMateriaAverages).map((m: any) => {
    const subjectStudents = overallMateriaStudentAverages[m.id] || {};
    const subjectRanking = Object.values(subjectStudents)
      .filter((s: any) => s.cuenta > 0)
      .map((s: any) => ({
        id: s.id,
        nombre: s.nombre,
        numero: s.numero,
        promedio: s.suma / s.cuenta,
        estado: overallMateriaEstudianteEstado[m.id]?.[s.id] || overallEstudianteEstado[s.id] || 'APROBADO'
      }))
      .sort((a: any, b: any) => b.promedio - a.promedio);

    const subjectTopIds = new Set(subjectRanking.slice(0, 10).map((s: any) => s.id));
    return {
      id: m.id,
      nombre: m.nombre,
      promedio: m.cuenta > 0 ? Math.round((m.suma / m.cuenta) * 100) / 100 : null,
      topEstudiantes: subjectRanking.slice(0, 10),
      alertas: subjectRanking.filter((s: any) => !subjectTopIds.has(s.id)).slice(-10).reverse()
    };
  });

  return {
    promedios: {
      cotidiana: countAC > 0 ? sumAC / countAC : null,
      integradora: countAI > 0 ? sumAI / countAI : null,
      examen: countEx > 0 ? sumEx / countEx : null
    },
    topEstudiantes: ranking.slice(0, 10),
    alertas: ranking.filter((s: any) => !topIds.has(s.id)).slice(-10).reverse(),
    materias: materiasConRanking
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trimestreParam = searchParams.get("trimestre") || "1";
    const allTrimestres = trimestreParam === "all";
    const trimestre = parseInt(trimestreParam);
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

    const isAdminRole = isAdmin(session.rol);

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
      if (allTrimestres) {
        const [statsT1, statsT2, statsT3] = await Promise.all([
          calcularStatsGrado(grado, 1),
          calcularStatsGrado(grado, 2),
          calcularStatsGrado(grado, 3)
        ]);

        const overall = combinarStats([statsT1, statsT2, statsT3]);

        return {
          gradoId: grado.id,
          nombre: `${grado.numero}° "${grado.seccion}"`,
          numero: grado.numero,
          seccion: grado.seccion,
          promedios: overall.promedios,
          topEstudiantes: overall.topEstudiantes,
          alertas: overall.alertas,
          materias: overall.materias,
          trimestres: {
            1: statsT1,
            2: statsT2,
            3: statsT3
          }
        };
      } else {
        const stats = await calcularStatsGrado(grado, trimestre);
        return {
          gradoId: grado.id,
          nombre: `${grado.numero}° "${grado.seccion}"`,
          numero: grado.numero,
          seccion: grado.seccion,
          promedios: stats.promedios,
          topEstudiantes: stats.topEstudiantes,
          alertas: stats.alertas,
          materias: stats.materias
        };
      }
    }));

    return NextResponse.json(statsPorGrado);
  } catch (error) {
    console.error("Error en dashboard stats:", error);
    return NextResponse.json({ error: "Error al calcular estadísticas" }, { status: 500 });
  }
}
