import { createHmac, timingSafeEqual } from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;

if (!SESSION_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET or NEXTAUTH_SECRET environment variable is required in production");
}

const SECRET = SESSION_SECRET || "dev-fallback-secret-do-not-use-in-production";

function getHmac(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("hex");
}

export function signSession(data: object): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = getHmac(payload);
  return `${payload}.${signature}`;
}

export function verifySession(cookieValue: string): any {
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