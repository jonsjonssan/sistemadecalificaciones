import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fechaParam = searchParams.get("fecha");
    const gradoId = searchParams.get("gradoId");
    const materiaId = searchParams.get("materiaId");

    if (!fechaParam || !gradoId) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    const fecha = new Date(fechaParam);
    if (isNaN(fecha.getTime())) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }
    fecha.setUTCHours(0, 0, 0, 0);

    let asistibilidades;
    if (materiaId) {
      asistibilidades = await sql`
        SELECT a.*, e.id as estudiante_id, e.nombre as estudiante_nombre, e.numero as estudiante_numero
        FROM "Asistencia" a
        JOIN "Estudiante" e ON a."estudianteId" = e.id
        WHERE a.fecha = ${fecha} AND a."gradoId" = ${gradoId} AND a."materiaId" = ${materiaId}
        ORDER BY e.numero
      `;
    } else {
      asistibilidades = await sql`
        SELECT a.*, e.id as estudiante_id, e.nombre as estudiante_nombre, e.numero as estudiante_numero
        FROM "Asistencia" a
        JOIN "Estudiante" e ON a."estudianteId" = e.id
        WHERE a.fecha = ${fecha} AND a."gradoId" = ${gradoId}
        ORDER BY e.numero
      `;
    }

    const formatted = asistibilidades.map((a: any) => ({
      id: a.id,
      estudianteId: a.estudianteId,
      fecha: a.fecha,
      estado: a.estado,
      gradoId: a.gradoId,
      materiaId: a.materiaId,
      estudiante: {
        id: a.estudiante_id,
        nombre: a.estudiante_nombre,
        numero: a.estudiante_numero
      }
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error obteniendo asistencia:", error);
    return NextResponse.json({ error: "Error del servidor al obtener asistencia" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { asistencias, fecha: fechaStr, gradoId, materiaId } = body;

    if (!asistencias || !Array.isArray(asistencias) || !fechaStr || !gradoId) {
      return NextResponse.json({ error: "Datos de asistencia inválidos" }, { status: 400 });
    }

    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }
    fecha.setUTCHours(0, 0, 0, 0);

    const resultados: any[] = [];
    for (const record of asistencias) {
      const { estudianteId, estado } = record;
      
      const existente = await sql`
        SELECT id FROM "Asistencia"
        WHERE "estudianteId" = ${estudianteId} AND fecha = ${fecha} AND "gradoId" = ${gradoId} AND ("materiaId" = ${materiaId} OR (${materiaId} IS NULL AND "materiaId" IS NULL))
        LIMIT 1
      `;

      if (existente.length > 0) {
        await sql`
          UPDATE "Asistencia" SET estado = ${estado}, "updatedAt" = NOW()
          WHERE id = ${existente[0].id}
        `;
        resultados.push({ id: existente[0].id, estudianteId, estado });
      } else {
        const nuevo = await sql`
          INSERT INTO "Asistencia" ("estudianteId", fecha, estado, "gradoId", "materiaId")
          VALUES (${estudianteId}, ${fecha}, ${estado}, ${gradoId}, ${materiaId || null})
          RETURNING *
        `;
        resultados.push(nuevo[0]);
      }
    }

    return NextResponse.json({ success: true, guardados: resultados.length });
  } catch (error) {
    console.error("Error guardando asistencia:", error);
    return NextResponse.json({ error: "Error del servidor al guardar asistencia" }, { status: 500 });
  }
}
