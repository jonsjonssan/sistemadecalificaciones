import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";
import { createAuditLog } from "@/lib/audit";

async function getUsuarioSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  return JSON.parse(session.value);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gradoId = searchParams.get("gradoId");
    const activos = searchParams.get("activos");

    let estudiantes;
    if (activos === "true") {
      estudiantes = await sql`
        SELECT * FROM "Estudiante" 
        WHERE "gradoId" = ${gradoId} AND activo = true
        ORDER BY numero
      `;
    } else if (activos === "false") {
      estudiantes = await sql`
        SELECT * FROM "Estudiante" 
        WHERE "gradoId" = ${gradoId} AND activo = false
        ORDER BY numero
      `;
    } else {
      estudiantes = await sql`
        SELECT * FROM "Estudiante" 
        WHERE "gradoId" = ${gradoId}
        ORDER BY numero
      `;
    }

    return NextResponse.json(estudiantes);
  } catch (error) {
    console.error("Error al obtener estudiantes:", error);
    return NextResponse.json({ error: "Error al obtener estudiantes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const data = await request.json();
    const { nombre, gradoId } = data;

    if (!nombre || !gradoId) {
      return NextResponse.json({ error: "Nombre y grado son requeridos" }, { status: 400 });
    }

    const ultimo = await sql`
      SELECT numero FROM "Estudiante" 
      WHERE "gradoId" = ${gradoId}
      ORDER BY numero DESC LIMIT 1
    `;

    const nuevoNumero = ultimo.length > 0 ? ultimo[0].numero + 1 : 1;

    const result = await sql`
      INSERT INTO "Estudiante" (numero, nombre, "gradoId", "createdAt", "updatedAt")
      VALUES (${nuevoNumero}, ${nombre}, ${gradoId}, NOW(), NOW())
      RETURNING *
    `;

    // Audit log
    if (session && session.id) {
      await createAuditLog({
        usuarioId: session.id,
        accion: "CREATE",
        entidad: "Estudiante",
        entidadId: result[0].id,
        detalles: JSON.stringify({ nombre, gradoId }),
      });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error al crear estudiante:", error);
    return NextResponse.json({ error: "Error al crear estudiante" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { estudiantes, gradoId } = await request.json();

    if (!estudiantes || !Array.isArray(estudiantes)) {
      return NextResponse.json({ error: "Se requiere un array de nombres" }, { status: 400 });
    }

    const ultimo = await sql`
      SELECT numero FROM "Estudiante" 
      WHERE "gradoId" = ${gradoId}
      ORDER BY numero DESC LIMIT 1
    `;

    const numeroInicial = ultimo.length > 0 ? ultimo[0].numero : 0;

    const creados: any[] = [];
    for (let i = 0; i < estudiantes.length; i++) {
      const result = await sql`
        INSERT INTO "Estudiante" (numero, nombre, "gradoId", "createdAt", "updatedAt")
        VALUES (${numeroInicial + i + 1}, ${estudiantes[i]}, ${gradoId}, NOW(), NOW())
        RETURNING *
      `;
      creados.push(result[0]);
    }

    return NextResponse.json({ message: `${creados.length} estudiantes creados`, estudiantes: creados });
  } catch (error) {
    console.error("Error al crear estudiantes:", error);
    return NextResponse.json({ error: "Error al crear estudiantes" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    // Get student info before deleting for audit
    const student = await sql`SELECT nombre, "gradoId" FROM "Estudiante" WHERE id = ${id}`;

    await sql`DELETE FROM "Calificacion" WHERE "estudianteId" = ${id}`;
    await sql`DELETE FROM "Asistencia" WHERE "estudianteId" = ${id}`;
    await sql`DELETE FROM "Estudiante" WHERE id = ${id}`;

    // Audit log
    if (session && session.id) {
      await createAuditLog({
        usuarioId: session.id,
        accion: "DELETE",
        entidad: "Estudiante",
        entidadId: id,
        detalles: JSON.stringify({ nombre: student[0]?.nombre, gradoId: student[0]?.gradoId }),
      });
    }

    return NextResponse.json({ message: "Estudiante eliminado" });
  } catch (error) {
    console.error("Error al eliminar estudiante:", error);
    return NextResponse.json({ error: "Error al eliminar estudiante" }, { status: 500 });
  }
}
