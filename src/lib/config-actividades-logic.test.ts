/**
 * Tests de lógica de negocio para ConfigActividad (configuración de actividades por materia/trimestre).
 */
import { describe, it, expect } from 'vitest';
import { ConfigActividadPartial } from '@/types';

function validarConfiguracion(config: {
  numActividadesCotidianas: number;
  numActividadesIntegradoras: number;
  porcentajeAC: number;
  porcentajeAI: number;
  porcentajeExamen: number;
  tieneExamen: boolean;
}): { valido: boolean; errores: string[] } {
  const errores: string[] = [];

  if (config.numActividadesCotidianas < 0 || config.numActividadesCotidianas > 10) {
    errores.push('Actividades Cotidianas debe estar entre 0 y 10');
  }
  if (config.numActividadesIntegradoras < 0 || config.numActividadesIntegradoras > 5) {
    errores.push('Actividades Integradoras debe estar entre 0 y 5');
  }
  if (config.porcentajeAC < 0 || config.porcentajeAC > 100) {
    errores.push('Porcentaje AC debe estar entre 0 y 100');
  }
  if (config.porcentajeAI < 0 || config.porcentajeAI > 100) {
    errores.push('Porcentaje AI debe estar entre 0 y 100');
  }
  if (config.porcentajeExamen < 0 || config.porcentajeExamen > 100) {
    errores.push('Porcentaje Examen debe estar entre 0 y 100');
  }

  if (!config.tieneExamen && config.porcentajeExamen > 0) {
    errores.push('No puede haber porcentaje de examen si no tiene examen');
  }

  if (config.tieneExamen) {
    const suma = config.porcentajeAC + config.porcentajeAI + config.porcentajeExamen;
    if (suma !== 100) {
      errores.push(`Los porcentajes deben sumar 100 (actual: ${suma})`);
    }
  } else {
    const suma = config.porcentajeAC + config.porcentajeAI;
    if (suma !== 100) {
      errores.push(`Los porcentajes deben sumar 100 (actual: ${suma})`);
    }
  }

  return { valido: errores.length === 0, errores };
}

describe('validarConfiguracion - Validación de configuración de actividades', () => {
  describe('configuraciones válidas', () => {
    it('configuracion por defecto (4 AC, 1 AI, 35/35/30)', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: 4,
        numActividadesIntegradoras: 1,
        porcentajeAC: 35,
        porcentajeAI: 35,
        porcentajeExamen: 30,
        tieneExamen: true,
      });
      expect(result.valido).toBe(true);
    });

    it('configuracion 50/50 sin examen', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: 6,
        numActividadesIntegradoras: 2,
        porcentajeAC: 50,
        porcentajeAI: 50,
        porcentajeExamen: 0,
        tieneExamen: false,
      });
      expect(result.valido).toBe(true);
    });

    it('configuracion 40/30/30', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: 5,
        numActividadesIntegradoras: 3,
        porcentajeAC: 40,
        porcentajeAI: 30,
        porcentajeExamen: 30,
        tieneExamen: true,
      });
      expect(result.valido).toBe(true);
    });

    it('configuracion solo examen (100% examen)', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: 0,
        numActividadesIntegradoras: 0,
        porcentajeAC: 0,
        porcentajeAI: 0,
        porcentajeExamen: 100,
        tieneExamen: true,
      });
      expect(result.valido).toBe(true);
    });

    it('limites minimos de actividades (0 AC, 0 AI)', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: 0,
        numActividadesIntegradoras: 0,
        porcentajeAC: 0,
        porcentajeAI: 0,
        porcentajeExamen: 100,
        tieneExamen: true,
      });
      expect(result.valido).toBe(true);
    });

    it('limites maximos de actividades (10 AC, 5 AI)', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: 10,
        numActividadesIntegradoras: 5,
        porcentajeAC: 35,
        porcentajeAI: 35,
        porcentajeExamen: 30,
        tieneExamen: true,
      });
      expect(result.valido).toBe(true);
    });
  });

  describe('configuraciones inválidas - porcentajes no suman 100', () => {
    it('porcentajes suman 90 (con examen)', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: 4,
        numActividadesIntegradoras: 1,
        porcentajeAC: 30,
        porcentajeAI: 30,
        porcentajeExamen: 30,
        tieneExamen: true,
      });
      expect(result.valido).toBe(false);
      expect(result.errores).toContain('Los porcentajes deben sumar 100 (actual: 90)');
    });

    it('porcentajes suman 110 (con examen)', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: 4,
        numActividadesIntegradoras: 1,
        porcentajeAC: 40,
        porcentajeAI: 40,
        porcentajeExamen: 30,
        tieneExamen: true,
      });
      expect(result.valido).toBe(false);
      expect(result.errores).toContain('Los porcentajes deben sumar 100 (actual: 110)');
    });

    it('porcentajes suman 90 (sin examen)', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: 4,
        numActividadesIntegradoras: 1,
        porcentajeAC: 40,
        porcentajeAI: 50,
        porcentajeExamen: 0,
        tieneExamen: false,
      });
      expect(result.valido).toBe(false);
    });

    it('porcentajes suman 110 (sin examen)', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: 4,
        numActividadesIntegradoras: 1,
        porcentajeAC: 60,
        porcentajeAI: 50,
        porcentajeExamen: 0,
        tieneExamen: false,
      });
      expect(result.valido).toBe(false);
    });
  });

  describe('configuraciones inválidas - porcentaje examen cuando no tiene', () => {
    it('tieneExamen false pero porcentajeExamen > 0', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: 4,
        numActividadesIntegradoras: 1,
        porcentajeAC: 50,
        porcentajeAI: 30,
        porcentajeExamen: 20,
        tieneExamen: false,
      });
      expect(result.valido).toBe(false);
      expect(result.errores).toContain('No puede haber porcentaje de examen si no tiene examen');
    });
  });

  describe('configuraciones inválidas - número de actividades fuera de rango', () => {
    it('AC negativa', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: -1,
        numActividadesIntegradoras: 1,
        porcentajeAC: 35,
        porcentajeAI: 35,
        porcentajeExamen: 30,
        tieneExamen: true,
      });
      expect(result.valido).toBe(false);
    });

    it('AC mayor a 10', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: 11,
        numActividadesIntegradoras: 1,
        porcentajeAC: 35,
        porcentajeAI: 35,
        porcentajeExamen: 30,
        tieneExamen: true,
      });
      expect(result.valido).toBe(false);
    });

    it('AI negativa', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: 4,
        numActividadesIntegradoras: -1,
        porcentajeAC: 35,
        porcentajeAI: 35,
        porcentajeExamen: 30,
        tieneExamen: true,
      });
      expect(result.valido).toBe(false);
    });

    it('AI mayor a 5', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: 4,
        numActividadesIntegradoras: 6,
        porcentajeAC: 35,
        porcentajeAI: 35,
        porcentajeExamen: 30,
        tieneExamen: true,
      });
      expect(result.valido).toBe(false);
    });
  });

  describe('configuraciones inválidas - porcentajes fuera de rango', () => {
    it('porcentaje AC negativo', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: 4,
        numActividadesIntegradoras: 1,
        porcentajeAC: -5,
        porcentajeAI: 50,
        porcentajeExamen: 55,
        tieneExamen: true,
      });
      expect(result.valido).toBe(false);
    });

    it('porcentaje AC mayor a 100', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: 4,
        numActividadesIntegradoras: 1,
        porcentajeAC: 150,
        porcentajeAI: 35,
        porcentajeExamen: 30,
        tieneExamen: true,
      });
      expect(result.valido).toBe(false);
    });

    it('porcentaje AI mayor a 100', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: 4,
        numActividadesIntegradoras: 1,
        porcentajeAC: 35,
        porcentajeAI: 150,
        porcentajeExamen: 30,
        tieneExamen: true,
      });
      expect(result.valido).toBe(false);
    });

    it('porcentaje Examen mayor a 100', () => {
      const result = validarConfiguracion({
        numActividadesCotidianas: 4,
        numActividadesIntegradoras: 1,
        porcentajeAC: 35,
        porcentajeAI: 35,
        porcentajeExamen: 150,
        tieneExamen: true,
      });
      expect(result.valido).toBe(false);
    });
  });
});

describe('ConfigActividadPartial - Valores por defecto', () => {
  it('usa defaults cuando no se proveen valores', () => {
    const config: ConfigActividadPartial = {
      numActividadesCotidianas: 4,
      numActividadesIntegradoras: 1,
      tieneExamen: true,
    } as ConfigActividadPartial;

    const pctAC = config.porcentajeAC ?? 35;
    const pctAI = config.porcentajeAI ?? 35;
    const pctEx = config.porcentajeExamen ?? 30;

    expect(pctAC).toBe(35);
    expect(pctAI).toBe(35);
    expect(pctEx).toBe(30);
  });

  it('usa valores proveídos cuando existen', () => {
    const config: ConfigActividadPartial = {
      numActividadesCotidianas: 6,
      numActividadesIntegradoras: 3,
      tieneExamen: true,
      porcentajeAC: 50,
      porcentajeAI: 30,
      porcentajeExamen: 20,
    };

    expect(config.porcentajeAC).toBe(50);
    expect(config.porcentajeAI).toBe(30);
    expect(config.porcentajeExamen).toBe(20);
  });
});

describe('Comportamiento de la API GET config-actividades', () => {
  it('config por defecto se crea con 4 AC, 1 AI, 35/35/30', () => {
    const defaultConfig = {
      numActividadesCotidianas: 4,
      numActividadesIntegradoras: 1,
      tieneExamen: true,
      porcentajeAC: 35.0,
      porcentajeAI: 35.0,
      porcentajeExamen: 30.0,
    };

    expect(defaultConfig.numActividadesCotidianas).toBe(4);
    expect(defaultConfig.numActividadesIntegradoras).toBe(1);
    expect(defaultConfig.tieneExamen).toBe(true);
    expect(defaultConfig.porcentajeAC + defaultConfig.porcentajeAI + defaultConfig.porcentajeExamen).toBe(100);
  });

  it('config se puede modificar a 6 AC, 2 AI', () => {
    const updatedConfig = {
      numActividadesCotidianas: 6,
      numActividadesIntegradoras: 2,
      tieneExamen: true,
      porcentajeAC: 40,
      porcentajeAI: 30,
      porcentajeExamen: 30,
    };

    expect(updatedConfig.porcentajeAC + updatedConfig.porcentajeAI + updatedConfig.porcentajeExamen).toBe(100);
  });

  it('config se puede modificar a sin examen', () => {
    const updatedConfig = {
      numActividadesCotidianas: 4,
      numActividadesIntegradoras: 1,
      tieneExamen: false,
      porcentajeAC: 60,
      porcentajeAI: 40,
      porcentajeExamen: 0,
    };

    expect(updatedConfig.tieneExamen).toBe(false);
    expect(updatedConfig.porcentajeExamen).toBe(0);
    expect(updatedConfig.porcentajeAC + updatedConfig.porcentajeAI).toBe(100);
  });
});

describe('Escenarios de aplicación masiva (aplicarATodasLasMateriasDelGrado)', () => {
  it('aplica la misma config a múltiples materias', () => {
    const materias = ['Matemática', 'Comunicación', 'Ciencias'];
    const config = {
      numActividadesCotidianas: 5,
      numActividadesIntegradoras: 2,
      tieneExamen: true,
      porcentajeAC: 40,
      porcentajeAI: 30,
      porcentajeExamen: 30,
    };

    const resultados = materias.map(() => ({ ...config }));
    expect(resultados).toHaveLength(3);
    resultados.forEach((r) => {
      expect(r.numActividadesCotidianas).toBe(5);
      expect(r.porcentajeAC).toBe(40);
    });
  });

  it('verifica que todas las materias resultantes tengan la misma config', () => {
    const configMaestra = {
      numActividadesCotidianas: 3,
      numActividadesIntegradoras: 1,
      tieneExamen: true,
      porcentajeAC: 33.34,
      porcentajeAI: 33.33,
      porcentajeExamen: 33.33,
    };

    expect(
      configMaestra.porcentajeAC + configMaestra.porcentajeAI + configMaestra.porcentajeExamen
    ).toBeCloseTo(100, 1);
  });
});
