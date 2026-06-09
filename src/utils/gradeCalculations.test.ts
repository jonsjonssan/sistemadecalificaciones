import { describe, it, expect } from 'vitest';
import { parseNotas, calcularPromedio, calcularPromedioFinal, getEstadoCompletitud, clasificarEscala } from './gradeCalculations';
import { ConfigActividadPartial, Calificacion } from '@/types';

const defaultConfig: ConfigActividadPartial = {
  numActividadesCotidianas: 4,
  numActividadesIntegradoras: 1,
  tieneExamen: true,
  numExamenes: 1,
  porcentajeAC: 35,
  porcentajeAI: 35,
  porcentajeExamen: 30,
};

const customConfig: ConfigActividadPartial = {
  numActividadesCotidianas: 6,
  numActividadesIntegradoras: 2,
  tieneExamen: true,
  numExamenes: 1,
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

  it('recuperacion se suma al promedio', () => {
    // Base: (8 * 0.35) + (9 * 0.35) + (7 * 0.30) = 8.05
    // Recuperacion 1: 8.05 + 1 = 9.05
    const result = calcularPromedioFinal(8, 9, 7, defaultConfig, 1);
    expect(result).toBeCloseTo(9.05, 2);
  });

  it('recuperacion se suma al promedio (cap en 10)', () => {
    // (4 * 0.35) + (4 * 0.35) + (4 * 0.30) = 4.0
    // Con recuperacion 8: 4 + 8 = 12, cap a 10
    const result = calcularPromedioFinal(4, 4, 4, defaultConfig, 8);
    expect(result).toBe(10);
  });

  it('recuperacion sin promedio base retorna null', () => {
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
      numExamenes: 1,
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

  it('recuperacion negativa se resta del promedio', () => {
    const result = calcularPromedioFinal(8, 9, 7, defaultConfig, -2);
    expect(result).toBeCloseTo(6.05, 2);
  });

  it('config con tieneExamen false aún usa el porcentaje de examen', () => {
    const configSinExamen: ConfigActividadPartial = {
      numActividadesCotidianas: 4,
      numActividadesIntegradoras: 1,
      tieneExamen: false,
      numExamenes: 0,
      porcentajeAC: 50,
      porcentajeAI: 50,
      porcentajeExamen: 0,
    };
    const result = calcularPromedioFinal(8, 7, 9, configSinExamen);
    // (8 * 0.50) + (7 * 0.50) + (9 * 0) = 4 + 3.5 + 0 = 7.5
    expect(result).toBe(7.5);
  });
});

describe('getEstadoCompletitud - multi-examen', () => {
  const baseConfig: ConfigActividadPartial = {
    numActividadesCotidianas: 4,
    numActividadesIntegradoras: 1,
    tieneExamen: true,
    numExamenes: 3,
    porcentajeAC: 35,
    porcentajeAI: 35,
    porcentajeExamen: 30,
  };

  const baseCalif: Calificacion = {
    id: 'test', estudianteId: 'e1', materiaId: 'm1', trimestre: 1,
    calificacionAC: null, calificacionAI: null, examenTrimestral: null,
    promedioFinal: null, recuperacion: null,
    actividadesCotidianas: JSON.stringify(Array(4).fill(null)),
    actividadesIntegradoras: JSON.stringify(Array(1).fill(null)),
    actividadesExamen: JSON.stringify(Array(3).fill(null)),
  };

  it('retorna vacio cuando todas las notas examen son null', () => {
    const calif = {
      ...baseCalif,
      actividadesCotidianas: JSON.stringify([null, null, null, null]),
      actividadesIntegradoras: JSON.stringify([null]),
      actividadesExamen: JSON.stringify([null, null, null]),
    };
    expect(getEstadoCompletitud(calif, baseConfig)).toBe('vacio');
  });

  it('retorna completo cuando todas las notas (incluyendo examen) están llenas', () => {
    const calif = {
      ...baseCalif,
      actividadesCotidianas: JSON.stringify([8, 7, 9, 6]),
      actividadesIntegradoras: JSON.stringify([8]),
      actividadesExamen: JSON.stringify([7, 8, 9]),
    };
    expect(getEstadoCompletitud(calif, baseConfig)).toBe('completo');
  });

  it('retorna parcial cuando solo algunas notas de examen están llenas', () => {
    const calif = {
      ...baseCalif,
      actividadesCotidianas: JSON.stringify([8, 7, 9, 6]),
      actividadesIntegradoras: JSON.stringify([8]),
      actividadesExamen: JSON.stringify([7, null, null]),
    };
    expect(getEstadoCompletitud(calif, baseConfig)).toBe('parcial');
  });

  it('retorna parcial con solo examen lleno y AC/AI vacío', () => {
    const calif = {
      ...baseCalif,
      actividadesCotidianas: JSON.stringify(Array(4).fill(null)),
      actividadesIntegradoras: JSON.stringify([null]),
      actividadesExamen: JSON.stringify([7, 8, 9]),
    };
    expect(getEstadoCompletitud(calif, baseConfig)).toBe('parcial');
  });

  it('considera numExamenes=0 igual que no tener examen', () => {
    const configSinExamen: ConfigActividadPartial = {
      ...baseConfig, tieneExamen: false, numExamenes: 0,
    };
    const calif = {
      ...baseCalif,
      actividadesCotidianas: JSON.stringify([8, 7, 9, 6]),
      actividadesIntegradoras: JSON.stringify([8]),
      actividadesExamen: JSON.stringify(Array(0).fill(null)),
    };
    expect(getEstadoCompletitud(calif, configSinExamen)).toBe('completo');
  });

  it('retorna vacio para calificacion undefined', () => {
    expect(getEstadoCompletitud(undefined, baseConfig)).toBe('vacio');
  });

  it('retorna vacio para config null', () => {
    expect(getEstadoCompletitud(baseCalif, null)).toBe('vacio');
  });

  it('maneja actividadesExamen como null (backward compat)', () => {
    const calif = {
      ...baseCalif,
      actividadesCotidianas: JSON.stringify([8, 7, 9, 6]),
      actividadesIntegradoras: JSON.stringify([8]),
      actividadesExamen: null,
    };
    // null → parseNotas returns all nulls → 0 filled = vacio
    // But AC+AI are filled (4+1=5 filled, total with config.numExamenes (3) = 4+1+3=8, 5<8 = parcial)
    expect(getEstadoCompletitud(calif, baseConfig)).toBe('parcial');
  });
});

describe('Flujo completo multi-examen - notas de examen a promedio final', () => {
  const config3Ex: ConfigActividadPartial = {
    numActividadesCotidianas: 4, numActividadesIntegradoras: 1, tieneExamen: true, numExamenes: 3,
    porcentajeAC: 35, porcentajeAI: 35, porcentajeExamen: 30,
  };
  const config1Ex: ConfigActividadPartial = {
    numActividadesCotidianas: 4, numActividadesIntegradoras: 1, tieneExamen: true, numExamenes: 1,
    porcentajeAC: 35, porcentajeAI: 35, porcentajeExamen: 30,
  };

  it('promedia 3 examenes y calcula promedio final', () => {
    const ac = calcularPromedio([8, 7, 9, 6]); // 7.5
    const ai = calcularPromedio([8]);           // 8
    const ex = calcularPromedio([7, 8, 9]);     // 8
    const pf = calcularPromedioFinal(ac, ai, ex, config3Ex);
    // (7.5 * 0.35) + (8 * 0.35) + (8 * 0.30) = 2.625 + 2.8 + 2.4 = 7.825
    expect(pf).toBeCloseTo(7.825, 3);
  });

  it('promedia 3 examenes con algunos null (usa solo válidos)', () => {
    const ex = calcularPromedio([7, null, 9]); // 8
    expect(ex).toBe(8);
  });

  it('examen con 5 partes en config', () => {
    const config5Ex: ConfigActividadPartial = {
      ...config3Ex, numExamenes: 5,
    };
    const ac = calcularPromedio([10, 10, 10, 10]); // 10
    const ai = calcularPromedio([10]);              // 10
    const ex = calcularPromedio([8, 8, 8, 8, 8]);   // 8
    const pf = calcularPromedioFinal(ac, ai, ex, config5Ex);
    expect(pf).toBeCloseTo(10 * 0.35 + 10 * 0.35 + 8 * 0.30, 5); // 3.5 + 3.5 + 2.4 = 9.4
    expect(pf).toBeCloseTo(9.4, 2);
  });

  it('examen con null y numExamenes=1 se comporta como examenTrimestral simple', () => {
    const ex = calcularPromedio([null]); // null
    expect(ex).toBeNull();
    const pf = calcularPromedioFinal(7.5, 8, ex, config1Ex);
    expect(pf).toBeCloseTo(7.5 * 0.35 + 8 * 0.35 + 0 * 0.30, 2); // 5.425
    expect(pf).toBeCloseTo(5.425, 3);
  });

  it('actividadesExamen parseadas correctamente con JSON.stringify', () => {
    const notas = [7, 8, 9];
    const str = JSON.stringify(notas);
    expect(parseNotas(str, 3)).toEqual([7, 8, 9]);
  });

  it('actividadesExamen con menos partes que numExamenes se rellena con null', () => {
    expect(parseNotas('[7, 8]', 5)).toEqual([7, 8, null, null, null]);
  });

  it('actividadesExamen con más partes que numExamenes se recorta', () => {
    expect(parseNotas('[7, 8, 9, 10, 11]', 3)).toEqual([7, 8, 9]);
  });

  it('parseNotas con count=0 cuando no hay examen', () => {
    expect(parseNotas('[7, 8]', 0)).toEqual([]);
  });

  it('parseNotas con null y count>0', () => {
    expect(parseNotas(null, 3)).toEqual([null, null, null]);
  });

  it('parseNotas con string vacío', () => {
    expect(parseNotas('[]', 3)).toEqual([null, null, null]);
  });
});

describe('clasificarEscala', () => {
  const umbrales = { condicionado: 4.5, aprobado: 6.5 };

  it('clasifica como REPROBADO cuando promedio < 4.5', () => {
    expect(clasificarEscala(0, umbrales)).toBe('REPROBADO');
    expect(clasificarEscala(2.5, umbrales)).toBe('REPROBADO');
    expect(clasificarEscala(4.49, umbrales)).toBe('REPROBADO');
  });

  it('clasifica como CONDICIONADO cuando 4.5 <= promedio < 6.5', () => {
    expect(clasificarEscala(4.5, umbrales)).toBe('CONDICIONADO');
    expect(clasificarEscala(5.0, umbrales)).toBe('CONDICIONADO');
    expect(clasificarEscala(6.49, umbrales)).toBe('CONDICIONADO');
  });

  it('clasifica como APROBADO cuando promedio >= 6.5', () => {
    expect(clasificarEscala(6.5, umbrales)).toBe('APROBADO');
    expect(clasificarEscala(8.0, umbrales)).toBe('APROBADO');
    expect(clasificarEscala(10, umbrales)).toBe('APROBADO');
  });

  it('funciona con umbrales personalizados', () => {
    const customUmbrales = { condicionado: 5.0, aprobado: 7.0 };
    expect(clasificarEscala(4.9, customUmbrales)).toBe('REPROBADO');
    expect(clasificarEscala(5.0, customUmbrales)).toBe('CONDICIONADO');
    expect(clasificarEscala(6.9, customUmbrales)).toBe('CONDICIONADO');
    expect(clasificarEscala(7.0, customUmbrales)).toBe('APROBADO');
  });
});
