import { describe, it, expect } from 'vitest';
import { generateSecurePassword, generateSecretKey, validatePasswordStrength } from '@/lib/security';

describe('Security - Password Generation', () => {
  it('debe generar passwords de 16 caracteres por defecto', () => {
    const password = generateSecurePassword();
    expect(password).toHaveLength(16);
  });

  it('debe generar passwords de la longitud especificada', () => {
    const password = generateSecurePassword(20);
    expect(password).toHaveLength(20);
  });

  it('debe incluir al menos una mayuscula, minuscula, numero y simbolo', () => {
    const password = generateSecurePassword(16);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/);
  });

  it('debe generar passwords diferentes cada vez', () => {
    const passwords = new Set<string>();
    for (let i = 0; i < 10; i++) {
      passwords.add(generateSecurePassword());
    }
    expect(passwords.size).toBe(10);
  });
});

describe('Security - Secret Key Generation', () => {
  it('debe generar secret keys de 64 bytes por defecto', () => {
    const secret = generateSecretKey();
    expect(secret.length).toBeGreaterThan(60);
  });

  it('debe generar secret keys de la longitud especificada', () => {
    const secret = generateSecretKey(128);
    expect(secret.length).toBeGreaterThan(120);
  });

  it('debe generar secrets diferentes cada vez', () => {
    const secrets = new Set<string>();
    for (let i = 0; i < 10; i++) {
      secrets.add(generateSecretKey());
    }
    expect(secrets.size).toBe(10);
  });
});

describe('Security - Password Validation', () => {
  it('debe rechazar passwords menores a 8 caracteres', () => {
    const result = validatePasswordStrength('Abc123!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('La contraseña debe tener al menos 8 caracteres');
  });

  it('debe rechazar passwords sin mayusculas', () => {
    const result = validatePasswordStrength('abc12345!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('La contraseña debe contener al menos una letra mayuscula');
  });

  it('debe rechazar passwords sin minusculas', () => {
    const result = validatePasswordStrength('ABC12345!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('La contraseña debe contener al menos una letra minuscula');
  });

  it('debe rechazar passwords sin numeros', () => {
    const result = validatePasswordStrength('Abcdefgh!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('La contraseña debe contener al menos un numero');
  });

  it('debe rechazar passwords sin simbolos', () => {
    const result = validatePasswordStrength('Abcdefgh1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('La contraseña debe contener al menos un simbolo especial');
  });

  it('debe aceptar passwords validas', () => {
    const result = validatePasswordStrength('Abcdefgh1!');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
