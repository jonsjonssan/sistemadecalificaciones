import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

// Listar usuarios
export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuarios = await db.usuario.findMany({
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        createdAt: true,
        gradosComoTutor: {
          select: {
            id: true,
            numero: true,
            seccion: true,
            año: true,
          },
        },
        materiasAsignadas: {
          select: {
            id: true,
            materia: {
              select: {
                id: true,
                nombre: true,
                grado: {
                  select: {
                    id: true,
                    numero: true,
                    seccion: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transformar la respuesta para incluir materias formateadas
    const usuariosFormateados = usuarios.map(u => ({
      ...u,
      materias: u.materiasAsignadas?.map(m => ({
        id: m.materia.id,
        nombre: m.materia.nombre,
        gradoId: m.materia.grado.id,
        gradoNumero: m.materia.grado.numero,
        gradoSeccion: m.materia.grado.seccion,
      })) || [],
    }));

    return NextResponse.json(usuariosFormateados);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

// Crear usuario
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuario = JSON.parse(session.value);
    if (usuario.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden crear usuarios" }, { status: 403 });
    }

    const { email, password, nombre, rol, gradosAsignados, materiasAsignadas } = await request.json();

    if (!email || !password || !nombre || !rol) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    const existeEmail = await db.usuario.findUnique({
      where: { email },
    });

    if (existeEmail) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 400 }
      );
    }

    // Crear usuario
    const nuevoUsuario = await db.usuario.create({
      data: {
        email,
        password,
        nombre,
        rol,
      },
    });

    // Si es docente y hay grados asignados (para grados 2-5, tutor)
    if (rol === "docente" && gradosAsignados && gradosAsignados.length > 0) {
      await db.grado.updateMany({
        where: { id: { in: gradosAsignados } },
        data: { docenteId: nuevoUsuario.id },
      });
    }

    // Si es docente y hay materias asignadas (para grados 6-9, especialista)
    if (rol === "docente" && materiasAsignadas && materiasAsignadas.length > 0) {
      await db.docenteMateria.createMany({
        data: materiasAsignadas.map((materiaId: string) => ({
          docenteId: nuevoUsuario.id,
          materiaId,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      id: nuevoUsuario.id,
      email: nuevoUsuario.email,
      nombre: nuevoUsuario.nombre,
      rol: nuevoUsuario.rol,
      activo: nuevoUsuario.activo,
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    );
  }
}

// Actualizar usuario (incluyendo asignación de grados y materias)
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuarioActual = JSON.parse(session.value);
    if (usuarioActual.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden modificar usuarios" }, { status: 403 });
    }

    const { id, nombre, rol, activo, password, gradosAsignados, materiasAsignadas } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    // Prevenir que el admin se desactive a sí mismo
    if (id === usuarioActual.id && activo === false) {
      return NextResponse.json({ error: "No puedes desactivarte a ti mismo" }, { status: 400 });
    }

    // Construir data de actualización
    const updateData: Record<string, unknown> = {};
    if (nombre) updateData.nombre = nombre;
    if (rol) updateData.rol = rol;
    if (activo !== undefined) updateData.activo = activo;
    if (password) updateData.password = password;

    // Actualizar usuario
    const usuarioActualizado = await db.usuario.update({
      where: { id },
      data: updateData,
    });

    // Si es docente, actualizar grados asignados (tutor para grados 2-5)
    if (gradosAsignados !== undefined) {
      // Primero quitar asignaciones anteriores de este docente
      await db.grado.updateMany({
        where: { docenteId: id },
        data: { docenteId: null },
      });
      
      // Asignar nuevos grados
      if (gradosAsignados && gradosAsignados.length > 0) {
        await db.grado.updateMany({
          where: { id: { in: gradosAsignados } },
          data: { docenteId: id },
        });
      }
    }

    // Si es docente, actualizar materias asignadas (especialista para grados 6-9)
    if (materiasAsignadas !== undefined) {
      // Primero eliminar todas las asignaciones anteriores
      await db.docenteMateria.deleteMany({
        where: { docenteId: id },
      });
      
      // Crear nuevas asignaciones
      if (materiasAsignadas && materiasAsignadas.length > 0) {
        await db.docenteMateria.createMany({
          data: materiasAsignadas.map((materiaId: string) => ({
            docenteId: id,
            materiaId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json({
      id: usuarioActualizado.id,
      email: usuarioActualizado.email,
      nombre: usuarioActualizado.nombre,
      rol: usuarioActualizado.rol,
      activo: usuarioActualizado.activo,
    });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}

// Eliminar usuario
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuarioActual = JSON.parse(session.value);
    if (usuarioActual.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden eliminar usuarios" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    // Prevenir que el admin se elimine a sí mismo
    if (id === usuarioActual.id) {
      return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
    }

    // Quitar asignaciones de grados del usuario
    await db.grado.updateMany({
      where: { docenteId: id },
      data: { docenteId: null },
    });

    // Eliminar asignaciones de materias
    await db.docenteMateria.deleteMany({
      where: { docenteId: id },
    });

    // Eliminar usuario
    await db.usuario.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Usuario eliminado" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 }
    );
  }
}
