import { randomBytes } from "crypto";

export function generateSecurePassword(length: number = 16): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = "";
  const bytes = randomBytes(length);
  
  password += uppercase[bytes[0] % uppercase.length];
  password += lowercase[bytes[1] % lowercase.length];
  password += numbers[bytes[2] % numbers.length];
  password += symbols[bytes[3] % symbols.length];
  
  for (let i = 4; i < length; i++) {
    password += allChars[bytes[i] % allChars.length];
  }
  
  return password.split("").sort(() => Math.random() - 0.5).join("");
}

export function generateSecretKey(length: number = 64): string {
  return randomBytes(length).toString("base64url");
}

export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("La contraseña debe tener al menos 8 caracteres");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("La contraseña debe contener al menos una letra mayuscula");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("La contraseña debe contener al menos una letra minuscula");
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push("La contraseña debe contener al menos un numero");
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push("La contraseña debe contener al menos un simbolo especial");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
