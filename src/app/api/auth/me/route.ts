import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session) {
      return NextResponse.json({ usuario: null });
    }

    const sessionData = verifySession(session.value);
    if (!sessionData) {
      return NextResponse.json({ usuario: null });
    }

    console.log("[auth/me] Session data:", JSON.stringify(sessionData));

    return NextResponse.json({ usuario: sessionData });
  } catch {
    return NextResponse.json({ usuario: null });
  }
}
