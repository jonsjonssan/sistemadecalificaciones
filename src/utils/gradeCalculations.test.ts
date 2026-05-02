import { describe, it, expect } from 'vitest';
import { parseNotas, calcularPromedio, calcularPromedioFinal } from './gradeCalculations';
import { ConfigActividadPartial } from '@/types';

const defaultConfig: ConfigActividadPartial = {
  numActividadesCotidianas: 4,
  numActividadesIntegradoras: 1,
  tieneExamen: true,
  porcentajeAC: 35,
  porcentajeAI: 35,
  porcentajeExamen: 30,
};

const customConfig: ConfigActividadPartial = {
  numActividadesCotidianas: 6,
  numActividadesIntegradoras: 2,
  tieneExamen: true,
  porcentajeAC: 40,
  porcentajeAI: 30,
  porcentajeExamen: 30,
};

describe('parseNotas', () => {
  it('parsea un JSON string válido con notas', () => {
    const result = parseNotas('[8, 7, 9, 6]', 4);
    expect(result).toEqual([8, 7, 9, 6]);
  });

  it('retorna array de nulls para entrada null', () => {
    const result = parseNotas(null, 4);
    expect(result).toEqual([null, null, null, null]);
  });

  it('retorna array de nulls para JSON inválido', () => {
    const result = parseNotas('no es json', 4);
    expect(result).toEqual([null, null, null, null]);
  });

  it('rellena con null si hay menos notas que el count', () => {
    const result = parseNotas('[8, 7]', 4);
    expect(result).toEqual([8, 7, null, null]);
  });

  it('recorta si hay más notas que el count', () => {
    const result = parseNotas('[8, 7, 9, 6, 5, 4]', 4);
    expect(result).toEqual([8, 7, 9, 6]);
  });

  it('maneja array vacío', () => {
    const result = parseNotas('[]', 4);
    expect(result).toEqual([null, null, null, null]);
  });

  it('convierte valores NaN a null', () => {
    const result = parseNotas('[8, null, "x", 6]', 4);
    expect(result).toEqual([8, null, null, 6]);
  });

  it('maneja count 0 correctamente', () => {
    const result = parseNotas('[8, 7]', 0);
    expect(result).toEqual([]);
  });

  it('maneja entrada que no es array', () => {
    const result = parseNotas('"no es un array"', 4);
    expect(result).toEqual([null, null, null, null]);
  });

  it('preserva decimales en las notas', () => {
    const result = parseNotas('[8.5, 7.3, 9.1]', 5);
    expect(result).toEqual([8.5, 7.3, 9.1, null, null]);
  });

  it('maneja notas en límite superior (10)', () => {
    const result = parseNotas('[10, 10, 10, 10]', 4);
    expect(result).toEqual([10, 10, 10, 10]);
  });

  it('maneja notas en límite inferior (0)', () => {
    const result = parseNotas('[0, 0, 0]', 3);
    expect(result).toEqual([0, 0, 0]);
  });
});

describe('calcularPromedio', () => {
  it('calcula promedio con todas las notas válidas', () => {
    expect(calcularPromedio([8, 9, 7, 6])).toBe(7.5);
  });

  it('ignora valores null en el cálculo', () => {
    expect(calcularPromedio([8, null, 6, null])).toBe(7);
  });

  it('retorna null cuando todas las notas son null', () => {
    expect(calcularPromedio([null, null, null])).toBe(null);
  });

  it('retorna null para array vacío', () => {
    expect(calcularPromedio([])).toBe(null);
  });

  it('calcula promedio con un solo valor', () => {
    expect(calcularPromedio([7])).toBe(7);
  });

  it('calcula promedio con un solo valor y nulls', () => {
    expect(calcularPromedio([null, 8, null])).toBe(8);
  });

  it('ignora NaN correctamente', () => {
    expect(calcularPromedio([8, NaN, 6])).toBe(7);
  });

  it('calcula con valores decimales', () => {
    const result = calcularPromedio([7.3, 8.7, 9.2]);
    expect(result).toBeCloseTo(8.4, 1);
  });

  it('retorna el valor exacto cuando hay una sola nota y el resto null', () => {
    expect(calcularPromedio([null, 9.5, null, null])).toBe(9.5);
  });

  it('maneja combinación de notas en límites (0 y 10)', () => {
    const result = calcularPromedio([0, 10, 0, 10]);
    expect(result).toBe(5);
  });
});

describe('calcularPromedioFinal con config por defecto (35/35/30)', () => {
  it('calcula promedio final con todas las notas', () => {
    // (8 * 0.35) + (9 * 0.35) + (7 * 0.30) = 2.8 + 3.15 + 2.1 = 8.05
    const result = calcularPromedioFinal(8, 9, 7, defaultConfig);
    expect(result).toBeCloseTo(8.05, 2);
  });

  it('retorna null cuando todos son null', () => {
    expect(calcularPromedioFinal(null, null, null, defaultConfig)).toBe(null);
  });

  it('calcula cuando AC es null (usa 0 para AC)', () => {
    // (0 * 0.35) + (9 * 0.35) + (7 * 0.30) = 0 + 3.15 + 2.1 = 5.25
    const result = calcularPromedioFinal(null, 9, 7, defaultConfig);
    expect(result).toBeCloseTo(5.25, 2);
  });

  it('calcula cuando AI es null (usa 0 para AI)', () => {
    // (8 * 0.35) + (0 * 0.35) + (7 * 0.30) = 2.8 + 0 + 2.1 = 4.9
    const result = calcularPromedioFinal(8, null, 7, defaultConfig);
    expect(result).toBeCloseTo(4.9, 2);
  });

  it('calcula cuando examen es null (usa 0 para examen)', () => {
    // (8 * 0.35) + (9 * 0.35) + (0 * 0.30) = 2.8 + 3.15 + 0 = 5.95
    const result = calcularPromedioFinal(8, 9, null, defaultConfig);
    expect(result).toBeCloseTo(5.95, 2);
  });

  it('calcula solo con AC (AI y examen son null)', () => {
    // (8 * 0.35) + (0 * 0.35) + (0 * 0.30) = 2.8
    expect(calcularPromedioFinal(8, null, null, defaultConfig)).toBeCloseTo(2.8, 2);
  });

  it('calcula solo con examen', () => {
    // (0 * 0.35) + (0 * 0.35) + (10 * 0.30) = 3
    expect(calcularPromedioFinal(null, null, 10, defaultConfig)).toBe(3);
  });

  it('nota perfecta 10 en todo', () => {
    expect(calcularPromedioFinal(10, 10, 10, defaultConfig)).toBe(10);
  });

  it('nota mínima 0 en todo', () => {
    expect(calcularPromedioFinal(0, 0, 0, defaultConfig)).toBe(0);
  });

  it('aplica recuperacion al promedio', () => {
    // Base: (8 * 0.35) + (9 * 0.35) + (7 * 0.30) = 8.05
    // Con recuperacion 1: 8.05 + 1 = 9.05
    const result = calcularPromedioFinal(8, 9, 7, defaultConfig, 1);
    expect(result).toBeCloseTo(9.05, 2);
  });

  it('recuperacion no excede 10 (cap en 10)', () => {
    // (9 * 0.35) + (10 * 0.35) + (9 * 0.30) = 3.15 + 3.5 + 2.7 = 9.35
    // Con recuperacion 2: min(10, 9.35 + 2) = 10
    const result = calcularPromedioFinal(9, 10, 9, defaultConfig, 2);
    expect(result).toBe(10);
  });

  it('recuperacion sin promedio base retorna null (no se puede recuperar sin notas)', () => {
    const result = calcularPromedioFinal(null, null, null, defaultConfig, 5);
    expect(result).toBe(null);
  });
});

describe('calcularPromedioFinal con config personalizada (40/30/30)', () => {
  it('calcula con porcentajes personalizados', () => {
    // (8 * 0.40) + (9 * 0.30) + (7 * 0.30) = 3.2 + 2.7 + 2.1 = 8.0
    const result = calcularPromedioFinal(8, 9, 7, customConfig);
    expect(result).toBe(8);
  });

  it('calcula con examen al 100% y AC/AI al 0%', () => {
    const configConSoloExamen: ConfigActividadPartial = {
      numActividadesCotidianas: 4,
      numActividadesIntegradoras: 1,
      tieneExamen: true,
      porcentajeAC: 0,
      porcentajeAI: 0,
      porcentajeExamen: 100,
    };
    expect(calcularPromedioFinal(8, 9, 7, configConSoloExamen)).toBe(7);
  });

  it('usa defaults cuando porcentajes no están definidos', () => {
    const configSinPorcentajes: ConfigActividadPartial = {
      numActividadesCotidianas: 4,
      numActividadesIntegradoras: 1,
      tieneExamen: true,
    } as ConfigActividadPartial;
    // Usa 35/35/30 por defecto
    const result = calcularPromedioFinal(10, 10, 10, configSinPorcentajes);
    expect(result).toBe(10);
  });

  it('calcula con notas mixtas y config personalizada', () => {
    const result = calcularPromedioFinal(5.5, null, 8.3, customConfig);
    // (5.5 * 0.40) + (0 * 0.30) + (8.3 * 0.30) = 2.2 + 0 + 2.49 = 4.69
    expect(result).toBeCloseTo(4.69, 2);
  });
});

describe('calcularPromedioFinal edge cases', () => {
  it('notas negativas no deberían ocurrir pero se calculan matemáticamente', () => {
    // Si llegaran notas negativas (bug), el cálculo sigue
    const result = calcularPromedioFinal(-1, 5, 5, defaultConfig);
    expect(result).toBeCloseTo(2.9, 1);
  });

  it('notas con muchos decimales', () => {
    const result = calcularPromedioFinal(7.333, 8.667, 6.5, defaultConfig);
    // (7.333 * 0.35) + (8.667 * 0.35) + (6.5 * 0.30) = 2.56655 + 3.03345 + 1.95 = 7.55
    expect(result).toBeCloseTo(7.55, 1);
  });

  it('recuperacion negativa reduce el promedio (no cap inferior)', () => {
    const result = calcularPromedioFinal(8, 9, 7, defaultConfig, -2);
    expect(result).toBeCloseTo(6.05, 2);
  });

  it('config con tieneExamen false aún usa el porcentaje de examen', () => {
    const configSinExamen: ConfigActividadPartial = {
      numActividadesCotidianas: 4,
      numActividadesIntegradoras: 1,
      tieneExamen: false,
      porcentajeAC: 50,
      porcentajeAI: 50,
      porcentajeExamen: 0,
    };
    const result = calcularPromedioFinal(8, 7, 9, configSinExamen);
    // (8 * 0.50) + (7 * 0.50) + (9 * 0) = 4 + 3.5 + 0 = 7.5
    expect(result).toBe(7.5);
  });
});
