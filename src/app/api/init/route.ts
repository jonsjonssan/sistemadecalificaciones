import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export async function POST() {
  try {
    console.log("Iniciando carga de usuarios y configuraciones...");

    // 1. Asegurar que los grados existan (del 2 al 9)
    for (let numero = 2; numero <= 9; numero++) {
      const existing = await sql`SELECT id FROM "Grado" WHERE numero = ${numero} LIMIT 1`;
      if (existing.length === 0) {
        await sql`INSERT INTO "Grado" (id, numero, seccion, año) VALUES (${randomUUID()}, ${numero}, 'A', 2026)`;
      }
    }

    const gradosDb = await sql`SELECT * FROM "Grado"`;
    const getGradoId = (num: number) => gradosDb.find((g: any) => g.numero === num)?.id ?? gradosDb.find((g: any) => g.numero === num)?.id;

    // Refrescar gradosDb después de inserts
    const gradosActualizados = await sql`SELECT * FROM "Grado"`;
    const getGradoIdActual = (num: number) => gradosActualizados.find((g: any) => g.numero === num)?.id;

    // Función para crear materia si no existe
    const asegurarMateria = async (nombre: string, numGrado: number) => {
      const gradoId = getGradoIdActual(numGrado);
      if (!gradoId) return null;
      
      let materia = await sql`SELECT * FROM "Materia" WHERE nombre = ${nombre} AND "gradoId" = ${gradoId} LIMIT 1`;

      if (materia.length === 0) {
        const materiaId = randomUUID();
        await sql`INSERT INTO "Materia" (id, nombre, "gradoId") VALUES (${materiaId}, ${nombre}, ${gradoId})`;
        materia = [{ id: materiaId, nombre, gradoId }];

        // Configuración de actividades para cada trimestre (por defecto)
        for (let trimestre = 1; trimestre <= 3; trimestre++) {
          await sql`
            INSERT INTO "ConfigActividad" (
              id, "materiaId", trimestre, 
              "numActividadesCotidianas", "numActividadesIntegradoras", 
              "tieneExamen", "porcentajeAC", "porcentajeAI", "porcentajeExamen"
            ) VALUES (
              ${randomUUID()}, ${materiaId}, ${trimestre},
              4, 1, true, 35.0, 35.0, 30.0
            )
          `;
        }
      }
      return materia[0];
    };

    // Nombres válidos de materias por grado (TODAS las materias que existen en el sistema)
    const nombresValidosPorGrado: Record<number, string[]> = {};
    for (let num = 2; num <= 9; num++) {
      const materia6ta = num >= 7 ? "Educación Física y Deportes" : "Desarrollo Corporal";
      nombresValidosPorGrado[num] = [
        "Comunicación",
        "Números y Formas",
        "Ciencia y Tecnología",
        "Ciudadanía y Valores",
        "Artes",
        materia6ta,
        "Educación en la Fe",
        "Comunicación y Literatura",
        "Aritmética y Finanzas",
      ];
      if (num >= 7) {
        nombresValidosPorGrado[num].push("Matemática y Datos");
        nombresValidosPorGrado[num].push("Inglés");
      }
    }

    // Eliminar materias que no corresponden al grado
    const todasMaterias = await sql`SELECT * FROM "Materia"`;
    for (const m of todasMaterias) {
      const grado = gradosActualizados.find((g: any) => g.id === m.gradoId);
      if (!grado) continue;
      const validos = nombresValidosPorGrado[grado.numero] || [];
      if (!validos.includes(m.nombre)) {
        await sql`DELETE FROM "ConfigActividad" WHERE "materiaId" = ${m.id}`;
        await sql`DELETE FROM "DocenteMateria" WHERE "materiaId" = ${m.id}`;
        await sql`DELETE FROM "Calificacion" WHERE "materiaId" = ${m.id}`;
        await sql`DELETE FROM "Materia" WHERE id = ${m.id}`;
      }
    }

    const users = [
      {
        nombre: "Administrador General",
        email: "jonathan.araujo.mendoza@clases.edu.sv",
        password: "admin",
        rol: "admin",
        materias: []
      },
      {
        nombre: "Mónica Lissette Tobar Gómez",
        email: "monica.lissette.tobar@clases.edu.sv",
        password: "admin123",
        rol: "admin",
        materias: []
      },
      {
        nombre: "Claudia Jasmin Arce Castillo",
        email: "claudia.jasmin.arce@clases.edu.sv",
        password: "admin123",
        rol: "admin",
        materias: []
      },
      {
        nombre: "Yessenia del Carmen Villafuerte Mejía",
        email: "yessenia.carmen.villafuerte@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        materias: [
          { grado: 6, mat: "Aritmética y Finanzas" },
          ...[7, 8, 9].map(g => ({ grado: g, mat: "Matemática y Datos" }))
        ]
      },
      {
        nombre: "Mónica Gissel Montesino Najarro",
        email: "monica.montesino.najarro@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        materias: [2, 3, 4, 5, 6].map(g => ({ grado: g, mat: "Desarrollo Corporal" })).concat([7, 8, 9].map(g => ({ grado: g, mat: "Educación Física y Deportes" })))
      },
      {
        nombre: "Jaqueline Lissette Landaverde de Gómez",
        email: "jaqueline.lissette.landaverde@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        materias: [6, 7, 8, 9].map(g => ({ grado: g, mat: "Ciencia y Tecnología" }))
      },
      {
        nombre: "Ana del Carmen Romero González",
        email: "ana.carmen.romero@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        materias: [6, 7, 8, 9].map(g => ({ grado: g, mat: "Ciudadanía y Valores" }))
      },
      {
        nombre: "Yency Yesenia Mejía Nerio",
        email: "04876579-1@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        tutorGrado: 3,
        materias: [3].flatMap(g => [
          { grado: g, mat: "Comunicación y Literatura" },
          { grado: g, mat: "Números y Formas" },
          { grado: g, mat: "Ciudadanía y Valores" },
          { grado: g, mat: "Ciencia y Tecnología" }
        ])
      },
      {
        nombre: "Silverio Mónico Mulato",
        email: "silverio.silverio.monico@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        tutorGrado: 4,
        materias: [4].flatMap(g => [
          { grado: g, mat: "Comunicación y Literatura" },
          { grado: g, mat: "Aritmética y Finanzas" },
          { grado: g, mat: "Ciudadanía y Valores" },
          { grado: g, mat: "Ciencia y Tecnología" }
        ])
      },
      {
        nombre: "Emilia Etel Peraza",
        email: "emilia.peraza.publicos698@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        tutorGrado: 5,
        materias: [5].flatMap(g => [
          { grado: g, mat: "Comunicación y Literatura" },
          { grado: g, mat: "Aritmética y Finanzas" },
          { grado: g, mat: "Ciudadanía y Valores" },
          { grado: g, mat: "Ciencia y Tecnología" }
        ])
      },
      {
        nombre: "Deysi Elizabeth Umanzor Cruz",
        email: "deysi.elizabeth.umanzor@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        tutorGrado: 2,
        materias: [2].flatMap(g => [
          { grado: g, mat: "Comunicación y Literatura" },
          { grado: g, mat: "Números y Formas" },
          { grado: g, mat: "Ciudadanía y Valores" },
          { grado: g, mat: "Ciencia y Tecnología" }
        ])
      },
      {
        nombre: "Helen Alicia Cabezas de Golcher",
        email: "03533849-6@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        materias: [2, 3, 4, 5, 6, 7, 8, 9].map(g => ({ grado: g, mat: "Educación en la Fe" }))
      },
      {
        nombre: "Diana Nicole Rojas Urias",
        email: "05980194-0@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        materias: [
          { grado: 2, mat: "Artes" },
          { grado: 3, mat: "Artes" },
          { grado: 7, mat: "Inglés" },
          { grado: 8, mat: "Inglés" },
          { grado: 9, mat: "Inglés" }
        ]
      }
    ];

    for (const u of users) {
      // Upsert usuario con SQL raw
      const existingUser = await sql`SELECT * FROM "Usuario" WHERE email = ${u.email}`;
      const hashedPassword = await bcrypt.hash(u.password, 10);
      
      let userId: string;
      if (existingUser.length > 0) {
        await sql`UPDATE "Usuario" SET password = ${hashedPassword}, nombre = ${u.nombre}, rol = ${u.rol}, "updatedAt" = NOW() WHERE email = ${u.email}`;
        userId = existingUser[0].id;
      } else {
        userId = randomUUID();
        await sql`INSERT INTO "Usuario" (id, email, password, nombre, rol) VALUES (${userId}, ${u.email}, ${hashedPassword}, ${u.nombre}, ${u.rol})`;
      }

      // Set Tutor
      if (u.tutorGrado) {
        const gradoId = getGradoIdActual(u.tutorGrado);
        if (gradoId) {
          await sql`UPDATE "Grado" SET "docenteId" = ${userId} WHERE id = ${gradoId}`;
        }
      }

      // Assign Materias
      if (u.materias && u.materias.length > 0) {
        for (const mat of u.materias) {
          const materiaRecord = await asegurarMateria(mat.mat, mat.grado);
          if (materiaRecord) {
            await sql`
              INSERT INTO "DocenteMateria" ("docenteId", "materiaId")
              VALUES (${userId}, ${materiaRecord.id})
              ON CONFLICT ("docenteId", "materiaId") DO NOTHING
            `;
          }
        }
      }
    }

    // Inicializar configuración global si no existe
    const config = await sql`SELECT * FROM "ConfiguracionSistema" LIMIT 1`;
    if (config.length === 0) {
      await sql`INSERT INTO "ConfiguracionSistema" (id, "añoEscolar", escuela) VALUES (${randomUUID()}, 2026, 'Centro Escolar Católico San José de la Montaña')`;
    }

    return NextResponse.json({
      message: "Sistema cargado con usuarios y asignaciones exitosamente",
      count: users.length
    });
  } catch (error) {
    console.error("Error al inicializar:", error);
    return NextResponse.json({ error: "Error al cargar los usuarios" }, { status: 500 });
  }
}
