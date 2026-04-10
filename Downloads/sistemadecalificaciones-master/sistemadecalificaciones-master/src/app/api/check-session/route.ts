import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session) {
      return NextResponse.json({ error: "No hay sesión activa" });
    }

    const sessionData = JSON.parse(session.value);
    return NextResponse.json({
      hasSession: true,
      session: {
        id: sessionData.id,
        nombre: sessionData.nombre,
        email: sessionData.email,
        rol: sessionData.rol,
        gradosAsignados: sessionData.gradosAsignados,
        asignaturasAsignadas: sessionData.asignaturasAsignadas,
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Error leyendo sesión", details: String(error) });
  }
}
