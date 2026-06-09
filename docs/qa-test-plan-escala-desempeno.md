# QA Test Plan: Escala de Desempeño

## Feature: Estadísticas de Escala de Desempeño por Grado y Asignatura

### Objetivo
Verificar que el endpoint `/api/stats/escala-desempeno` y el componente `EscalaDesempeno` calculen y muestren correctamente la distribución de estudiantes en las escalas:
- **Reprobado:** 0 – 4.49
- **Condicionado:** 4.50 – 6.49
- **Aprobado:** ≥ 6.50

### Alcance
- Endpoint API `GET /api/stats/escala-desempeno`
- Componente React `EscalaDesempeno`
- Integración con Dashboard
- Casos de borde (sin notas, un solo trimestre, todos los trimestres)

### Entorno
- Next.js 16 (App Router)
- Base de datos PostgreSQL/Prisma
- Navegadores: Chrome, Firefox, Edge

---

## Casos de Prueba

### TC-001: Endpoint retorna 401 sin sesión
**Prioridad:** P0 (Critical)
**Tipo:** Seguridad

#### Pasos
1. Enviar `GET /api/stats/escala-desempeno` sin cookies de sesión.

#### Resultado Esperado
- HTTP 401
- Body: `{ error: "No autorizado" }`

---

### TC-002: Endpoint retorna 403 para grado no asignado (docente)
**Prioridad:** P0 (Critical)
**Tipo:** Seguridad

#### Pasos
1. Iniciar sesión como docente asignado al grado "3A".
2. Enviar `GET /api/stats/escala-desempeno?gradoId=<id-de-2A>`.

#### Resultado Esperado
- HTTP 403
- Body: `{ error: "No tiene acceso a este grado" }`

---

### TC-003: Endpoint retorna datos por grado (trimestre único)
**Prioridad:** P0 (Critical)
**Tipo:** Funcional

#### Precondiciones
- Grado "2A" con 5 estudiantes.
- 3 materias con calificaciones en trimestre 1.

#### Pasos
1. Iniciar sesión como admin.
2. Enviar `GET /api/stats/escala-desempeno?trimestre=1&gradoId=<id>`.

#### Resultado Esperado
- HTTP 200
- Array con un elemento:
  - `gradoNombre`: `"2° \"A\""`
  - `escala.reprobado`, `escala.condicionado`, `escala.aprobado` suman `escala.total`
  - `materias` tiene 3 items con sus respectivos conteos

---

### TC-004: Endpoint calcula promedio anual correctamente (trimestre=all)
**Prioridad:** P0 (Critical)
**Tipo:** Funcional

#### Precondiciones
- Estudiante con promedios T1=4, T2=6, T3=8 en una materia.

#### Pasos
1. Enviar `GET /api/stats/escala-desempeno?trimestre=all`.

#### Resultado Esperado
- Promedio anual del estudiante en esa materia = (4+6+8)/3 = 6.0
- Clasificación: **Condicionado**

---

### TC-005: Clasificación en límites exactos de umbrales
**Prioridad:** P1 (High)
**Tipo:** Funcional

#### Pasos
1. Insertar calificaciones con `promedioFinal` exactos:
   - 4.49 → Reprobado
   - 4.50 → Condicionado
   - 6.49 → Condicionado
   - 6.50 → Aprobado

#### Resultado Esperado
- Endpoint clasifica correctamente según los umbrales de `ConfiguracionSistema`.

---

### TC-006: Endpoint maneja grado sin calificaciones
**Prioridad:** P1 (High)
**Tipo:** Funcional / Edge Case

#### Precondiciones
- Grado con estudiantes activos pero sin calificaciones registradas.

#### Pasos
1. Enviar `GET /api/stats/escala-desempeno?trimestre=1&gradoId=<id>`.

#### Resultado Esperado
- HTTP 200
- `escala.total` = número de estudiantes
- `escala.sinNotas` = número de estudiantes
- `escala.reprobado`, `condicionado`, `aprobado` = 0

---

### TC-007: Componente `EscalaDesempeno` renderiza gráfico por grado
**Prioridad:** P1 (High)
**Tipo:** UI

#### Pasos
1. Iniciar sesión como admin.
2. Ir al Dashboard.
3. Verificar que aparece la tarjeta "Escala de Desempeño".

#### Resultado Esperado
- Gráfico de barras apiladas visible con leyendas: Reprobado (rojo), Condicionado (ámbar), Aprobado (verde).
- Eje X muestra nombres de grados.

---

### TC-008: Componente muestra tabla por asignatura al seleccionar un grado
**Prioridad:** P1 (High)
**Tipo:** UI

#### Pasos
1. En el Dashboard, seleccionar un grado específico en el filtro del componente `EscalaDesempeno`.
2. (Si es admin, seleccionar un grado del dropdown)

#### Resultado Esperado
- Se muestra un segundo gráfico de barras apiladas por asignatura.
- Tabla debajo con filas de asignaturas y conteos exactos.

---

### TC-009: Filtro de trimestre actualiza datos dinámicamente
**Prioridad:** P1 (High)
**Tipo:** UI / Integración

#### Pasos
1. En el componente `EscalaDesempeno`, cambiar el select de "Anual" a "I Trimestre".

#### Resultado Esperado
- Se dispara una nueva petición a `/api/stats/escala-desempeno?trimestre=1`.
- Los gráficos y la tabla se actualizan con los nuevos datos.

---

### TC-010: Docente solo ve su grado asignado
**Prioridad:** P1 (High)
**Tipo:** Seguridad / UI

#### Pasos
1. Iniciar sesión como docente orientador de 3A.
2. Ir al Dashboard.

#### Resultado Esperado
- `EscalaDesempeno` se renderiza solo con datos del grado 3A.
- No aparece el selector de grado.

---

### TC-011: API client `stats.escalaDesempeno` envía params correctamente
**Prioridad:** P2 (Medium)
**Tipo:** Integración

#### Pasos
1. Ejecutar tests unitarios: `npx vitest run src/__tests__/api-client.test.ts`

#### Resultado Esperado
- Todos los tests de `api.stats` pasan, incluyendo `escalaDesempeno`.

---

### TC-012: Tests unitarios de `clasificarEscala` cubren límites
**Prioridad:** P2 (Medium)
**Tipo:** Regresión

#### Pasos
1. Ejecutar tests unitarios: `npx vitest run src/utils/gradeCalculations.test.ts`

#### Resultado Esperado
- Tests de `clasificarEscala` pasan (0, 4.49, 4.50, 6.49, 6.50, 10).

---

## Regresión: Endpoints Existentes

### TC-R001: Endpoint `/api/stats/dashboard` sigue funcionando
**Prioridad:** P0
**Tipo:** Regresión

#### Pasos
1. Iniciar sesión como admin.
2. Acceder al Dashboard.

#### Resultado Esperado
- El dashboard carga sin errores 500.
- Las estadísticas previas se muestran correctamente.

### TC-R002: Endpoint `/api/calificaciones` CRUD intacto
**Prioridad:** P0
**Tipo:** Regresión

#### Pasos
1. Guardar una calificación.
2. Verificar que se actualiza `promedioFinal`.

#### Resultado Esperado
- Calificación guardada correctamente.
- `promedioFinal` recalculado.

---

## Criterios de Salida
- [x] Todos los casos P0 ejecutados y aprobados.
- [x] Tests unitarios pasan (276 tests).
- [x] TypeScript sin errores (`tsc --noEmit`).
- [x] Sin errores de lint en archivos modificados.
- [ ] (Opcional) Pruebas manuales en staging.

## Riesgos
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Rendimiento lento en grados grandes (>50 estudiantes) | Media | Media | Query optimizada con `findMany` agrupado |
| Datos inconsistentes si hay calificaciones sin `promedioFinal` | Baja | Alta | Se maneja con `sinNotas` |

---

**Tester:** OpenCode Agent
**Fecha:** 2026-06-09
**Build:** commit actual (rama principal)
