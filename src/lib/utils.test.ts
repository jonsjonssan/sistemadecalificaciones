import { describe, it, expect } from 'vitest';
import {
  calcularPromedio,
  calcularPromedioFinal,
  estaAprobado,
  getColorPromedio,
  getColorAsistencia,
  truncate,
  generarNumeroLista,
  formatDate,
  formatDateShort,
} from './utils/index';

describe('calcularPromedio', () => {
  it('calcula promedio correctamente con números válidos', () => {
    expect(calcularPromedio([8, 9, 7])).toBe(8);
  });

  it('calcula promedio correctamente con decimales', () => {
    expect(calcularPromedio([7.5, 8.5])).toBe(8);
  });

  it('retorna null para array vacío', () => {
    expect(calcularPromedio([])).toBe(null);
  });

  it('retorna 0 para notas con valor cero', () => {
    expect(calcularPromedio([0, 0, 0])).toBe(0);
  });

  it('redondea a 2 decimales', () => {
    expect(calcularPromedio([7, 8, 9])).toBe(8);
  });
});

describe('calcularPromedioFinal', () => {
  it('calcula promedio final con todos los valores', () => {
    const result = calcularPromedioFinal(8, 9, 7);
    expect(result).toBe(8.05);
  });

  it('retorna null si promedioAC es null', () => {
    expect(calcularPromedioFinal(null, 9, 7)).toBe(null);
  });

  it('retorna null si promedioAI es null', () => {
    expect(calcularPromedioFinal(8, null, 7)).toBe(null);
  });

  it('retorna null si examen es null', () => {
    expect(calcularPromedioFinal(8, 9, null)).toBe(null);
  });

  it('aplica porcentajes correctamente (35% AC + 35% AI + 30% Examen)', () => {
    const result = calcularPromedioFinal(10, 10, 10);
    expect(result).toBe(10);
  });
});

describe('estaAprobado', () => {
  it('retorna true para promedio redondeado >= 5', () => {
    expect(estaAprobado(5)).toBe(true);
    expect(estaAprobado(4.5)).toBe(true);
    expect(estaAprobado(7.5)).toBe(true);
    expect(estaAprobado(10)).toBe(true);
  });

  it('retorna false para promedio redondeado < 5', () => {
    expect(estaAprobado(4.4)).toBe(false);
    expect(estaAprobado(1)).toBe(false);
  });

  it('retorna false para promedio null', () => {
    expect(estaAprobado(null)).toBe(false);
  });
});

describe('getColorPromedio', () => {
  it('retorna color primary para promedio >= 9', () => {
    expect(getColorPromedio(9)).toBe('text-primary');
    expect(getColorPromedio(10)).toBe('text-primary');
  });

  it('retorna color foreground/80 para promedio redondeado >= 7 y < 9', () => {
    expect(getColorPromedio(7)).toBe('text-foreground/80');
    expect(getColorPromedio(8.4)).toBe('text-foreground/80');
  });

  it('retorna color muted-foreground para promedio redondeado >= 5 y < 7', () => {
    expect(getColorPromedio(5)).toBe('text-muted-foreground');
    expect(getColorPromedio(4.5)).toBe('text-muted-foreground');
    expect(getColorPromedio(6.4)).toBe('text-muted-foreground');
  });

  it('retorna color destructive para promedio redondeado < 5', () => {
    expect(getColorPromedio(4.4)).toBe('text-destructive');
    expect(getColorPromedio(0)).toBe('text-destructive');
  });

  it('retorna color muted para null', () => {
    expect(getColorPromedio(null)).toBe('text-muted-foreground');
  });
});

describe('getColorAsistencia', () => {
  it('retorna color success para presente', () => {
    expect(getColorAsistencia('presente')).toBe('bg-status-success-muted text-status-success');
  });

  it('retorna color error para ausente', () => {
    expect(getColorAsistencia('ausente')).toBe('bg-status-error-muted text-status-error');
  });

  it('retorna color muted para justificada', () => {
    expect(getColorAsistencia('justificada')).toBe('bg-muted text-muted-foreground');
  });

  it('retorna color warning para tarde', () => {
    expect(getColorAsistencia('tarde')).toBe('bg-status-warning-muted text-status-warning');
  });

  it('retorna color muted para estado desconocido', () => {
    expect(getColorAsistencia('desconocido')).toBe('bg-muted text-muted-foreground');
  });
});

describe('truncate', () => {
  it('no trunca si la cadena es más corta que el límite', () => {
    expect(truncate('hola', 10)).toBe('hola');
  });

  it('trunca correctamente', () => {
    expect(truncate('hola mundo', 4)).toBe('hola...');
  });

  it('funciona con límites iguales', () => {
    expect(truncate('hola', 4)).toBe('hola');
  });
});

describe('generarNumeroLista', () => {
  it('retorna 1 si no hay estudiantes', () => {
    expect(generarNumeroLista([])).toBe(1);
  });

  it('retorna el siguiente número al máximo', () => {
    expect(generarNumeroLista([{ numero: 5 }, { numero: 3 }])).toBe(6);
  });

  it('funciona con un solo estudiante', () => {
    expect(generarNumeroLista([{ numero: 1 }])).toBe(2);
  });
});

describe('formatDate', () => {
  it('formatea fecha correctamente', () => {
    const result = formatDate('2026-04-02');
    expect(result).toContain('2026');
    expect(result).toContain('abril');
    expect(result).toContain('2');
  });
});

describe('formatDateShort', () => {
  it('formatea fecha corta correctamente', () => {
    const result = formatDateShort('2026-04-02');
    expect(result).toContain('02');
    expect(result).toContain('04');
    expect(result).toContain('2026');
  });
});