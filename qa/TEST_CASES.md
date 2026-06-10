# Casos de Prueba - Sistema de Calificaciones

## Índice

1. [Fechas de Trimestres Configurables](#fechas-de-trimestres-configurables)
2. [Estadísticas Anuales Completas](#estadísticas-anuales-completas)
3. [Suite de Regresión](#suite-de-regresión)

---

## Fechas de Trimestres Configurables

### TC-FECHA-001: Acceso a UI de configuración de fechas

**Priority:** P0 (Critical)  
**Type:** Functional + UI  
**Estimated Time:** 3 minutes

#### Objective
Verificar que solo usuarios admin pueden acceder a la configuración de fechas de trimestres

#### Preconditions
- Usuario admin logueado (admin@example.com / admin123)
- Pestaña Admin visible

#### Test Steps
1. Navegar a pestaña "Admin"
   **Expected:** Pestaña Admin visible en navegación

2. Scroll hasta sección "Fechas de Trimestres"
   **Expected:** 
   - Card visible con título "Fechas de Trimestres"
   - Icono de calendario junto al título
   - Descripción: "Configura las fechas de inicio y fin para cada trimestre..."

3. Verificar que hay 3 columnas (Primer, Segundo, Tercer Trimestre)
   **Expected:** 
   - Columna 1: "Primer Trimestre" con campos Inicio y Fin
   - Columna 2: "Segundo Trimestre" con campos Inicio y Fin
   - Columna 3: "Tercer Trimestre" con campos Inicio y Fin

4. Verificar botones "Restablecer" y "Guardar"
   **Expected:** 
   - Botón "Restablecer" con icono de refresh
   - Botón "Guardar" con icono de save
   - Ambos botones deshabilitados inicialmente (sin cambios)

#### Post-conditions
- UI de configuración visible y funcional

#### Edge Cases
- TC-FECHA-001-ALT: Usuario docente no debe ver pestaña Admin

---

### TC-FECHA-002: Configurar fechas del primer trimestre

**Priority:** P0 (Critical)  
**Type:** Functional  
**Estimated Time:** 5 minutes

#### Objective
Verificar que se pueden configurar y guardar fechas del primer trimestre

#### Preconditions
- Usuario admin logueado
- En pestaña Admin > Fechas de Trimestres

#### Test Steps
1. En columna "Primer Trimestre", campo "Inicio", ingresar fecha: 02/02/2026
   **Expected:** 
   - Campo acepta la fecha
   - Debajo del campo aparece texto: "1 de febrero de 2026" (formato legible)

2. En campo "Fin", ingresar fecha: 30/04/2026
   **Expected:** 
   - Campo acepta la fecha
   - Debajo aparece: "29 de abril de 2026"
   - Botones "Restablecer" y "Guardar" se habilitan

3. Click en botón "Guardar"
   **Expected:** 
   - Loading indicator en botón
   - Toast notification: "Fechas de trimestres guardadas"
   - Botones vuelven a estado deshabilitado

4. Recargar página (F5)
   **Expected:** 
   - Fechas persisten: Inicio 02/02/2026, Fin 30/04/2026
   - Texto legible visible debajo de cada campo

#### Test Data
- Fecha inicio: 02/02/2026
- Fecha fin: 30/04/2026

#### Post-conditions
- Fechas guardadas en base de datos
- Configuración persiste después de recargar

---

### TC-FECHA-003: Validación de fechas inválidas

**Priority:** P0 (Critical)  
**Type:** Functional + Validation  
**Estimated Time:** 5 minutes

#### Objective
Verificar que no se permiten fechas de inicio posteriores a fechas de fin

#### Preconditions
- Usuario admin logueado
- En pestaña Admin > Fechas de Trimestres

#### Test Steps
1. En "Primer Trimestre", campo "Inicio", ingresar: 30/04/2026
2. En campo "Fin", ingresar: 02/02/2026
   **Expected:** 
   - Aparece mensaje de error en rojo: "Error: Las fechas de inicio deben ser anteriores a las fechas de fin."
   - Botón "Guardar" permanece deshabilitado

3. Corregir fecha fin a: 30/05/2026
   **Expected:** 
   - Mensaje de error desaparece
   - Botón "Guardar" se habilita

4. Click en "Guardar"
   **Expected:** 
   - Guardado exitoso
   - Toast: "Fechas de trimestres guardadas"

#### Test Data
- Fecha inicio: 30/04/2026 (inválida si fin es anterior)
- Fecha fin válida: 30/05/2026

#### Post-conditions
- Validación previene datos inconsistentes

---

### TC-FECHA-004: Restablecer fechas a valores por defecto

**Priority:** P1 (High)  
**Type:** Functional  
**Estimated Time:** 3 minutes

#### Objective
Verificar que el botón "Restablecer" limpia las fechas configuradas

#### Preconditions
- Fechas de trimestres previamente configuradas
- Usuario admin logueado

#### Test Steps
1. Verificar que hay fechas configuradas en los 3 trimestres
2. Click en botón "Restablecer"
   **Expected:** 
   - Todos los campos de fecha se vacían
   - Textos legibles debajo de campos desaparecen
   - Botones "Restablecer" y "Guardar" se deshabilitan

3. Click en "Guardar" (si se habilita)
   **Expected:** 
   - No debería estar habilitado sin cambios
   - Si se guarda, las fechas quedan null en BD

4. Recargar página
   **Expected:** 
   - Campos vacíos (sin fechas configuradas)
   - Sistema usará rangos por defecto

#### Post-conditions
- Fechas limpias, sistema usa defaults

---

### TC-FECHA-005: API POST /api/configuracion con fechas

**Priority:** P0 (Critical)  
**Type:** Integration + API  
**Estimated Time:** 5 minutes

#### Objective
Verificar que el endpoint POST acepta y guarda fechas correctamente

#### Preconditions
- Usuario admin autenticado
- Session cookie válida

#### Test Steps
1. Enviar POST a `/api/configuracion` con body:
```json
{
  "fechaInicioT1": "2026-02-02T00:00:00.000Z",
  "fechaFinT1": "2026-04-30T00:00:00.000Z",
  "fechaInicioT2": "2026-05-04T00:00:00.000Z",
  "fechaFinT2": "2026-07-31T00:00:00.000Z",
  "fechaInicioT3": "2026-08-07T00:00:00.000Z",
  "fechaFinT3": "2026-11-16T00:00:00.000Z"
}
```
   **Expected:** 
   - HTTP 200 OK
   - Response body contiene objeto de configuración con fechas actualizadas

2. Enviar GET a `/api/configuracion`
   **Expected:** 
   - HTTP 200 OK
   - Response body contiene las mismas fechas enviadas en POST

3. Enviar POST sin autenticación
   **Expected:** 
   - HTTP 401 Unauthorized
   - Error: "No autorizado"

#### Test Data
- Fechas ISO 8601 para los 3 trimestres

#### Post-conditions
- Datos persisten en base de datos

---

### TC-FECHA-006: Asistencia usa fechas configurables

**Priority:** P0 (Critical)  
**Type:** Integration  
**Estimated Time:** 10 minutes

#### Objective
Verificar que el resumen de asistencia filtra por fechas configuradas en vez de rangos hardcodeados

#### Preconditions
- Fechas de T1 configuradas: 02/02/2026 - 30/04/2026
- Fechas de T2 configuradas: 04/05/2026 - 31/07/2026
- Asistencia registrada en febrero, mayo, y septiembre

#### Test Steps
1. Ir a pestaña "Lista" (Asistencia)
2. Seleccionar grado: 2° A
3. Seleccionar filtro: "Trimestre 1"
4. Click en "Resumen"
   **Expected:** 
   - Solo muestra asistencias entre 02/02/2026 y 30/04/2026
   - No incluye asistencias de enero (fuera del rango configurado)

5. Cambiar filtro a "Trimestre 2"
   **Expected:** 
   - Muestra asistencias entre 04/05/2026 y 31/07/2026
   - No incluye asistencias de abril o agosto

6. Verificar conteos de presente/ausente/tarde
   **Expected:** 
   - Números correctos según fechas filtradas

#### Test Data
- Asistencia registrada en: 15/01/2026, 15/02/2026, 15/05/2026, 15/09/2026

#### Post-conditions
- Resumen de asistencia correcto según configuración

---

## Estadísticas Anuales Completas

### TC-STAT-001: Dashboard muestra promedios anuales con todos los estudiantes

**Priority:** P0 (Critical)  
**Type:** Functional  
**Estimated Time:** 10 minutes

#### Objective
Verificar que el promedio anual incluye a todos los estudiantes, no solo top 10 y bottom 10

#### Preconditions
- Grado con 25+ estudiantes
- Calificaciones registradas en T1, T2, y T3
- Al menos 15 estudiantes con notas completas

#### Test Steps
1. Ir a pestaña "Inicio" (Dashboard)
2. Seleccionar trimestre: "Anual"
3. Seleccionar grado: 2° A
4. Verificar sección "Rendimiento Académico"
   **Expected:** 
   - Gráfico de barras muestra promedio de TODOS los estudiantes
   - No solo top 10 y bottom 10

5. Verificar "Cuadro de Honor" (top estudiantes)
   **Expected:** 
   - Muestra top 10 estudiantes con mejores promedios
   - Promedios calculados correctamente (T1+T2+T3)/3

6. Verificar "Alertas" (estudiantes en riesgo)
   **Expected:** 
   - Muestra bottom 10 estudiantes
   - Incluye estudiantes con promedio < 6.5

7. Verificar promedio institucional
   **Expected:** 
   - Promedio general del grado correcto
   - No sesgado por solo incluir top/bottom

#### Test Data
- 25 estudiantes con calificaciones en 3 trimestres
- Promedios variados: 3.0 a 9.5

#### Post-conditions
- Estadísticas anuales precisas y completas

---

### TC-STAT-002: API stats/dashboard con trimestre=all

**Priority:** P0 (Critical)  
**Type:** Integration + API  
**Estimated Time:** 8 minutes

#### Objective
Verificar que el endpoint retorna datos de todos los estudiantes para cálculo anual

#### Preconditions
- Usuario autenticado
- Calificaciones en T1, T2, T3

#### Test Steps
1. Enviar GET a `/api/stats/dashboard?trimestre=all&gradoId={id}`
   **Expected:** 
   - HTTP 200 OK
   - Response contiene array de grados con stats

2. Verificar estructura de respuesta:
```json
{
  "gradoId": "...",
  "nombre": "2° \"A\"",
  "promedios": { "cotidiana": 7.5, "integradora": 7.2, "examen": 7.0 },
  "topEstudiantes": [...],
  "alertas": [...],
  "materias": [...],
  "trimestres": {
    "1": { "todosEstudiantes": [...] },
    "2": { "todosEstudiantes": [...] },
    "3": { "todosEstudiantes": [...] }
  }
}
```
   **Expected:** 
   - Campo `todosEstudiantes` presente en cada trimestre
   - Array contiene todos los estudiantes con calificaciones

3. Verificar que `combinarStats` usa `todosEstudiantes`
   **Expected:** 
   - Promedios anuales calculados con todos los estudiantes
   - No solo top 10 + bottom 10

#### Test Data
- 25 estudiantes con notas en 3 trimestres

#### Post-conditions
- API retorna datos completos para cálculo anual

---

### TC-STAT-003: Promedio anual con datos parciales

**Priority:** P1 (High)  
**Type:** Functional  
**Estimated Time:** 8 minutes

#### Objective
Verificar que el promedio anual se calcula correctamente cuando solo hay datos en algunos trimestres

#### Preconditions
- Estudiante con notas solo en T1 y T3 (T2 vacío)

#### Test Steps
1. Registrar calificaciones para estudiante en T1: promedio 8.0
2. Dejar T2 sin calificaciones (null)
3. Registrar calificaciones en T3: promedio 7.0
4. Ir a Dashboard, seleccionar "Anual"
   **Expected:** 
   - Promedio anual = (8.0 + 7.0) / 2 = 7.5
   - No divide entre 3 trimestres

5. Verificar en tabla de rendimientos por ciclo
   **Expected:** 
   - Columna "I Trimestre": 8.0
   - Columna "II Trimestre": - (sin datos)
   - Columna "III Trimestre": 7.0
   - Columna "Anual": 7.5

#### Test Data
- Estudiante con notas parciales

#### Post-conditions
- Cálculo correcto con datos parciales

---

## Suite de Regresión

### TC-REG-001: Login de usuarios

**Priority:** P0 (Critical)  
**Type:** Regression  
**Estimated Time:** 3 minutes

#### Test Steps
1. Navegar a página principal
2. Ingresar credenciales admin
3. Click "Iniciar Sesión"
   **Expected:** Login exitoso, redirección a Dashboard

---

### TC-REG-002: CRUD de calificaciones

**Priority:** P0 (Critical)  
**Type:** Regression  
**Estimated Time:** 10 minutes

#### Test Steps
1. Ir a pestaña "Notas"
2. Seleccionar grado, trimestre, materia
3. Ingresar notas para 3 estudiantes
4. Click "Guardar"
   **Expected:** Notas guardadas, toast de confirmación
5. Recargar página
   **Expected:** Notas persisten

---

### TC-REG-003: Registro de asistencia

**Priority:** P0 (Critical)  
**Type:** Regression  
**Estimated Time:** 8 minutes

#### Test Steps
1. Ir a pestaña "Lista"
2. Seleccionar grado y fecha
3. Marcar asistencia de 5 estudiantes
4. Verificar auto-save
   **Expected:** Asistencia guardada automáticamente

---

### TC-REG-004: Generación de boletas

**Priority:** P1 (High)  
**Type:** Regression  
**Estimated Time:** 5 minutes

#### Test Steps
1. Ir a pestaña "Boletas"
2. Seleccionar grado y trimestre
3. Click "Generar Boleta" para estudiante
   **Expected:** Boleta generada con notas y observaciones

---

### TC-REG-005: Configuración de umbrales

**Priority:** P1 (High)  
**Type:** Regression  
**Estimated Time:** 5 minutes

#### Test Steps
1. Ir a pestaña "Admin"
2. Sección "Umbrales del Sistema"
3. Modificar umbral aprobado a 7.0
4. Click "Guardar"
   **Expected:** Umbrales guardados, toast de confirmación

---

### TC-REG-006: Gestión de usuarios

**Priority:** P1 (High)  
**Type:** Regression  
**Estimated Time:** 8 minutes

#### Test Steps
1. Ir a pestaña "Admin"
2. Click "Nuevo Usuario"
3. Completar formulario y guardar
   **Expected:** Usuario creado, aparece en tabla

---

### TC-REG-007: Exportación de reportes

**Priority:** P2 (Medium)  
**Type:** Regression  
**Estimated Time:** 5 minutes

#### Test Steps
1. Ir a pestaña "Reportes"
2. Seleccionar grado y trimestre
3. Click "Exportar PDF"
   **Expected:** PDF descargado con datos correctos

---

### TC-REG-008: Dark mode toggle

**Priority:** P2 (Medium)  
**Type:** UI Regression  
**Estimated Time:** 2 minutes

#### Test Steps
1. Click en toggle de tema (header)
   **Expected:** Tema cambia a dark mode
2. Navegar entre pestañas
   **Expected:** Dark mode persiste en todas las vistas

---

## Resumen de Casos de Prueba

| ID | Título | Priority | Type | Status |
|----|--------|----------|------|--------|
| TC-FECHA-001 | Acceso a UI de configuración | P0 | Functional | Not Run |
| TC-FECHA-002 | Configurar fechas T1 | P0 | Functional | Not Run |
| TC-FECHA-003 | Validación fechas inválidas | P0 | Validation | Not Run |
| TC-FECHA-004 | Restablecer fechas | P1 | Functional | Not Run |
| TC-FECHA-005 | API POST fechas | P0 | Integration | Not Run |
| TC-FECHA-006 | Asistencia usa fechas | P0 | Integration | Not Run |
| TC-STAT-001 | Dashboard promedios anuales | P0 | Functional | Not Run |
| TC-STAT-002 | API stats todos estudiantes | P0 | Integration | Not Run |
| TC-STAT-003 | Promedio con datos parciales | P1 | Functional | Not Run |
| TC-REG-001 | Login usuarios | P0 | Regression | Not Run |
| TC-REG-002 | CRUD calificaciones | P0 | Regression | Not Run |
| TC-REG-003 | Registro asistencia | P0 | Regression | Not Run |
| TC-REG-004 | Generación boletas | P1 | Regression | Not Run |
| TC-REG-005 | Configuración umbrales | P1 | Regression | Not Run |
| TC-REG-006 | Gestión usuarios | P1 | Regression | Not Run |
| TC-REG-007 | Exportación reportes | P2 | Regression | Not Run |
| TC-REG-008 | Dark mode toggle | P2 | UI Regression | Not Run |

**Total:** 17 casos de prueba  
**P0 (Critical):** 8  
**P1 (High):** 5  
**P2 (Medium):** 4

---

## Criterios de Aceptación

### Para Fechas de Trimestres
- [ ] UI accesible solo para admin
- [ ] Fechas se guardan correctamente
- [ ] Validación previene fechas inválidas
- [ ] Asistencia filtra por fechas configuradas
- [ ] Fallback a rangos por defecto si no hay configuración

### Para Estadísticas Anuales
- [ ] Promedio anual incluye todos los estudiantes
- [ ] Cálculo correcto con datos parciales
- [ ] API retorna `todosEstudiantes` en respuesta
- [ ] Dashboard muestra datos precisos

### Para Regresión
- [ ] Login funciona correctamente
- [ ] CRUD de calificaciones sin errores
- [ ] Asistencia se registra y guarda
- [ ] Boletas se generan correctamente
- [ ] Configuración de umbrales persistente
- [ ] Gestión de usuarios funcional
- [ ] Exportación de reportes operativa
- [ ] Dark mode funciona en todas las vistas
