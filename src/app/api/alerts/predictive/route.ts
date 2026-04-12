import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
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
    const gradoId = searchParams.get("gradoId");

    if (!gradoId) {
      return NextResponse.json({ error: "Grado requerido" }, { status: 400 });
    }

    // Obtener todas las calificaciones del grado
    const calificaciones = await db.calificacion.findMany({
      where: { estudiante: { gradoId } },
      include: {
        estudiante: { include: { grado: true } },
        materia: true,
        notasActividad: true,
      },
    });

    // Obtener asistencias del grado
    const asistencias = await db.asistencia.findMany({
      where: { estudiante: { gradoId } },
      include: { estudiante: true },
    });

    // Obtener configs para promedios ponderados
    const configs = await db.configActividad.findMany();

    const result = generateAdvancedAlerts(calificaciones, asistencias, configs);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[alerts/predictive] Error:", error);
    return NextResponse.json({ error: "Error al generar alertas" }, { status: 500 });
  }
}

function generateAdvancedAlerts(calificaciones: any[], asistencias: any[], configs: any[]) {
  // ========== 1. TENDENCIA DE RENDIMIENTO ==========
  const tendencias = calcularTendencias(calificaciones);

  // ========== 2. CORRELACIÓN AUSENCIAS-NOTAS ==========
  const correlaciones = calcularCorrelacionAusencias(calificaciones, asistencias);

  // ========== 3. ASIGNATURAS CRÍTICAS ==========
  const asignaturasCriticas = calcularAsignaturasCriticas(calificaciones);

  // ========== 4. PREDICCIÓN DE REPROBACIÓN ==========
  const predicciones = calcularPrediccionReprobacion(calificaciones, configs);

  // ========== 5. COMPARACIÓN HISTÓRICA ==========
  // (Simplificado - en producción necesitarías datos históricos reales)
  const comparacionHistorica = generarComparacion(calificaciones);

  // ========== 6. RECOMENDACIONES ACCIONABLES ==========
  const recomendaciones = generarRecomendaciones(tendencias, correlaciones, asignaturasCriticas, predicciones);

  return {
    tendencias,
    correlaciones,
    asignaturasCriticas,
    predicciones,
    comparacionHistorica,
    recomendaciones,
    resumen: {
      totalEstudiantes: new Set(calificaciones.map(c => c.estudianteId)).size,
      estudiantesEnRiesgo: predicciones.filter(p => p.probabilidadReprobacion > 60).length,
      promedioGeneral: calificaciones.length > 0
        ? calificaciones.reduce((sum, c) => sum + (c.promedioFinal || 0), 0) / calificaciones.filter(c => c.promedioFinal).length
        : 0,
    }
  };
}

function calcularTendencias(calificaciones: any[]) {
  // Agrupar por estudiante
  const porEstudiante = new Map<string, any[]>();
  calificaciones.forEach((cal: any) => {
    if (!porEstudiante.has(cal.estudianteId)) {
      porEstudiante.set(cal.estudianteId, []);
    }
    porEstudiante.get(cal.estudianteId)!.push(cal);
  });

  const tendencias: any[] = [];

  for (const [estId, califs] of porEstudiante) {
    const estudiante = (califs as any[])[0].estudiante;
    const promedios = (califs as any[])
      .filter(c => c.promedioFinal)
      .sort((a, b) => a.trimestre - b.trimestre)
      .map(c => ({ trimestre: c.trimestre, promedio: c.promedioFinal }));

    if (promedios.length < 2) continue;

    const primerProm = promedios[0].promedio;
    const ultimoProm = promedios[promedios.length - 1].promedio;
    const cambio = ultimoProm - primerProm;
    const tendencia = cambio > 0.5 ? "mejorando" : cambio < -0.5 ? "empeorando" : "estable";

    tendencias.push({
      estudianteId: estId,
      nombre: estudiante.nombre,
      grado: `${estudiante.grado.numero}° ${estudiante.grado.seccion}`,
      promedios,
      tendencia,
      cambio: Math.round(cambio * 100) / 100,
      primerPromedio: primerProm,
      ultimoPromedio: ultimoProm,
    });
  }

  return tendencias.sort((a, b) => a.cambio - b.cambio);
}

function calcularCorrelacionAusencias(calificaciones: any[], asistencias: any[]) {
  const porEstudiante = new Map<string, any[]>();
  calificaciones.forEach(cal => {
    if (!porEstudiante.has(cal.estudianteId)) {
      porEstudiante.set(cal.estudianteId, []);
    }
    porEstudiante.get(cal.estudianteId)!.push(cal);
  });

  const correlaciones = [];

  for (const [estId, califs] of porEstudiante) {
    const estudiante = califs[0].estudiante;
    const ausencias = asistencias.filter(a => a.estudianteId === estId && a.estado === "ausente");
    const totalAusencias = ausencias.length;

    if (totalAusencias === 0) continue;

    const promedioConNotas = califs
      .filter(c => c.promedioFinal)
      .reduce((sum, c) => sum + c.promedioFinal, 0) / califs.filter(c => c.promedioFinal).length;

    const correlacion = {
      estudianteId: estId,
      nombre: estudiante.nombre,
      totalAusencias,
      ausenciasInjustificadas: ausencias.filter(a => !a.estado.includes("justific")).length,
      promedio: Math.round(promedioConNotas * 100) / 100,
      impacto: totalAusencias > 5 ? "alto" : totalAusencias > 3 ? "medio" : "bajo",
    };

    correlaciones.push(correlacion);
  }

  return correlaciones.sort((a, b) => b.totalAusencias - a.totalAusencias);
}

function calcularAsignaturasCriticas(calificaciones: any[]) {
  const porMateria = new Map<string, any[]>();
  calificaciones.forEach(cal => {
    const key = `${cal.materiaId}-${cal.trimestre}`;
    if (!porMateria.has(key)) {
      porMateria.set(key, []);
    }
    porMateria.get(key)!.push(cal);
  });

  const criticas = [];

  for (const [key, califs] of porMateria) {
    const materia = califs[0].materia;
    const trimestre = califs[0].trimestre;
    const grado = califs[0].estudiante.grado;

    const conNotas = califs.filter(c => c.promedioFinal !== null);
    if (conNotas.length === 0) continue;

    const promedioMateria = conNotas.reduce((sum, c) => sum + c.promedioFinal, 0) / conNotas.length;
    const estudiantesEnRiesgo = conNotas.filter(c => c.promedioFinal < 5.0).length;
    const porcentajeEnRiesgo = (estudiantesEnRiesgo / conNotas.length) * 100;

    if (promedioMateria < 7.0) {
      criticas.push({
        materiaId: califs[0].materiaId,
        materiaNombre: materia.nombre,
        grado: `${grado.numero}° ${grado.seccion}`,
        trimestre,
        promedioMateria: Math.round(promedioMateria * 100) / 100,
        totalEstudiantes: conNotas.length,
        estudiantesEnRiesgo,
        porcentajeEnRiesgo: Math.round(porcentajeEnRiesgo),
        nivel: porcentajeEnRiesgo > 50 ? "critico" : porcentajeEnRiesgo > 30 ? "preocupante" : "atencion",
      });
    }
  }

  return criticas.sort((a, b) => a.promedioMateria - b.promedioMateria);
}

function calcularPrediccionReprobacion(calificaciones: any[], configs: any[]) {
  const porEstudiante = new Map<string, any[]>();
  calificaciones.forEach(cal => {
    if (!porEstudiante.has(cal.estudianteId)) {
      porEstudiante.set(cal.estudianteId, []);
    }
    porEstudiante.get(cal.estudianteId)!.push(cal);
  });

  const predicciones = [];

  for (const [estId, califs] of porEstudiante) {
    const estudiante = califs[0].estudiante;
    const grado = estudiante.grado;

    const conNotas = califs.filter(c => c.promedioFinal !== null);
    if (conNotas.length === 0) continue;

    const promedioGeneral = conNotas.reduce((sum, c) => sum + c.promedioFinal, 0) / conNotas.length;
    const materiasEnRiesgo = conNotas.filter(c => c.promedioFinal < 5.0).length;
    const materiasCriticas = conNotas.filter(c => c.promedioFinal < 4.0).length;

    // Fórmula simple de predicción
    let probabilidad = 0;
    if (promedioGeneral < 4.0) probabilidad = 90;
    else if (promedioGeneral < 4.5) probabilidad = 75;
    else if (promedioGeneral < 5.0) probabilidad = 60;
    else if (promedioGeneral < 5.5) probabilidad = 30;
    else probabilidad = 10;

    // Ajustar por materias críticas
    probabilidad += materiasCriticas * 10;
    probabilidad = Math.min(100, probabilidad);

    predicciones.push({
      estudianteId: estId,
      nombre: estudiante.nombre,
      grado: `${grado.numero}° ${grado.seccion}`,
      promedioGeneral: Math.round(promedioGeneral * 100) / 100,
      totalMaterias: conNotas.length,
      materiasEnRiesgo,
      materiasCriticas,
      probabilidadReprobacion: Math.round(probabilidad),
      nivel: probabilidad > 70 ? "muy_alto" : probabilidad > 50 ? "alto" : probabilidad > 30 ? "medio" : "bajo",
    });
  }

  return predicciones.sort((a, b) => b.probabilidadReprobacion - a.probabilidadReprobacion);
}

function generarComparacion(calificaciones: any[]) {
  // Simplificado - compara promedio actual vs umbral de aprobación
  const conNotas = calificaciones.filter(c => c.promedioFinal !== null);
  if (conNotas.length === 0) return null;

  const promedioActual = conNotas.reduce((sum, c) => sum + c.promedioFinal, 0) / conNotas.length;
  const umbral = 5.0;
  const distancia = promedioActual - umbral;

  return {
    promedioActual: Math.round(promedioActual * 100) / 100,
    umbralAprobacion: umbral,
    distancia: Math.round(distancia * 100) / 100,
    estado: distancia >= 0 ? "sobre_umbral" : "bajo_umbral",
    totalEstudiantes: new Set(conNotas.map(c => c.estudianteId)).size,
  };
}

function generarRecomendaciones(tendencias: any[], correlaciones: any[], asignaturasCriticas: any[], predicciones: any[]) {
  const recomendaciones = [];

  // Recomendación por estudiantes en riesgo crítico
  const riesgoCritico = predicciones.filter(p => p.probabilidadReprobacion > 70);
  if (riesgoCritico.length > 0) {
    recomendaciones.push({
      tipo: "urgente",
      titulo: `Intervención urgente: ${riesgoCritico.length} estudiante(s) en riesgo crítico`,
      descripcion: `Estudiantes con probabilidad >70% de reprobar. Se recomienda reunión con padres y plan de recuperación inmediato.`,
      estudiantes: riesgoCritico.slice(0, 5).map(e => e.nombre),
      accion: "contactar_padres",
    });
  }

  // Recomendación por asignaturas críticas
  if (asignaturasCriticas.length > 0) {
    recomendaciones.push({
      tipo: "academica",
      titulo: `Revisión de metodología en ${asignaturasCriticas.length} asignatura(s)`,
      descripcion: `Asignaturas con promedio general bajo 7.0. Considerar ajuste en metodología de enseñanza.`,
      materias: asignaturasCriticas.slice(0, 3).map(a => `${a.materiaNombre} (${a.grado})`),
      accion: "revision_metodologica",
    });
  }

  // Recomendación por ausencias
  const conMuchasAusencias = correlaciones.filter(c => c.totalAusencias > 5);
  if (conMuchasAusencias.length > 0) {
    recomendaciones.push({
      tipo: "asistencia",
      titulo: `Control de asistencia: ${conMuchasAusencias.length} estudiante(s) con muchas ausencias`,
      descripcion: `Estudiantes con más de 5 ausencias. Las ausencias correlacionan con bajo rendimiento.`,
      estudiantes: conMuchasAusencias.slice(0, 5).map(e => e.nombre),
      accion: "control_asistencia",
    });
  }

  // Recomendación por tendencia negativa
  const empeorando = tendencias.filter(t => t.tendencia === "empeorando");
  if (empeorando.length > 0) {
    recomendaciones.push({
      tipo: "tendencia",
      titulo: `Seguimiento: ${empeorando.length} estudiante(s) con rendimiento descendente`,
      descripcion: `Estudiantes cuya nota ha bajado significativamente entre trimestres.`,
      estudiantes: empeorando.slice(0, 5).map(e => e.nombre),
      accion: "seguimiento_individual",
    });
  }

  return recomendaciones;
}
