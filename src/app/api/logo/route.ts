import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const logoPath = path.join(process.cwd(), "upload", "0.png");
    const imageBuffer = fs.readFileSync(logoPath);

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Logo no encontrado" }, { status: 404 });
  }
}
