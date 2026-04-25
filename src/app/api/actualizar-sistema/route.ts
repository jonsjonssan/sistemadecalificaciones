import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";

// API para agregar Inglés y corregir datos
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sessionData = verifySession(session.value);
    if (sessionData.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden ejecutar esta acción" }, { status: 403 });
    }

    const resultados = {
      inglesAgregado: 0,
      correoCorregido: false,
      inglesAsignado: false,
    };

    // 1. Agregar materia "Inglés" a todos los grados
    const grados = await db.grado.findMany();
    
    for (const grado of grados) {
      // Verificar si ya existe Inglés en este grado
      const existeIngles = await db.materia.findFirst({
        where: { gradoId: grado.id, nombre: "Inglés" }
      });
      
      if (!existeIngles) {
        const materia = await db.materia.create({
          data: {
            nombre: "Inglés",
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
        resultados.inglesAgregado++;
      }
    }

    // 2. Corregir el correo de Jonathan Araujo
    const jonathan = await db.usuario.findFirst({
      where: { email: "jonatha.araujo.mendoza@clases.edu.sv" }
    });
    
    if (jonathan) {
      await db.usuario.update({
        where: { id: jonathan.id },
        data: { email: "jonathan.araujo.mendoza@clases.edu.sv" }
      });
      resultados.correoCorregido = true;
    }

    // 3. Asignar Inglés (7°, 8°, 9°) a Diana Nicole Rojas Urias
    const diana = await db.usuario.findUnique({
      where: { email: "05980194-0@clases.edu.sv" }
    });
    
    if (diana) {
      // Obtener materias de Inglés para grados 7, 8, 9
      for (const grado of grados) {
        if (grado.numero >= 7 && grado.numero <= 9) {
          const materiaIngles = await db.materia.findFirst({
            where: { gradoId: grado.id, nombre: "Inglés" }
          });
          
          if (materiaIngles) {
            // Verificar si ya está asignada
            const existente = await db.docenteMateria.findFirst({
              where: { docenteId: diana.id, materiaId: materiaIngles.id }
            });
            
            if (!existente) {
              await db.docenteMateria.create({
                data: {
                  docenteId: diana.id,
                  materiaId: materiaIngles.id,
                }
              });
            }
          }
        }
      }
      resultados.inglesAsignado = true;
    }

    return NextResponse.json({
      message: "Sistema actualizado correctamente",
      resultados,
    });
  } catch (error) {
    console.error("Error al actualizar sistema:", error);
    return NextResponse.json(
      { error: "Error al actualizar sistema" },
      { status: 500 }
    );
  }
}
