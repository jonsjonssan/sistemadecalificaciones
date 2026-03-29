import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

// Calcular promedio de actividades
function calcularPromedioActividades(notas: (number | null)[]): number | null {
  const notasValidas = notas.filter((n) => n !== null && n !== undefined) as number[];
  if (notasValidas.length === 0) return null;
  return notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length;
}

// Verificar si el usuario tiene acceso a una materia
async function verificarAccesoMateria(usuarioId: string, materiaId: string): Promise<boolean> {
  const usuario = await db.usuario.findUnique({
    where: { id: usuarioId },
    include: {
      gradosComoTutor: { select: { id: true } },
      materiasAsignadas: { select: { materiaId: true } },
    },
  });
  
  if (!usuario) return false;
  if (usuario.rol === "admin") return true;
  
  // Verificar si es tutor del grado de la materia
  const materia = await db.materia.findUnique({
    where: { id: materiaId },
    include: { grado: true },
  });
  
  if (!materia) return false;
  
  // Si es tutor del grado
  if (usuario.gradosComoTutor.some(g => g.id === materia.gradoId)) return true;
  
  // Si tiene asignada la materia específica
  if (usuario.materiasAsignadas.some(m => m.materiaId === materiaId)) return true;
  
  return false;
}

// Verificar si el usuario tiene acceso a un grado
async function verificarAccesoGrado(usuarioId: string, gradoId: string): Promise<boolean> {
  const usuario = await db.usuario.findUnique({
    where: { id: usuarioId },
    include: {
      gradosComoTutor: { select: { id: true } },
      materiasAsignadas: { 
        select: { materia: { select: { gradoId: true } } } 
      },
    },
  });
  
  if (!usuario) return false;
  if (usuario.rol === "admin") return true;
  
  // Si es tutor del grado
  if (usuario.gradosComoTutor.some(g => g.id === gradoId)) return true;
  
  // Si tiene alguna materia en ese grado
  if (usuario.materiasAsignadas.some(m => m.materia.gradoId === gradoId)) return true;
  
  return false;
}

// Listar calificaciones
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sessionData = JSON.parse(session.value);
    const { searchParams } = new URL(request.url);
    const estudianteId = searchParams.get("estudianteId");
    const materiaId = searchParams.get("materiaId");
    const gradoId = searchParams.get("gradoId");
    const trimestre = searchParams.get("trimestre");

    // Verificar acceso si se especifica un grado
    if (gradoId) {
      const tieneAcceso = await verificarAccesoGrado(sessionData.id, gradoId);
      if (!tieneAcceso) {
        return NextResponse.json({ error: "No tiene acceso a este grado" }, { status: 403 });
      }
    }

    // Verificar acceso si se especifica una materia
    if (materiaId) {
      const tieneAcceso = await verificarAccesoMateria(sessionData.id, materiaId);
      if (!tieneAcceso) {
        return NextResponse.json({ error: "No tiene acceso a esta materia" }, { status: 403 });
      }
    }

    const where: Record<string, unknown> = {};
    if (estudianteId) where.estudianteId = estudianteId;
    if (materiaId) where.materiaId = materiaId;
    const anual = searchParams.get("anual");
    if (trimestre && anual !== "true") where.trimestre = parseInt(trimestre);

    let calificaciones;

    if (gradoId && !estudianteId) {
      // Obtener calificaciones de todos los estudiantes del grado
      calificaciones = await db.calificacion.findMany({
        where: {
          ...where,
          estudiante: { gradoId },
        },
        include: {
          estudiante: true,
          materia: true,
        },
      });
    } else {
      calificaciones = await db.calificacion.findMany({
        where,
        include: {
          estudiante: true,
          materia: true,
        },
      });
    }

    return NextResponse.json(calificaciones);
  } catch (error) {
    console.error("Error al obtener calificaciones:", error);
    return NextResponse.json(
      { error: "Error al obtener calificaciones" },
      { status: 500 }
    );
  }
}

// Crear o actualizar calificación
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sessionData = JSON.parse(session.value);
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
      return NextResponse.json(
        { error: "Estudiante, materia y trimestre son requeridos" },
        { status: 400 }
      );
    }

    // Verificar acceso a la materia
    const tieneAcceso = await verificarAccesoMateria(sessionData.id, materiaId);
    if (!tieneAcceso) {
      return NextResponse.json({ error: "No tiene acceso a esta materia" }, { status: 403 });
    }

    // Parsear arrays JSON
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

    // Obtener configuración de la materia para calcular promedios
    const config = await db.configActividad.findUnique({
      where: {
        materiaId_trimestre: {
          materiaId,
          trimestre: parseInt(String(trimestre)),
        },
      },
    });

    // Calcular promedios
    const calificacionAC = calcularPromedioActividades(acNotas);
    const calificacionAI = calcularPromedioActividades(aiNotas);

    // Calcular promedio final con porcentajes de configuración
    let promedioFinal: number | null = null;
    if (config) {
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
      // Usar porcentajes por defecto (35%, 35%, 30%)
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

    // Usar upsert para crear o actualizar
    const calificacion = await db.calificacion.upsert({
      where: {
        estudianteId_materiaId_trimestre: {
          estudianteId,
          materiaId,
          trimestre: parseInt(String(trimestre)),
        },
      },
      create: {
        estudianteId,
        materiaId,
        trimestre: parseInt(String(trimestre)),
        actividadesCotidianas: JSON.stringify(acNotas),
        calificacionAC,
        actividadesIntegradoras: JSON.stringify(aiNotas),
        calificacionAI,
        examenTrimestral,
        promedioFinal,
        recuperacion,
      },
      update: {
        actividadesCotidianas: JSON.stringify(acNotas),
        calificacionAC,
        actividadesIntegradoras: JSON.stringify(aiNotas),
        calificacionAI,
        examenTrimestral,
        promedioFinal,
        recuperacion,
      },
      include: {
        estudiante: true,
        materia: true,
      },
    });

    return NextResponse.json(calificacion);
  } catch (error) {
    console.error("Error al guardar calificación:", error);
    return NextResponse.json(
      { error: "Error al guardar calificación" },
      { status: 500 }
    );
  }
}

// Actualizar múltiples calificaciones
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { calificaciones } = await request.json();

    if (!Array.isArray(calificaciones)) {
      return NextResponse.json(
        { error: "Se requiere un array de calificaciones" },
        { status: 400 }
      );
    }

    const resultados: any[] = [];

    for (const data of calificaciones) {
      const {
        estudianteId,
        materiaId,
        trimestre,
        actividadesCotidianas,
        actividadesIntegradoras,
        examenTrimestral,
        recuperacion,
      } = data;

      // Parsear arrays
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

      // Calcular promedio final (porcentajes por defecto)
      const totalPonderacion = 
        (calificacionAC !== null ? 0.35 : 0) + 
        (calificacionAI !== null ? 0.35 : 0) + 
        (examenTrimestral !== null ? 0.30 : 0);

      let promedioFinal: number | null = null;
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

      const resultado = await db.calificacion.upsert({
        where: {
          estudianteId_materiaId_trimestre: {
            estudianteId,
            materiaId,
            trimestre,
          },
        },
        create: {
          estudianteId,
          materiaId,
          trimestre,
          actividadesCotidianas: JSON.stringify(acNotas),
          calificacionAC,
          actividadesIntegradoras: JSON.stringify(aiNotas),
          calificacionAI,
          examenTrimestral,
          promedioFinal,
          recuperacion,
        },
        update: {
          actividadesCotidianas: JSON.stringify(acNotas),
          calificacionAC,
          actividadesIntegradoras: JSON.stringify(aiNotas),
          calificacionAI,
          examenTrimestral,
          promedioFinal,
          recuperacion,
        },
      });

      resultados.push(resultado);
    }

    return NextResponse.json({ message: "Calificaciones guardadas", count: resultados.length });
  } catch (error) {
    console.error("Error al guardar calificaciones:", error);
    return NextResponse.json(
      { error: "Error al guardar calificaciones" },
      { status: 500 }
    );
  }
}
