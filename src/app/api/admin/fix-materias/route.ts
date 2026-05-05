import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const sessionData = verifySession(session.value);
    if (!["admin", "admin-directora", "admin-codirectora"].includes(sessionData.rol)) {
      return NextResponse.json({ error: "Solo administradores pueden ejecutar esta acción" }, { status: 403 });
    }

    const materiasABorrar = await db.materia.findMany({
      where: {
        nombre: "Desarrollo Corporal y Educación Física"
      },
      include: {
        grado: true
      }
    });

    console.log(`Encontradas ${materiasABorrar.length} materias para procesar.`);

    for (const materiaOld of materiasABorrar) {
      const gradoNum = materiaOld.grado.numero;
      const targetNombre = gradoNum >= 7 ? "Educación Física y Deportes" : "Desarrollo Corporal";

      // 1. Asegurar materia destino
      let materiaNew = await db.materia.findFirst({
        where: {
          nombre: targetNombre,
          gradoId: materiaOld.gradoId
        }
      });

      if (!materiaNew) {
        materiaNew = await db.materia.create({
          data: {
            nombre: targetNombre,
            gradoId: materiaOld.gradoId
          }
        });
      }

      // 2. Migrar Calificaciones
      await db.calificacion.updateMany({
        where: { materiaId: materiaOld.id },
        data: { materiaId: materiaNew.id }
      });

      // 3. Migrar Asignaciones de Docentes
      const asignaciones = await db.docenteMateria.findMany({
        where: { materiaId: materiaOld.id }
      });

      for (const asig of asignaciones) {
        await db.docenteMateria.upsert({
          where: {
            docenteId_materiaId: {
              docenteId: asig.docenteId,
              materiaId: materiaNew.id
            }
          },
          update: {},
          create: {
            docenteId: asig.docenteId,
            materiaId: materiaNew.id
          }
        });
      }

      // 4. Migrar Configuración de Actividades (si la nueva no tiene)
      const configsOld = await db.configActividad.findMany({
        where: { materiaId: materiaOld.id }
      });

      for (const cfg of configsOld) {
        const exist = await db.configActividad.findFirst({
          where: { materiaId: materiaNew.id, trimestre: cfg.trimestre }
        });
        if (!exist) {
          await db.configActividad.create({
            data: {
              ...cfg,
              id: undefined,
              materiaId: materiaNew.id
            }
          });
        }
      }

      // 5. Borrar materia vieja
      // Primero limpiar relaciones fallidas si las hay (aunque updateMany debería bastar)
      await db.docenteMateria.deleteMany({ where: { materiaId: materiaOld.id } });
      await db.configActividad.deleteMany({ where: { materiaId: materiaOld.id } });
      await db.calificacion.deleteMany({ where: { materiaId: materiaOld.id } }); // Por si quedaron duplicados
      
      await db.materia.delete({
        where: { id: materiaOld.id }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Se procesaron y eliminaron ${materiasABorrar.length} materias.` 
    });
  } catch (error: any) {
    console.error("Error en fix-materias:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
