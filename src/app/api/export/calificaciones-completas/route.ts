import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/api-middleware";

export async function GET(req: NextRequest) {
  const usuario = await getSession();
  if (!usuario || !["admin", "admin-directora", "admin-codirectora"].includes(usuario.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const trimestre = parseInt(searchParams.get("trimestre") || "1");
  const incluirDatos = searchParams.get("data") === "true";

  if (trimestre < 1 || trimestre > 3) {
    return NextResponse.json({ error: "Trimestre inválido" }, { status: 400 });
  }

  const grados = (await db.grado.findMany({
    where: { numero: { gte: 2, lte: 9 } },
    include: {
      estudiantes: { where: { activo: true }, select: { id: true, nombre: true, numero: true } },
      materias: { select: { id: true, nombre: true } },
    },
    orderBy: { numero: "asc" },
  })) as any[];

  const allMateriaIds = grados.flatMap((g: any) => g.materias.map((m: any) => m.id));

  const calificacionCounts = await db.calificacion.groupBy({
    by: ["materiaId"],
    where: {
      materiaId: { in: allMateriaIds },
      trimestre,
      promedioFinal: { not: null },
    },
    _count: { id: true },
  });

  const countMap = new Map(calificacionCounts.map((c) => [c.materiaId, c._count.id]));

  type AvanceItem = {
    gradoId: string;
    gradoNumero: number;
    gradoSeccion: string;
    materiaId: string;
    materiaNombre: string;
    totalEstudiantes: number;
    conCalificaciones: number;
    porcentaje: number;
  };

  const avance: AvanceItem[] = [];

  for (const grado of grados as any[]) {
    for (const materia of grado.materias) {
      const total = grado.estudiantes.length;
      const conCalificaciones = Math.min(countMap.get(materia.id) || 0, total);
      avance.push({
        gradoId: grado.id,
        gradoNumero: grado.numero,
        gradoSeccion: grado.seccion,
        materiaId: materia.id,
        materiaNombre: materia.nombre,
        totalEstudiantes: total,
        conCalificaciones,
        porcentaje: total > 0 ? Math.round((conCalificaciones / total) * 10000) / 100 : 0,
      });
    }
  }

  const combosSuficientes = avance.filter((a) => a.porcentaje >= 33.34).length;
  const totalCombos = avance.length;
  const progresoGlobal = totalCombos > 0 ? Math.round((combosSuficientes / totalCombos) * 100) : 0;
  const habilitado = progresoGlobal >= 33.33;

  let datos: any[] | undefined;

  if (incluirDatos) {
    const calificaciones = await db.calificacion.findMany({
      where: {
        materiaId: { in: allMateriaIds },
        trimestre,
      },
      include: {
        estudiante: { select: { id: true, nombre: true, numero: true } },
        materia: { select: { id: true, nombre: true, gradoId: true } },
        notasActividad: { select: { tipo: true, numeroActividad: true, nota: true } },
      },
      orderBy: [{ materia: { gradoId: "asc" } }, { estudiante: { numero: "asc" } }],
    });

    const configs = await db.configActividad.findMany({
      where: { materiaId: { in: allMateriaIds }, trimestre },
    });

    const configMap = new Map(configs.map((c: any) => [c.materiaId, c]));

    datos = calificaciones.map((c: any) => {
      const config = configMap.get(c.materiaId) as any;
      const cotidianas: (number | null)[] = [];
      const integradoras: (number | null)[] = [];
      const examenes: (number | null)[] = [];
      const numAC = config?.numActividadesCotidianas ?? 4;
      const numAI = config?.numActividadesIntegradoras ?? 1;
      const numEX = config?.numExamenes ?? (config?.tieneExamen ? 1 : 0);
      for (let i = 1; i <= numAC; i++) {
        const na = c.notasActividad.find((n: any) => n.tipo === "cotidiana" && n.numeroActividad === i);
        cotidianas.push(na?.nota ?? null);
      }
      for (let i = 1; i <= numAI; i++) {
        const na = c.notasActividad.find((n: any) => n.tipo === "integradora" && n.numeroActividad === i);
        integradoras.push(na?.nota ?? null);
      }
      for (let i = 1; i <= numEX; i++) {
        const na = c.notasActividad.find((n: any) => n.tipo === "examen" && n.numeroActividad === i);
        examenes.push(na?.nota ?? null);
      }
      // Migrate: if no exam parts found in notasActividad but examenTrimestral exists, use it
      if (numEX > 0 && examenes.every(e => e === null) && c.examenTrimestral != null) {
        examenes[0] = c.examenTrimestral;
      }
      return {
        estudianteId: c.estudianteId,
        estudianteNombre: c.estudiante.nombre,
        estudianteNumero: c.estudiante.numero,
        materiaId: c.materiaId,
        materiaNombre: c.materia.nombre,
        gradoId: c.materia.gradoId,
        trimestre: c.trimestre,
        actividadesCotidianas: cotidianas,
        actividadesIntegradoras: integradoras,
        actividadesExamen: examenes,
        calificacionAC: c.calificacionAC,
        calificacionAI: c.calificacionAI,
        examenTrimestral: c.examenTrimestral,
        promedioFinal: c.promedioFinal,
        recuperacion: c.recuperacion,
        config: config
          ? {
              numActividadesCotidianas: config.numActividadesCotidianas,
              numActividadesIntegradoras: config.numActividadesIntegradoras,
              tieneExamen: config.tieneExamen,
              numExamenes: config.numExamenes,
              porcentajeAC: config.porcentajeAC,
              porcentajeAI: config.porcentajeAI,
              porcentajeExamen: config.porcentajeExamen,
            }
          : null,
      };
    });
  }

  return NextResponse.json({
    trimestre,
    progresoGlobal,
    habilitado,
    totalCombos,
    combosSuficientes,
    avance,
    grados: grados.map((g: any) => ({
      id: g.id,
      numero: g.numero,
      seccion: g.seccion,
      estudiantes: g.estudiantes,
      materias: g.materias,
    })),
    datos,
  });
}
