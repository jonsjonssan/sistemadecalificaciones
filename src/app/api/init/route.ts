import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    console.log("Iniciando carga de usuarios y configuraciones...");

    // 1. Asegurar que los grados existan (del 2 al 9)
    for (let numero = 2; numero <= 9; numero++) {
      await db.grado.upsert({
        where: {
          id: (await db.grado.findFirst({ where: { numero } }))?.id || "not-found",
        },
        update: {},
        create: {
          numero,
          seccion: "A",
          año: 2026,
        },
      });
    }

    const gradosDb = await db.grado.findMany();
    const getGradoId = (num: number) => gradosDb.find(g => g.numero === num)?.id;

    // Función para crear materia si no existe
    const asegurarMateria = async (nombre: string, numGrado: number) => {
      const gradoId = getGradoId(numGrado);
      if (!gradoId) return null;
      
      let materia = await db.materia.findFirst({
        where: { nombre, gradoId },
      });

      if (!materia) {
        materia = await db.materia.create({
          data: { nombre, gradoId },
        });

        // Configuración de actividades para cada trimestre (por defecto)
        for (let trimestre = 1; trimestre <= 3; trimestre++) {
          await db.configActividad.create({
            data: {
              materiaId: materia.id,
              trimestre,
              numActividadesCotidianas: 4,
              numActividadesIntegradoras: 1,
              tieneExamen: true,
              porcentajeAC: 35.0,
              porcentajeAI: 35.0,
              porcentajeExamen: 30.0,
            },
          });
        }
      }
      return materia;
    };

    // ============================================
    // LISTA OFICIAL DE USUARIOS
    // ============================================
    const users: {
      nombre: string;
      email: string;
      password: string;
      rol: string;
      tutorGrado?: number;
      materias: { grado: number; mat: string }[];
    }[] = [
      // ---- ADMINISTRADORES ----
      {
        nombre: "Administrador General",
        email: "admin@escuela.edu",
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
        tutorGrado: 9,
        materias: [
          { grado: 6, mat: "Comunicación y Literatura" },
          { grado: 7, mat: "Lenguaje y Literatura" },
          { grado: 8, mat: "Lenguaje y Literatura" },
          { grado: 9, mat: "Lenguaje y Literatura" }
        ]
      },

      // ---- DOCENTES ----
      {
        nombre: "Jonathan Adonay Araujo Mendoza",
        email: "jonathan.araujo.mendoza@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        materias: [
          { grado: 4, mat: "Artes" },
          { grado: 5, mat: "Artes" },
          { grado: 6, mat: "Artes" }
        ]
      },
      {
        nombre: "Yessenia del Carmen Villafuerte Mejía",
        email: "yessenia.carmen.villafuerte@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        tutorGrado: 6,
        materias: [
          { grado: 6, mat: "Aritmética y Finanzas" },
          { grado: 7, mat: "Matemática y Datos" },
          { grado: 8, mat: "Matemática y Datos" },
          { grado: 9, mat: "Matemática y Datos" }
        ]
      },
      {
        nombre: "Mónica Gissel Montesino Najarro",
        email: "monica.montesino.najarro@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        materias: [
          ...[2, 3, 4, 5, 6].map(g => ({ grado: g, mat: "Desarrollo Corporal" })),
          { grado: 7, mat: "Educación Física y Deportes" },
          { grado: 8, mat: "Educación Física y Deportes" },
          { grado: 9, mat: "Educación Física y Deportes" }
        ]
      },
      {
        nombre: "Jaqueline Lissette Landaverde de Gómez",
        email: "jaqueline.lissette.landaverde@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        tutorGrado: 7,
        materias: [
          { grado: 6, mat: "Ciencia y Tecnología" },
          { grado: 7, mat: "Ciencia y Tecnología" },
          { grado: 8, mat: "Ciencia y Tecnología" },
          { grado: 9, mat: "Ciencia y Tecnología" }
        ]
      },
      {
        nombre: "Ana del Carmen Romero González",
        email: "ana.carmen.romero@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        tutorGrado: 8,
        materias: [
          { grado: 6, mat: "Ciudadanía y Valores" },
          { grado: 7, mat: "Ciudadanía y Valores" },
          { grado: 8, mat: "Ciudadanía y Valores" },
          { grado: 9, mat: "Ciudadanía y Valores" }
        ]
      },
      {
        nombre: "Yency Yesenia Mejía Nerio",
        email: "04876579-1@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        tutorGrado: 3,
        materias: [
          { grado: 3, mat: "Comunicación y Literatura" },
          { grado: 3, mat: "Aritmética y Finanzas" },
          { grado: 3, mat: "Ciudadanía y Valores" },
          { grado: 3, mat: "Ciencia y Tecnología" }
        ]
      },
      {
        nombre: "Silverio Mónico Mulato",
        email: "silverio.silverio.monico@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        tutorGrado: 4,
        materias: [
          { grado: 4, mat: "Comunicación y Literatura" },
          { grado: 4, mat: "Aritmética y Finanzas" },
          { grado: 4, mat: "Ciudadanía y Valores" },
          { grado: 4, mat: "Ciencia y Tecnología" }
        ]
      },
      {
        nombre: "Emilia Etel Peraza",
        email: "emilia.peraza.publicos698@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        tutorGrado: 5,
        materias: [
          { grado: 5, mat: "Comunicación y Literatura" },
          { grado: 5, mat: "Aritmética y Finanzas" },
          { grado: 5, mat: "Ciudadanía y Valores" },
          { grado: 5, mat: "Ciencia y Tecnología" }
        ]
      },
      {
        nombre: "Deysi Elizabeth Umanzor Cruz",
        email: "deysi.elizabeth.umanzor@clases.edu.sv",
        password: "docente123",
        rol: "docente",
        tutorGrado: 2,
        materias: [
          { grado: 2, mat: "Comunicación y Literatura" },
          { grado: 2, mat: "Aritmética y Finanzas" },
          { grado: 2, mat: "Ciudadanía y Valores" },
          { grado: 2, mat: "Ciencia y Tecnología" }
        ]
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
      },
    ];

    const resultados: { nombre: string; email: string; rol: string }[] = [];

    for (const u of users) {
      // Upsert usuario
      const user = await db.usuario.upsert({
        where: { email: u.email },
        update: {
          password: u.password,
          nombre: u.nombre,
          rol: u.rol,
        },
        create: {
          email: u.email,
          nombre: u.nombre,
          password: u.password,
          rol: u.rol,
        }
      });

      // Set Tutor
      if (u.tutorGrado) {
        const gradoId = getGradoId(u.tutorGrado);
        if (gradoId) {
          await db.grado.update({
            where: { id: gradoId },
            data: { docenteId: user.id }
          });
        }
      }

      // Limpiar asignaciones previas de materias
      await db.docenteMateria.deleteMany({
        where: { docenteId: user.id }
      });

      // Assign Materias
      if (u.materias && u.materias.length > 0) {
        for (const mat of u.materias) {
          const materiaRecord = await asegurarMateria(mat.mat, mat.grado);
          if (materiaRecord) {
            await db.docenteMateria.upsert({
              where: {
                docenteId_materiaId: {
                  docenteId: user.id,
                  materiaId: materiaRecord.id
                }
              },
              update: {},
              create: {
                docenteId: user.id,
                materiaId: materiaRecord.id
              }
            });
          }
        }
      }

      resultados.push({ nombre: u.nombre, email: u.email, rol: u.rol });
    }

    // Inicializar configuración global si no existe
    const config = await db.configuracionSistema.findFirst();
    if (!config) {
      await db.configuracionSistema.create({
        data: {
          añoEscolar: 2026,
          escuela: "Centro Escolar Católico San José de la Montaña"
        }
      });
    }

    return NextResponse.json({
      message: "Sistema cargado con usuarios y asignaciones exitosamente",
      count: users.length,
      usuarios: resultados
    });
  } catch (error) {
    console.error("Error al inicializar:", error);
    return NextResponse.json({ error: "Error al cargar los usuarios" }, { status: 500 });
  }
}
