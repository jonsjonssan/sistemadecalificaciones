import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sessionData = JSON.parse(session.value);
    if (sessionData.rol !== "admin") {
      return NextResponse.json({ error: "Solo admin puede ejecutar esta acción" }, { status: 403 });
    }

    const grados = await sql`SELECT id, numero FROM "Grado" WHERE numero >= 7`;
    
    let actualizados = 0;
    for (const grado of grados) {
      const materia = await sql`SELECT id, nombre FROM "Materia" WHERE "gradoId" = ${grado.id} AND nombre = 'Desarrollo Corporal'`;
      
      if (materia.length > 0) {
        console.log(`Grado ${grado.numero}: ${materia[0].nombre} -> Educación Física y Deportes`);
        await sql`UPDATE "Materia" SET nombre = 'Educación Física y Deportes' WHERE id = ${materia[0].id}`;
        actualizados++;
      }
    }

    return NextResponse.json({ message: `${actualizados} materias actualizadas` });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
