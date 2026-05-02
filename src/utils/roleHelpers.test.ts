import { describe, it, expect } from 'vitest';
import { isAdmin, canDeleteUsers, getDocentesDelGrado } from './roleHelpers';
import { Usuario, UsuarioSesion } from '@/types';

describe('isAdmin', () => {
  it('admin es admin', () => {
    expect(isAdmin('admin')).toBe(true);
  });

  it('admin-directora es admin', () => {
    expect(isAdmin('admin-directora')).toBe(true);
  });

  it('admin-codirectora es admin', () => {
    expect(isAdmin('admin-codirectora')).toBe(true);
  });

  it('docente no es admin', () => {
    expect(isAdmin('docente')).toBe(false);
  });

  it('docente-orientador no es admin', () => {
    expect(isAdmin('docente-orientador')).toBe(false);
  });

  it('string vacío no es admin', () => {
    expect(isAdmin('')).toBe(false);
  });

  it('rol con mayusculas no es admin (case sensitive)', () => {
    expect(isAdmin('Admin')).toBe(false);
    expect(isAdmin('ADMIN')).toBe(false);
  });

  it('rol null/undefined no es admin', () => {
    expect(isAdmin(null as unknown as string)).toBe(false);
    expect(isAdmin(undefined as unknown as string)).toBe(false);
  });

  it('rol aleatorio no es admin', () => {
    expect(isAdmin('estudiante')).toBe(false);
    expect(isAdmin('padre')).toBe(false);
  });
});

describe('canDeleteUsers', () => {
  it('usuario autorizado puede eliminar', () => {
    const user: UsuarioSesion = {
      id: '1',
      email: 'jonathan.araujo.mendoza@clases.edu.sv',
      nombre: 'Jonathan',
      rol: 'admin',
    };
    expect(canDeleteUsers(user)).toBe(true);
  });

  it('admin con otro email no puede eliminar', () => {
    const user: UsuarioSesion = {
      id: '2',
      email: 'otro@clases.edu.sv',
      nombre: 'Otro Admin',
      rol: 'admin',
    };
    expect(canDeleteUsers(user)).toBe(false);
  });

  it('usuario null no puede eliminar', () => {
    expect(canDeleteUsers(null)).toBe(false);
  });

  it('usuario sin email no puede eliminar', () => {
    const user = {
      id: '3',
      email: '',
      nombre: 'Sin Email',
      rol: 'admin',
    } as UsuarioSesion;
    expect(canDeleteUsers(user)).toBe(false);
  });
});

describe('getDocentesDelGrado', () => {
  const usuarios: Usuario[] = [
    {
      id: '1',
      email: 'profe1@clases.edu.sv',
      nombre: 'Profesor Mario',
      rol: 'docente',
      activo: true,
      materias: [
        { id: 'm1', nombre: 'Matemática', gradoId: 'g1' },
        { id: 'm2', nombre: 'Física', gradoId: 'g2' },
      ],
    },
    {
      id: '2',
      email: 'profe2@clases.edu.sv',
      nombre: 'Profesora Luisa',
      rol: 'docente',
      activo: true,
      materias: [
        { id: 'm3', nombre: 'Comunicación', gradoId: 'g1' },
      ],
    },
    {
      id: '3',
      email: 'profe3@clases.edu.sv',
      nombre: 'Profesor Carlos',
      rol: 'docente',
      activo: true,
      materias: [
        { id: 'm4', nombre: 'Historia', gradoId: 'g3' },
      ],
    },
    {
      id: '4',
      email: 'admin@clases.edu.sv',
      nombre: 'Admin',
      rol: 'admin',
      activo: true,
    },
  ];

  it('retorna docentes del grado correcto', () => {
    const result = getDocentesDelGrado(usuarios, 'g1');
    expect(result).toContain('Profesor Mario');
    expect(result).toContain('Profesora Luisa');
    expect(result).toHaveLength(2);
  });

  it('retorna array vacío si no hay docentes en el grado', () => {
    const result = getDocentesDelGrado(usuarios, 'g99');
    expect(result).toEqual([]);
  });

  it('no incluye usuarios sin materias', () => {
    const result = getDocentesDelGrado(usuarios, 'g1');
    expect(result).not.toContain('Admin');
  });

  it('retorna array vacío si usuarios no es array', () => {
    expect(getDocentesDelGrado(null as unknown as Usuario[], 'g1')).toEqual([]);
    expect(getDocentesDelGrado(undefined as unknown as Usuario[], 'g1')).toEqual([]);
  });

  it('retorna solo un docente si comparte varias materias en el mismo grado', () => {
    const usuariosConDuplicado: Usuario[] = [
      {
        id: '1',
        email: 'profe@clases.edu.sv',
        nombre: 'Profesor Único',
        rol: 'docente',
        activo: true,
        materias: [
          { id: 'm1', nombre: 'Matemática', gradoId: 'g1' },
          { id: 'm2', nombre: 'Física', gradoId: 'g1' },
        ],
      },
    ];
    const result = getDocentesDelGrado(usuariosConDuplicado, 'g1');
    expect(result).toEqual(['Profesor Único']);
  });

  it('maneja usuario sin propiedad materias', () => {
    const usuariosSinMaterias: Usuario[] = [
      {
        id: '1',
        email: 'user@clases.edu.sv',
        nombre: 'Usuario Sin Materias',
        rol: 'docente',
        activo: true,
      },
    ];
    const result = getDocentesDelGrado(usuariosSinMaterias, 'g1');
    expect(result).toEqual([]);
  });
});
