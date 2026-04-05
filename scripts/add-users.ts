import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Iniciando carga de usuarios y asignaciones...");

  // Asegurar que los grados existan (del 2 al 9)
  const gradosData = [];
  for (let i = 2; i <= 9; i++) {
    gradosData.push({ numero: i, seccion: "A", año: 2026 });
  }

  for (const g of gradosData) {
    const existing = await db.grado.findFirst({ where: { numero: g.numero } });
    if (!existing) {
      await db.grado.create({
        data: { numero: g.numero, seccion: g.seccion, año: g.año },
      });
    }
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

  // Hash de contraseña
  const hashPassword = async (password: string) => {
    return await bcrypt.hash(password, 10);
  };

  const users = [
    // ==================== ADMINISTRADORES ====================
    {
      nombre: "Jonathan Adonay Araujo Mendoza",
      email: "jonathan.araujo.mendoza@clases.edu.sv",
      password: "docente123",
      rol: "admin" as const,
      materias: [] // Acceso total
    },
    {
      nombre: "Mónica Lissette Tobar Gómez",
      email: "monica.lissette.tobar@clases.edu.sv",
      password: "admin123",
      rol: "admin-directora" as const,
      materias: [] // Acceso total, no puede eliminar usuarios
    },
    {
      nombre: "Claudia Jasmin Arce Castillo",
      email: "claudia.jasmin.arce@clases.edu.sv",
      password: "admin123",
      rol: "admin-codirectora" as const,
      materias: [] // Acceso total, no puede eliminar usuarios
    },

    // ==================== DOCENTES-ORIENTADORES (6-9 grado) ====================
    // Califican una asignatura específica en 6°, 7°, 8° y 9°
    {
      nombre: "Yessenia del Carmen Villafuerte Mejía",
      email: "yessenia.carmen.villafuerte@clases.edu.sv",
      password: "docente123",
      rol: "docente-orientador" as const,
      materias: [
        { grado: 6, mat: "Aritmética y Finanzas" },
        { grado: 7, mat: "Matemática y Datos" },
        { grado: 8, mat: "Matemática y Datos" },
        { grado: 9, mat: "Matemática y Datos" }
      ]
    },
    {
      nombre: "Jaqueline Lissette Landaverde de Gómez",
      email: "jaqueline.lissette.landaverde@clases.edu.sv",
      password: "docente123",
      rol: "docente-orientador" as const,
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
      rol: "docente-orientador" as const,
      materias: [
        { grado: 6, mat: "Ciudadanía y Valores" },
        { grado: 7, mat: "Ciudadanía y Valores" },
        { grado: 8, mat: "Ciudadanía y Valores" },
        { grado: 9, mat: "Ciudadanía y Valores" }
      ]
    },
    {
      nombre: "Mónica Gissel Montesino Najarro",
      email: "monica.montesino.najarro@clases.edu.sv",
      password: "docente123",
      rol: "docente-orientador" as const,
      materias: [
        { grado: 6, mat: "Desarrollo Corporal" },
        { grado: 7, mat: "Educación Física y Deportes" },
        { grado: 8, mat: "Educación Física y Deportes" },
        { grado: 9, mat: "Educación Física y Deportes" }
      ]
    },

    // ==================== DOCENTES (2-5 grado con asignaturas) ====================
    // Califican múltiples asignaturas en un grado específico (como asignaturas, no como tutor)
    {
      nombre: "Deysi Elizabeth Umanzor Cruz",
      email: "deysi.elizabeth.umanzor@clases.edu.sv",
      password: "docente123",
      rol: "docente" as const,
      materias: [
        { grado: 2, mat: "Comunicación y Literatura" },
        { grado: 2, mat: "Aritmética y Finanzas" },
        { grado: 2, mat: "Ciudadanía y Valores" },
        { grado: 2, mat: "Ciencia y Tecnología" }
      ]
    },
    {
      nombre: "Yency Yesenia Mejía Nerio",
      email: "04876579-1@clases.edu.sv",
      password: "docente123",
      rol: "docente" as const,
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
      rol: "docente" as const,
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
      rol: "docente" as const,
      materias: [
        { grado: 5, mat: "Comunicación y Literatura" },
        { grado: 5, mat: "Aritmética y Finanzas" },
        { grado: 5, mat: "Ciudadanía y Valores" },
        { grado: 5, mat: "Ciencia y Tecnología" }
      ]
    },

    // ==================== DOCENTES ESPECIALISTAS ====================
    // Califican una asignatura en múltiples grados
    {
      nombre: "Helen Alicia Cabezas de Golcher",
      email: "03533849-6@clases.edu.sv",
      password: "docente123",
      rol: "docente" as const,
      materias: [2, 3, 4, 5, 6, 7, 8, 9].map(g => ({ grado: g, mat: "Educación en la Fe" }))
    },
    {
      nombre: "Diana Nicole Rojas Urias",
      email: "05980194-0@clases.edu.sv",
      password: "docente123",
      rol: "docente" as const,
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
    // Hash password
    const hashedPassword = await hashPassword(u.password);

    // Upsert usuario
    let user = await db.usuario.findUnique({ where: { email: u.email } });
    if (!user) {
      user = await db.usuario.create({
        data: {
          email: u.email,
          nombre: u.nombre,
          password: hashedPassword,
          rol: u.rol,
        }
      });
      console.log(`✓ Creado usuario: ${u.nombre} (${u.rol})`);
    } else {
      user = await db.usuario.update({
        where: { email: u.email },
        data: { rol: u.rol, password: hashedPassword, nombre: u.nombre }
      });
      console.log(`✓ Actualizado usuario: ${u.nombre} (${u.rol})`);
    }

    // Limpiar asignaciones anteriores
    await db.docenteMateria.deleteMany({
      where: { docenteId: user.id }
    });

    // Asignar Materias
    if (u.materias && u.materias.length > 0) {
      for (const mat of u.materias) {
        const materiaRecord = await asegurarMateria(mat.mat, mat.grado);
        if (materiaRecord) {
          await db.docenteMateria.create({
            data: { docenteId: user.id, materiaId: materiaRecord.id }
          });
        }
      }
      console.log(`  → ${u.materias.length} materia(s) asignada(s)`);
    }
  }

  console.log("\n✅ ¡Completado! Todos los usuarios han sido creados/actualizados.");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
