import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";
import { emitRealtimeEventAsync } from "@/lib/realtime/emit";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");

  // Obtener datos del usuario antes de borrar la cookie
  let sessionData: { id: string; nombre: string; email: string; rol: string } | null = null;
  if (sessionCookie) {
    try {
      sessionData = JSON.parse(sessionCookie.value);
    } catch {
      // ignore parse errors
    }
  }

  cookieStore.delete("session");

  // Actualizar LoginSession como inactiva
  if (sessionData?.id) {
    try {
      await sql`
        UPDATE "LoginSession"
        SET "isActive" = false, "logoutAt" = NOW()
        WHERE "usuarioId" = ${sessionData.id}
          AND "isActive" = true
      `;

      emitRealtimeEventAsync({
        type: "user-disconnected",
        payload: {
          id: sessionData.id,
          nombre: sessionData.nombre,
          email: sessionData.email,
          rol: sessionData.rol,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[logout] Error updating session:", error);
    }
  }

  return NextResponse.json({ message: "Sesión cerrada" });
}
