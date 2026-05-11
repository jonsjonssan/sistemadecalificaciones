import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export const revalidate = 300;

// ==================== Helpers ====================

async function getUsuarioSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  return verifySession(session.value);
}

/**
 * Verifica si el usuario tiene rol de administrador (cualquier variante)
 */
function isAdmin(rol: string): boolean {
  return ["admin", "admin-directora", "admin-codirectora"].includes(rol);
}

/**
 * Verifica si el usuario puede eliminar otros usuarios
 * Cualquier administrador puede eliminar usuarios
 */
function canDeleteUsers(session: any): boolean {
  return ["admin", "admin-directora", "admin-codirectora"].includes(session.rol);
}

/**
 * Verifica si el usuario puede ver todas las calificaciones
 */
function canViewAll(session: any): boolean {
  return isAdmin(session.rol);
}

// ==================== GET: Listar usuarios ====================

export async function GET() {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo admins pueden ver la lista completa de usuarios
    if (!isAdmin(session.rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const usuarios = await sql`
      SELECT u.id, u.email, u.nombre, u.rol, u.activo, u."createdAt"
      FROM "Usuario" u
      ORDER BY u."createdAt" DESC
    `;

    const usuariosFormateados = await Promise.all(usuarios.map(async (u: any) => {
      const materiasRaw = await sql`
        SELECT dm.id, m.id as materia_id, m.nombre as materia_nombre,
               g.id as grado_id, g.numero as grado_numero, g.seccion as grado_seccion
        FROM "DocenteMateria" dm
        JOIN "Materia" m ON dm."materiaId" = m.id
        JOIN "Grado" g ON m."gradoId" = g.id
        WHERE dm."docenteId" = ${u.id}
      `;

      return {
        ...u,
        materias: materiasRaw.map((m: any) => ({
          id: m.materia_id,
          nombre: m.materia_nombre,
          gradoId: m.grado_id,
          gradoNumero: m.grado_numero,
          gradoSeccion: m.grado_seccion,
        })),
      };
    }));

    return NextResponse.json(usuariosFormateados);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}

// ==================== POST: Crear usuario ====================

export async function POST(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo admin principal puede crear usuarios
    if (!canDeleteUsers(session)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { email, password, nombre, rol, materiasAsignadas } = await request.json();

    if (!email || !password || !nombre || !rol) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
    }

    const existeEmail = await sql`SELECT id FROM "Usuario" WHERE email = ${email}`;
    if (existeEmail.length > 0) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = await sql`
      INSERT INTO "Usuario" (email, password, nombre, rol, "createdAt", "updatedAt")
      VALUES (${email}, ${hashedPassword}, ${nombre}, ${rol}, NOW(), NOW())
      RETURNING id, email, nombre, rol, activo
    `;

    if (materiasAsignadas && materiasAsignadas.length > 0) {
      for (const materiaId of materiasAsignadas) {
        await sql`
          INSERT INTO "DocenteMateria" ("id", "docenteId", "materiaId")
          VALUES (${randomUUID()}, ${nuevoUsuario[0].id}, ${materiaId})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    return NextResponse.json(nuevoUsuario[0]);
  } catch (error: any) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json({ error: error.message || "Error al crear usuario" }, { status: 500 });
  }
}

// ==================== PUT: Actualizar usuario ====================

export async function PUT(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo admin principal puede modificar usuarios
    if (!canDeleteUsers(session)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { id, nombre, rol, activo, password, materiasAsignadas } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    if (id === session.id && activo === false) {
      return NextResponse.json({ error: "No puedes desactivarte a ti mismo" }, { status: 400 });
    }

    const usuarioActualizado = await db.$transaction(async (tx: any) => {
      let updatedUser: any;

      if (nombre !== undefined || rol !== undefined || activo !== undefined || password) {
        const current = await tx.usuario.findUnique({ where: { id } });
        if (!current) {
          throw { status: 404, message: "Usuario no encontrado" };
        }

        const updateData: any = { updatedAt: new Date() };
        if (nombre !== undefined) updateData.nombre = nombre;
        if (rol !== undefined) updateData.rol = rol;
        if (activo !== undefined) updateData.activo = activo;
        if (password) {
          updateData.password = await bcrypt.hash(password, 10);
        }

        updatedUser = await tx.usuario.update({
          where: { id },
          data: updateData,
          select: { id: true, email: true, nombre: true, rol: true, activo: true },
        });
      }

      if (materiasAsignadas !== undefined) {
        await tx.docenteMateria.deleteMany({ where: { docenteId: id } });
        if (materiasAsignadas && materiasAsignadas.length > 0) {
          for (const materiaId of materiasAsignadas) {
            await tx.docenteMateria.create({
              data: { docenteId: id, materiaId },
            });
          }
        }
      }

      // Si no se actualizó el usuario (solo materias), obtenerlo para respuesta
      if (!updatedUser) {
        updatedUser = await tx.usuario.findUnique({
          where: { id },
          select: { id: true, email: true, nombre: true, rol: true, activo: true },
        });
      }

      return updatedUser;
    });

    if (!usuarioActualizado) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(usuarioActualizado);
  } catch (error: any) {
    if (error?.status === 404) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json({ error: error.message || "Error al actualizar usuario" }, { status: 500 });
  }
}

// ==================== DELETE: Eliminar usuario ====================

export async function DELETE(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo el admin principal puede eliminar usuarios
    if (!canDeleteUsers(session)) {
      return NextResponse.json({ error: "Solo el administrador principal puede eliminar usuarios" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    if (id === session.id) {
      return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
    }

    await db.$transaction([
      db.docenteMateria.deleteMany({ where: { docenteId: id } }),
      db.usuario.delete({ where: { id } }),
    ]);

    return NextResponse.json({ message: "Usuario eliminado" });
  } catch (error: any) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json({ error: error.message || "Error al eliminar usuario" }, { status: 500 });
  }
}
