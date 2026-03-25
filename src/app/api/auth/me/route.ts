import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session) {
      return NextResponse.json({ usuario: null });
    }

    const sessionData = JSON.parse(session.value);

    // Obtener información completa del usuario con sus asignaciones
    const usuarioCompleto = await db.usuario.findUnique({
      where: { id: sessionData.id },
      include: {
        gradosComoTutor: true,
        materiasAsignadas: {
          include: {
            materia: {
              include: {
                grado: true
              }
            }
          }
        }
      }
    });

    if (!usuarioCompleto) {
      return NextResponse.json({ usuario: null });
    }

    // Formatear respuesta
    const usuario = {
      id: usuarioCompleto.id,
      email: usuarioCompleto.email,
      nombre: usuarioCompleto.nombre,
      rol: usuarioCompleto.rol,
      gradosAsignados: usuarioCompleto.gradosComoTutor.map(g => ({
        id: g.id,
        numero: g.numero,
        seccion: g.seccion
      })),
      materiasAsignadas: usuarioCompleto.materiasAsignadas.map(m => ({
        id: m.materia.id,
        nombre: m.materia.nombre,
        gradoId: m.materia.gradoId,
        gradoNumero: m.materia.grado?.numero
      }))
    };

    return NextResponse.json({ usuario });
  } catch {
    return NextResponse.json({ usuario: null });
  }
}
