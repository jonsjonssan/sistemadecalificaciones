import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/api-middleware";

export async function POST() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;
  const sql = neon(process.env.DATABASE_URL!);

  try {
    console.log("[reparar] Iniciando reparación de asignaciones...");

    // Materias que deben existir por grado
    const materiasPorGrado: Record<number, string[]> = {
      2: ["Comunicación", "Números y Formas", "Ciudadanía y Valores", "Ciencia y Tecnología", "Desarrollo Corporal", "Educación en la Fe", "Artes"],
      3: ["Comunicación", "Números y Formas", "Ciudadanía y Valores", "Ciencia y Tecnología", "Desarrollo Corporal", "Educación en la Fe", "Artes"],
      4: ["Comunicación y Literatura", "Aritmética y Finanzas", "Ciudadanía y Valores", "Ciencia y Tecnología", "Desarrollo Corporal", "Educación en la Fe", "Artes"],
      5: ["Comunicación y Literatura", "Aritmética y Finanzas", "Ciudadanía y Valores", "Ciencia y Tecnología", "Desarrollo Corporal", "Educación en la Fe", "Artes"],
      6: ["Comunicación y Literatura", "Aritmética y Finanzas", "Ciudadanía y Valores", "Ciencia y Tecnología", "Desarrollo Corporal", "Educación en la Fe", "Artes", "Educación Física y Deportes"],
      7: ["Lengua y Literatura", "Matemática y Datos", "Ciudadanía y Valores", "Ciencia y Tecnología", "Educación Física y Deportes", "Educación en la Fe", "Artes", "Inglés"],
      8: ["Lengua y Literatura", "Matemática y Datos", "Ciudadanía y Valores", "Ciencia y Tecnología", "Educación Física y Deportes", "Educación en la Fe", "Artes", "Inglés"],
      9: ["Lengua y Literatura", "Matemática y Datos", "Ciudadanía y Valores", "Ciencia y Tecnología", "Educación Física y Deportes", "Educación en la Fe", "Artes", "Inglés"],
    };

    // Crear materias que no existan
    const grados = await sql`SELECT id, numero FROM "Grado"`;
    const getGradoId = (num: number) => grados.find((g: any) => g.numero === num)?.id;

    let materiasCreadas = 0;
    for (const [numGrado, materias] of Object.entries(materiasPorGrado)) {
      const gradoId = getGradoId(parseInt(numGrado));
      if (!gradoId) continue;

      for (const nombreMateria of materias) {
        const existente = await sql`SELECT id FROM "Materia" WHERE nombre = ${nombreMateria} AND "gradoId" = ${gradoId} LIMIT 1`;
        if (existente.length === 0) {
          await sql`INSERT INTO "Materia" (id, nombre, "gradoId", "createdAt", "updatedAt") VALUES (${randomUUID()}, ${nombreMateria}, ${gradoId}, NOW(), NOW())`;
          console.log(`[reparar] Creada materia: ${nombreMateria} para grado ${numGrado}`);
          materiasCreadas++;
        }
      }
    }

    // Definir asignaciones de docentes
    const asignacionesDocentes = [
      { email: "yessenia.carmen.villafuerte@clases.edu.sv", materias: [{ grado: 6, mat: "Aritmética y Finanzas" }, { grado: 7, mat: "Matemática y Datos" }, { grado: 8, mat: "Matemática y Datos" }, { grado: 9, mat: "Matemática y Datos" }] },
      { email: "monica.montesino.najarro@clases.edu.sv", materias: [{ grado: 2, mat: "Desarrollo Corporal" }, { grado: 3, mat: "Desarrollo Corporal" }, { grado: 4, mat: "Desarrollo Corporal" }, { grado: 5, mat: "Desarrollo Corporal" }, { grado: 6, mat: "Desarrollo Corporal" }, { grado: 7, mat: "Educación Física y Deportes" }, { grado: 8, mat: "Educación Física y Deportes" }, { grado: 9, mat: "Educación Física y Deportes" }] },
      { email: "jaqueline.lissette.landaverde@clases.edu.sv", materias: [{ grado: 6, mat: "Ciencia y Tecnología" }, { grado: 7, mat: "Ciencia y Tecnología" }, { grado: 8, mat: "Ciencia y Tecnología" }, { grado: 9, mat: "Ciencia y Tecnología" }] },
      { email: "ana.carmen.romero@clases.edu.sv", materias: [{ grado: 6, mat: "Ciudadanía y Valores" }, { grado: 7, mat: "Ciudadanía y Valores" }, { grado: 8, mat: "Ciudadanía y Valores" }, { grado: 9, mat: "Ciudadanía y Valores" }] },
      { email: "04876579-1@clases.edu.sv", tutorGrado: 3, materias: [{ grado: 3, mat: "Comunicación" }, { grado: 3, mat: "Números y Formas" }, { grado: 3, mat: "Ciudadanía y Valores" }, { grado: 3, mat: "Ciencia y Tecnología" }] },
      { email: "silverio.silverio.monico@clases.edu.sv", tutorGrado: 4, materias: [{ grado: 4, mat: "Comunicación y Literatura" }, { grado: 4, mat: "Aritmética y Finanzas" }, { grado: 4, mat: "Ciudadanía y Valores" }, { grado: 4, mat: "Ciencia y Tecnología" }] },
      { email: "emilia.peraza.publicos698@clases.edu.sv", tutorGrado: 5, materias: [{ grado: 5, mat: "Comunicación y Literatura" }, { grado: 5, mat: "Aritmética y Finanzas" }, { grado: 5, mat: "Ciudadanía y Valores" }, { grado: 5, mat: "Ciencia y Tecnología" }] },
      { email: "deysi.elizabeth.umanzor@clases.edu.sv", tutorGrado: 2, materias: [{ grado: 2, mat: "Comunicación" }, { grado: 2, mat: "Números y Formas" }, { grado: 2, mat: "Ciudadanía y Valores" }, { grado: 2, mat: "Ciencia y Tecnología" }] },
      { email: "03533849-6@clases.edu.sv", materias: [{ grado: 2, mat: "Educación en la Fe" }, { grado: 3, mat: "Educación en la Fe" }, { grado: 4, mat: "Educación en la Fe" }, { grado: 5, mat: "Educación en la Fe" }, { grado: 6, mat: "Educación en la Fe" }, { grado: 7, mat: "Educación en la Fe" }, { grado: 8, mat: "Educación en la Fe" }, { grado: 9, mat: "Educación en la Fe" }] },
      { email: "05980194-0@clases.edu.sv", materias: [{ grado: 2, mat: "Artes" }, { grado: 3, mat: "Artes" }, { grado: 7, mat: "Inglés" }, { grado: 8, mat: "Inglés" }, { grado: 9, mat: "Inglés" }] },
    ];

    let asignacionesCreadas = 0;
    let tutoresAsignados = 0;

    for (const docente of asignacionesDocentes) {
      // Buscar usuario
      const usuario = await sql`SELECT id FROM "Usuario" WHERE email = ${docente.email} LIMIT 1`;
      if (usuario.length === 0) {
        console.log(`[reparar] Usuario no encontrado: ${docente.email}`);
        continue;
      }
      const usuarioId = usuario[0].id;

      // Asignar como tutor de grado
      if (docente.tutorGrado) {
        const gradoId = getGradoId(docente.tutorGrado);
        if (gradoId) {
          await sql`UPDATE "Grado" SET "docenteId" = ${usuarioId} WHERE id = ${gradoId}`;
          console.log(`[reparar] ${docente.email} asignado como tutor del grado ${docente.tutorGrado}`);
          tutoresAsignados++;
        }
      }

      // Asignar materias
      for (const mat of docente.materias || []) {
        const gradoId = getGradoId(mat.grado);
        if (!gradoId) continue;

        const materia = await sql`SELECT id FROM "Materia" WHERE nombre = ${mat.mat} AND "gradoId" = ${gradoId} LIMIT 1`;
        if (materia.length === 0) {
          console.log(`[reparar] Materia no encontrada: ${mat.mat} grado ${mat.grado}`);
          continue;
        }

        // Verificar si ya existe la asignación
        const existente = await sql`SELECT id FROM "DocenteMateria" WHERE "docenteId" = ${usuarioId} AND "materiaId" = ${materia[0].id} LIMIT 1`;
        if (existente.length === 0) {
          await sql`INSERT INTO "DocenteMateria" (id, "docenteId", "materiaId") VALUES (${randomUUID()}, ${usuarioId}, ${materia[0].id})`;
          console.log(`[reparar] Asignada ${mat.mat} a ${docente.email}`);
          asignacionesCreadas++;
        }
      }
    }

    console.log(`[reparar] Completado: ${materiasCreadas} materias creadas, ${asignacionesCreadas} asignaciones creadas, ${tutoresAsignados} tutores asignados`);

    return NextResponse.json({ 
      message: "Reparación completada",
      materiasCreadas,
      asignacionesCreadas,
      tutoresAsignados
    });
  } catch (error: any) {
    console.error("[reparar] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}