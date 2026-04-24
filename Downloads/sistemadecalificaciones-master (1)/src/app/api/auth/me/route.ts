import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session) {
      return NextResponse.json({ usuario: null });
    }

    const sessionData = JSON.parse(session.value);
    console.log("[auth/me] Session data:", JSON.stringify(sessionData));

    return NextResponse.json({ usuario: sessionData });
  } catch {
    return NextResponse.json({ usuario: null });
  }
}
