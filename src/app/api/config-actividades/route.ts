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
    const materiaId = searchParams.get("materiaId");
    const gradoId = searchParams.get("gradoId");
    const trimestre = searchParams.get("trimestre");

    console.log("[config-actividades] Session:", JSON.stringify(session));
    console.log("[config-actividades] Params:", { materiaId, gradoId, trimestre });

    if (session.rol === "docente") {
      const materiasAsignadasIds = session.asignaturasAsignadas?.map((m: any) => m.id) || [];
      const gradosByMaterias = session.asignaturasAsignadas?.map((m: any) => m.gradoId) || [];
      const gradosByTutor = session.gradosAsignados?.map((g: any) => g.id) || [];
      const todosGradosIds = [...new Set([...gradosByMaterias, ...gradosByTutor])];

      console.log("[config-actividades] docente session:", JSON.stringify({ materiasAsignadasIds, todosGradosIds }));

      if (materiaId && materiasAsignadasIds.length > 0 && !materiasAsignadasIds.includes(materiaId)) {
        return NextResponse.json({ error: "No autorizado para esta materia" }, { status: 403 });
      }
      if (gradoId && todosGradosIds.length > 0 && !todosGradosIds.includes(gradoId)) {
        console.log("[config-actividades] No autorizado para grado:", gradoId, "permitidos:", todosGradosIds);
        return NextResponse.json({ error: "No autorizado para este grado" }, { status: 403 });
      }
    }

    if (materiaId && trimestre) {
      const materiaExists = await sql`SELECT id FROM "Materia" WHERE id = ${materiaId} LIMIT 1`;
      if (materiaExists.length === 0) {
        return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
      }

      let configResult = await sql`
        SELECT * FROM "ConfigActividad"
        WHERE "materiaId" = ${materiaId} AND trimestre = ${parseInt(trimestre!)}
      `;

      if (configResult.length === 0) {
        const newConfig = await sql`
          INSERT INTO "ConfigActividad" (
            "materiaId", trimestre, 
            "numActividadesCotidianas", "numActividadesIntegradoras", 
            "tieneExamen", "porcentajeAC", "porcentajeAI", "porcentajeExamen"
          ) VALUES (
            ${materiaId}, ${parseInt(trimestre!)},
            4, 1, true, 35.0, 35.0, 30.0
          )
          ON CONFLICT ("materiaId", trimestre) DO UPDATE SET
            "numActividadesCotidianas" = EXCLUDED."numActividadesCotidianas",
            "numActividadesIntegradoras" = EXCLUDED."numActividadesIntegradoras",
            "tieneExamen" = EXCLUDED."tieneExamen",
            "porcentajeAC" = EXCLUDED."porcentajeAC",
            "porcentajeAI" = EXCLUDED."porcentajeAI",
            "porcentajeExamen" = EXCLUDED."porcentajeExamen"
          RETURNING *
        `;
        configResult = newConfig;
      }

      const config = configResult[0];
      return NextResponse.json({
        id: config.id,
        materiaId: config.materiaId,
        trimestre: config.trimestre,
        numActividadesCotidianas: config.numActividadesCotidianas,
        numActividadesIntegradoras: config.numActividadesIntegradoras,
        tieneExamen: config.tieneExamen,
        porcentajeAC: config.porcentajeAC,
        porcentajeAI: config.porcentajeAI,
        porcentajeExamen: config.porcentajeExamen,
      });
    }

    if (gradoId && trimestre) {
      const gradoExists = await sql`SELECT id FROM "Grado" WHERE id = ${gradoId} LIMIT 1`;
      if (gradoExists.length === 0) {
        return NextResponse.json({ error: "Grado no encontrado" }, { status: 404 });
      }

      const materias = await sql`
        SELECT id, nombre FROM "Materia" WHERE "gradoId" = ${gradoId}
      `;

      const result: any[] = [];
      for (const materia of materias) {
        try {
          let configResult = await sql`
            SELECT * FROM "ConfigActividad"
            WHERE "materiaId" = ${materia.id} AND trimestre = ${parseInt(trimestre!)}
          `;

          if (configResult.length === 0) {
            const newConfig = await sql`
              INSERT INTO "ConfigActividad" (
                "materiaId", trimestre, 
                "numActividadesCotidianas", "numActividadesIntegradoras", 
                "tieneExamen", "porcentajeAC", "porcentajeAI", "porcentajeExamen"
              ) VALUES (
                ${materia.id}, ${parseInt(trimestre!)},
                4, 1, true, 35.0, 35.0, 30.0
              )
              ON CONFLICT ("materiaId", trimestre) DO UPDATE SET
                "numActividadesCotidianas" = EXCLUDED."numActividadesCotidianas",
                "numActividadesIntegradoras" = EXCLUDED."numActividadesIntegradoras",
                "tieneExamen" = EXCLUDED."tieneExamen",
                "porcentajeAC" = EXCLUDED."porcentajeAC",
                "porcentajeAI" = EXCLUDED."porcentajeAI",
                "porcentajeExamen" = EXCLUDED."porcentajeExamen"
              RETURNING *
            `;
            result.push({ ...newConfig[0], materiaNombre: materia.nombre });
          } else {
            result.push({ ...configResult[0], materiaNombre: materia.nombre });
          }
        } catch (err) {
          console.error(`[config-actividades] Error con materia ${materia.id}:`, err);
        }
      }

      return NextResponse.json(result);
    }

    return NextResponse.json(null);
  } catch (error) {
    console.error("Error al obtener configuración:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error al obtener configuración", details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const data = await request.json();
    const { materiaId, gradoId, aplicarATodasLasMateriasDelGrado, trimestre, numActividadesCotidianas, numActividadesIntegradoras, tieneExamen, porcentajeAC, porcentajeAI, porcentajeExamen } = data;

    if (session.rol === "docente") {
      const materiasAsignadasIds = session.asignaturasAsignadas?.map((m: any) => m.id) || [];
      const gradosByMaterias = session.asignaturasAsignadas?.map((m: any) => m.gradoId) || [];
      const gradosByTutor = session.gradosAsignados?.map((g: any) => g.id) || [];
      const todosGradosIds = [...new Set([...gradosByMaterias, ...gradosByTutor])];

      if (materiaId && materiasAsignadasIds.length > 0 && !materiasAsignadasIds.includes(materiaId)) {
        return NextResponse.json({ error: "No autorizado para esta materia" }, { status: 403 });
      }
      if (gradoId && todosGradosIds.length > 0 && !todosGradosIds.includes(gradoId)) {
        return NextResponse.json({ error: "No autorizado para este grado" }, { status: 403 });
      }
      if (aplicarATodasLasMateriasDelGrado) {
        return NextResponse.json({ error: "No autorizado para aplicar a todas las materias" }, { status: 403 });
      }
    }

    if (!trimestre) return NextResponse.json({ error: "Trimestre es requerido" }, { status: 400 });

    const baseData = {
      trimestre: parseInt(String(trimestre)),
      numActividadesCotidianas: numActividadesCotidianas ?? 4,
      numActividadesIntegradoras: numActividadesIntegradoras ?? 1,
      tieneExamen: tieneExamen ?? true,
      porcentajeAC: porcentajeAC ?? 35.0,
      porcentajeAI: porcentajeAI ?? 35.0,
      porcentajeExamen: porcentajeExamen ?? 30.0,
    };

    if (aplicarATodasLasMateriasDelGrado && gradoId) {
      const materias = await sql`SELECT id FROM "Materia" WHERE "gradoId" = ${gradoId}`;
      
      for (const materia of materias) {
        const exist = await sql`
          SELECT id FROM "ConfigActividad"
          WHERE "materiaId" = ${materia.id} AND trimestre = ${baseData.trimestre}
        `;

        if (exist.length > 0) {
          await sql`
            UPDATE "ConfigActividad" SET
              "numActividadesCotidianas" = ${baseData.numActividadesCotidianas},
              "numActividadesIntegradoras" = ${baseData.numActividadesIntegradoras},
              "tieneExamen" = ${baseData.tieneExamen},
              "porcentajeAC" = ${baseData.porcentajeAC},
              "porcentajeAI" = ${baseData.porcentajeAI},
              "porcentajeExamen" = ${baseData.porcentajeExamen},
              "updatedAt" = NOW()
            WHERE "materiaId" = ${materia.id} AND trimestre = ${baseData.trimestre}
          `;
        } else {
          await sql`
            INSERT INTO "ConfigActividad" (
              "materiaId", trimestre, 
              "numActividadesCotidianas", "numActividadesIntegradoras", 
              "tieneExamen", "porcentajeAC", "porcentajeAI", "porcentajeExamen"
            ) VALUES (
              ${materia.id}, ${baseData.trimestre},
              ${baseData.numActividadesCotidianas}, ${baseData.numActividadesIntegradoras},
              ${baseData.tieneExamen}, ${baseData.porcentajeAC}, ${baseData.porcentajeAI}, ${baseData.porcentajeExamen}
            )
          `;
        }
      }
      return NextResponse.json({ success: true, count: materias.length });
    }

    if (!materiaId) return NextResponse.json({ error: "materiaId es requerido" }, { status: 400 });

    const exist = await sql`
      SELECT id FROM "ConfigActividad"
      WHERE "materiaId" = ${materiaId} AND trimestre = ${baseData.trimestre}
    `;

    let result;
    if (exist.length > 0) {
      result = await sql`
        UPDATE "ConfigActividad" SET
          "numActividadesCotidianas" = ${baseData.numActividadesCotidianas},
          "numActividadesIntegradoras" = ${baseData.numActividadesIntegradoras},
          "tieneExamen" = ${baseData.tieneExamen},
          "porcentajeAC" = ${baseData.porcentajeAC},
          "porcentajeAI" = ${baseData.porcentajeAI},
          "porcentajeExamen" = ${baseData.porcentajeExamen},
          "updatedAt" = NOW()
        WHERE "materiaId" = ${materiaId} AND trimestre = ${baseData.trimestre}
        RETURNING *
      `;
    } else {
      result = await sql`
        INSERT INTO "ConfigActividad" (
          "materiaId", trimestre, 
          "numActividadesCotidianas", "numActividadesIntegradoras", 
          "tieneExamen", "porcentajeAC", "porcentajeAI", "porcentajeExamen"
        ) VALUES (
          ${materiaId}, ${baseData.trimestre},
          ${baseData.numActividadesCotidianas}, ${baseData.numActividadesIntegradoras},
          ${baseData.tieneExamen}, ${baseData.porcentajeAC}, ${baseData.porcentajeAI}, ${baseData.porcentajeExamen}
        )
        RETURNING *
      `;
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error al guardar configuración:", error);
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
