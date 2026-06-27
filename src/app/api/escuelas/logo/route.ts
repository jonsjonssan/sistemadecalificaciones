import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-middleware";
import sharp from "sharp";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "escuelas");
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const TARGET_SIZE = 512; // px

export async function POST(req: Request) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  if (session.rol !== "superadmin") {
    return NextResponse.json({ error: "Solo el superadministrador puede subir logos" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("logo") as File | null;
    const escuelaId = (formData.get("escuelaId") as string) || "nueva";

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Solo se permiten archivos PNG o JPG" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "El archivo no debe superar los 2MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Procesar con sharp: redimensionar a cuadrado 512x512 manteniendo proporción (cover)
    const processed = await sharp(buffer)
      .resize(TARGET_SIZE, TARGET_SIZE, { fit: "cover", position: "center" })
      .png({ quality: 90 })
      .toBuffer();

    const metadata = await sharp(processed).metadata();
    const width = metadata.width || TARGET_SIZE;
    const height = metadata.height || TARGET_SIZE;

    if (width !== height) {
      return NextResponse.json({ error: "El logo debe ser cuadrado" }, { status: 400 });
    }

    if (width < 128) {
      return NextResponse.json({ error: "El logo debe tener al menos 128x128 px" }, { status: 400 });
    }

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `${escuelaId}-${timestamp}.png`;
    const filePath = path.join(UPLOAD_DIR, filename);
    await writeFile(filePath, processed);

    const publicUrl = `/escuelas/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      width,
      height,
      message: `Logo subido correctamente (${width}x${height}px)`,
    });
  } catch (error: any) {
    console.error("[escuelas/logo] ERROR:", error.message);
    return NextResponse.json({ error: error.message || "Error al procesar el logo" }, { status: 500 });
  }
}
