import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

async function getUsuarioSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  return JSON.parse(session.value);
}

export async function GET() {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const prisma = prisma;

    const usuarios = await prisma.usuario.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        gradosComoTutor: { select: { id: true, numero: true, seccion: true, año: true } },
        materiasAsignadas: {
          include: {
            materia: {
              include: {
                grado: { select: { id: true, numero: true, seccion: true } },
              },
            },
          },
        },
      },
    });



    const usuariosFormateados = usuarios.map((u: any) => ({
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      rol: u.rol,
      activo: u.activo,
      createdAt: u.createdAt,
      gradosComoTutor: u.gradosComoTutor,
      materias: u.materiasAsignadas.map((dm: any) => ({
        id: dm.materia.id,
        nombre: dm.materia.nombre,
        gradoId: dm.materia.gradoId,
        gradoNumero: dm.materia.grado?.numero,
        gradoSeccion: dm.materia.grado?.seccion,
      })),
    }));

    return NextResponse.json(usuariosFormateados);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json({ error: "Error al obtener usuarios", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden crear usuarios" }, { status: 403 });
    }

    const { email, password, nombre, rol, gradosAsignados, materiasAsignadas } = await request.json();

    if (!email || !password || !nombre || !rol) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
    }

    const prisma = prisma;

    const existeEmail = await prisma.usuario.findUnique({ where: { email } });
    if (existeEmail) {

      return NextResponse.json({ error: "El email ya está registrado" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        email,
        password: hashedPassword,
        nombre,
        rol,
      },
    });

    if (gradosAsignados && gradosAsignados.length > 0) {
      await prisma.grado.updateMany({
        where: { id: { in: gradosAsignados } },
        data: { docenteId: nuevoUsuario.id },
      });
    }

    if (materiasAsignadas && materiasAsignadas.length > 0) {
      await prisma.docenteMateria.createMany({
        data: materiasAsignadas.map((materiaId: string) => ({
          id: randomUUID(),
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
  } catch (error: any) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json({ error: error.message || "Error al crear usuario" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden modificar usuarios" }, { status: 403 });
    }

    const body = await request.json();
    const { id, nombre, rol, activo, password, gradosAsignados, materiasAsignadas } = body;

    const gradosReales = body.gradoAsignados || body.gradosAsignados || gradosAsignados;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    if (id === session.id && activo === false) {
      return NextResponse.json({ error: "No puedes desactivarte a ti mismo" }, { status: 400 });
    }

    const prisma = prisma;

    const current = await prisma.usuario.findUnique({ where: { id } });
    if (!current) {

      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    let finalPassword = current.password;
    if (password) {
      finalPassword = await bcrypt.hash(password, 10);
    }

    await prisma.usuario.update({
      where: { id },
      data: {
        nombre: nombre || current.nombre,
        rol: rol || current.rol,
        activo: activo !== undefined ? activo : current.activo,
        password: finalPassword,
      },
    });

    if (gradosReales !== undefined) {
      await prisma.grado.updateMany({
        where: { docenteId: id },
        data: { docenteId: null },
      });
      if (gradosReales && gradosReales.length > 0) {
        await prisma.grado.updateMany({
          where: { id: { in: gradosReales } },
          data: { docenteId: id },
        });
      }
    }

    if (materiasAsignadas !== undefined) {
      await prisma.docenteMateria.deleteMany({ where: { docenteId: id } });
      if (materiasAsignadas && materiasAsignadas.length > 0) {
        await prisma.docenteMateria.createMany({
          data: materiasAsignadas.map((materiaId: string) => ({
            id: randomUUID(),
            docenteId: id,
            materiaId,
          })),
          skipDuplicates: true,
        });
      }
    }

    const usuarioActualizado = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, email: true, nombre: true, rol: true, activo: true },
    });



    return NextResponse.json(usuarioActualizado);
  } catch (error: any) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json({ error: error.message || "Error al actualizar usuario" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden eliminar usuarios" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    if (id === session.id) {
      return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
    }

    const prisma = prisma;

    await prisma.grado.updateMany({ where: { docenteId: id }, data: { docenteId: null } });
    await prisma.docenteMateria.deleteMany({ where: { docenteId: id } });
    await prisma.usuario.delete({ where: { id } });



    return NextResponse.json({ message: "Usuario eliminado" });
  } catch (error: any) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json({ error: error.message || "Error al eliminar usuario" }, { status: 500 });
  }
}
