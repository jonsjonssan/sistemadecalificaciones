import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

// API para crear usuarios docentes con sus asignaciones
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que sea admin
    const sessionData = JSON.parse(session.value);
    if (sessionData.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden ejecutar esta acción" }, { status: 403 });
    }

    // Obtener todos los grados y materias
    const grados = await db.grado.findMany({
      include: { materias: true },
      orderBy: { numero: "asc" }
    });

    // Crear mapa de grados por número
    const gradoMap = new Map(grados.map(g => [g.numero, g]));
    
    // Crear mapa de materias por grado y nombre
    const getMateria = (gradoNum: number, nombreMateria: string) => {
      const grado = gradoMap.get(gradoNum);
      if (!grado) return null;
      return grado.materias.find(m => m.nombre === nombreMateria);
    };

    // Función para crear usuario
    const crearUsuario = async (
      nombre: string, 
      email: string, 
      password: string,
      gradosTutor: number[] = [],
      materiasAsignadas: { grado: number; materia: string }[] = []
    ) => {
      // Verificar si ya existe
      const existente = await db.usuario.findUnique({ where: { email } });
      if (existente) {
        return { nombre, email, status: "ya existe" };
      }

      // Crear usuario
      const usuario = await db.usuario.create({
        data: {
          email,
          password,
          nombre,
          rol: "docente",
        },
      });

      // Asignar grados como tutor (grados 2-5)
      for (const numGrado of gradosTutor) {
        const grado = gradoMap.get(numGrado);
        if (grado) {
          await db.grado.update({
            where: { id: grado.id },
            data: { docenteId: usuario.id },
          });
        }
      }

      // Asignar materias específicas (grados 6-9)
      for (const { grado: gradoNum, materia: nombreMateria } of materiasAsignadas) {
        const materia = getMateria(gradoNum, nombreMateria);
        if (materia) {
          await db.docenteMateria.create({
            data: {
              docenteId: usuario.id,
              materiaId: materia.id,
            },
          });
        }
      }

      return { nombre, email, status: "creado", gradosTutor, materiasAsignadas: materiasAsignadas.length };
    };

    const resultados = [];

    // ============================================
    // CREAR TODOS LOS USUARIOS
    // ============================================

    // 1. Jonathan Adonay Araujo Mendoza - Artes 4°, 5°, 6°
    resultados.push(await crearUsuario(
      "Jonathan Adonay Araujo Mendoza",
      "jonatha.araujo.mendoza@clases.edu.sv",
      "jonathan2024",
      [],
      [
        { grado: 4, materia: "Artes" },
        { grado: 5, materia: "Artes" },
        { grado: 6, materia: "Artes" },
      ]
    ));

    // 2. Claudia Jasmin Arce Castillo - Artes 4°, 5°, 6°
    resultados.push(await crearUsuario(
      "Claudia Jasmin Arce Castillo",
      "claudia.jasmin.arce@clases.edu.sv",
      "claudia2024",
      [],
      [
        { grado: 4, materia: "Artes" },
        { grado: 5, materia: "Artes" },
        { grado: 6, materia: "Artes" },
      ]
    ));

    // 3. Mónica Lissette Tobar Gómez - Artes 4°, 5°, 6°
    resultados.push(await crearUsuario(
      "Mónica Lissette Tobar Gómez",
      "monica.lissette.tobar@clases.edu.sv",
      "monica2024",
      [],
      [
        { grado: 4, materia: "Artes" },
        { grado: 5, materia: "Artes" },
        { grado: 6, materia: "Artes" },
      ]
    ));

    // 4. Diana Nicole Rojas Urias - Artes 2°, 3°
    // Nota: Inglés no está en el sistema actual, solo se asigna Artes
    resultados.push(await crearUsuario(
      "Diana Nicole Rojas Urias",
      "05980194-0@clases.edu.sv",
      "diana2024",
      [],
      [
        { grado: 2, materia: "Artes" },
        { grado: 3, materia: "Artes" },
      ]
    ));

    // 5. Helen Alicia Cabezas de Golcher - Educación en la Fe (todos los grados 2-9)
    const materiasFe = [];
    for (let i = 2; i <= 9; i++) {
      materiasFe.push({ grado: i, materia: "Educación en la Fe" });
    }
    resultados.push(await crearUsuario(
      "Helen Alicia Cabezas de Golcher",
      "03533849-6@clases.edu.sv",
      "helen2024",
      [],
      materiasFe
    ));

    // 6. Deysi Elizabeth Umanzor Cruz - Tutora 2° grado
    resultados.push(await crearUsuario(
      "Deysi Elizabeth Umanzor Cruz",
      "deysi.elizabeth.umanzor@clases.edu.sv",
      "deysi2024",
      [2], // Tutora de 2° grado
      []
    ));

    // 7. Emilia Etel Peraza - Tutora 5° grado
    resultados.push(await crearUsuario(
      "Emilia Etel Peraza",
      "emilia.peraza.publicos698@clases.edu.sv",
      "emilia2024",
      [5], // Tutora de 5° grado
      []
    ));

    // 8. Silverio Mónico Mulato - Tutor 4° grado
    resultados.push(await crearUsuario(
      "Silverio Mónico Mulato",
      "silverio.silverio.monico@clases.edu.sv",
      "silverio2024",
      [4], // Tutor de 4° grado
      []
    ));

    // 9. Yency Yesenia Mejía Nerio - Tutora 3° grado
    resultados.push(await crearUsuario(
      "Yency Yesenia Mejía Nerio",
      "04876579-1@clases.edu.sv",
      "yency2024",
      [3], // Tutora de 3° grado
      []
    ));

    // 10. Ana del Carmen Romero González - Ciudadanía y Valores 6°-9°
    resultados.push(await crearUsuario(
      "Ana del Carmen Romero González",
      "ana.carmen.romero@clases.edu.sv",
      "ana2024",
      [],
      [
        { grado: 6, materia: "Ciudadanía y Valores" },
        { grado: 7, materia: "Ciudadanía y Valores" },
        { grado: 8, materia: "Ciudadanía y Valores" },
        { grado: 9, materia: "Ciudadanía y Valores" },
      ]
    ));

    // 11. Jaqueline Lissette Landaverde de Gómez - Ciencia y Tecnología 6°-9°
    resultados.push(await crearUsuario(
      "Jaqueline Lissette Landaverde de Gómez",
      "jaqueline.lissette.landaverde@clases.edu.sv",
      "jaqueline2024",
      [],
      [
        { grado: 6, materia: "Ciencia y Tecnología" },
        { grado: 7, materia: "Ciencia y Tecnología" },
        { grado: 8, materia: "Ciencia y Tecnología" },
        { grado: 9, materia: "Ciencia y Tecnología" },
      ]
    ));

    // 12. Mónica Gissel Montesino Najarro - Desarrollo Corporal 2°-6°, Educación Física 7°-9°
    const materiasDesarrollo = [];
    for (let i = 2; i <= 6; i++) {
      materiasDesarrollo.push({ grado: i, materia: "Desarrollo Corporal" });
    }
    for (let i = 7; i <= 9; i++) {
      materiasDesarrollo.push({ grado: i, materia: "Educación Física y Deportes" });
    }
    resultados.push(await crearUsuario(
      "Mónica Gissel Montesino Najarro",
      "monica.montesino.najarro@clases.edu.sv",
      "gissel2024",
      [],
      materiasDesarrollo
    ));

    // 13. Yessenia del Carmen Villafuerte Mejía - Números y Formas 6°-9°
    resultados.push(await crearUsuario(
      "Yessenia del Carmen Villafuerte Mejía",
      "yessenia.carmen.villafuerte@clases.edu.sv",
      "yessenia2024",
      [],
      [
        { grado: 6, materia: "Números y Formas" },
        { grado: 7, materia: "Números y Formas" },
        { grado: 8, materia: "Números y Formas" },
        { grado: 9, materia: "Números y Formas" },
      ]
    ));

    return NextResponse.json({
      message: "Usuarios creados exitosamente",
      total: resultados.filter(r => r.status === "creado").length,
      usuarios: resultados,
    });
  } catch (error) {
    console.error("Error al crear usuarios:", error);
    return NextResponse.json(
      { error: "Error al crear usuarios" },
      { status: 500 }
    );
  }
}
