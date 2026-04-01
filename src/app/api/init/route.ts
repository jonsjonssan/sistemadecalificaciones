import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";

export async function POST() {
  const sql = neon(process.env.DATABASE_URL!);

  try {
    console.log("[init] Paso 1: Asegurar grados...");
    for (let numero = 2; numero <= 9; numero++) {
      const existing = await sql`SELECT id FROM "Grado" WHERE numero = ${numero} LIMIT 1`;
      if (existing.length === 0) {
        await sql`INSERT INTO "Grado" (id, numero, seccion, año, "createdAt", "updatedAt") VALUES (${randomUUID()}, ${numero}, 'A', 2026, NOW(), NOW())`;
      }
    }

    console.log("[init] Paso 2: Crear materias...");
    const grados = await sql`SELECT * FROM "Grado"`;
    const getGradoId = (num: number) => grados.find((g: any) => g.numero === num)?.id;

    const asegurarMateria = async (nombre: string, numGrado: number) => {
      const gradoId = getGradoId(numGrado);
      if (!gradoId) return null;
      
      const existing = await sql`SELECT id FROM "Materia" WHERE nombre = ${nombre} AND "gradoId" = ${gradoId} LIMIT 1`;
      if (existing.length > 0) return existing[0];

      const materiaId = randomUUID();
      await sql`INSERT INTO "Materia" (id, nombre, "gradoId", "createdAt", "updatedAt") VALUES (${materiaId}, ${nombre}, ${gradoId}, NOW(), NOW())`;

      for (let t = 1; t <= 3; t++) {
        const existingCfg = await sql`SELECT id FROM "ConfigActividad" WHERE "materiaId" = ${materiaId} AND trimestre = ${t} LIMIT 1`;
        if (existingCfg.length === 0) {
          await sql`INSERT INTO "ConfigActividad" (id, "materiaId", trimestre, "numActividadesCotidianas", "numActividadesIntegradoras", "tieneExamen", "porcentajeAC", "porcentajeAI", "porcentajeExamen") VALUES (${randomUUID()}, ${materiaId}, ${t}, 4, 1, true, 35.0, 35.0, 30.0)`;
        }
      }
      return { id: materiaId, nombre, gradoId };
    };

    console.log("[init] Paso 3: Usuarios...");
    const users = [
      { nombre: "Administrador General", email: "jonathan.araujo.mendoza@clases.edu.sv", password: "admin", rol: "admin", materias: [] },
      { nombre: "Mónica Lissette Tobar Gómez", email: "monica.lissette.tobar@clases.edu.sv", password: "admin123", rol: "admin", materias: [] },
      { nombre: "Claudia Jasmin Arce Castillo", email: "claudia.jasmin.arce@clases.edu.sv", password: "admin123", rol: "admin", materias: [] },
      { nombre: "Yessenia del Carmen Villafuerte Mejía", email: "yessenia.carmen.villafuerte@clases.edu.sv", password: "docente123", rol: "docente", materias: [{ grado: 6, mat: "Aritmética y Finanzas" }, { grado: 7, mat: "Matemática y Datos" }, { grado: 8, mat: "Matemática y Datos" }, { grado: 9, mat: "Matemática y Datos" }] },
      { nombre: "Mónica Gissel Montesino Najarro", email: "monica.montesino.najarro@clases.edu.sv", password: "docente123", rol: "docente", materias: [{ grado: 2, mat: "Desarrollo Corporal" }, { grado: 3, mat: "Desarrollo Corporal" }, { grado: 4, mat: "Desarrollo Corporal" }, { grado: 5, mat: "Desarrollo Corporal" }, { grado: 6, mat: "Desarrollo Corporal" }, { grado: 7, mat: "Educación Física y Deportes" }, { grado: 8, mat: "Educación Física y Deportes" }, { grado: 9, mat: "Educación Física y Deportes" }] },
      { nombre: "Jaqueline Lissette Landaverde de Gómez", email: "jaqueline.lissette.landaverde@clases.edu.sv", password: "docente123", rol: "docente", materias: [{ grado: 6, mat: "Ciencia y Tecnología" }, { grado: 7, mat: "Ciencia y Tecnología" }, { grado: 8, mat: "Ciencia y Tecnología" }, { grado: 9, mat: "Ciencia y Tecnología" }] },
      { nombre: "Ana del Carmen Romero González", email: "ana.carmen.romero@clases.edu.sv", password: "docente123", rol: "docente", materias: [{ grado: 6, mat: "Ciudadanía y Valores" }, { grado: 7, mat: "Ciudadanía y Valores" }, { grado: 8, mat: "Ciudadanía y Valores" }, { grado: 9, mat: "Ciudadanía y Valores" }] },
      { nombre: "Yency Yesenia Mejía Nerio", email: "04876579-1@clases.edu.sv", password: "docente123", rol: "docente", tutorGrado: 3, materias: [{ grado: 3, mat: "Comunicación y Literatura" }, { grado: 3, mat: "Números y Formas" }, { grado: 3, mat: "Ciudadanía y Valores" }, { grado: 3, mat: "Ciencia y Tecnología" }] },
      { nombre: "Silverio Mónico Mulato", email: "silverio.silverio.monico@clases.edu.sv", password: "docente123", rol: "docente", tutorGrado: 4, materias: [{ grado: 4, mat: "Comunicación y Literatura" }, { grado: 4, mat: "Aritmética y Finanzas" }, { grado: 4, mat: "Ciudadanía y Valores" }, { grado: 4, mat: "Ciencia y Tecnología" }] },
      { nombre: "Emilia Etel Peraza", email: "emilia.peraza.publicos698@clases.edu.sv", password: "docente123", rol: "docente", tutorGrado: 5, materias: [{ grado: 5, mat: "Comunicación y Literatura" }, { grado: 5, mat: "Aritmética y Finanzas" }, { grado: 5, mat: "Ciudadanía y Valores" }, { grado: 5, mat: "Ciencia y Tecnología" }] },
      { nombre: "Deysi Elizabeth Umanzor Cruz", email: "deysi.elizabeth.umanzor@clases.edu.sv", password: "docente123", rol: "docente", tutorGrado: 2, materias: [{ grado: 2, mat: "Comunicación y Literatura" }, { grado: 2, mat: "Números y Formas" }, { grado: 2, mat: "Ciudadanía y Valores" }, { grado: 2, mat: "Ciencia y Tecnología" }] },
      { nombre: "Helen Alicia Cabezas de Golcher", email: "03533849-6@clases.edu.sv", password: "docente123", rol: "docente", materias: [{ grado: 2, mat: "Educación en la Fe" }, { grado: 3, mat: "Educación en la Fe" }, { grado: 4, mat: "Educación en la Fe" }, { grado: 5, mat: "Educación en la Fe" }, { grado: 6, mat: "Educación en la Fe" }, { grado: 7, mat: "Educación en la Fe" }, { grado: 8, mat: "Educación en la Fe" }, { grado: 9, mat: "Educación en la Fe" }] },
      { nombre: "Diana Nicole Rojas Urias", email: "05980194-0@clases.edu.sv", password: "docente123", rol: "docente", materias: [{ grado: 2, mat: "Artes" }, { grado: 3, mat: "Artes" }, { grado: 7, mat: "Inglés" }, { grado: 8, mat: "Inglés" }, { grado: 9, mat: "Inglés" }] },
    ];

    for (const u of users) {
      const existing = await sql`SELECT id FROM "Usuario" WHERE email = ${u.email} LIMIT 1`;
      let userId: string;
      
      if (existing.length > 0) {
        userId = existing[0].id;
        await sql`UPDATE "Usuario" SET nombre = ${u.nombre}, rol = ${u.rol}, password = ${u.password}, "updatedAt" = NOW() WHERE id = ${userId}`;
      } else {
        userId = randomUUID();
        await sql`INSERT INTO "Usuario" (id, email, password, nombre, rol, activo, "createdAt", "updatedAt") VALUES (${userId}, ${u.email}, ${u.password}, ${u.nombre}, ${u.rol}, true, NOW(), NOW())`;
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
            await sql`INSERT INTO "DocenteMateria" (id, "docenteId", "materiaId") VALUES (${randomUUID()}, ${userId}, ${materiaRecord.id})`;
          }
        }
      }
    }

    console.log("[init] Paso 4: Configuración...");
    const cfg = await sql`SELECT id FROM "ConfiguracionSistema" LIMIT 1`;
    if (cfg.length === 0) {
      await sql`INSERT INTO "ConfiguracionSistema" (id, "añoEscolar", escuela) VALUES (${randomUUID()}, 2026, 'Centro Escolar Católico San José de la Montaña')`;
    }

    console.log("[init] Completado");
    return NextResponse.json({ message: "Sistema cargado exitosamente", count: users.length });
  } catch (error: any) {
    console.error("[init] ERROR:", error.message);
    console.error("[init] Stack:", error.stack);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
