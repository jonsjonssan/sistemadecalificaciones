export interface SesionMateria {
  id: string;
  nombre: string;
  gradoId: string;
  grado?: { numero: number; seccion: string };
  gradoNumero?: number;
  gradoSeccion?: string;
}

export interface SesionGrado {
  id: string;
  numero: number;
  seccion: string;
}

export interface SessionUsuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  escuelaId: string;
  escuela?: { id: string; nombre: string; codigo?: string; logo?: string; colorPrimario?: string };
  sessionId?: string;
  gradoId?: string;
  materias?: SesionMateria[];
  gradosAsignados?: SesionGrado[];
  asignaturasAsignadas?: SesionMateria[];
  provider?: string;
}

export type SessionData = SessionUsuario;
