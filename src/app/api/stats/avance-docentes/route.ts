import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";

const selectMateriasConDatos = {
  materia: {
    select: {
      id: true,
      nombre: true,
      gradoId: true,
      grado: {
        select: {
          id: true,
          numero: true,
          seccion: true,
          estudiantes: {
            where: { activo: true },
            select: { id: true, nombre: true, numero: true },
            orderBy: { numero: "asc" as const },
          },
        },
      },
      configActividades: {
        select: {
          trimestre: true,
          numActividadesCotidianas: true,
          numActividadesIntegradoras: true,
          tieneExamen: true,
          porcentajeAC: true,
          porcentajeAI: true,
          porcentajeExamen: true,
        },
      },
      calificaciones: {
        select: {
          id: true,
          estudianteId: true,
          trimestre: true,
          calificacionAC: true,
          calificacionAI: true,
          examenTrimestral: true,
          promedioFinal: true,
          notasActividad: {
            select: {
              tipo: true,
              numeroActividad: true,
              nota: true,
            },
          },
        },
      },
    },
  },
};

function computeStats(docente: any) {
  const materiasStats = (docente.materiasAsignadas || []).map((asignacion: any) => {
    const materia = asignacion.materia;
    const estudiantes = materia.grado.estudiantes;
    const configs = materia.configActividades;

    const trimestresStats = [1, 2, 3].map((trimestre) => {
      const config = configs.find((c: any) => c.trimestre === trimestre) ?? {
        trimestre,
        numActividadesCotidianas: 4,
        numActividadesIntegradoras: 1,
        tieneExamen: true,
        porcentajeAC: 35,
        porcentajeAI: 35,
        porcentajeExamen: 30,
      };

      let completo = 0;
      let parcial = 0;
      let vacio = 0;

      for (const est of estudiantes) {
        const calif = materia.calificaciones.find(
          (c: any) => c.estudianteId === est.id && c.trimestre === trimestre
        );

        if (!calif) {
          vacio++;
          continue;
        }

        const notasAC = calif.notasActividad.filter(
          (n: any) => n.tipo === "cotidiana"
        );
        const notasAI = calif.notasActividad.filter(
          (n: any) => n.tipo === "integradora"
        );

        const filledAC = notasAC.length;
        const filledAI = notasAI.length;
        const filledExamen =
          config.tieneExamen && calif.examenTrimestral !== null ? 1 : 0;

        const totalFields =
          config.numActividadesCotidianas +
          config.numActividadesIntegradoras +
          (config.tieneExamen ? 1 : 0);

        const filledFields = filledAC + filledAI + filledExamen;

        if (filledFields === 0) {
          vacio++;
        } else if (filledFields >= totalFields) {
          completo++;
        } else {
          parcial++;
        }
      }

      return {
        trimestre,
        stats: { completo, parcial, vacio, total: estudiantes.length },
      };
    });

    const totalEsperado = estudiantes.length * 3;
    const totalCompleto = trimestresStats.reduce(
      (s: number, t: any) => s + t.stats.completo, 0
    );
    const totalParcial = trimestresStats.reduce(
      (s: number, t: any) => s + t.stats.parcial, 0
    );
    const totalVacio = trimestresStats.reduce(
      (s: number, t: any) => s + t.stats.vacio, 0
    );

    return {
      materiaId: materia.id,
      materiaNombre: materia.nombre,
      gradoId: materia.grado.id,
      gradoNumero: materia.grado.numero,
      gradoSeccion: materia.grado.seccion,
      totalEstudiantes: estudiantes.length,
      trimestres: trimestresStats.map((t: any) => ({
        trimestre: t.trimestre,
        completo: t.stats.completo,
        parcial: t.stats.parcial,
        vacio: t.stats.vacio,
        total: t.stats.total,
        porcentaje:
          t.stats.total > 0
            ? Math.round((t.stats.completo / t.stats.total) * 100)
            : 0,
      })),
      totalCompleto,
      totalParcial,
      totalVacio,
      totalEsperado,
      porcentaje:
        totalEsperado > 0
          ? Math.round((totalCompleto / totalEsperado) * 100)
          : 0,
    };
  });

  const globalCompleto = materiasStats.reduce(
    (s: number, m: any) => s + m.totalCompleto, 0
  );
  const globalParcial = materiasStats.reduce(
    (s: number, m: any) => s + m.totalParcial, 0
  );
  const globalVacio = materiasStats.reduce(
    (s: number, m: any) => s + m.totalVacio, 0
  );
  const globalEsperado = materiasStats.reduce(
    (s: number, m: any) => s + m.totalEsperado, 0
  );

  return {
    docenteId: docente.id,
    docenteNombre: docente.nombre,
    docenteEmail: docente.email,
    docenteRol: docente.rol,
    materias: materiasStats,
    globalCompleto,
    globalParcial,
    globalVacio,
    globalEsperado,
    porcentajeGlobal:
      globalEsperado > 0
        ? Math.round((globalCompleto / globalEsperado) * 100)
        : 100,
  };
}

export async function GET() {
  try {
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

    if (!isAdminRole && !["docente", "docente-orientador"].includes(session.rol)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    let usuarios;

    if (isAdminRole) {
      usuarios = await db.usuario.findMany({
        where: { activo: true },
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
          materiasAsignadas: { select: selectMateriasConDatos },
        },
        orderBy: [{ rol: "asc" }, { nombre: "asc" }],
      });
    } else {
      usuarios = await db.usuario.findMany({
        where: {
          rol: { in: ["docente", "docente-orientador"] },
          activo: true,
          id: session.id,
        },
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
          materiasAsignadas: { select: selectMateriasConDatos },
        },
      });
    }

    const resultado = usuarios.map(computeStats);

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error en avance-docentes:", error);
    return NextResponse.json(
      { error: "Error al calcular avance de docentes" },
      { status: 500 }
    );
  }
}
