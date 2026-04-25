import { db } from "./db";

export async function createAuditLog({
  usuarioId,
  accion,
  entidad,
  entidadId,
  detalles
}: {
  usuarioId: string;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  detalles?: string | null;
}) {
  try {
    await db.auditLog.create({
      data: {
        usuarioId,
        accion,
        entidad,
        entidadId,
        detalles,
      },
    });
  } catch (error) {
    console.error("[audit] Failed to create log:", error);
  }
}
