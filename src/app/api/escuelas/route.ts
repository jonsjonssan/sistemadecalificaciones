import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireAdmin } from "@/lib/api-middleware";

// GET: Listar todas las escuelas (público para login)
export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const escuelas = await sql`
      SELECT id, nombre, codigo, tipo, logo, colorPrimario, activo
      FROM "Escuela"
      WHERE activo = true
      ORDER BY nombre ASC
    `;
    return NextResponse.json({ escuelas });
  } catch (error: any) {
    console.error("[escuelas] ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Crear nueva escuela (solo superadmin)
export async function POST(req: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const sql = neon(process.env.DATABASE_URL!);
  const body = await req.json();
  const { nombre, codigo, direccion, distrito, tipo, planEstudio, escalaNotas, periodos, logo, colorPrimario } = body;

  try {
    const result = await sql`
      INSERT INTO "Escuela" (id, nombre, codigo, direccion, distrito, tipo, "planEstudio", "escalaNotas", periodos, logo, "colorPrimario", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${nombre}, ${codigo || null}, ${direccion || null}, ${distrito || null}, ${tipo || 'publico'}, ${planEstudio || 'general'}, ${escalaNotas || '0-10'}, ${periodos || 'trimestres'}, ${logo || null}, ${colorPrimario || '#1a3a2a'}, NOW(), NOW())
      RETURNING id, nombre, codigo
    `;
    return NextResponse.json({ escuela: result[0] });
  } catch (error: any) {
    console.error("[escuelas/POST] ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
