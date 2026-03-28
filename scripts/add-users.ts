import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Iniciando carga de usuarios y asignaciones...");

  // Asegurar que los grados existan (del 2 al 9)
  const gradosData = [];
  for (let i = 2; i <= 9; i++) {
    gradosData.push({ numero: i, seccion: "A", año: 2026 });
  }

  for (const g of gradosData) {
    await db.grado.upsert({
      where: {
        // No hay un constraint único por grado en el schema simple, buscaremos el primero
        id: (await db.grado.findFirst({ where: { numero: g.numero } }))?.id || "not-found",
      },
      update: {},
      create: { numero: g.numero, seccion: g.seccion, año: g.año },
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
    }
    return materia;
  };

  const users = [
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
        { grado: 2, mat: "Desarrollo Corporal" },
        { grado: 3, mat: "Desarrollo Corporal" },
        { grado: 4, mat: "Desarrollo Corporal" },
        { grado: 5, mat: "Desarrollo Corporal" },
        { grado: 6, mat: "Desarrollo Corporal" },
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
      materias: [2,3,4,5,6,7,8,9].map(g => ({ grado: g, mat: "Educación en la Fe" }))
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
    {
      nombre: "Mónica Lissette Tobar Gómez",
      email: "monica.lissette.tobar@clases.edu.sv",
      password: "admin123",
      rol: "admin",
      materias: [
        { grado: 4, mat: "Artes" },
        { grado: 5, mat: "Artes" },
        { grado: 6, mat: "Artes" }
      ]
    },
    {
      nombre: "Administrador",
      email: "admin@escuela.edu",
      password: "admin",
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
    }
  ];

  for (const u of users) {
    // Upsert usuario
    let user = await db.usuario.findUnique({ where: { email: u.email } });
    if (!user) {
      user = await db.usuario.create({
        data: {
          email: u.email,
          nombre: u.nombre,
          password: u.password,
          rol: u.rol,
        }
      });
      console.log(`Creado usuario: ${u.nombre}`);
    } else {
      user = await db.usuario.update({
        where: { email: u.email },
        data: { rol: u.rol, password: u.password, nombre: u.nombre }
      });
      console.log(`Actualizado usuario: ${u.nombre}`);
    }

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

    // Assign Materias
    if (u.materias && u.materias.length > 0) {
      for (const mat of u.materias) {
        const materiaRecord = await asegurarMateria(mat.mat, mat.grado);
        if (materiaRecord) {
          // Verify assignment
          const existingAssign = await db.docenteMateria.findFirst({
            where: { docenteId: user.id, materiaId: materiaRecord.id }
          });
          if (!existingAssign) {
            await db.docenteMateria.create({
              data: { docenteId: user.id, materiaId: materiaRecord.id }
            });
          }
        }
      }
    }
  }

  console.log("Completado!");
}

main().catch(console.error).finally(() => db.$disconnect());
