import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireSession } from "@/lib/api-middleware";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

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

// POST: Crear nueva escuela (SOLO superadmin)
export async function POST(req: Request) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  if (session.rol !== "superadmin") {
    return NextResponse.json({ error: "Solo el superadministrador puede crear escuelas" }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const body = await req.json();
  const { nombre, codigo, direccion, distrito, tipo, planEstudio, escalaNotas, periodos, logo, colorPrimario, adminEmail, adminPassword, adminNombre } = body;

  if (!nombre || !codigo) {
    return NextResponse.json({ error: "Nombre y codigo son requeridos" }, { status: 400 });
  }

  if (!adminEmail || !adminPassword || !adminNombre) {
    return NextResponse.json({ error: "Datos del admin inicial son requeridos (adminEmail, adminPassword, adminNombre)" }, { status: 400 });
  }

  try {
    const escuelaResult = await sql`
      INSERT INTO "Escuela" (id, nombre, codigo, direccion, distrito, tipo, "planEstudio", "escalaNotas", periodos, logo, "colorPrimario", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${nombre}, ${codigo}, ${direccion || null}, ${distrito || null}, ${tipo || 'publico'}, ${planEstudio || 'general'}, ${escalaNotas || '0-10'}, ${periodos || 'trimestres'}, ${logo || null}, ${colorPrimario || '#1E3A8A'}, NOW(), NOW())
      RETURNING id, nombre, codigo
    `;

    const nuevaEscuela = escuelaResult[0];

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminId = randomUUID();

    await sql`
      INSERT INTO "Usuario" (id, email, password, nombre, rol, "escuelaId", provider, "createdAt", "updatedAt")
      VALUES (${adminId}, ${adminEmail}, ${hashedPassword}, ${adminNombre}, 'admin', ${nuevaEscuela.id}, 'credentials', NOW(), NOW())
    `;

    const configId = randomUUID();
    await sql`
      INSERT INTO "ConfiguracionSistema" (id, "escuelaId", "añoEscolar", "nombreDirectora", "umbralCondicionado", "umbralAprobado")
      VALUES (${configId}, ${nuevaEscuela.id}, ${new Date().getFullYear() + 1}, ${adminNombre}, 4.50, 6.50)
    `;

    return NextResponse.json({
      escuela: nuevaEscuela,
      admin: { id: adminId, email: adminEmail, nombre: adminNombre, rol: 'admin' },
      message: "Escuela creada con admin inicial y configuración por defecto"
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
