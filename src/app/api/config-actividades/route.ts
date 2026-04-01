import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";

async function getUsuarioSession() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session) return null;
    return JSON.parse(session.value);
  } catch (error) {
    console.error("[config-actividades] Error parsing session:", error);
    return null;
  }
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

    console.log("[config-actividades] GET Session:", JSON.stringify(session));
    console.log("[config-actividades] GET Params:", { materiaId, gradoId, trimestre });

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
    }

    if (materiaId && trimestre) {
      const trimestreNum = parseInt(trimestre);
      if (isNaN(trimestreNum)) {
        return NextResponse.json({ error: "Trimestre inválido" }, { status: 400 });
      }

      console.log("[config-actividades] GET materia:", materiaId, "trimestre:", trimestreNum);

      const materiaExists = await sql`SELECT id FROM "Materia" WHERE id = ${materiaId} LIMIT 1`;
      if (materiaExists.length === 0) {
        return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
      }

      let configResult = await sql`
        SELECT * FROM "ConfigActividad"
        WHERE "materiaId" = ${materiaId} AND trimestre = ${trimestreNum}
      `;

      if (configResult.length === 0) {
        const newConfig = await sql`
          INSERT INTO "ConfigActividad" (
            "materiaId", trimestre, 
            "numActividadesCotidianas", "numActividadesIntegradoras", 
            "tieneExamen", "porcentajeAC", "porcentajeAI", "porcentajeExamen"
          ) VALUES (
            ${materiaId}, ${trimestreNum},
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
      const trimestreNum = parseInt(trimestre);
      if (isNaN(trimestreNum)) {
        return NextResponse.json({ error: "Trimestre inválido" }, { status: 400 });
      }

      console.log("[config-actividades] GET grado:", gradoId, "trimestre:", trimestreNum);

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
            WHERE "materiaId" = ${materia.id} AND trimestre = ${trimestreNum}
          `;

          if (configResult.length === 0) {
            const newConfig = await sql`
              INSERT INTO "ConfigActividad" (
                "materiaId", trimestre, 
                "numActividadesCotidianas", "numActividadesIntegradoras", 
                "tieneExamen", "porcentajeAC", "porcentajeAI", "porcentajeExamen"
              ) VALUES (
                ${materia.id}, ${trimestreNum},
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
    console.error("[config-actividades] GET Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error al obtener configuración", details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const data = await request.json();
    console.log("[config-actividades] POST body:", JSON.stringify(data));

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

    const trimestreNum = trimestre !== undefined && trimestre !== null ? parseInt(String(trimestre)) : NaN;
    if (!trimestre || isNaN(trimestreNum)) {
      return NextResponse.json({ error: "Trimestre es requerido y debe ser válido" }, { status: 400 });
    }

    const numAC = numActividadesCotidianas !== undefined ? parseInt(String(numActividadesCotidianas)) : 4;
    const numAI = numActividadesIntegradoras !== undefined ? parseInt(String(numActividadesIntegradoras)) : 1;
    const tieneEx = tieneExamen === true || tieneExamen === "true" || tieneExamen === 1;
    const porcAC = porcentajeAC !== undefined ? parseFloat(String(porcentajeAC)) : 35.0;
    const porcAI = porcentajeAI !== undefined ? parseFloat(String(porcentajeAI)) : 35.0;
    const porcEx = porcentajeExamen !== undefined ? parseFloat(String(porcentajeExamen)) : 30.0;

    console.log("[config-actividades] POST parsed values:", {
      trimestreNum, numAC, numAI, tieneEx, porcAC, porcAI, porcEx,
      aplicarATodas: aplicarATodasLasMateriasDelGrado, gradoId, materiaId
    });

    if (aplicarATodasLasMateriasDelGrado && gradoId) {
      const materias = await sql`SELECT id FROM "Materia" WHERE "gradoId" = ${gradoId}`;
      
      if (materias.length === 0) {
        return NextResponse.json({ error: "No hay materias para este grado" }, { status: 404 });
      }
      
      let count = 0;
      for (const materia of materias) {
        const exist = await sql`
          SELECT id FROM "ConfigActividad"
          WHERE "materiaId" = ${materia.id} AND trimestre = ${trimestreNum}
        `;

        if (exist.length > 0) {
          await sql`
            UPDATE "ConfigActividad" SET
              "numActividadesCotidianas" = ${numAC},
              "numActividadesIntegradoras" = ${numAI},
              "tieneExamen" = ${tieneEx},
              "porcentajeAC" = ${porcAC},
              "porcentajeAI" = ${porcAI},
              "porcentajeExamen" = ${porcEx}
            WHERE "materiaId" = ${materia.id} AND trimestre = ${trimestreNum}
          `;
        } else {
          await sql`
            INSERT INTO "ConfigActividad" (
              "materiaId", trimestre, 
              "numActividadesCotidianas", "numActividadesIntegradoras", 
              "tieneExamen", "porcentajeAC", "porcentajeAI", "porcentajeExamen"
            ) VALUES (
              ${materia.id}, ${trimestreNum},
              ${numAC}, ${numAI},
              ${tieneEx}, ${porcAC}, ${porcAI}, ${porcEx}
            )
          `;
        }
        count++;
      }
      console.log("[config-actividades] POST apply-to-all success, count:", count);
      return NextResponse.json({ success: true, count });
    }

    if (!materiaId) return NextResponse.json({ error: "materiaId es requerido" }, { status: 400 });

    const exist = await sql`
      SELECT id FROM "ConfigActividad"
      WHERE "materiaId" = ${materiaId} AND trimestre = ${trimestreNum}
    `;

    let result;
    if (exist.length > 0) {
      result = await sql`
        UPDATE "ConfigActividad" SET
          "numActividadesCotidianas" = ${numAC},
          "numActividadesIntegradoras" = ${numAI},
          "tieneExamen" = ${tieneEx},
          "porcentajeAC" = ${porcAC},
          "porcentajeAI" = ${porcAI},
          "porcentajeExamen" = ${porcEx}
        WHERE "materiaId" = ${materiaId} AND trimestre = ${trimestreNum}
        RETURNING *
      `;
    } else {
      result = await sql`
        INSERT INTO "ConfigActividad" (
          "materiaId", trimestre, 
          "numActividadesCotidianas", "numActividadesIntegradoras", 
          "tieneExamen", "porcentajeAC", "porcentajeAI", "porcentajeExamen"
        ) VALUES (
          ${materiaId}, ${trimestreNum},
          ${numAC}, ${numAI},
          ${tieneEx}, ${porcAC}, ${porcAI}, ${porcEx}
        )
        RETURNING *
      `;
    }

    console.log("[config-actividades] POST success:", JSON.stringify(result[0]));
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("[config-actividades] POST Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error al guardar configuración", details: errorMessage }, { status: 500 });
  }
}
