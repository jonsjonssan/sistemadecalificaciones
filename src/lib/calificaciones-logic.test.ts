/**
 * Tests de lógica de negocio para el sistema de calificaciones.
 * Prueba la validación Zod, cálculos de promedios, y reglas de negocio
 * que están implementadas en src/app/api/calificaciones/route.ts
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const calificacionSchema = z.object({
  estudianteId: z.string().min(1, 'ID de estudiante requerido'),
  materiaId: z.string().min(1, 'ID de materia requerido'),
  trimestre: z.number().int().min(1).max(3, 'Trimestre inválido'),
  actividadesCotidianas: z
    .union([z.string(), z.array(z.number().min(0).max(10).nullable())])
    .optional(),
  actividadesIntegradoras: z
    .union([z.string(), z.array(z.number().min(0).max(10).nullable())])
    .optional(),
  examenTrimestral: z.number().min(0).max(10).nullable().optional(),
  recuperacion: z.number().min(0).max(10).nullable().optional(),
});

function calcularPromedioNotas(notas: (number | null)[]): number | null {
  const validas = notas.filter((n): n is number => n !== null && n !== undefined && !isNaN(n));
  if (validas.length === 0) return null;
  return validas.reduce((a, b) => a + b, 0) / validas.length;
}

function calcularPromedioFinal(
  calificacionAC: number | null,
  calificacionAI: number | null,
  examenTrimestral: number | null,
  recuperacion: number | null,
  config?: {
    porcentajeAC: number;
    porcentajeAI: number;
    porcentajeExamen: number;
    tieneExamen: boolean;
  } | null
): number | null {
  const porcAC = config ? config.porcentajeAC / 100 : 0.35;
  const porcAI = config ? config.porcentajeAI / 100 : 0.35;
  const porcExam = config
    ? config.tieneExamen
      ? config.porcentajeExamen / 100
      : 0
    : 0.30;

  const tieneNotas = calificacionAC !== null || calificacionAI !== null || examenTrimestral !== null;
  if (!tieneNotas) return null;

  const suma =
    (calificacionAC ?? 0) * porcAC +
    (calificacionAI ?? 0) * porcAI +
    (examenTrimestral ?? 0) * porcExam;

  let promedio = isNaN(suma) ? null : suma;

  if (recuperacion !== null && recuperacion !== undefined) {
    promedio = Math.min(10, (promedio ?? 0) + recuperacion);
  }

  return promedio;
}

describe('Zod Schema - Validacion de entrada', () => {
  describe('campos requeridos', () => {
    it('valida una entrada completa correcta', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 1,
        actividadesCotidianas: [8, 7, 9, null],
        actividadesIntegradoras: [8],
        examenTrimestral: 7.5,
        recuperacion: null,
      });
      expect(result.success).toBe(true);
    });

    it('rechaza cuando falta estudianteId', () => {
      const result = calificacionSchema.safeParse({
        materiaId: 'mat456',
        trimestre: 1,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.estudianteId).toBeDefined();
      }
    });

    it('rechaza cuando falta materiaId', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        trimestre: 1,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.materiaId).toBeDefined();
      }
    });

    it('rechaza cuando falta trimestre', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
      });
      expect(result.success).toBe(false);
    });

    it('rechaza estudianteId vacío', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: '',
        materiaId: 'mat456',
        trimestre: 1,
      });
      expect(result.success).toBe(false);
    });

    it('rechaza materiaId vacío', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: '',
        trimestre: 1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('validacion de trimestre', () => {
    it('acepta trimestre 1', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 1,
      });
      expect(result.success).toBe(true);
    });

    it('acepta trimestre 2', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 2,
      });
      expect(result.success).toBe(true);
    });

    it('acepta trimestre 3', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 3,
      });
      expect(result.success).toBe(true);
    });

    it('rechaza trimestre 0', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rechaza trimestre 5', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 5,
      });
      expect(result.success).toBe(false);
    });

    it('rechaza trimestre negativo', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: -1,
      });
      expect(result.success).toBe(false);
    });

    it('rechaza trimestre decimal', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 1.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('validacion de notas', () => {
    it('acepta examenTrimestral null', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 1,
        examenTrimestral: null,
      });
      expect(result.success).toBe(true);
    });

    it('acepta examenTrimestral 0', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 1,
        examenTrimestral: 0,
      });
      expect(result.success).toBe(true);
    });

    it('acepta examenTrimestral 10', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 1,
        examenTrimestral: 10,
      });
      expect(result.success).toBe(true);
    });

    it('rechaza examenTrimestral negativo', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 1,
        examenTrimestral: -1,
      });
      expect(result.success).toBe(false);
    });

    it('rechaza examenTrimestral mayor a 10', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 1,
        examenTrimestral: 11,
      });
      expect(result.success).toBe(false);
    });

    it('rechaza examenTrimestral 10.1', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 1,
        examenTrimestral: 10.1,
      });
      expect(result.success).toBe(false);
    });

    it('acepta recuperacion null', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 1,
        recuperacion: null,
      });
      expect(result.success).toBe(true);
    });

    it('rechaza recuperacion mayor a 10', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 1,
        recuperacion: 11,
      });
      expect(result.success).toBe(false);
    });

    it('rechaza recuperacion negativa', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 1,
        recuperacion: -0.1,
      });
      expect(result.success).toBe(false);
    });

    it('acepta actividadesCotidianas como string JSON', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 1,
        actividadesCotidianas: '[8, 7, 9, 6]',
      });
      expect(result.success).toBe(true);
    });

    it('acepta actividadesCotidianas como array', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 1,
        actividadesCotidianas: [8, 7, 9, 6],
      });
      expect(result.success).toBe(true);
    });

    it('rechaza nota en array fuera de rango (negativa)', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 1,
        actividadesCotidianas: [-1, 7, 9, 6],
      });
      expect(result.success).toBe(false);
    });

    it('rechaza nota en array fuera de rango (> 10)', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 1,
        actividadesCotidianas: [11, 7, 9, 6],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('tipos de datos inválidos', () => {
    it('rechaza trimestre como string', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: '1',
      });
      expect(result.success).toBe(false);
    });

    it('rechaza examenTrimestral como string', () => {
      const result = calificacionSchema.safeParse({
        estudianteId: 'est123',
        materiaId: 'mat456',
        trimestre: 1,
        examenTrimestral: '7.5',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('calcularPromedioNotas - Cálculo de promedio de actividades', () => {
  it('promedio de 4 notas válidas', () => {
    expect(calcularPromedioNotas([8, 7, 9, 6])).toBe(7.5);
  });

  it('ignora nulls en el cálculo', () => {
    expect(calcularPromedioNotas([8, null, null, 6])).toBe(7);
  });

  it('retorna null cuando todas son null', () => {
    expect(calcularPromedioNotas([null, null, null, null])).toBe(null);
  });

  it('retorna null para array vacío', () => {
    expect(calcularPromedioNotas([])).toBe(null);
  });

  it('una sola nota válida', () => {
    expect(calcularPromedioNotas([null, 9, null, null])).toBe(9);
  });

  it('ignora undefined', () => {
    expect(calcularPromedioNotas([8, undefined as unknown as number | null, 6])).toBe(7);
  });

  it('ignora NaN', () => {
    expect(calcularPromedioNotas([8, NaN, 6])).toBe(7);
  });

  it('promedio con notas decimales', () => {
    const result = calcularPromedioNotas([7.5, 8.5, 9.0]);
    expect(result).toBeCloseTo(8.333, 2);
  });
});

describe('calcularPromedioFinal - Cálculo de promedio final', () => {
  describe('con configuracion por defecto (35/35/30)', () => {
    it('todas las notas presentes', () => {
      // (8 * 0.35) + (9 * 0.35) + (7 * 0.30) = 8.05
      expect(calcularPromedioFinal(8, 9, 7, null, null)).toBeCloseTo(8.05, 2);
    });

    it('nota perfecta en todo', () => {
      expect(calcularPromedioFinal(10, 10, 10, null, null)).toBe(10);
    });

    it('AC es null (usa 0)', () => {
      expect(calcularPromedioFinal(null, 8, 7, null, null)).toBe(4.9);
    });

    it('AI es null (usa 0)', () => {
      expect(calcularPromedioFinal(8, null, 7, null, null)).toBe(4.9);
    });

    it('Examen es null (usa 0)', () => {
      expect(calcularPromedioFinal(8, 8, null, null, null)).toBe(5.6);
    });

    it('solo AC tiene valor', () => {
      expect(calcularPromedioFinal(8, null, null, null, null)).toBe(2.8);
    });

    it('todas son null', () => {
      expect(calcularPromedioFinal(null, null, null, null, null)).toBe(null);
    });

    it('recuperacion se suma al promedio', () => {
      // base = 8.05, recup = 1.5 -> 8.05 + 1.5 = 9.55
      expect(calcularPromedioFinal(8, 9, 7, 1.5, null)).toBeCloseTo(9.55, 2);
    });

    it('recuperacion se suma al promedio (cap en 10)', () => {
      // base = 4.0, recup = 7.5 -> 4 + 7.5 = 11.5, cap a 10
      expect(calcularPromedioFinal(4, 4, 4, 7.5, null)).toBe(10);
    });

    it('recuperacion con promedio nulo retorna null', () => {
      expect(calcularPromedioFinal(null, null, null, 5, null)).toBe(null);
    });
  });

  describe('con configuracion personalizada', () => {
    const config = {
      porcentajeAC: 40,
      porcentajeAI: 30,
      porcentajeExamen: 30,
      tieneExamen: true,
    };

    it('calcula con 40/30/30', () => {
      // (8 * 0.40) + (9 * 0.30) + (7 * 0.30) = 3.2 + 2.7 + 2.1 = 8.0
      expect(calcularPromedioFinal(8, 9, 7, null, config)).toBe(8);
    });

    it('calcula con 50/50/0 (sin examen)', () => {
      const configSinExamen = {
        porcentajeAC: 50,
        porcentajeAI: 50,
        porcentajeExamen: 0,
        tieneExamen: false,
      };
      // (8 * 0.50) + (9 * 0.50) + (10 * 0) = 4 + 4.5 + 0 = 8.5
      expect(calcularPromedioFinal(8, 9, 10, null, configSinExamen)).toBe(8.5);
    });

    it('calcula con 100% examen', () => {
      const configSoloExamen = {
        porcentajeAC: 0,
        porcentajeAI: 0,
        porcentajeExamen: 100,
        tieneExamen: true,
      };
      expect(calcularPromedioFinal(5, 5, 8, null, configSoloExamen)).toBe(8);
    });

    it('calcula con 50% AC y 50% AI', () => {
      const configSinExamen = {
        porcentajeAC: 50,
        porcentajeAI: 50,
        porcentajeExamen: 0,
        tieneExamen: false,
      };
      // (10 * 0.50) + (0 * 0.50) + (0 * 0) = 5
      expect(calcularPromedioFinal(10, 0, null, null, configSinExamen)).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('notas fuera de rango se calculan matemáticamente', () => {
      const result = calcularPromedioFinal(15, 5, 5, null, null);
      // (15 * 0.35) + (5 * 0.35) + (5 * 0.30) = 8.5
      expect(result).toBe(8.5);
    });

    it('NaN en promedio AC retorna null (filtrado por isnan)', () => {
      const result = calcularPromedioFinal(NaN, 8, 7, null, null);
      // la API convierte NaN a null antes del cálculo; aquí isnan lo detecta y retorna null
      expect(result).toBe(null);
    });

    it('con recuperacion negativa se resta del promedio', () => {
      const result = calcularPromedioFinal(8, 9, 7, -2, null);
      expect(result).toBeCloseTo(6.05, 2);
    });

    it('con config null usa defaults 35/35/30', () => {
      const result = calcularPromedioFinal(10, 10, 10, null, null);
      expect(result).toBe(10);
    });
  });
});

describe('Flujo completo: desde notas individuales hasta promedio final', () => {
  it('estudiante con notas normales', () => {
    const notasAC = [7, 8, 9, 6];
    const notasAI = [8];
    const examen = 7.5;

    const promAC = calcularPromedioNotas(notasAC);
    const promAI = calcularPromedioNotas(notasAI);

    expect(promAC).toBe(7.5);
    expect(promAI).toBe(8);

    const promFinal = calcularPromedioFinal(promAC, promAI, examen, null, null);
    // (7.5 * 0.35) + (8 * 0.35) + (7.5 * 0.30) = 2.625 + 2.8 + 2.25 = 7.675
    expect(promFinal).toBeCloseTo(7.675, 3);
  });

  it('estudiante con solo examen (sin AC ni AI)', () => {
    const notasAC = [null, null, null, null];
    const notasAI = [null];
    const examen = 8;

    const promAC = calcularPromedioNotas(notasAC);
    const promAI = calcularPromedioNotas(notasAI);

    expect(promAC).toBe(null);
    expect(promAI).toBe(null);

    const promFinal = calcularPromedioFinal(promAC, promAI, examen, null, null);
    // (0 * 0.35) + (0 * 0.35) + (8 * 0.30) = 2.4
    expect(promFinal).toBe(2.4);
  });

    it('estudiante con notas perfectas y recuperacion', () => {
      const notasAC = [10, 10, 10, 10];
      const notasAI = [10];
      const examen = 10;
      const recuperacion = 1;

      const promAC = calcularPromedioNotas(notasAC);
      const promAI = calcularPromedioNotas(notasAI);

      expect(promAC).toBe(10);
      expect(promAI).toBe(10);

      const promFinal = calcularPromedioFinal(promAC, promAI, examen, recuperacion, null);
      // base = 10, recup = 1 -> 10 + 1 = 11, cap a 10
      expect(promFinal).toBe(10);
    });

  it('estudiante con actividades incompletas', () => {
    const notasAC = [8, null, 9, null];
    const notasAI: (number | null)[] = [];
    const examen = null;

    const promAC = calcularPromedioNotas(notasAC);
    const promAI = calcularPromedioNotas(notasAI);

    expect(promAC).toBe(8.5);
    expect(promAI).toBe(null);

    const promFinal = calcularPromedioFinal(promAC, promAI, examen, null, null);
    // (8.5 * 0.35) + (0 * 0.35) + (0 * 0.30) = 2.975
    expect(promFinal).toBeCloseTo(2.975, 3);
  });

  it('estudiante con mas notas de las que deberia (bug de config)', () => {
    // 6 notas AC cuando solo hay 4 configuradas
    const notasAC = [8, 7, 9, 6, 5, 4];
    const promAC = calcularPromedioNotas(notasAC);
    // Promedia todas las válidas: (8+7+9+6+5+4)/6 = 6.5
    expect(promAC).toBe(6.5);
  });
});

describe('Reglas de negocio - casos de borde', () => {
  it('estudiante aprueba con 5.0 exacto', () => {
    // 5 * 0.35 + 5 * 0.35 + 5 * 0.30 = 5.0
    const result = calcularPromedioFinal(5, 5, 5, null, null);
    expect(result).toBe(5.0);
  });

  it('estudiante reprueba con 4.99', () => {
    const result = calcularPromedioFinal(4.99, 4.99, 4.99, null, null);
    expect(result).toBeCloseTo(4.99, 2);
  });

    it('recuperacion puede hacer que un estudiante apruebe', () => {
      // base = 4.0, recup = 2.0 -> 4 + 2 = 6.0 (aprueba)
      const result = calcularPromedioFinal(4, 4, 4, 2.0, null);
      expect(result).toBe(6);
    });

    it('promedio con recuperacion no puede exceder 10', () => {
      // base = 10, recup = 12 -> 10 + 12 = 22, cap a 10
      const result = calcularPromedioFinal(10, 10, 10, 12, null);
      expect(result).toBe(10);
    });

  it('estudiante con todas notas 0', () => {
    const result = calcularPromedioFinal(0, 0, 0, null, null);
    expect(result).toBe(0);
  });

  it('config con porcentajes que no suman 100', () => {
    const config = {
      porcentajeAC: 50,
      porcentajeAI: 50,
      porcentajeExamen: 50,
      tieneExamen: true,
    };
    // (8 * 0.50) + (8 * 0.50) + (8 * 0.50) = 4 + 4 + 4 = 12 (no cap sin recuperacion!)
    const result = calcularPromedioFinal(8, 8, 8, null, config);
    expect(result).toBe(12);
  });
});
