import { db } from "./db";

export async function createAuditLog({
  usuarioId,
  escuelaId,
  accion,
  entidad,
  entidadId,
  detalles
}: {
  usuarioId: string;
  escuelaId?: string | null;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  detalles?: string | null;
}) {
  try {
    await db.auditLog.create({
      data: {
        usuarioId,
        escuelaId: escuelaId || '',
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
