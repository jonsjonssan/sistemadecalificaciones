import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
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

    const usuarios = await sql`
      SELECT u.id, u.email, u.nombre, u.rol, u.activo, u."createdAt"
      FROM "Usuario" u
      ORDER BY u."createdAt" DESC
    `;

    const usuariosFormateados = await Promise.all(usuarios.map(async (u: any) => {
      const grados = await sql`
        SELECT g.id, g.numero, g.seccion, g.año
        FROM "Grado" g WHERE g."docenteId" = ${u.id}
      `;

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
        gradosComoTutor: grados,
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

export async function POST(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    console.log("[usuarios POST] Session:", JSON.stringify(session));
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden crear usuarios" }, { status: 403 });
    }

    const { email, password, nombre, rol, gradosAsignados, materiasAsignadas } = await request.json();
    console.log("[usuarios POST] Data:", { email, nombre, rol, gradosAsignados, materiasAsignadas });

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

    if (gradosAsignados && gradosAsignados.length > 0) {
      for (const gradoId of gradosAsignados) {
        await sql`UPDATE "Grado" SET "docenteId" = ${nuevoUsuario[0].id} WHERE id = ${gradoId}`;
      }
    }

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

    if (nombre !== undefined || rol !== undefined || activo !== undefined || password) {
      const current = await sql`SELECT * FROM "Usuario" WHERE id = ${id}`;
      if (current.length === 0) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }
      
      let finalPassword = current[0].password;
      if (password) {
        finalPassword = await bcrypt.hash(password, 10);
      }

      await sql`
        UPDATE "Usuario" SET
          nombre = ${nombre || current[0].nombre},
          rol = ${rol || current[0].rol},
          activo = ${activo !== undefined ? activo : current[0].activo},
          password = ${finalPassword},
          "updatedAt" = NOW()
        WHERE id = ${id}
      `;
    }

    if (gradosReales !== undefined) {
      await sql`UPDATE "Grado" SET "docenteId" = NULL WHERE "docenteId" = ${id}`;
      if (gradosReales && gradosReales.length > 0) {
        for (const gradoId of gradosReales) {
          await sql`UPDATE "Grado" SET "docenteId" = ${id} WHERE id = ${gradoId}`;
        }
      }
    }

    if (materiasAsignadas !== undefined) {
      await sql`DELETE FROM "DocenteMateria" WHERE "docenteId" = ${id}`;
      if (materiasAsignadas && materiasAsignadas.length > 0) {
        for (const materiaId of materiasAsignadas) {
          await sql`
            INSERT INTO "DocenteMateria" ("id", "docenteId", "materiaId")
            VALUES (${randomUUID()}, ${id}, ${materiaId})
            ON CONFLICT DO NOTHING
          `;
        }
      }
    }

    const usuarioActualizado = await sql`SELECT id, email, nombre, rol, activo FROM "Usuario" WHERE id = ${id}`;
    return NextResponse.json(usuarioActualizado[0]);
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

    await sql`UPDATE "Grado" SET "docenteId" = NULL WHERE "docenteId" = ${id}`;
    await sql`DELETE FROM "DocenteMateria" WHERE "docenteId" = ${id}`;
    await sql`DELETE FROM "Usuario" WHERE id = ${id}`;

    return NextResponse.json({ message: "Usuario eliminado" });
  } catch (error: any) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json({ error: error.message || "Error al eliminar usuario" }, { status: 500 });
  }
}
