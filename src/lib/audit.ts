import { PrismaClient } from "@prisma/client";

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
    const prisma = new PrismaClient();
    await prisma.auditLog.create({
      data: {
        usuarioId,
        accion,
        entidad,
        entidadId,
        detalles,
      },
    });
    await prisma.$disconnect();
  } catch (error) {
    console.error("[audit] Failed to create log:", error);
  }
}
