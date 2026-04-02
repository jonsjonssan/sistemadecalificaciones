import { sql } from "@/lib/neon";

export async function createAuditLog({
  usuarioId,
  accion,
  entidad,
  entidadId,
  detalles,
  grado,
  ip,
  userAgent
}: {
  usuarioId: string;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  detalles?: string | null;
  grado?: string | null;
  ip?: string;
  userAgent?: string;
}) {
  try {
    await sql`
      INSERT INTO "AuditLog" ("id", "usuarioId", "accion", "entidad", "entidadId", "detalles", "grado", "ip", "userAgent", "createdAt")
      VALUES (gen_random_uuid()::text, ${usuarioId}, ${accion}, ${entidad}, ${entidadId || null}, ${detalles || null}, ${grado || null}, ${ip || null}, ${userAgent || null}, NOW())
    `;
  } catch (error) {
    console.error("[audit] Failed to create log:", error);
  }
}
