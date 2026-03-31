import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

function calcularPromedioActividades(notas: (number | null)[]): number | null {
  const notasValidas = notas.filter((n) => n !== null && n !== undefined) as number[];
  if (notasValidas.length === 0) return null;
  return notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length;
}

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
    const materiaId = searchParams.get("materiaId");
    const trimestre = searchParams.get("trimestre");
    const estudianteId = searchParams.get("estudianteId");

    let calificaciones;
    if (materiaId && trimestre) {
      calificaciones = await sql`
        SELECT c.*, e.id as estudiante_id, e.numero as estudiante_numero, e.nombre as estudiante_nombre, 
               m.nombre as materia_nombre, m.id as materia_id
        FROM "Calificacion" c
        JOIN "Estudiante" e ON c."estudianteId" = e.id
        JOIN "Materia" m ON c."materiaId" = m.id
        WHERE e."gradoId" = ${gradoId}
          AND c."materiaId" = ${materiaId}
          AND c.trimestre = ${parseInt(trimestre!)}
        ORDER BY e.numero
      `;
    } else if (estudianteId) {
      calificaciones = await sql`
        SELECT c.*, e.id as estudiante_id, e.numero as estudiante_numero, e.nombre as estudiante_nombre, 
               m.nombre as materia_nombre, m.id as materia_id
        FROM "Calificacion" c
        JOIN "Estudiante" e ON c."estudianteId" = e.id
        JOIN "Materia" m ON c."materiaId" = m.id
        WHERE c."estudianteId" = ${estudianteId}
        ORDER BY e.numero
      `;
    } else if (gradoId) {
      calificaciones = await sql`
        SELECT c.*, e.id as estudiante_id, e.numero as estudiante_numero, e.nombre as estudiante_nombre, 
               m.nombre as materia_nombre, m.id as materia_id
        FROM "Calificacion" c
        JOIN "Estudiante" e ON c."estudianteId" = e.id
        JOIN "Materia" m ON c."materiaId" = m.id
        WHERE e."gradoId" = ${gradoId}
        ORDER BY e.numero
      `;
    } else {
      calificaciones = [];
    }

    const formatted = calificaciones.map((c: any) => ({
      id: c.id,
      estudianteId: c.estudianteId,
      materiaId: c.materiaId,
      trimestre: c.trimestre,
      actividadesCotidianas: c.actividadesCotidianas,
      calificacionAC: c.calificacionAC,
      actividadesIntegradoras: c.actividadesIntegradoras,
      calificacionAI: c.calificacionAI,
      examenTrimestral: c.examenTrimestral,
      promedioFinal: c.promedioFinal,
      recuperacion: c.recuperacion,
      estudiante: {
        id: c.estudiante_id,
        numero: c.estudiante_numero,
        nombre: c.estudiante_nombre,
        gradoId: gradoId
      },
      materia: {
        id: c.materia_id,
        nombre: c.materia_nombre
      }
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error al obtener calificaciones:", error);
    return NextResponse.json({ error: "Error al obtener calificaciones" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const data = await request.json();
    const {
      estudianteId,
      materiaId,
      trimestre,
      actividadesCotidianas,
      actividadesIntegradoras,
      examenTrimestral,
      recuperacion,
    } = data;

    if (!estudianteId || !materiaId || !trimestre) {
      return NextResponse.json({ error: "Estudiante, materia y trimestre son requeridos" }, { status: 400 });
    }

    let acNotas: (number | null)[] = [];
    let aiNotas: (number | null)[] = [];
    
    if (actividadesCotidianas) {
      try {
        acNotas = typeof actividadesCotidianas === 'string' 
          ? JSON.parse(actividadesCotidianas) 
          : actividadesCotidianas;
      } catch { acNotas = []; }
    }
    
    if (actividadesIntegradoras) {
      try {
        aiNotas = typeof actividadesIntegradoras === 'string' 
          ? JSON.parse(actividadesIntegradoras) 
          : actividadesIntegradoras;
      } catch { aiNotas = []; }
    }

    const calificacionAC = calcularPromedioActividades(acNotas);
    const calificacionAI = calcularPromedioActividades(aiNotas);

    const configResult = await sql`
      SELECT "porcentajeAC", "porcentajeAI", "tieneExamen", "porcentajeExamen"
      FROM "ConfigActividad"
      WHERE "materiaId" = ${materiaId} AND trimestre = ${parseInt(String(trimestre))}
    `;

    let promedioFinal: number | null = null;
    if (configResult.length > 0) {
      const config = configResult[0];
      const porcAC = config.porcentajeAC / 100;
      const porcAI = config.porcentajeAI / 100;
      const porcExam = config.tieneExamen ? config.porcentajeExamen / 100 : 0;

      const totalPonderacion = 
        (calificacionAC !== null ? porcAC : 0) + 
        (calificacionAI !== null ? porcAI : 0) + 
        (examenTrimestral !== null && config.tieneExamen ? porcExam : 0);

      if (totalPonderacion > 0) {
        const suma = 
          (calificacionAC ?? 0) * porcAC + 
          (calificacionAI ?? 0) * porcAI + 
          (examenTrimestral ?? 0) * porcExam;
        promedioFinal = suma / totalPonderacion;
        if (recuperacion !== null) {
          promedioFinal = Math.min(10, promedioFinal + recuperacion);
        }
      }
    } else {
      const totalPonderacion = 
        (calificacionAC !== null ? 0.35 : 0) + 
        (calificacionAI !== null ? 0.35 : 0) + 
        (examenTrimestral !== null ? 0.30 : 0);

      if (totalPonderacion > 0) {
        const suma = 
          (calificacionAC ?? 0) * 0.35 + 
          (calificacionAI ?? 0) * 0.35 + 
          (examenTrimestral ?? 0) * 0.30;
        promedioFinal = suma / totalPonderacion;
        if (recuperacion !== null) {
          promedioFinal = Math.min(10, promedioFinal + recuperacion);
        }
      }
    }

    const existResult = await sql`
      SELECT id FROM "Calificacion"
      WHERE "estudianteId" = ${estudianteId} AND "materiaId" = ${materiaId} AND trimestre = ${parseInt(String(trimestre))}
    `;

    // Capturar contexto histórico para estabilidad de datos
    const estudianteExtra = await sql`
      SELECT e."gradoId", g.numero as grado_numero, g.año as grado_año 
      FROM "Estudiante" e JOIN "Grado" g on e."gradoId" = g.id 
      WHERE e.id = ${estudianteId}
    `;
    const materiaExtra = await sql`SELECT nombre FROM "Materia" WHERE id = ${materiaId}`;
    
    const gradoIdCapturado = estudianteExtra[0]?.gradoId || null;
    const gradoNombreCapturado = estudianteExtra[0]?.grado_numero ? String(estudianteExtra[0].grado_numero) : null;
    const añoEscolarCapturado = estudianteExtra[0]?.grado_año || null;
    const materiaNombreCapturada = materiaExtra[0]?.nombre || null;

    let result;
    if (existResult.length > 0) {
      result = await sql`
        UPDATE "Calificacion" 
        SET actividadesCotidianas = ${JSON.stringify(acNotas)},
            calificacionAC = ${calificacionAC},
            actividadesIntegradoras = ${JSON.stringify(aiNotas)},
            calificacionAI = ${calificacionAI},
            examenTrimestral = ${examenTrimestral},
            promedioFinal = ${promedioFinal},
            recuperacion = ${recuperacion},
            "updatedAt" = NOW()
        WHERE id = ${existResult[0].id}
        RETURNING *
      `;
    } else {
      result = await sql`
        INSERT INTO "Calificacion" (
          "id", "estudianteId", "materiaId", trimestre,
          actividadesCotidianas, calificacionAC,
          actividadesIntegradoras, calificacionAI,
          examenTrimestral, promedioFinal, recuperacion
        ) VALUES (
          ${randomUUID()}, ${estudianteId}, ${materiaId}, ${parseInt(String(trimestre))},
          ${JSON.stringify(acNotas)}, ${calificacionAC},
          ${JSON.stringify(aiNotas)}, ${calificacionAI},
          ${examenTrimestral}, ${promedioFinal}, ${recuperacion}
        )
        RETURNING *
      `;
    }

    const calif = result[0];
    const estudiante = await sql`SELECT id, numero, nombre, "gradoId" FROM "Estudiante" WHERE id = ${estudianteId}`;
    const materia = await sql`SELECT id, nombre FROM "Materia" WHERE id = ${materiaId}`;

    return NextResponse.json({
      id: calif.id,
      estudianteId: calif.estudianteId,
      materiaId: calif.materiaId,
      trimestre: calif.trimestre,
      actividadesCotidianas: calif.actividadesCotidianas,
      calificacionAC: calif.calificacionAC,
      actividadesIntegradoras: calif.actividadesIntegradoras,
      calificacionAI: calif.calificacionAI,
      examenTrimestral: calif.examenTrimestral,
      promedioFinal: calif.promedioFinal,
      recuperacion: calif.recuperacion,
      estudiante: estudiante[0],
      materia: materia[0]
    });
  } catch (error) {
    console.error("Error al guardar calificación:", error);
    return NextResponse.json({ error: "Error al guardar calificación" }, { status: 500 });
  }
}
