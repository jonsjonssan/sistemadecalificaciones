import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, signSession } from "@/lib/session";
import { sql } from "@/lib/neon";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session) {
      return NextResponse.json({ usuario: null });
    }

    let sessionData = verifySession(session.value);
    if (!sessionData) {
      return NextResponse.json({ usuario: null });
    }

    // Si la sesión no tiene escuelaId, enriquecerla desde la DB
    if (!sessionData.escuelaId && sessionData.id) {
      try {
        const userRows = await sql`
          SELECT u."escuelaId", e.id as escuela_id, e.nombre as escuela_nombre,
                 e.codigo as escuela_codigo, e.logo as escuela_logo, e."colorPrimario" as escuela_color
          FROM "Usuario" u
          LEFT JOIN "Escuela" e ON u."escuelaId" = e.id
          WHERE u.id = ${sessionData.id}
        `;
        if (userRows.length > 0 && userRows[0].escuelaId) {
          sessionData.escuelaId = userRows[0].escuelaId;
          sessionData.escuela = userRows[0].escuela_id ? {
            id: userRows[0].escuela_id,
            nombre: userRows[0].escuela_nombre,
            codigo: userRows[0].escuela_codigo,
            logo: userRows[0].escuela_logo,
            colorPrimario: userRows[0].escuela_color,
          } : null;
          // Re-firmar y actualizar la cookie
          cookieStore.set("session", signSession(sessionData), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 60 * 60 * 8,
          });
        }
      } catch (e) {
        console.error("[auth/me] Error enriqueciendo sesión:", e);
      }
    }

    return NextResponse.json({ usuario: sessionData });
  } catch {
    return NextResponse.json({ usuario: null });
  }
}
