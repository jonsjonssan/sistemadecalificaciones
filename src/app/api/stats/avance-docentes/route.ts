import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";

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

    const whereDocentes: any = {
      rol: { in: ["docente", "docente-orientador"] },
      activo: true,
    };

    if (!isAdminRole) {
      whereDocentes.id = session.id;
    }

    const docentes = await db.usuario.findMany({
      where: whereDocentes,
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        materiasAsignadas: {
          select: {
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
                      orderBy: { numero: "asc" },
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
          },
        },
      },
    });

    const resultado = docentes.map((docente) => {
      const materiasStats = docente.materiasAsignadas.map((asignacion) => {
        const materia = asignacion.materia;
        const estudiantes = materia.grado.estudiantes;
        const configs = materia.configActividades;

        const trimestresStats = [1, 2, 3].map((trimestre) => {
          const config = configs.find((c) => c.trimestre === trimestre) ?? {
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
              (c) => c.estudianteId === est.id && c.trimestre === trimestre
            );

            if (!calif) {
              vacio++;
              continue;
            }

            const notasAC = calif.notasActividad.filter(
              (n) => n.tipo === "cotidiana"
            );
            const notasAI = calif.notasActividad.filter(
              (n) => n.tipo === "integradora"
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
            config: {
              numActividadesCotidianas: config.numActividadesCotidianas,
              numActividadesIntegradoras: config.numActividadesIntegradoras,
              tieneExamen: config.tieneExamen,
            },
          };
        });

        const totalEsperado = estudiantes.length * 3;
        const totalCompleto = trimestresStats.reduce(
          (s, t) => s + t.stats.completo,
          0
        );
        const totalParcial = trimestresStats.reduce(
          (s, t) => s + t.stats.parcial,
          0
        );
        const totalVacio = trimestresStats.reduce(
          (s, t) => s + t.stats.vacio,
          0
        );

        return {
          materiaId: materia.id,
          materiaNombre: materia.nombre,
          gradoId: materia.grado.id,
          gradoNumero: materia.grado.numero,
          gradoSeccion: materia.grado.seccion,
          totalEstudiantes: estudiantes.length,
          trimestres: trimestresStats.map((t) => ({
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
        (s, m) => s + m.totalCompleto,
        0
      );
      const globalParcial = materiasStats.reduce(
        (s, m) => s + m.totalParcial,
        0
      );
      const globalVacio = materiasStats.reduce((s, m) => s + m.totalVacio, 0);
      const globalEsperado = materiasStats.reduce(
        (s, m) => s + m.totalEsperado,
        0
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
            : 0,
      };
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error en avance-docentes:", error);
    return NextResponse.json(
      { error: "Error al calcular avance de docentes" },
      { status: 500 }
    );
  }
}
