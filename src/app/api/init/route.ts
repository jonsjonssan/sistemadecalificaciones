import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    // Verificar si ya existe un admin
    const adminExistente = await db.usuario.findFirst({
      where: { rol: "admin" },
    });

    if (adminExistente) {
      return NextResponse.json({
        message: "Ya existe un administrador",
        admin: { email: adminExistente.email },
      });
    }

    // Crear administrador por defecto
    const admin = await db.usuario.create({
      data: {
        email: "admin@escuela.edu",
        password: "admin123",
        nombre: "Administrador",
        rol: "admin",
      },
    });

    // Crear grados del 2 al 9
    for (let numero = 2; numero <= 9; numero++) {
      const grado = await db.grado.create({
        data: {
          numero,
          seccion: "A",
          año: 2026,
        },
      });

      // Crear las 8 materias para cada grado
      const materiasNombres = [
        "Comunicación",
        "Números y Formas",
        "Ciencia y Tecnología",
        "Ciudadanía y Valores",
        "Artes",
        "Desarrollo Corporal",
        "Educación en la Fe",
        "Inglés",
      ];

      for (const nombre of materiasNombres) {
        const materia = await db.materia.create({
          data: {
            nombre,
            gradoId: grado.id,
          },
        });

        // Crear configuración de actividades para cada trimestre
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

      // Crear estudiantes de ejemplo para 2do grado
      if (numero === 2) {
        const estudiantes = [
          "Ayala Mercado, Ariana Valentina",
          "Beltrán Espinoza, Erick Maximiliano",
          "Flores Cáceres, Marcela Valentina",
          "González Hernández, Mía Fernanda",
          "Luna Ayala, Leonardo Santiago",
          "Luna Ayala, Samantha Natalia",
          "Martell Campos, Gloria Fátima María",
          "Oviedo Cubías, Adriana Marcela",
          "Peña Baños, Emma Camille",
          "Pineda Argueta, Raúl Adrián",
          "Polanco, Jeremy Stanley",
          "Rivera Alfaro, Kathia Valeria",
          "Rodríguez García, Moises Gerardo",
          "Serrano Hernández, Santiago Alessandro",
          "Trejo Prado, Zoe Itzel",
        ];

        for (let i = 0; i < estudiantes.length; i++) {
          await db.estudiante.create({
            data: {
              numero: i + 1,
              nombre: estudiantes[i],
              gradoId: grado.id,
            },
          });
        }
      }
    }

    return NextResponse.json({
      message: "Sistema inicializado correctamente",
      admin: { email: admin.email, password: "admin123" },
    });
  } catch (error) {
    console.error("Error al inicializar:", error);
    return NextResponse.json(
      { error: "Error al inicializar el sistema" },
      { status: 500 }
    );
  }
}
