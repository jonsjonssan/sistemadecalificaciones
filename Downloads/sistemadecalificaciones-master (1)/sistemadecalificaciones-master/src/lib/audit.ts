import { PrismaClient } from "@prisma/client";

// Singleton pattern to avoid connection pool exhaustion
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

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
    await prisma.auditLog.create({
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
