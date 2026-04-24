import winston from "winston";

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
  ],
});

if (process.env.NODE_ENV === "production") {
  logger.add(new winston.transports.File({ 
    filename: "logs/error.log", 
    level: "error",
    maxsize: 5242880,
    maxFiles: 5,
  }));
  logger.add(new winston.transports.File({ 
    filename: "logs/combined.log",
    maxsize: 5242880,
    maxFiles: 5,
  }));
}

export type AuditAction = 
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "VIEW"
  | "EXPORT";

export type AuditEntity = 
  | "Usuario"
  | "Grado"
  | "Estudiante"
  | "Materia"
  | "Calificacion"
  | "Asistencia"
  | "ConfigActividad"
  | "Sistema";

interface AuditLogData {
  accion: AuditAction;
  entidad: AuditEntity;
  entidadId?: string;
  usuarioId: string;
  usuarioEmail: string;
  detalles?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export async function registrarAuditoria(data: AuditLogData): Promise<void> {
  try {
    logger.info(`AUDIT: ${data.accion} on ${data.entidad}`, {
      entidadId: data.entidadId,
      usuarioId: data.usuarioId,
      usuarioEmail: data.usuarioEmail,
      detalles: data.detalles,
    });
  } catch (error) {
    logger.error("Error al registrar auditoría", { error, data });
  }
}

export function registrarAccion(
  accion: AuditAction,
  entidad: AuditEntity,
  entidadId?: string
) {
  return async (usuarioId: string, usuarioEmail: string, detalles?: Record<string, unknown>) => {
    await registrarAuditoria({
      accion,
      entidad,
      entidadId,
      usuarioId,
      usuarioEmail,
      detalles,
    });
  };
}

export function sanitizeLogData(data: Record<string, unknown>): Record<string, unknown> {
  const camposSensibles = ["password", "token", "secret", "apiKey", "authorization"];
  const sanitized = { ...data };
  
  for (const campo of camposSensibles) {
    if (campo in sanitized) {
      sanitized[campo] = "***REDACTED***";
    }
  }
  
  return sanitized;
}
