/**
 * Seed de Escuela Demo para comercialización.
 *
 * Crea una escuela genérica ("Instituto Educativo Las Colinas") con datos
 * realistas que muestran todas las virtudes del sistema:
 *   - Multi-tenencia (no toca datos de otras escuelas)
 *   - Grados 2° a 9° con secciones
 *   - Materias por ciclo con configuración de actividades por trimestre
 *   - Usuarios: directora, codirectora y docentes (orientadores + especialistas)
 *   - Asignaciones DocenteMateria
 *   - Estudiantes con número de lista por grado
 *   - Calificaciones T1 completas, T2 en progreso (~55%), T3 vacías
 *   - Recuperaciones para estudiantes reprobados
 *   - Asistencia diaria del trimestre en curso
 *
 * Idempotente: identificado por Escuela.codigo = "DEMO-LAS-COLINAS".
 * Re-ejecutar borra y recrea los datos académicos de la escuela demo
 * (preserva usuarios para no romper sesiones activas).
 *
 * Uso:
 *   npx tsx scripts/seed-escuela-demo.ts
 *
 * Credenciales (todas con password "demo1234"):
 *   - directora@lascolinas.edu      (admin-directora)
 *   - codirectora@lascolinas.edu    (admin-codirectora)
 *   - docente.<grado>@lascolinas.edu (docente-orientador 2..9)
 *   - especialista.<materia>@lascolinas.edu (docente)
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Configuración de la escuela demo
// ---------------------------------------------------------------------------

const ESCUELA_CODIGO = "DEMO-LAS-COLINAS";
const ESCUELA = {
  nombre: "Instituto Educativo Las Colinas",
  codigo: ESCUELA_CODIGO,
  direccion: "Avenida Central #45, Colonia Las Colinas",
  distrito: "Distrito Educativo Centro",
  tipo: "privado" as const,
  planEstudio: "general",
  escalaNotas: "0-10",
  periodos: "trimestres",
  colorPrimario: "#1a3a2a",
};

const AÑO = 2026;
const DEFAULT_PASSWORD = "demo1234";

// Materias por ciclo (alineado con src/lib/constants/index.ts)
const MATERIAS_POR_CICLO: Record<number, string[]> = {
  2: ["Comunicación", "Números y Formas", "Ciudadanía y Valores", "Ciencia y Tecnología", "Desarrollo Corporal", "Educación en la Fe", "Artes"],
  3: ["Comunicación", "Números y Formas", "Ciudadanía y Valores", "Ciencia y Tecnología", "Desarrollo Corporal", "Educación en la Fe", "Artes"],
  4: ["Comunicación y Literatura", "Aritmética y Finanzas", "Ciudadanía y Valores", "Ciencia y Tecnología", "Desarrollo Corporal", "Educación en la Fe"],
  5: ["Comunicación y Literatura", "Aritmética y Finanzas", "Ciudadanía y Valores", "Ciencia y Tecnología", "Desarrollo Corporal", "Educación en la Fe"],
  6: ["Comunicación y Literatura", "Aritmética y Finanzas", "Ciencia y Tecnología", "Ciudadanía y Valores", "Desarrollo Corporal", "Educación en la Fe"],
  7: ["Lengua y Literatura", "Matemática y Datos", "Ciencia y Tecnología", "Ciudadanía y Valores", "Educación Física y Deportes", "Educación en la Fe", "Inglés"],
  8: ["Lengua y Literatura", "Matemática y Datos", "Ciencia y Tecnología", "Ciudadanía y Valores", "Educación Física y Deportes", "Educación en la Fe", "Inglés"],
  9: ["Lengua y Literatura", "Matemática y Datos", "Ciencia y Tecnología", "Ciudadanía y Valores", "Educación Física y Deportes", "Educación en la Fe", "Inglés"],
};

// Pesos estándar del sistema
const PESOS = { porcentajeAC: 35.0, porcentajeAI: 35.0, porcentajeExamen: 30.0, tieneExamen: true };
const NOTA_MAXIMA = 10.0;

// Docentes orientadores (uno por grado 2-9)
const ORIENTADORES: { grado: number; nombre: string; email: string }[] = [
  { grado: 2, nombre: "María Fernanda Herrera López", email: "docente.2@lascolinas.edu" },
  { grado: 3, nombre: "José Eduardo Ramírez Cruz", email: "docente.3@lascolinas.edu" },
  { grado: 4, nombre: "Ana Lucía Torres Mendoza", email: "docente.4@lascolinas.edu" },
  { grado: 5, nombre: "Carlos Alberto Vargas Aguilar", email: "docente.5@lascolinas.edu" },
  { grado: 6, nombre: "Sofía del Carmen Castillo Romero", email: "docente.6@lascolinas.edu" },
  { grado: 7, nombre: "L Fernando Gómez Jiménez", email: "docente.7@lascolinas.edu" },
  { grado: 8, nombre: "Patricia Eugenia Moreno Flores", email: "docente.8@lascolinas.edu" },
  { grado: 9, nombre: "Roberto Manuel Sánchez Ruiz", email: "docente.9@lascolinas.edu" },
];

// Docentes especialistas (asignan una materia en varios grados)
const ESPECIALISTAS: { nombre: string; email: string; materias: { grado: number; mat: string }[] }[] = [
  {
    nombre: "Helen Alicia Cabezas de Golcher",
    email: "especialista.educacionfisica@lascolinas.edu",
    materias: [2, 3, 4, 5, 6].flatMap((g) => [{ grado: g, mat: "Desarrollo Corporal" }]).concat(
      [7, 8, 9].map((g) => ({ grado: g, mat: "Educación Física y Deportes" }))
    ),
  },
  {
    nombre: "Diana Nicole Rojas Urias",
    email: "especialista.artes@lascolinas.edu",
    materias: [2, 3, 4].map((g) => ({ grado: g, mat: "Artes" })),
  },
  {
    nombre: "Javier Esteban Ortega Herrera",
    email: "especialista.ingles@lascolinas.edu",
    materias: [7, 8, 9].map((g) => ({ grado: g, mat: "Inglés" })),
  },
  {
    nombre: "Rosa Emilia Medina Aguirre",
    email: "especialista.educacionenlafe@lascolinas.edu",
    materias: [2, 3, 4, 5, 6, 7, 8, 9].map((g) => ({ grado: g, mat: "Educación en la Fe" })),
  },
];

// Pool de nombres para generar estudiantes genéricos realistas
const NOMBRES_M = [
  "Mateo", "Sebastián", "Diego", "Andrés", "Felipe", "Joaquín", "Tomás", "Emilio",
  "Bruno", "Adrián", "Iker", "Dylan", "Axel", "Bautista", "Ignacio", "Lautaro",
  "Benjamín", "Javier", "Manuel", "Pedro", "Ricardo", "Alejandro", "Fernando", "Ángel",
];
const NOMBRES_F = [
  "Valentina", "Camila", "Isabella", "Sofía", "Lucía", "Daniela", "Gabriela", "Mariana",
  "Renata", "Antonella", "Martina", "Catalina", "Emilia", "Julia", "Paula", "Sara",
  "Elena", "Ana", "Carmen", "Rosa", "Patricia", "Silvia", "Carla", "Vanesa",
];
const APELLIDOS = [
  "García", "Rodríguez", "Gómez", "Martínez", "López", "Pérez", "González", "Hernández",
  "Torres", "Ramírez", "Vásquez", "Flores", "Rivera", "Aguilar", "Castillo", "Moreno",
  "Jiménez", "Ruiz", "Romero", "Mendoza", "Cruz", "Ortega", "Sánchez", "Herrera",
  "Medina", "Aguirre", "Vargas", "Castro", "Guzmán", "Ramos", "Reyes", "Navarro",
];

// ---------------------------------------------------------------------------
// PRNG determinista (mulberry32) — datos estables entre ejecuciones
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260202);
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const randChoice = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

// ---------------------------------------------------------------------------
// Cálculo de promedio final (réplica de src/lib/calculations.ts)
// ---------------------------------------------------------------------------

function calcularPromedio(notas: number[]): number | null {
  if (notas.length === 0) return null;
  return notas.reduce((a, b) => a + b, 0) / notas.length;
}

function calcularPromedioFinal(
  ac: number | null,
  ai: number | null,
  examen: number | null,
  recuperacion: number | null
): number | null {
  if (ac === null && ai === null && examen === null) return null;
  const pAC = PESOS.porcentajeAC / 100;
  const pAI = PESOS.porcentajeAI / 100;
  const pEx = PESOS.tieneExamen ? PESOS.porcentajeExamen / 100 : 0;
  const base = (ac ?? 0) * pAC + (ai ?? 0) * pAI + (examen ?? 0) * pEx;
  if (recuperacion !== null && recuperacion !== undefined) {
    return Math.min(NOTA_MAXIMA, base + recuperacion);
  }
  return Math.round(base * 100) / 100;
}

// Genera notas realistas con una "tendencia" del estudiante (5..10)
function generarNotas(tendencia: number, cantidad: number): number[] {
  return Array.from({ length: cantidad }, () => {
    const r = rand();
    const val = tendencia + (r - 0.5) * 3.5;
    return Math.max(0, Math.min(10, Math.round(val * 10) / 10));
  });
}

// ---------------------------------------------------------------------------
// Helpers de logging
// ---------------------------------------------------------------------------

function log(seccion: string, msg: string) {
  console.log(`[${seccion}] ${msg}`);
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  const inicio = Date.now();
  console.log("\n============================================================");
  console.log("  Seed: Instituto Educativo Las Colinas (escuela demo)");
  console.log("============================================================\n");

  // 1. Escuela --------------------------------------------------------------
  log("escuela", "Buscando/creando escuela demo...");
  let escuela = await prisma.escuela.findUnique({ where: { codigo: ESCUELA_CODIGO } });
  if (!escuela) {
    escuela = await prisma.escuela.create({ data: ESCUELA });
    log("escuela", `Creada: ${escuela.nombre} (${escuela.id})`);
  } else {
    escuela = await prisma.escuela.update({
      where: { id: escuela.id },
      data: { ...ESCUELA, activo: true },
    });
    log("escuela", `Actualizada: ${escuela.nombre} (${escuela.id})`);
  }
  const escuelaId = escuela.id;

  // 2. Configuración del sistema -------------------------------------------
  log("config", "Configurando sistema y fechas de trimestres...");
  await prisma.configuracionSistema.upsert({
    where: { escuelaId },
    create: {
      escuelaId,
      añoEscolar: AÑO,
      nombreDirectora: "María Fernanda Herrera López",
      umbralRecuperacion: 5.0,
      umbralCondicionado: 4.5,
      umbralAprobado: 6.5,
      notaMinima: 0.0,
      notaMaxima: 10.0,
      maxHistorialCelda: 10,
      usarIntervaloReprobado: true,
      usarIntervaloCondicionado: true,
      usarIntervaloAprobado: true,
      fechaInicioT1: new Date(`${AÑO}-02-02T00:00:00Z`),
      fechaFinT1: new Date(`${AÑO}-04-30T00:00:00Z`),
      fechaInicioT2: new Date(`${AÑO}-05-04T00:00:00Z`),
      fechaFinT2: new Date(`${AÑO}-08-08T00:00:00Z`),
      fechaInicioT3: new Date(`${AÑO}-08-10T00:00:00Z`),
      fechaFinT3: new Date(`${AÑO}-11-13T00:00:00Z`),
    },
    update: {
      añoEscolar: AÑO,
      nombreDirectora: "María Fernanda Herrera López",
      umbralRecuperacion: 5.0,
      umbralCondicionado: 4.5,
      umbralAprobado: 6.5,
      notaMinima: 0.0,
      notaMaxima: 10.0,
      maxHistorialCelda: 10,
      usarIntervaloReprobado: true,
      usarIntervaloCondicionado: true,
      usarIntervaloAprobado: true,
      fechaInicioT1: new Date(`${AÑO}-02-02T00:00:00Z`),
      fechaFinT1: new Date(`${AÑO}-04-30T00:00:00Z`),
      fechaInicioT2: new Date(`${AÑO}-05-04T00:00:00Z`),
      fechaFinT2: new Date(`${AÑO}-08-08T00:00:00Z`),
      fechaInicioT3: new Date(`${AÑO}-08-10T00:00:00Z`),
      fechaFinT3: new Date(`${AÑO}-11-13T00:00:00Z`),
    },
  });

  // 3. Usuarios -------------------------------------------------------------
  log("usuarios", "Creando/actualizando usuarios...");
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const usuariosDef: { nombre: string; email: string; rol: string }[] = [
    { nombre: "María Fernanda Herrera López", email: "directora@lascolinas.edu", rol: "admin-directora" },
    { nombre: "Carlos Alberto Vargas Aguilar", email: "codirectora@lascolinas.edu", rol: "admin-codirectora" },
    ...ORIENTADORES.map((o) => ({
      nombre: o.nombre,
      email: o.email,
      rol: "docente-orientador",
    })),
    ...ESPECIALISTAS.map((e) => ({
      nombre: e.nombre,
      email: e.email,
      rol: "docente",
    })),
  ];

  const usuarioIdByEmail = new Map<string, string>();
  for (const u of usuariosDef) {
    const existente = await prisma.usuario.findUnique({
      where: { email_escuelaId: { email: u.email, escuelaId } },
    });
    if (existente) {
      await prisma.usuario.update({
        where: { id: existente.id },
        data: { nombre: u.nombre, rol: u.rol, activo: true, password: hashedPassword },
      });
      usuarioIdByEmail.set(u.email, existente.id);
    } else {
      const created = await prisma.usuario.create({
        data: { email: u.email, nombre: u.nombre, rol: u.rol, password: hashedPassword, escuelaId },
      });
      usuarioIdByEmail.set(u.email, created.id);
    }
  }
  log("usuarios", `${usuariosDef.length} usuarios listos (password: "${DEFAULT_PASSWORD}")`);

  // 4. Grados + Materias + ConfigActividad ---------------------------------
  log("grados", "Recreando grados, materias y configuración...");

  // Limpiar grados existentes de la escuela demo (cascada borra materias, etc.)
  await prisma.grado.deleteMany({ where: { escuelaId } });

  const gradoIdByNum = new Map<number, string>();
  for (let num = 2; num <= 9; num++) {
    const grado = await prisma.grado.create({
      data: { numero: num, seccion: "A", año: AÑO, escuelaId },
    });
    gradoIdByNum.set(num, grado.id);

    const materias = MATERIAS_POR_CICLO[num] ?? [];
    for (const nombreMat of materias) {
      const materia = await prisma.materia.create({
        data: { nombre: nombreMat, gradoId: grado.id, escuelaId },
      });
      for (let t = 1; t <= 3; t++) {
        await prisma.configActividad.create({
          data: {
            materiaId: materia.id,
            escuelaId,
            trimestre: t,
            numActividadesCotidianas: 4,
            numActividadesIntegradoras: 1,
            tieneExamen: true,
            numExamenes: 1,
            porcentajeAC: 35.0,
            porcentajeAI: 35.0,
            porcentajeExamen: 30.0,
          },
        });
      }
    }
  }
  log("grados", "8 grados + materias + configs creados");

  // 5. Asignar docente orientador a cada grado ------------------------------
  log("docentes", "Asignando orientadores y especialistas...");
  for (const o of ORIENTADORES) {
    const gradoId = gradoIdByNum.get(o.grado);
    const userId = usuarioIdByEmail.get(o.email);
    if (gradoId && userId) {
      await prisma.grado.update({ where: { id: gradoId }, data: { docenteId: userId } });
    }
  }

  // Limpiar asignaciones previas y reasignar
  await prisma.docenteMateria.deleteMany({ where: { escuelaId } });

  // Orientadores: en primer/segundo ciclo (2-6) imparten TODAS las materias de su grado
  for (const o of ORIENTADORES) {
    const userId = usuarioIdByEmail.get(o.email)!;
    const gradoId = gradoIdByNum.get(o.grado)!;
    const materiasDelGrado = await prisma.materia.findMany({ where: { gradoId } });
    for (const m of materiasDelGrado) {
      await prisma.docenteMateria.create({
        data: { docenteId: userId, materiaId: m.id, escuelaId },
      });
    }
  }

  // Especialistas: imparten su materia en los grados indicados
  for (const e of ESPECIALISTAS) {
    const userId = usuarioIdByEmail.get(e.email)!;
    for (const am of e.materias) {
      const gradoId = gradoIdByNum.get(am.grado);
      if (!gradoId) continue;
      const materia = await prisma.materia.findFirst({
        where: { nombre: am.mat, gradoId, escuelaId },
      });
      if (materia) {
        // Evitar duplicado si el orientador ya la tenía (especialista la reemplaza)
        const existente = await prisma.docenteMateria.findUnique({
          where: { docenteId_materiaId: { docenteId: userId, materiaId: materia.id } },
        });
        if (!existente) {
          await prisma.docenteMateria.create({
            data: { docenteId: userId, materiaId: materia.id, escuelaId },
          });
        }
      }
    }
  }
  log("docentes", "Asignaciones DocenteMateria creadas");

  // 6. Estudiantes ----------------------------------------------------------
  log("estudiantes", "Creando estudiantes por grado...");
  const ESTUDIANTES_POR_GRADO = 18;
  const estudianteIdByGrado = new Map<number, string[]>();

  for (let num = 2; num <= 9; num++) {
    const gradoId = gradoIdByNum.get(num)!;
    const ids: string[] = [];
    for (let i = 0; i < ESTUDIANTES_POR_GRADO; i++) {
      const esMasculino = rand() < 0.5;
      const nombre = esMasculino ? randChoice(NOMBRES_M) : randChoice(NOMBRES_F);
      const apellido1 = randChoice(APELLIDOS);
      const apellido2 = randChoice(APELLIDOS);
      const numero = i + 1;
      const est = await prisma.estudiante.create({
        data: {
          numero,
          nombre: `${nombre} ${apellido1} ${apellido2}`,
          gradoId,
          escuelaId,
          orden: numero,
          activo: true,
        },
      });
      ids.push(est.id);
    }
    estudianteIdByGrado.set(num, ids);
  }
  log("estudiantes", `${ESTUDIANTES_POR_GRADO * 8} estudiantes creados`);

  // 7. Calificaciones + NotaActividad (createMany con IDs pre-generados) ----
  log("calificaciones", "Generando calificaciones (T1 completo, T2 parcial, T3 vacío)...");
  let totalCalificaciones = 0;
  let totalNotas = 0;
  let totalRecuperaciones = 0;

  const BATCH_SIZE = 500;
  const califsBatch: { id: string; estudianteId: string; materiaId: string; escuelaId: string; trimestre: number; calificacionAC: number | null; calificacionAI: number | null; examenTrimestral: number | null; promedioFinal: number | null; recuperacion: number | null }[] = [];
  const notasBatch: { id: string; calificacionId: string; escuelaId: string; tipo: string; numeroActividad: number; nota: number }[] = [];

  const flushBatches = async () => {
    for (let i = 0; i < califsBatch.length; i += BATCH_SIZE) {
      await prisma.calificacion.createMany({ data: califsBatch.slice(i, i + BATCH_SIZE), skipDuplicates: true });
    }
    for (let i = 0; i < notasBatch.length; i += BATCH_SIZE) {
      await prisma.notaActividad.createMany({ data: notasBatch.slice(i, i + BATCH_SIZE), skipDuplicates: true });
    }
    califsBatch.length = 0;
    notasBatch.length = 0;
  };

  for (let num = 2; num <= 9; num++) {
    const gradoId = gradoIdByNum.get(num)!;
    const materias = await prisma.materia.findMany({ where: { gradoId } });
    const estudiantes = estudianteIdByGrado.get(num)!;

    for (const estudianteId of estudiantes) {
      // Tendencia académica del estudiante (5.5 .. 9.5) — estable por estudiante
      const tendencia = 5.5 + rand() * 4.0;

      for (const materia of materias) {
        // --- Trimestre 1: COMPLETO ---
        const calT1Id = randomUUID();
        const notasAC = generarNotas(tendencia, 4);
        const notasAI = generarNotas(tendencia, 1);
        const examen = Math.max(0, Math.min(10, Math.round((tendencia + (rand() - 0.5) * 2) * 10) / 10));

        for (let k = 0; k < notasAC.length; k++) {
          notasBatch.push({ id: randomUUID(), calificacionId: calT1Id, escuelaId, tipo: "cotidiana", numeroActividad: k + 1, nota: notasAC[k] });
          totalNotas++;
        }
        for (let k = 0; k < notasAI.length; k++) {
          notasBatch.push({ id: randomUUID(), calificacionId: calT1Id, escuelaId, tipo: "integradora", numeroActividad: k + 1, nota: notasAI[k] });
          totalNotas++;
        }
        notasBatch.push({ id: randomUUID(), calificacionId: calT1Id, escuelaId, tipo: "examen", numeroActividad: 1, nota: examen });
        totalNotas++;

        const promAC = calcularPromedio(notasAC);
        const promAI = calcularPromedio(notasAI);
        const promFinalSinRec = calcularPromedioFinal(promAC, promAI, examen, null);

        // Recuperación: si promedio < 5.0, ~70% de los casos presenta recuperación
        let recuperacion: number | null = null;
        if (promFinalSinRec !== null && promFinalSinRec < 5.0 && rand() < 0.7) {
          recuperacion = Math.min(3, Math.max(0.5, Math.round((rand() * 2.5 + 0.5) * 10) / 10));
          totalRecuperaciones++;
        }
        const promFinalConRec = calcularPromedioFinal(promAC, promAI, examen, recuperacion);

        califsBatch.push({
          id: calT1Id,
          estudianteId,
          materiaId: materia.id,
          escuelaId,
          trimestre: 1,
          calificacionAC: promAC,
          calificacionAI: promAI,
          examenTrimestral: examen,
          promedioFinal: promFinalConRec,
          recuperacion,
        });
        totalCalificaciones++;

        // --- Trimestre 2: PARCIAL (~55%) — muestra estado "en progreso" ---
        if (rand() < 0.55) {
          const calT2Id = randomUUID();
          const numAC = randInt(2, 4);
          const numAI = rand() < 0.5 ? 1 : 0;
          const tieneExamen = rand() < 0.25;

          const notasAC2 = generarNotas(tendencia, numAC);
          const notasAI2 = numAI ? generarNotas(tendencia, numAI) : [];
          const examen2 = tieneExamen ? Math.max(0, Math.min(10, Math.round((tendencia + (rand() - 0.5) * 2) * 10) / 10)) : null;

          for (let k = 0; k < notasAC2.length; k++) {
            notasBatch.push({ id: randomUUID(), calificacionId: calT2Id, escuelaId, tipo: "cotidiana", numeroActividad: k + 1, nota: notasAC2[k] });
            totalNotas++;
          }
          for (let k = 0; k < notasAI2.length; k++) {
            notasBatch.push({ id: randomUUID(), calificacionId: calT2Id, escuelaId, tipo: "integradora", numeroActividad: k + 1, nota: notasAI2[k] });
            totalNotas++;
          }
          if (examen2 !== null) {
            notasBatch.push({ id: randomUUID(), calificacionId: calT2Id, escuelaId, tipo: "examen", numeroActividad: 1, nota: examen2 });
            totalNotas++;
          }

          const promAC2 = calcularPromedio(notasAC2);
          const promAI2 = calcularPromedio(notasAI2);
          const promFinal2 = calcularPromedioFinal(promAC2, promAI2, examen2, null);

          califsBatch.push({
            id: calT2Id,
            estudianteId,
            materiaId: materia.id,
            escuelaId,
            trimestre: 2,
            calificacionAC: promAC2,
            calificacionAI: promAI2,
            examenTrimestral: examen2,
            promedioFinal: promFinal2,
            recuperacion: null,
          });
          totalCalificaciones++;
        }

        // Flush periódico para no acumular demasiados en memoria
        if (califsBatch.length >= BATCH_SIZE) {
          await flushBatches();
        }

        // --- Trimestre 3: VACÍO (no se crea registro) ---
      }
    }
  }
  await flushBatches();
  log("calificaciones", `${totalCalificaciones} calificaciones, ${totalNotas} notas, ${totalRecuperaciones} recuperaciones`);

  // 8. Asistencia (createMany en batches) ----------------------------------
  log("asistencia", "Generando asistencia diaria del T1 (~30 días hábiles)...");
  let totalAsistencia = 0;
  const DIAS_T1 = 30;
  const fechaInicioT1 = new Date(`${AÑO}-02-02T00:00:00Z`);
  const asisBatch: { id: string; estudianteId: string; fecha: Date; estado: string; gradoId: string; escuelaId: string }[] = [];

  for (let num = 2; num <= 9; num++) {
    const gradoId = gradoIdByNum.get(num)!;
    const estudiantes = estudianteIdByGrado.get(num)!;

    let diasGenerados = 0;
    let diaOffset = 0;
    while (diasGenerados < DIAS_T1) {
      const fecha = new Date(fechaInicioT1);
      fecha.setUTCDate(fecha.getUTCDate() + diaOffset);
      const dow = fecha.getUTCDay(); // 0=dom, 6=sáb
      diaOffset++;
      if (dow === 0 || dow === 6) continue; // sólo días hábiles

      for (const estudianteId of estudiantes) {
        const r = rand();
        let estado: string;
        if (r < 0.93) estado = "presente";
        else if (r < 0.96) estado = "tarde";
        else if (r < 0.985) estado = "justificada";
        else estado = "ausente";

        asisBatch.push({ id: randomUUID(), estudianteId, fecha, estado, gradoId, escuelaId });
        totalAsistencia++;
      }
      diasGenerados++;
    }
  }

  for (let i = 0; i < asisBatch.length; i += BATCH_SIZE) {
    await prisma.asistencia.createMany({ data: asisBatch.slice(i, i + BATCH_SIZE), skipDuplicates: true });
  }
  log("asistencia", `${totalAsistencia} registros de asistencia`);

  // 9. Resumen --------------------------------------------------------------
  const duracionSeg = ((Date.now() - inicio) / 1000).toFixed(1);
  console.log("\n============================================================");
  console.log("  Seed completado en " + duracionSeg + "s");
  console.log("============================================================");
  console.log("  Escuela: " + escuela.nombre + " (codigo: " + escuela.codigo + ")");
  console.log("  Usuarios: " + usuariosDef.length + " (password: " + DEFAULT_PASSWORD + ")");
  console.log("  Grados: 8 (2° a 9°)");
  console.log("  Estudiantes: " + ESTUDIANTES_POR_GRADO * 8);
  console.log("  Calificaciones: " + totalCalificaciones);
  console.log("  Notas individuales: " + totalNotas);
  console.log("  Recuperaciones: " + totalRecuperaciones);
  console.log("  Asistencias: " + totalAsistencia);
  console.log("\n  Credenciales de acceso:");
  console.log("    Directora:    directora@lascolinas.edu / " + DEFAULT_PASSWORD);
  console.log("    Codirectora:  codirectora@lascolinas.edu / " + DEFAULT_PASSWORD);
  console.log("    Docente 2°:   docente.2@lascolinas.edu / " + DEFAULT_PASSWORD);
  console.log("    ... (docente.3 .. docente.9)");
  console.log("    Especialistas: especialista.<area>@lascolinas.edu / " + DEFAULT_PASSWORD);
  console.log("\n  Login: selecciona \"Instituto Educativo Las Colinas\" en el selector.");
  console.log("============================================================\n");
}

main()
  .catch((error) => {
    console.error("\n[seed] ERROR:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
