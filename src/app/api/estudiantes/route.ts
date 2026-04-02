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
    console.log("[estudiantes POST] Iniciando creación de estudiante");
    const session = await getUsuarioSession();
    console.log("[estudiantes POST] Session:", session ? session.nombre : "null");
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const data = await request.json();
    console.log("[estudiantes POST] Request body:", JSON.stringify(data));
    const { nombre, gradoId } = data;

    if (!nombre || !gradoId) {
      console.log("[estudiantes POST] Faltan campos:", { nombre, gradoId });
      return NextResponse.json({ error: "Nombre y grado son requeridos" }, { status: 400 });
    }

    if (session.rol !== "admin" && session.rol !== "docente") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Verify grado exists
    const gradoCheck = await sql`SELECT id, numero, seccion FROM "Grado" WHERE id = ${gradoId}`;
    console.log("[estudiantes POST] Grado existe:", gradoCheck.length > 0 ? gradoCheck[0] : "NO");
    if (gradoCheck.length === 0) {
      return NextResponse.json({ error: "El grado seleccionado no existe" }, { status: 400 });
    }

    const ultimo = await sql`
      SELECT numero FROM "Estudiante" 
      WHERE "gradoId" = ${gradoId}
      ORDER BY numero DESC LIMIT 1
    `;
    console.log("[estudiantes POST] Último número:", ultimo.length > 0 ? ultimo[0].numero : "0 (primero)");

    const nuevoNumero = ultimo.length > 0 ? ultimo[0].numero + 1 : 1;

    console.log("[estudiantes POST] Insertando estudiante:", { numero: nuevoNumero, nombre, gradoId });
    const result = await sql`
      INSERT INTO "Estudiante" (numero, nombre, "gradoId", activo, "createdAt", "updatedAt")
      VALUES (${nuevoNumero}, ${nombre}, ${gradoId}, true, NOW(), NOW())
      RETURNING *
    `;
    console.log("[estudiantes POST] Insertado correctamente:", result[0]?.id);

    // Audit log (non-blocking)
    try {
      if (session && session.id) {
        await createAuditLog({
          usuarioId: session.id,
          accion: "CREATE_ESTUDIANTE",
          entidad: "Estudiante",
          entidadId: result[0].id,
          detalles: JSON.stringify({ nombre, gradoId }),
        });
      }
    } catch (auditError) {
      console.error("Error creating audit log:", auditError);
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("[estudiantes POST] Error al crear estudiante:", error);
    return NextResponse.json({ error: "Error al crear estudiante: " + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log("[estudiantes PUT] Iniciando creación masiva");
    const session = await getUsuarioSession();
    console.log("[estudiantes PUT] Session:", session ? session.nombre : "null");
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { estudiantes, gradoId } = await request.json();
    console.log("[estudiantes PUT] Request body:", { count: estudiantes?.length, gradoId });

    if (!estudiantes || !Array.isArray(estudiantes)) {
      return NextResponse.json({ error: "Se requiere un array de nombres" }, { status: 400 });
    }

    if (!gradoId) {
      return NextResponse.json({ error: "Grado es requerido" }, { status: 400 });
    }

    if (session.rol !== "admin" && session.rol !== "docente") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Verify grado exists
    const gradoCheck = await sql`SELECT id, numero, seccion FROM "Grado" WHERE id = ${gradoId}`;
    console.log("[estudiantes PUT] Grado existe:", gradoCheck.length > 0 ? gradoCheck[0] : "NO");
    if (gradoCheck.length === 0) {
      return NextResponse.json({ error: "El grado seleccionado no existe" }, { status: 400 });
    }

    const ultimo = await sql`
      SELECT numero FROM "Estudiante" 
      WHERE "gradoId" = ${gradoId}
      ORDER BY numero DESC LIMIT 1
    `;

    const numeroInicial = ultimo.length > 0 ? ultimo[0].numero : 0;
    console.log("[estudiantes PUT] Número inicial:", numeroInicial);

    const creados: any[] = [];
    for (let i = 0; i < estudiantes.length; i++) {
      console.log("[estudiantes PUT] Insertando:", estudiantes[i], "número:", numeroInicial + i + 1);
      const result = await sql`
        INSERT INTO "Estudiante" (numero, nombre, "gradoId", activo, "createdAt", "updatedAt")
        VALUES (${numeroInicial + i + 1}, ${estudiantes[i]}, ${gradoId}, true, NOW(), NOW())
        RETURNING *
      `;
      creados.push(result[0]);
    }
    console.log("[estudiantes PUT] Creados:", creados.length);

    // Audit log (non-blocking)
    try {
      if (session && session.id) {
        await createAuditLog({
          usuarioId: session.id,
          accion: "CREATE_ESTUDIANTES_BULK",
          entidad: "Estudiante",
          detalles: JSON.stringify({ count: creados.length, gradoId }),
        });
      }
    } catch (auditError) {
      console.error("Error creating audit log:", auditError);
    }

    return NextResponse.json({ message: `${creados.length} estudiantes creados`, estudiantes: creados });
  } catch (error) {
    console.error("[estudiantes PUT] Error al crear estudiantes:", error);
    return NextResponse.json({ error: "Error al crear estudiantes: " + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
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
    try {
      if (session && session.id) {
        await createAuditLog({
          usuarioId: session.id,
          accion: "DELETE_ESTUDIANTE",
          entidad: "Estudiante",
          entidadId: id,
          detalles: JSON.stringify({ nombre: student[0]?.nombre, gradoId: student[0]?.gradoId }),
        });
      }
    } catch (auditError) {
      console.error("Error creating audit log:", auditError);
    }

    return NextResponse.json({ message: "Estudiante eliminado" });
  } catch (error) {
    console.error("Error al eliminar estudiante:", error);
    return NextResponse.json({ error: "Error al eliminar estudiante" }, { status: 500 });
  }
}
