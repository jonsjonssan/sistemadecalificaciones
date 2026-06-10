import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { sql } from "@/lib/neon";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    
    if (sessionCookie) {
      const sessionData = verifySession(sessionCookie.value);
      
      if (sessionData?.sessionId) {
        await sql`
          UPDATE "LoginSession" 
          SET "logoutAt" = NOW(), "isActive" = false 
          WHERE id = ${sessionData.sessionId}
        `;
      }
      
      cookieStore.delete("session");
    }
    
    return NextResponse.json({ message: "Sesión cerrada" });
  } catch (error) {
    console.error("[auth/logout] Error:", error);
    return NextResponse.json({ message: "Sesión cerrada" });
  }
}
