import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

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
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuario = JSON.parse(session.value);
    if (usuario.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden crear usuarios" }, { status: 403 });
    }

    const { email, password, nombre, rol, gradosAsignados, materiasAsignadas } = await request.json();

    if (!email || !password || !nombre || !rol) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
    }

    const existeEmail = await sql`SELECT id FROM "Usuario" WHERE email = ${email}`;
    if (existeEmail.length > 0) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = await sql`
      INSERT INTO "Usuario" (email, password, nombre, rol)
      VALUES (${email}, ${hashedPassword}, ${nombre}, ${rol})
      RETURNING id, email, nombre, rol, activo
    `;

    if (rol === "docente" && gradosAsignados && gradosAsignados.length > 0) {
      for (const gradoId of gradosAsignados) {
        await sql`UPDATE "Grado" SET "docenteId" = ${nuevoUsuario[0].id} WHERE id = ${gradoId}`;
      }
    }

    if (rol === "docente" && materiasAsignadas && materiasAsignadas.length > 0) {
      for (const materiaId of materiasAsignadas) {
        await sql`
          INSERT INTO "DocenteMateria" ("docenteId", "materiaId")
          VALUES (${nuevoUsuario[0].id}, ${materiaId})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    return NextResponse.json(nuevoUsuario[0]);
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuarioActual = JSON.parse(session.value);
    if (usuarioActual.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden modificar usuarios" }, { status: 403 });
    }

    const body = await request.json();
    const { id, nombre, rol, activo, password, gradoAsignados: gradoAsig, gradosAsignados, materiasAsignadas } = body;
    const gradoDelFrontend = gradoAsig || gradosAsignados;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    if (id === usuarioActual.id && activo === false) {
      return NextResponse.json({ error: "No puedes desactivarte a ti mismo" }, { status: 400 });
    }

    if (nombre || rol || activo !== undefined || password) {
      const current = await sql`SELECT * FROM "Usuario" WHERE id = ${id}`;
      if (current.length === 0) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }
      
      await sql`
        UPDATE "Usuario" SET
          nombre = ${nombre || current[0].nombre},
          rol = ${rol || current[0].rol},
          activo = ${activo !== undefined ? activo : current[0].activo},
          password = ${password || current[0].password},
          "updatedAt" = NOW()
        WHERE id = ${id}
      `;
    }

    if (gradoDelFrontend !== undefined) {
      await sql`UPDATE "Grado" SET "docenteId" = NULL WHERE "docenteId" = ${id}`;
      if (gradoDelFrontend && gradoDelFrontend.length > 0) {
        for (const gradoId of gradoDelFrontend) {
          await sql`UPDATE "Grado" SET "docenteId" = ${id} WHERE id = ${gradoId}`;
        }
      }
    }

    if (materiasAsignadas !== undefined) {
      await sql`DELETE FROM "DocenteMateria" WHERE "docenteId" = ${id}`;
      if (materiasAsignadas && materiasAsignadas.length > 0) {
        for (const materiaId of materiasAsignadas) {
          await sql`
            INSERT INTO "DocenteMateria" ("docenteId", "materiaId")
            VALUES (${id}, ${materiaId})
            ON CONFLICT ("docenteId", "materiaId") DO NOTHING
          `;
        }
      }
    }

    const usuarioActualizado = await sql`SELECT id, email, nombre, rol, activo FROM "Usuario" WHERE id = ${id}`;
    return NextResponse.json(usuarioActualizado[0]);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    console.log("DELETE session:", session);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuarioActual = session;
    console.log("DELETE usuarioActual:", usuarioActual);
    if (usuarioActual.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden eliminar usuarios" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    if (id === usuarioActual.id) {
      return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
    }

    await sql`UPDATE "Grado" SET "docenteId" = NULL WHERE "docenteId" = ${id}`;
    await sql`DELETE FROM "DocenteMateria" WHERE "docenteId" = ${id}`;
    await sql`DELETE FROM "Usuario" WHERE id = ${id}`;

    return NextResponse.json({ message: "Usuario eliminado" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 });
  }
}
