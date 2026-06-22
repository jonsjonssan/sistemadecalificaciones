import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireSession } from "@/lib/api-middleware";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import {
  UMBRAL_APROBADO_DEFAULT,
  UMBRAL_CONDICIONADO_DEFAULT,
  UMBRAL_RECUPERACION_DEFAULT,
  MAX_HISTORIAL_CELDA_DEFAULT,
  CANTIDAD_TRIMESTRES,
} from "@/lib/constants";

// GET: Listar todas las escuelas (público para login)
export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const escuelas = await sql`
      SELECT id, nombre, codigo, tipo, logo, "colorPrimario", activo,
             (SELECT COUNT(*) FROM "Usuario" u WHERE u."escuelaId" = "Escuela".id) as usuarios_count,
             (SELECT COUNT(*) FROM "Grado" g WHERE g."escuelaId" = "Escuela".id) as grados_count,
             (SELECT COUNT(*) FROM "Estudiante" e WHERE e."escuelaId" = "Escuela".id) as estudiantes_count
      FROM "Escuela"
      ORDER BY nombre ASC
    `;
    return NextResponse.json({ escuelas });
  } catch (error: any) {
    console.error("[escuelas] ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function clonarConfiguracionEscuela(escuelaPlantillaId: string, nuevaEscuelaId: string, año: number, nombreDirectora: string): Promise<{ clonado: boolean; camposClonados: string[] }> {
  const configPlantilla = await db.configuracionSistema.findFirst({
    where: { escuelaId: escuelaPlantillaId },
  });

  if (!configPlantilla) {
    return { clonado: false, camposClonados: [] };
  }

  const camposClonados: string[] = [];

  const configId = randomUUID();
  await db.configuracionSistema.create({
    data: {
      id: configId,
      escuelaId: nuevaEscuelaId,
      añoEscolar: año,
      nombreDirectora: nombreDirectora || configPlantilla.nombreDirectora || null,
      umbralRecuperacion: configPlantilla.umbralRecuperacion ?? UMBRAL_RECUPERACION_DEFAULT,
      umbralCondicionado: configPlantilla.umbralCondicionado ?? UMBRAL_CONDICIONADO_DEFAULT,
      umbralAprobado: configPlantilla.umbralAprobado ?? UMBRAL_APROBADO_DEFAULT,
      notaMinima: configPlantilla.notaMinima ?? 0.0,
      notaMaxima: configPlantilla.notaMaxima ?? 10.0,
      maxHistorialCelda: configPlantilla.maxHistorialCelda ?? MAX_HISTORIAL_CELDA_DEFAULT,
      usarIntervaloReprobado: configPlantilla.usarIntervaloReprobado ?? true,
      usarIntervaloCondicionado: configPlantilla.usarIntervaloCondicionado ?? true,
      usarIntervaloAprobado: configPlantilla.usarIntervaloAprobado ?? true,
      fechaInicioT1: configPlantilla.fechaInicioT1,
      fechaFinT1: configPlantilla.fechaFinT1,
      fechaInicioT2: configPlantilla.fechaInicioT2,
      fechaFinT2: configPlantilla.fechaFinT2,
      fechaInicioT3: configPlantilla.fechaInicioT3,
      fechaFinT3: configPlantilla.fechaFinT3,
    },
  });

  if (configPlantilla.umbralRecuperacion != null) camposClonados.push("umbralRecuperacion");
  if (configPlantilla.umbralCondicionado != null) camposClonados.push("umbralCondicionado");
  if (configPlantilla.umbralAprobado != null) camposClonados.push("umbralAprobado");
  if (configPlantilla.notaMinima != null) camposClonados.push("notaMinima");
  if (configPlantilla.notaMaxima != null) camposClonados.push("notaMaxima");
  if (configPlantilla.maxHistorialCelda != null) camposClonados.push("maxHistorialCelda");
  if (configPlantilla.usarIntervaloReprobado != null) camposClonados.push("usarIntervaloReprobado");
  if (configPlantilla.usarIntervaloCondicionado != null) camposClonados.push("usarIntervaloCondicionado");
  if (configPlantilla.usarIntervaloAprobado != null) camposClonados.push("usarIntervaloAprobado");
  if (configPlantilla.fechaInicioT1 != null) camposClonados.push("fechasTrimestres");

  return { clonado: true, camposClonados };
}

async function encontrarEscuelaPlantilla(cloneFromEscuelaId?: string): Promise<string | null> {
  if (cloneFromEscuelaId) {
    const escuela = await db.escuela.findUnique({ where: { id: cloneFromEscuelaId } });
    if (escuela) return escuela.id;
  }

  const todasEscuelas = await db.escuela.findMany({
    where: { activo: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, nombre: true },
  });

  const sanJose = todasEscuelas.find((e) =>
    e.nombre.toLowerCase().includes("san jos") || e.nombre.toLowerCase().includes("san jose")
  );
  if (sanJose) return sanJose.id;

  if (todasEscuelas.length > 0) return todasEscuelas[0].id;

  return null;
}

// POST: Crear nueva escuela (SOLO superadmin)
export async function POST(req: Request) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  if (session.rol !== "superadmin") {
    return NextResponse.json({ error: "Solo el superadministrador puede crear escuelas" }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const body = await req.json();
  const { nombre, codigo, direccion, distrito, tipo, planEstudio, escalaNotas, periodos, logo, colorPrimario, adminEmail, adminPassword, adminNombre, cloneFromEscuelaId } = body;

  if (!nombre || !codigo) {
    return NextResponse.json({ error: "Nombre y codigo son requeridos" }, { status: 400 });
  }

  if (!adminEmail || !adminPassword || !adminNombre) {
    return NextResponse.json({ error: "Datos del admin inicial son requeridos (adminEmail, adminPassword, adminNombre)" }, { status: 400 });
  }

  try {
    const añoEscolar = new Date().getFullYear() + 1;

    const escuelaResult = await sql`
      INSERT INTO "Escuela" (id, nombre, codigo, direccion, distrito, tipo, "planEstudio", "escalaNotas", periodos, logo, "colorPrimario", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${nombre}, ${codigo}, ${direccion || null}, ${distrito || null}, ${tipo || 'publico'}, ${planEstudio || 'general'}, ${escalaNotas || '0-10'}, ${periodos || 'trimestres'}, ${logo || null}, ${colorPrimario || '#1a3a2a'}, NOW(), NOW())
      RETURNING id, nombre, codigo
    `;

    const nuevaEscuela = escuelaResult[0];

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminId = randomUUID();

    await sql`
      INSERT INTO "Usuario" (id, email, password, nombre, rol, "escuelaId", provider, "createdAt", "updatedAt")
      VALUES (${adminId}, ${adminEmail}, ${hashedPassword}, ${adminNombre}, 'admin', ${nuevaEscuela.id}, 'credentials', NOW(), NOW())
    `;

    // Clonar la configuración del sistema (lógica y procesos) de la escuela plantilla
    // Esto incluye umbrales, fechas de trimestres, flags de intervalos, etc.
    // NO clona grados/materias porque cada escuela configura los suyos propios.
    const plantillaId = await encontrarEscuelaPlantilla(cloneFromEscuelaId);
    let clonacion = { clonado: false, camposClonados: [] as string[], escuelaPlantilla: null as string | null };

    if (plantillaId && plantillaId !== nuevaEscuela.id) {
      const resultado = await clonarConfiguracionEscuela(plantillaId, nuevaEscuela.id, añoEscolar, adminNombre);
      clonacion = { ...resultado, escuelaPlantilla: plantillaId };
    }

    // Si no se clonó (no hay plantilla o no tenía config), crear config con defaults
    if (!clonacion.clonado) {
      const configId = randomUUID();
      await db.configuracionSistema.create({
        data: {
          id: configId,
          escuelaId: nuevaEscuela.id,
          añoEscolar: añoEscolar,
          nombreDirectora: adminNombre,
          umbralRecuperacion: UMBRAL_RECUPERACION_DEFAULT,
          umbralCondicionado: UMBRAL_CONDICIONADO_DEFAULT,
          umbralAprobado: UMBRAL_APROBADO_DEFAULT,
          notaMinima: 0.0,
          notaMaxima: 10.0,
          maxHistorialCelda: MAX_HISTORIAL_CELDA_DEFAULT,
          usarIntervaloReprobado: true,
          usarIntervaloCondicionado: true,
          usarIntervaloAprobado: true,
        },
      });
    }

    return NextResponse.json({
      escuela: nuevaEscuela,
      admin: { id: adminId, email: adminEmail, nombre: adminNombre, rol: 'admin' },
      clonacion: {
        configuracionClonada: clonacion.clonado,
        camposClonados: clonacion.camposClonados,
        escuelaPlantillaId: clonacion.escuelaPlantilla,
        trimestrePorDefecto: CANTIDAD_TRIMESTRES,
      },
      message: clonacion.clonado
        ? `Escuela creada. Configuración del sistema clonada (${clonacion.camposClonados.length} parámetros): ${clonacion.camposClonados.join(", ")}. Los grados y materias se configuran manualmente.`
        : "Escuela creada con admin inicial y configuración por defecto. Los grados y materias se configuran manualmente."
    });
  } catch (error: any) {
    console.error("[escuelas/POST] ERROR:", error.message);
    if (error.message?.includes("codigo_unique") || error.message?.includes("duplicate")) {
      return NextResponse.json({ error: "El codigo de escuela ya existe" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Editar escuela (SOLO superadmin)
export async function PUT(req: Request) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  if (session.rol !== "superadmin") {
    return NextResponse.json({ error: "Solo el superadministrador puede editar escuelas" }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const body = await req.json();
  const { id, nombre, codigo, direccion, distrito, tipo, planEstudio, escalaNotas, periodos, logo, colorPrimario, activo } = body;

  if (!id) {
    return NextResponse.json({ error: "ID de escuela requerido" }, { status: 400 });
  }

  try {
    const result = await sql`
      UPDATE "Escuela" SET
        nombre = COALESCE(${nombre || null}, nombre),
        codigo = COALESCE(${codigo || null}, codigo),
        direccion = COALESCE(${direccion || null}, direccion),
        distrito = COALESCE(${distrito || null}, distrito),
        tipo = COALESCE(${tipo || null}, tipo),
        "planEstudio" = COALESCE(${planEstudio || null}, "planEstudio"),
        "escalaNotas" = COALESCE(${escalaNotas || null}, "escalaNotas"),
        periodos = COALESCE(${periodos || null}, periodos),
        logo = COALESCE(${logo || null}, logo),
        "colorPrimario" = COALESCE(${colorPrimario || null}, "colorPrimario"),
        activo = COALESCE(${activo !== undefined ? activo : null}, activo),
        "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING id, nombre, codigo, activo
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Escuela no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ escuela: result[0] });
  } catch (error: any) {
    console.error("[escuelas/PUT] ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Desactivar escuela (SOLO superadmin, soft delete)
export async function DELETE(req: Request) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  if (session.rol !== "superadmin") {
    return NextResponse.json({ error: "Solo el superadministrador puede eliminar escuelas" }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID de escuela requerido" }, { status: 400 });
  }

  if (id === session.escuelaId) {
    return NextResponse.json({ error: "No puedes eliminar tu propia escuela" }, { status: 400 });
  }

  try {
    const result = await sql`
      UPDATE "Escuela" SET activo = false, "updatedAt" = NOW()
      WHERE id = ${id} AND activo = true
      RETURNING id, nombre
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Escuela no encontrada o ya inactiva" }, { status: 404 });
    }

    return NextResponse.json({ message: "Escuela desactivada", escuela: result[0] });
  } catch (error: any) {
    console.error("[escuelas/DELETE] ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
