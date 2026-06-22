import { createHmac, timingSafeEqual } from "crypto";
import type { SessionUsuario } from "@/lib/types/session";

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;

if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET or NEXTAUTH_SECRET environment variable is required");
}

if (SESSION_SECRET.length < 32) {
  throw new Error(
    `SESSION_SECRET debe tener al menos 32 caracteres (actual: ${SESSION_SECRET.length}). ` +
    `Genere uno con: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
  );
}

const SECRET = SESSION_SECRET;

function getHmac(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("hex");
}

export function signSession(data: object): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = getHmac(payload);
  return `${payload}.${signature}`;
}

export function verifySession(cookieValue: string): SessionUsuario | null {
  const dotIndex = cookieValue.indexOf(".");
  if (dotIndex === -1) return null;

  const payload = cookieValue.substring(0, dotIndex);
  const providedSignature = cookieValue.substring(dotIndex + 1);

  const expectedSignature = getHmac(payload);

  if (
    providedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))
  ) {
    return null;
  }

  try {
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}