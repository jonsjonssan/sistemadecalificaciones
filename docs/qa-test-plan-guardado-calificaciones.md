# Plan de Pruebas QA: Guardado de Calificaciones (Autoguardado y Manual)

## Resumen Ejecutivo

Validar que el sistema de calificaciones guarda correctamente los datos tanto en autoguardado (debounce 800ms) como en guardado manual (botón "Guardar"). Se cubren: API (`POST /api/calificaciones`), frontend (`CalificacionRow.tsx`), hook (`useDashboardData.ts`), lógica de promedios, historial de cambios, auditoría y tolerancia a fallos.

## Alcance

### In Scope
- Autoguardado con debounce de 800ms al editar celdas
- Guardado manual con botón "Guardar" (Guardar Todo)
- Guardado al desmontar componente (`keepalive`)
- Cálculo de promedios (AC, AI, Examen, Promedio Final, Recuperación)
- Historial de cambios por celda (`HistorialCalificacion`)
- Auditoría (`AuditLog`)
- Validación Zod de entrada
- Consistencia de grado (cross-grade prevention)
- Reintentos con backoff exponencial
- Indicador visual de estado (saving/saved/idle)
- Offline queue (IndexedDB)

### Out of Scope
- DELETE de calificaciones
- GET de calificaciones (carga inicial)
- Configuración de actividades
- Módulo de asistencia
- Login/Autenticación

## Estrategia de Pruebas

| Tipo | Enfoque |
|------|---------|
| Funcional | Caja negra: entrada → salida esperada |
| Integración | API + DB + frontend (end-to-end) |
| Negativa | Datos inválidos, errores de red, concurrencia |
| Límite | Valores frontera (0, 10, null, vacío) |
| Recuperación | Fallo de red, reconexión, reintentos |

## Entorno de Pruebas

- **Navegadores:** Chrome 120+, Firefox 121+, Edge 120+
- **Dispositivos:** Desktop (1920×1080), Tablet (768×1024)
- **Backend:** Next.js API routes / Prisma + PostgreSQL
- **Red:** Online / Offline simulado (DevTools)

---

## Casos de Prueba

### TC-001: Autoguardado — Editar una celda AC

**Prioridad:** P0
**Tipo:** Funcional

**Precondiciones:**
- Sesión iniciada como docente
- Grado, asignatura y trimestre seleccionados
- Estudiante visible en la tabla

**Pasos:**
1. Hacer clic en una celda de actividad cotidiana (AC1) vacía
2. Escribir "8"
3. Esperar 1 segundo (debounce 800ms + latencia)

**Resultado Esperado:**
- Indicador "Guardando…" aparece (icono rotatorio)
- Indicador "Guardado" aparece con checkmark verde
- Indicador desaparece tras 2 segundos
- Al recargar la página, el valor "8" persiste en AC1
- El promedio AC se calcula correctamente
- El promedio final se actualiza

---

### TC-002: Autoguardado — Editar múltiples celdas rápido

**Prioridad:** P0
**Tipo:** Funcional

**Precondiciones:** TC-001

**Pasos:**
1. Escribir "7" en AC1
2. Sin esperar, escribir "8" en AC2
3. Sin esperar, escribir "9" en AC3
4. Esperar 1.5 segundos

**Resultado Esperado:**
- Solo UNA petición POST se envía (no 3)
- Los 3 valores se guardan correctamente
- Promedio AC = (7+8+9)/3 = 8.0
- Promedio final refleja el cambio

---

### TC-003: Autoguardado — Actividades Integradoras (AI)

**Prioridad:** P0
**Tipo:** Funcional

**Pasos:** Similar a TC-001 pero en celda AI

**Resultado Esperado:**
- Valor guardado correctamente
- Promedio AI calculado
- Promedio final actualizado con ponderación

---

### TC-004: Autoguardado — Examen Trimestral

**Prioridad:** P0
**Tipo:** Funcional

**Pasos:**
1. Ingresar "7.5" en examen trimestral
2. Esperar autoguardado

**Resultado Esperado:**
- `examenTrimestral = 7.5` en BD
- Promedio final = AC×0.35 + AI×0.35 + 7.5×0.30

---

### TC-005: Autoguardado — Recuperación

**Prioridad:** P0
**Tipo:** Funcional

**Pasos:**
1. Tener promedio final = 6.0
2. Ingresar "2" en recuperación
3. Esperar autoguardado

**Resultado Esperado:**
- `recuperacion = 2` en BD
- Promedio final = min(10, 6.0 + 2) = 8.0

---

### TC-006: Autoguardado — Borrar un valor (poner vacío)

**Prioridad:** P0
**Tipo:** Funcional

**Pasos:**
1. Tener AC1 = 8
2. Borrar el valor (dejar vacío)
3. Esperar autoguardado

**Resultado Esperado:**
- `acNotas[0] = null` en BD
- Promedio AC recalcula sin esa nota
- Historial registra: "AC1: 8 → vacío"

---

### TC-007: Guardado Manual — Botón "Guardar"

**Prioridad:** P0
**Tipo:** Funcional

**Precondiciones:** Múltiples estudiantes con datos modificados

**Pasos:**
1. Editar calificaciones de 3 estudiantes
2. Hacer clic en botón "Guardar"
3. Esperar respuesta

**Resultado Esperado:**
- Toast: "3 calificaciones guardadas" (o similar)
- Todas las filas quedan en estado no-dirty
- Los valores persisten al recargar

---

### TC-008: Guardado Manual — Sin cambios

**Prioridad:** P1
**Tipo:** Funcional

**Pasos:**
1. Sin modificar ninguna calificación
2. Hacer clic en "Guardar"

**Resultado Esperado:**
- Toast: "No hay calificaciones para guardar"
- Sin errores en consola

---

### TC-009: Validación — Nota fuera de rango (>10)

**Prioridad:** P0
**Tipo:** Negativa

**Pasos:**
1. Intentar escribir "11" en una celda

**Resultado Esperado:**
- El input no permite valores >10 (validación HTML o JS)
- Si se envía igual, API responde 400 con error Zod

---

### TC-010: Validación — Nota negativa (<0)

**Prioridad:** P0
**Tipo:** Negativa

**Pasos:**
1. Intentar escribir "-1"

**Resultado Esperado:**
- Input bloquea o API responde 400

---

### TC-011: Validación — Nota con decimal (ej: 7.8)

**Prioridad:** P1
**Tipo:** Funcional

**Pasos:**
1. Escribir "7.8"
2. Esperar autoguardado

**Resultado Esperado:**
- Valor guardado correctamente como 7.8
- Promedios calculados con precisión decimal

---

### TC-012: Consistencia de Grado — Cross-grade prevention

**Prioridad:** P1
**Tipo:** Negativa

**Precondiciones:**
- Estudiante de 1°A
- Materia de 2°B

**Pasos:**
1. Intentar guardar calificación para esta combinación

**Resultado Esperado:**
- API responde 400 con `code: "GRADE_MISMATCH"`
- Toast muestra mensaje de error
- BD no registra cambios

---

### TC-013: Historial de Cambios — Celda individual

**Prioridad:** P1
**Tipo:** Funcional

**Pasos:**
1. AC1 cambia de 7 → 9
2. Verificar historial

**Resultado Esperado:**
- `HistorialCalificacion` registra: `{ tipoCampo: "cotidiana_1", valorAnterior: 7, valorNuevo: 9, descripcion: "AC1: 7 → 9" }`
- Se guarda `usuarioId`, `calificacionId`, `createdAt`

---

### TC-014: Historial de Cambios — Límite de entradas

**Prioridad:** P2
**Tipo:** Funcional

**Pasos:**
1. Editar la misma celda 15 veces

**Resultado Esperado:**
- Solo 10 entradas más recientes se conservan por celda
- Las más antiguas se eliminan automáticamente

---

### TC-015: Auditoría — Guardado exitoso

**Prioridad:** P1
**Tipo:** Funcional

**Pasos:**
1. Guardar una calificación
2. Consultar tabla `AuditLog`

**Resultado Esperado:**
- Nuevo registro con `accion: "UPDATE"`, `entidad: "Calificacion"`
- Detalles incluyen: estudiante, materia, trimestre, promedioFinal, grado

---

### TC-016: Reintentos — Error de red temporal

**Prioridad:** P1
**Tipo:** Recuperación

**Pasos:**
1. Desconectar red (DevTools: Offline)
2. Editar una celda
3. Esperar 5 segundos
4. Reconectar red

**Resultado Esperado:**
- Indicador de error aparece (icono rojo)
- Reintento ocurre con backoff: 2s, 4s, 8s, 16s, 30s (máx)
- Al reconectar, el reintento eventualmente guarda
- Indicador de error desaparece, muestra "Guardado"
- No hay pérdida de datos

---

### TC-017: Guardado al cerrar / navegar (keepalive)

**Prioridad:** P1
**Tipo:** Funcional

**Pasos:**
1. Editar una celda (poner sucia)
2. Sin esperar autoguardado, cerrar pestaña
3. O navegar a otra ruta

**Resultado Esperado:**
- Fetch con `keepalive: true` se envía
- El valor persiste en BD al recargar la página
- Sin errores en consola del servidor

---

### TC-018: Múltiples exámenes (numExamenes > 1)

**Prioridad:** P1
**Tipo:** Funcional

**Precondiciones:** Config con `numExamenes: 2`

**Pasos:**
1. Ingresar Examen 1 = 8, Examen 2 = 6
2. Esperar autoguardado

**Resultado Esperado:**
- `notasExamen = [8, 6]` en BD
- `examenTrimestral = (8+6)/2 = 7.0`
- Promedio final usa examenTrimestral = 7.0

---

### TC-019: Sin configuración de actividades (valores por defecto)

**Prioridad:** P1
**Tipo:** Funcional

**Precondiciones:** Sin `ConfigActividad` para la materia/trimestre

**Pasos:**
1. Guardar AC=[8], AI=[7], Examen=6

**Resultado Esperado:**
- Promedio final usa pesos default: 35/35/30
- PF = 8×0.35 + 7×0.35 + 6×0.30 = 7.05
- Sin errores

---

### TC-020: Concurrencia — Dos docentes guardan el mismo estudiante

**Prioridad:** P2
**Tipo:** Integración

**Pasos:**
1. Docente A edita AC1=9 (guarda)
2. Docente B edita AC1=5 (guarda después)

**Resultado Esperado:**
- El último guardado prevalece (sin conflictos)
- Historial registra ambos cambios en orden cronológico
- Sin corrupción de datos

---

### TC-021: Todos los campos vacíos (calificación nueva)

**Prioridad:** P1
**Tipo:** Funcional

**Pasos:**
1. No ingresar ningún valor
2. Hacer clic en "Guardar"

**Resultado Esperado:**
- No se crea registro en BD (no hay datos)
- Toast: "No hay calificaciones para guardar"

---

### TC-022: Offline — IndexedDB almacena datos pendientes

**Prioridad:** P1
**Tipo:** Recuperación

**Pasos:**
1. Desconectar red
2. Editar varias calificaciones
3. Verificar IndexedDB → `offlineQueue`

**Resultado Esperado:**
- Los datos se almacenan en IndexedDB
- Al reconectar, la cola se reproduce
- Todos los valores se guardan en servidor

---

### TC-023: Autoguardado — Cambio rápido seguido de Guardar Manual

**Prioridad:** P1
**Tipo:** Funcional

**Pasos:**
1. Escribir en una celda
2. Inmediatamente (antes de 800ms) hacer clic en "Guardar"

**Resultado Esperado:**
- `handleGuardarTodo` ejecuta `forceSaveFns` que incluye el `doSave` de la fila
- No se duplica la petición
- Valor guardado correctamente

---

### TC-024: Indicador visual — Estados saving/saved/idle

**Prioridad:** P2
**Tipo:** UI

**Pasos:**
1. Editar celda → ver indicador
2. Esperar a que guarde → ver checkmark
3. Esperar 2s → indicador desaparece

**Resultado Esperado:**
- Transiciones suaves entre estados
- Sin parpadeos ni estados incorrectos

---

### TC-025: Promedio Final con recuperación (no excede 10)

**Prioridad:** P1
**Tipo:** Funcional

**Pasos:**
1. Tener promedio = 9.5
2. Ingresar recuperación = 3

**Resultado Esperado:**
- Promedio final = min(10, 9.5+3) = 10
- No excede 10

---

### TC-026: Solo examen trimestral (sin AC/AI)

**Prioridad:** P1
**Tipo:** Funcional

**Pasos:**
1. Dejar AC y AI vacíos
2. Ingresar examen = 8
3. Guardar

**Resultado Esperado:**
- `calificacionAC = null`, `calificacionAI = null`
- `examenTrimestral = 8`
- `promedioFinal = 8 × 0.30 = 2.40`

---

### TC-027: PromedioFinal null cuando no hay notas

**Prioridad:** P1
**Tipo:** Funcional

**Pasos:**
1. Enviar payload sin notas (todo null/vacío)

**Resultado Esperado:**
- `promedioFinal = null` en BD
- No hay error del servidor

---

### TC-028: Validación — trimestre inválido

**Prioridad:** P1
**Tipo:** Negativa

**Pasos:**
1. Enviar `trimestre: 4`

**Resultado Esperado:**
- API responde 400
- Zod error: "Trimestre inválido"

---

### TC-029: Sesión expirada

**Prioridad:** P0
**Tipo:** Seguridad

**Pasos:**
1. Iniciar sesión, esperar a que expire
2. Editar y guardar

**Resultado Esperado:**
- API responde 401
- Frontend redirige al login
- No se guardan datos

---

### TC-030: Sin permiso de materia

**Prioridad:** P0
**Tipo:** Seguridad

**Pasos:**
1. Docente de Matemáticas intenta guardar en Español

**Resultado Esperado:**
- API responde 403
- Toast: "Sin permiso"

---

## Matriz de Cobertura

| # | Caso | Tipo | Prioridad | Automatizable |
|---|------|------|-----------|---------------|
| TC-001 | Autoguardado celda AC | Funcional | P0 | Sí |
| TC-002 | Múltiples celdas rápido | Funcional | P0 | Sí |
| TC-003 | Autoguardado AI | Funcional | P0 | Sí |
| TC-004 | Examen Trimestral | Funcional | P0 | Sí |
| TC-005 | Recuperación | Funcional | P0 | Sí |
| TC-006 | Borrar valor | Funcional | P0 | Sí |
| TC-007 | Guardar Todo manual | Funcional | P0 | Sí |
| TC-008 | Guardar sin cambios | Funcional | P1 | Sí |
| TC-009 | Nota >10 | Negativa | P0 | Sí |
| TC-010 | Nota <0 | Negativa | P0 | Sí |
| TC-011 | Nota decimal | Funcional | P1 | Sí |
| TC-012 | Cross-grade | Negativa | P1 | Sí |
| TC-013 | Historial celda | Funcional | P1 | Sí |
| TC-014 | Límite historial | Funcional | P2 | Sí |
| TC-015 | Auditoría | Funcional | P1 | Sí |
| TC-016 | Reintento red | Recuperación | P1 | Sí |
| TC-017 | Keepalive unload | Funcional | P1 | No |
| TC-018 | Múltiples exámenes | Funcional | P1 | Sí |
| TC-019 | Sin config | Funcional | P1 | Sí |
| TC-020 | Concurrencia | Integración | P2 | No |
| TC-021 | Todo vacío | Funcional | P1 | Sí |
| TC-022 | Offline IndexedDB | Recuperación | P1 | No |
| TC-023 | Autoguardado + manual | Funcional | P1 | Sí |
| TC-024 | Indicador UI | UI | P2 | Sí |
| TC-025 | Recup no excede 10 | Funcional | P1 | Sí |
| TC-026 | Solo examen | Funcional | P1 | Sí |
| TC-027 | Null promedioFinal | Funcional | P1 | Sí |
| TC-028 | Trimestre inválido | Negativa | P1 | Sí |
| TC-029 | Sesión expirada | Seguridad | P0 | Sí |
| TC-030 | Sin permiso | Seguridad | P0 | Sí |

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Pérdida de datos por error de red | Media | Alto | Reintentos con backoff, keepalive, offline queue |
| Concurrencia: dos docentes mismos datos | Baja | Medio | Transacción atómica, último write gana |
| Debounce no cancela petición anterior | Baja | Medio | `savingRef` previene solapamiento |
| Navegación antes de autoguardar | Media | Medio | `beforeunload` + visibilitychange + keepalive |

## Criterios de Salida

- [ ] Todos los P0 aprobados
- [ ] ≥90% de P1 aprobados
- [ ] Ningún bug crítico abierto (pérdida de datos, corrupción)
- [ ] Pruebas de reintento y offline verificadas manualmente
