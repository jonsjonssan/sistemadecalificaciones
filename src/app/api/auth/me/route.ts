import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session) {
      return NextResponse.json({ usuario: null });
    }

    const sessionData = JSON.parse(session.value);
    const prisma = new PrismaClient();

    const usuario = await prisma.usuario.findUnique({
      where: { id: sessionData.id },
      include: {
        gradosComoTutor: { select: { id: true, numero: true, seccion: true } },
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

    await prisma.$disconnect();

    if (!usuario) {
      return NextResponse.json({ usuario: null });
    }

    return NextResponse.json({
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        gradosAsignados: usuario.gradosComoTutor,
        asignaturasAsignadas: usuario.materiasAsignadas.map((dm: any) => ({
          id: dm.materia.id,
          nombre: dm.materia.nombre,
          gradoId: dm.materia.gradoId,
          gradoNumero: dm.materia.grado?.numero,
          gradoSeccion: dm.materia.grado?.seccion,
        })),
      },
    });
  } catch (error) {
    console.error("Error en /api/auth/me:", error);
    return NextResponse.json({ usuario: null });
  }
}
