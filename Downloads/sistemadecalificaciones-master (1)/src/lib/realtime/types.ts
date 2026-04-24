export interface RealtimeUser {
  id: string
  nombre: string
  email: string
  rol: string
}

export interface RealtimeActivity {
  id: string
  tipo: "calificacion" | "asistencia"
  accion: "UPDATE" | "DELETE" | "CREATE"
  entidad: "Calificacion" | "Asistencia"
  usuario: { nombre: string; email: string; rol: string }
  detalles: Record<string, unknown> | null
  fecha: string
}

export interface RealtimeEvent {
  type: "user-connected" | "user-disconnected" | "activity" | "users-list" | "initial-state"
  payload: unknown
  timestamp: string
}
