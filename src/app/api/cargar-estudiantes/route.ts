import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

// Nómina de estudiantes por grado
const estudiantesPorGrado: Record<number, string[]> = {
  2: [
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
    "Rivera Alfaro, Kathia Valeria",
    "Rodríguez García, Moises Gerardo",
    "Serrano Hernández, Santiago Alessandro",
    "Trejo Prado, Zoe Itzel",
  ],
  3: [
    "Carrillo Ruiz, Víctor Daniel",
    "Chacón Marroquín, Leslie Elizabeth",
    "Clímaco Sánchez, Luisa Camila",
    "Cubías Hernández, Fátima Belén",
    "González Barrera, Valentina Abigaíl",
    "Jurado Molina, Mathias Josué",
    "Linares Juarez, Gabriela Sofía",
    "Lozano Rivas, Herber Mateo",
    "Mejía Hernández, Luis Antonio",
    "Paz Lovos, Brianna Sabrina",
    "Pineda Galindo, Ximena Fernanda",
    "Ponce Magaña, Jonás Isaías",
    "Portillo Beltrán, Axel Ernesto",
    "Quijada Roque, Carlos Daniel",
    "Rivas Ramírez, Melanie Margarita",
    "Sánchez Portillo, Roberto Enmanuel",
    "Santos Marroquín, Oscar Mateo",
    "Ventura Recinos, Luka Alejandro",
  ],
  4: [
    "Abarca Medina, Alicia Valentina",
    "Amaya Ramírez, Steven Alexander",
    "Aragón Santos, César Rodrigo",
    "Barraza Castillo, Damaris Abigail",
    "Barrera Martínez, Bianca Lucía",
    "Cortés Melara, Brandon Alonso",
    "Cortez Hernández, Angie Fernanda",
    "Díaz Rivas, Heylen Johanna",
    "Hernández Jiménez, José Santiago",
    "Lazo Santos, Santiago Alí",
    "Melara Hernández, Gerson Isaí",
    "Murcia Granados, Jeancarlos Ezequiel",
    "Pacheco Hernández, Esteban Santiago",
    "Paz Martínez, Génesis Valeria",
    "Pérez Barahona, Adrián Alessandro",
    "Pérez Barahona, Zoé Valentina",
    "Rivas Sánchez, Francisco Salvador",
    "Rivera Merlos, Nicolás Alexander",
    "Rodríguez Escalante, Erick Ezequiel",
    "Rodríguez López, Kimberly Valeria",
    "Salazar Cartagena, Valeria Isabella",
  ],
  5: [
    "Andrade Moreno, María Fernanda",
    "Barrera Molina, Sabrina Sofía",
    "Cabrera Guzmán, Lesly Damaris",
    "Calles Quijano, Eliette Antonella",
    "Cortez Sánchez, Sonia Carolina",
    "Cubías Hernández, Rosa de María",
    "Flores Cáceres, Mateo Adrián",
    "Fuentes Ascencio, Daniela Nohemy",
    "Galán Santos, Jefferson Adonay",
    "Gómez Menjívar, Fernando Andrés",
    "Guerra Martínez, Giovanny Gabriel",
    "Guevara Hernández, Tiffany Alexandra",
    "Hernández Molina, Brittany Fabiola",
    "Leiva Figueroa, Mateo José",
    "Lezama Reyes, Douglas David",
    "López Moreno, Kaylee Dayane",
    "Meléndez López, Melany Michelle",
    "Mendoza Portillo, Marbella Beatriz",
    "Munguía Vega, Iliana Esmeralda",
    "Navarro Trigueros, Axel Eduardo",
    "Polanco Méndez, Daniela Alessandra",
    "Reyes Martínez, Jacqueline Alexandra",
    "Santos Marroquín, Adriana Valeria",
    "Serrano Hernández, Cristian Kenneth",
    "Urbina Macías, Leticia Guadalupe",
  ],
  6: [
    "Ávalos Quijada, Santiago Adalberto",
    "Carrillo Ruiz, Josué Emmanuel",
    "Clímaco Sánchez, Sofía Celeste",
    "Cortez Hernández, Ana Camila",
    "Gálvez Carrión, Rocati Yaax",
    "Marroquín Vásquez, Mónica Ivonne",
    "Mejía Mira, Alicia Camila",
    "Molina Mata, Allison Valentina",
    "Mulato Sánchez, Raúl Alessandro",
    "Oviedo Cubías, Elena Sofía",
    "Rivera Deleón, Mateo Zaid",
    "Rodríguez López, Alejandro Enrique",
    "Serrano Martínez, María José",
  ],
  7: [
    "Abarca Medina, Mariana Guadalupe",
    "Aguirre Maravilla, Fernanda Paola",
    "Cabrera Guzmán, Henry Stanley",
    "Callejas Flores, Emanuel Alexander",
    "Calles Quijano, Mateo Alejandro",
    "Corvera Castro, Sofía Isabella",
    "García Escobar, Moises Eduardo",
    "González Hernández, Cristian Damián",
    "Guardado Mejía, Christian Ariel",
    "Hernández Hernández, Julia Milagro",
    "Marroquín Meléndez, Santiago Alexander",
    "Melara Martínez, Julio Ernesto",
    "Mena Marroquín, Diego Leonardo",
    "Méndez Martínez, Ashly Nicole",
    "Mónico Henríquez, Rocío Arianna",
    "Munguía Vega, Lissué Jael",
    "Nerio Contreras, Kimberly Camila",
    "Rivera Cedillos, Alexis Elías",
    "Serrano Martínez, María Isabel",
    "Siliezar Albayero, Nallely Ivonne",
    "Vásquez Sasso, Mateo Sebastián",
  ],
  8: [
    "Aguilar Jovel, Luis Anibal",
    "Alvarenga Guevara, Axel Santiago",
    "Aragón Santos, Kenedy Ediberto",
    "Ávalos Quijada, Mateo Alejandro",
    "Hernández Hernández, Jillian Juliette",
    "Luna Aguilar, Melanie Nicole",
    "Méndez Aquino, Sharon Marisol",
    "Méndez Martínez, Michael Stanley",
    "Quezada López, Valeria Celeste",
    "Rivera Domínguez, Kevin Adonay",
    "Rivera Guardado, Sofía Nathalia",
    "Rodríguez Navarrete, Celia Marianela",
    "Rojas Flores, Elías Geovanni",
  ],
  9: [
    "Abarca Medina, José Luis",
    "Alvarado Lemus, Daniela Nicole",
    "Araujo Beza, Gabriel Ernesto",
    "Deleón Zavaleta, Melany Guadalupe",
    "Deodanes Jorge, Samanta Elizabeth",
    "Fernández Moreira, Nelson Armando",
    "García Palacios, Hazel Abigail",
    "Hernández Martínez, Jennifer Jeannette",
    "Leiva Figueroa, Christopher Emilio",
    "Martell Campos, Christopher Steven",
    "Martínez Pérez, Camila Alessandra",
    "Melara Jorge, Valeria Alejandra",
    "Méndez Ponce, Diego Alejandro",
    "Mercedes López, María José",
    "Molina Zaldaña, Daniel Aldair",
    "Ortiz Tobar, Aarón Emmanuel",
    "Pineda Alfaro, Carlos Alberto",
    "Ramírez García, André Emiliano",
    "Reyes Mejía, Mónica Guadalupe",
    "Romero Coto, Zoe Tamara",
    "Vásquez Miranda, Carlos Daniel",
    "Zarco Reyes, Mauricio Elías",
  ],
};

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sessionData = JSON.parse(session.value);
    if (sessionData.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden ejecutar esta acción" }, { status: 403 });
    }

    // Obtener todos los grados
    const grados = await db.grado.findMany();
    const gradoMap = new Map(grados.map(g => [g.numero, g]));

    const resultados: { grado: number; agregados: number; existentes: number }[] = [];

    // Cargar estudiantes por grado
    for (const [gradoNum, estudiantes] of Object.entries(estudiantesPorGrado)) {
      const grado = gradoMap.get(parseInt(gradoNum));
      if (!grado) continue;

      let agregados = 0;
      let existentes = 0;

      for (let i = 0; i < estudiantes.length; i++) {
        const nombre = estudiantes[i];
        
        // Verificar si ya existe
        const existente = await db.estudiante.findFirst({
          where: { nombre, gradoId: grado.id }
        });

        if (existente) {
          existentes++;
        } else {
          await db.estudiante.create({
            data: {
              numero: i + 1,
              nombre,
              gradoId: grado.id,
            },
          });
          agregados++;
        }
      }

      resultados.push({
        grado: parseInt(gradoNum),
        agregados,
        existentes,
      });
    }

    // Calcular totales
    const totalAgregados = resultados.reduce((sum, r) => sum + r.agregados, 0);
    const totalExistentes = resultados.reduce((sum, r) => sum + r.existentes, 0);

    return NextResponse.json({
      message: "Nómina de estudiantes cargada exitosamente",
      resumen: {
        totalAgregados,
        totalExistentes,
        totalEstudiantes: totalAgregados + totalExistentes,
      },
      detalle: resultados,
    });
  } catch (error) {
    console.error("Error al cargar estudiantes:", error);
    return NextResponse.json(
      { error: "Error al cargar estudiantes" },
      { status: 500 }
    );
  }
}
