import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

// API para cambiar contraseña
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sessionData = JSON.parse(session.value);
    const { passwordActual, passwordNuevo } = await request.json();

    if (!passwordActual || !passwordNuevo) {
      return NextResponse.json({ error: "Contraseña actual y nueva son requeridas" }, { status: 400 });
    }

    if (passwordNuevo.length < 6) {
      return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    // Obtener usuario
    const usuario = await db.usuario.findUnique({
      where: { id: sessionData.id }
    });

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Verificar contraseña actual
    if (usuario.password !== passwordActual) {
      return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
    }

    // Actualizar contraseña
    await db.usuario.update({
      where: { id: usuario.id },
      data: { password: passwordNuevo }
    });

    return NextResponse.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    return NextResponse.json(
      { error: "Error al cambiar contraseña" },
      { status: 500 }
    );
  }
}
