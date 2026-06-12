import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/api-middleware";
import { generateSecurePassword } from "@/lib/security";

// GET: Verificar si el sistema está inicializado (público, no requiere auth)
export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const usuariosExistentes = await sql`SELECT id FROM "Usuario" LIMIT 1`;
    return NextResponse.json({ initialized: usuariosExistentes.length > 0 });
  } catch (error: any) {
    console.error("[init/status] ERROR:", error.message);
    return NextResponse.json({ initialized: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Endpoint deshabilitado en producción" },
      { status: 403 }
    );
  }

  const sql = neon(process.env.DATABASE_URL!);

  // Permitir init sin admin solo si no hay usuarios en el sistema
  const usuariosExistentes = await sql`SELECT id FROM "Usuario" LIMIT 1`;
  if (usuariosExistentes.length > 0) {
    const { error: authError } = await requireAdmin();
    if (authError) return authError;
  }

  try {
    // Paso 1: Crear escuela por defecto
    console.log("[init] Paso 1: Crear escuela por defecto...");
    const escuelaResult = await sql`
      INSERT INTO "Escuela" (id, nombre, codigo, direccion, distrito, tipo, "planEstudio", "escalaNotas", periodos, "colorPrimario", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, 'Centro Escolar Católico San José de la Montaña', 'CEC-SJM', 'San Salvador', 'San Salvador', 'religioso', 'catolico', '0-10', 'trimestres', '#1a3a2a', NOW(), NOW())
      RETURNING id
    `;
    const escuelaId = escuelaResult[0].id;

    // Paso 2: Asegurar grados para esta escuela
    console.log("[init] Paso 2: Asegurar grados...");
    for (let numero = 2; numero <= 9; numero++) {
      const existing = await sql`SELECT id FROM "Grado" WHERE numero = ${numero} AND "escuelaId" = ${escuelaId} LIMIT 1`;
      if (existing.length === 0) {
        await sql`INSERT INTO "Grado" (id, numero, seccion, año, "escuelaId", "createdAt", "updatedAt") VALUES (${randomUUID()}, ${numero}, 'A', 2026, ${escuelaId}, NOW(), NOW())`;
      }
    }

    console.log("[init] Paso 3: Crear materias...");
    const grados = await sql`SELECT * FROM "Grado" WHERE "escuelaId" = ${escuelaId}`;
    const getGradoId = (num: number) => grados.find((g: any) => g.numero === num)?.id;

    const asegurarMateria = async (nombre: string, numGrado: number) => {
      const gradoId = getGradoId(numGrado);
      if (!gradoId) return null;
      
      const existing = await sql`SELECT id FROM "Materia" WHERE nombre = ${nombre} AND "gradoId" = ${gradoId} AND "escuelaId" = ${escuelaId} LIMIT 1`;
      if (existing.length > 0) return existing[0];

      const materiaId = randomUUID();
      await sql`INSERT INTO "Materia" (id, nombre, "gradoId", "escuelaId", "createdAt", "updatedAt") VALUES (${materiaId}, ${nombre}, ${gradoId}, ${escuelaId}, NOW(), NOW())`;

      for (let t = 1; t <= 3; t++) {
        const existingCfg = await sql`SELECT id FROM "ConfigActividad" WHERE "materiaId" = ${materiaId} AND trimestre = ${t} LIMIT 1`;
        if (existingCfg.length === 0) {
          await sql`INSERT INTO "ConfigActividad" (id, "materiaId", "escuelaId", trimestre, "numActividadesCotidianas", "numActividadesIntegradoras", "tieneExamen", "porcentajeAC", "porcentajeAI", "porcentajeExamen") VALUES (${randomUUID()}, ${materiaId}, ${escuelaId}, ${t}, 4, 1, true, 35.0, 35.0, 30.0)`;
        }
      }
      return { id: materiaId, nombre, gradoId };
    };

    console.log("[init] Paso 4: Usuarios...");
    const users = [
      { nombre: "Administrador General", email: "admin@sistema.edu", rol: "superadmin", materias: [] },
      { nombre: "Administrador CEC", email: "admin@cecsjm.edu.sv", rol: "admin", materias: [] },
      { nombre: "Mónica Lissette Tobar Gómez", email: "monica.tobar@cecsjm.edu.sv", rol: "admin", materias: [] },
      { nombre: "Claudia Jasmin Arce Castillo", email: "claudia.arce@cecsjm.edu.sv", rol: "admin", materias: [] },
      { nombre: "Yessenia del Carmen Villafuerte Mejía", email: "yessenia.villafuerte@cecsjm.edu.sv", rol: "docente", materias: [{ grado: 6, mat: "Aritmética y Finanzas" }, { grado: 7, mat: "Matemática y Datos" }, { grado: 8, mat: "Matemática y Datos" }, { grado: 9, mat: "Matemática y Datos" }] },
      { nombre: "Mónica Gissel Montesino Najarro", email: "monica.montesino@cecsjm.edu.sv", rol: "docente", materias: [{ grado: 2, mat: "Desarrollo Corporal" }, { grado: 3, mat: "Desarrollo Corporal" }, { grado: 4, mat: "Desarrollo Corporal" }, { grado: 5, mat: "Desarrollo Corporal" }, { grado: 6, mat: "Desarrollo Corporal" }, { grado: 7, mat: "Educación Física y Deportes" }, { grado: 8, mat: "Educación Física y Deportes" }, { grado: 9, mat: "Educación Física y Deportes" }] },
      { nombre: "Jaqueline Lissette Landaverde de Gómez", email: "jaqueline.landaverde@cecsjm.edu.sv", rol: "docente", materias: [{ grado: 6, mat: "Ciencia y Tecnología" }, { grado: 7, mat: "Ciencia y Tecnología" }, { grado: 8, mat: "Ciencia y Tecnología" }, { grado: 9, mat: "Ciencia y Tecnología" }] },
      { nombre: "Ana del Carmen Romero González", email: "ana.romero@cecsjm.edu.sv", rol: "docente", materias: [{ grado: 6, mat: "Ciudadanía y Valores" }, { grado: 7, mat: "Ciudadanía y Valores" }, { grado: 8, mat: "Ciudadanía y Valores" }, { grado: 9, mat: "Ciudadanía y Valores" }] },
      { nombre: "Yency Yesenia Mejía Nerio", email: "yency.mejia@cecsjm.edu.sv", rol: "docente", tutorGrado: 3, materias: [{ grado: 3, mat: "Comunicación" }, { grado: 3, mat: "Números y Formas" }, { grado: 3, mat: "Ciudadanía y Valores" }, { grado: 3, mat: "Ciencia y Tecnología" }] },
      { nombre: "Silverio Mónico Mulato", email: "silverio.mulato@cecsjm.edu.sv", rol: "docente", tutorGrado: 4, materias: [{ grado: 4, mat: "Comunicación y Literatura" }, { grado: 4, mat: "Aritmética y Finanzas" }, { grado: 4, mat: "Ciudadanía y Valores" }, { grado: 4, mat: "Ciencia y Tecnología" }] },
      { nombre: "Emilia Etel Peraza", email: "emilia.peraza@cecsjm.edu.sv", rol: "docente", tutorGrado: 5, materias: [{ grado: 5, mat: "Comunicación y Literatura" }, { grado: 5, mat: "Aritmética y Finanzas" }, { grado: 5, mat: "Ciudadanía y Valores" }, { grado: 5, mat: "Ciencia y Tecnología" }] },
      { nombre: "Deysi Elizabeth Umanzor Cruz", email: "deysi.umanzor@cecsjm.edu.sv", rol: "docente", tutorGrado: 2, materias: [{ grado: 2, mat: "Comunicación" }, { grado: 2, mat: "Números y Formas" }, { grado: 2, mat: "Ciudadanía y Valores" }, { grado: 2, mat: "Ciencia y Tecnología" }] },
      { nombre: "Helen Alicia Cabezas de Golcher", email: "helen.cabezas@cecsjm.edu.sv", rol: "docente", materias: [{ grado: 2, mat: "Educación en la Fe" }, { grado: 3, mat: "Educación en la Fe" }, { grado: 4, mat: "Educación en la Fe" }, { grado: 5, mat: "Educación en la Fe" }, { grado: 6, mat: "Educación en la Fe" }, { grado: 7, mat: "Educación en la Fe" }, { grado: 8, mat: "Educación en la Fe" }, { grado: 9, mat: "Educación en la Fe" }] },
      { nombre: "Diana Nicole Rojas Urias", email: "diana.rojas@cecsjm.edu.sv", rol: "docente", materias: [{ grado: 2, mat: "Artes" }, { grado: 3, mat: "Artes" }, { grado: 7, mat: "Inglés" }, { grado: 8, mat: "Inglés" }, { grado: 9, mat: "Inglés" }] },
    ];

    const generatedPasswords: { email: string; password: string }[] = [];

    for (const u of users) {
      const existing = await sql`SELECT id FROM "Usuario" WHERE email = ${u.email} AND "escuelaId" = ${escuelaId} LIMIT 1`;
      let userId: string;
      
      if (existing.length > 0) {
        userId = existing[0].id;
        await sql`UPDATE "Usuario" SET nombre = ${u.nombre}, rol = ${u.rol}, "updatedAt" = NOW() WHERE id = ${userId}`;
      } else {
        userId = randomUUID();
        const tempPassword = generateSecurePassword(16);
        generatedPasswords.push({ email: u.email, password: tempPassword });
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        await sql`INSERT INTO "Usuario" (id, email, password, nombre, rol, "escuelaId", activo, "createdAt", "updatedAt") VALUES (${userId}, ${u.email}, ${hashedPassword}, ${u.nombre}, ${u.rol}, ${escuelaId}, true, NOW(), NOW())`;
      }

      if (u.tutorGrado) {
        const gradoId = getGradoId(u.tutorGrado);
        if (gradoId) {
          await sql`UPDATE "Grado" SET "docenteId" = ${userId} WHERE id = ${gradoId}`;
        }
      }

      for (const mat of u.materias) {
        const materiaRecord = await asegurarMateria(mat.mat, mat.grado);
        if (materiaRecord) {
          const existingAsig = await sql`SELECT id FROM "DocenteMateria" WHERE "docenteId" = ${userId} AND "materiaId" = ${materiaRecord.id} LIMIT 1`;
          if (existingAsig.length === 0) {
            await sql`INSERT INTO "DocenteMateria" (id, "docenteId", "materiaId", "escuelaId") VALUES (${randomUUID()}, ${userId}, ${materiaRecord.id}, ${escuelaId})`;
          }
        }
      }
    }

    console.log("[init] Paso 5: Configuración...");
    const cfg = await sql`SELECT id FROM "ConfiguracionSistema" WHERE "escuelaId" = ${escuelaId} LIMIT 1`;
    if (cfg.length === 0) {
      await sql`INSERT INTO "ConfiguracionSistema" (id, "escuelaId", "añoEscolar") VALUES (${randomUUID()}, ${escuelaId}, 2026)`;
    }

    console.log("[init] Completado");
    return NextResponse.json({ 
      message: "Sistema cargado exitosamente. Las contraseñas temporales han sido generadas.",
      count: users.length,
      escuelaId,
      generatedPasswords: process.env.NODE_ENV === "development" ? generatedPasswords : undefined
    });
  } catch (error: any) {
    console.error("[init] ERROR:", error.message);
    console.error("[init] Stack:", error.stack);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
