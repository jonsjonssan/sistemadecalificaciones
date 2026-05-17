# Test Plan: Opciones de Boletas (Generación de Boletas)

**Versión:** 1.0
**Feature:** Generación de Boletas (TabsContent value="boletas")
**Archivo:** `src/app/page.tsx` (líneas 2732-2909)
**Componente hijo:** `src/components/BoletaList.tsx`
**Fecha:** 2026-05-14

---

## Executive Summary

Plan de pruebas para la sección de generación de boletas de calificaciones. Cubre la selección de grado/trimestre, filtro de asignaturas (admin), opciones de tamaño de papel, modo de asistencia, y la integración con el componente BoletaList. Incluye pruebas funcionales, de UI, regresión y casos borde.

---

## Test Scope

**In Scope:**
- Selector de Grado
- Selector de Trimestre
- Filtro de asignaturas en boleta (admin/docente-orientador)
- RadioGroup tamaño de papel (Carta / A4)
- Select modo de asistencia (Automática / Espacio Manual / Manual por Alumno)
- Renderizado del componente BoletaList con props
- Persistencia en localStorage de todas las opciones
- Modo oscuro
- Estados vacíos y carga

**Out of Scope:**
- Lógica interna de BoletaList (componente separado)
- API de datos (GET /api/boleta, GET /api/calificaciones)
- Exportación PDF (API /api/export)
- Funcionalidad de otras pestañas

---

## Test Strategy

| Tipo | Enfoque |
|------|---------|
| Functional | Validar que cada control produzca el cambio de estado correcto |
| UI/Visual | Verificar que los estilos se apliquen correctamente en modo claro y oscuro |
| Integration | Validar que los props se pasen correctamente a BoletaList |
| Regression | Asegurar que cambios no rompan funcionalidad existente |
| Edge Cases | Estados vacíos, selecciones inválidas, datos limítrofes |

---

## Test Environment

- **OS:** Windows 11
- **Browser:** Chrome 120+, Firefox 121+, Edge 120+
- **Viewport:** Desktop (1920×1080), Tablet (768px), Mobile (375px)
- **Theme:** Light mode y Dark mode
- **Build:** Local dev server (`npm run dev`)

---

## Test Cases

### TC-BOL-001: Selección de Grado

**Priority:** P0 (Critical)
**Type:** Functional
**Estimated Time:** 2 min

**Objective:** Verificar que al seleccionar un grado del dropdown, se actualice el estado `gradoSeleccionado` y se resetee `asignaturaSeleccionada`.

**Preconditions:**
- [x] Usuario logueado con cualquier rol
- [x] Existen grados cargados en el sistema
- [ ] Tab de Boletas activa

**Test Steps:**

1. Hacer clic en el Select de "Grado"
   **Expected:** Se despliega lista de grados disponibles con formato `{numero}° "{seccion}"`

2. Seleccionar un grado de la lista
   **Expected:**
   - El Select muestra el grado seleccionado
   - Si hay estudiantes en ese grado, aparecen las secciones de opciones de impresión y el componente BoletaList

3. Cambiar a otro grado
   **Expected:** El contenido se actualiza para reflejar el nuevo grado

**Post-conditions:** `gradoSeleccionado` contiene el ID del grado seleccionado

---

### TC-BOL-002: Selección de Trimestre

**Priority:** P0 (Critical)
**Type:** Functional

**Objective:** Verificar que al seleccionar un trimestre se actualice `trimestreSeleccionado`.

**Preconditions:**
- [x] Grado seleccionado
- [x] Existen estudiantes en el grado

**Test Steps:**

1. Hacer clic en el Select de "Trimestre"
   **Expected:** Se despliegan opciones: I, II, III

2. Seleccionar "I"
   **Expected:** Select muestra "I", BoletaList recibe `trimestre=1`

3. Seleccionar "II"
   **Expected:** Select muestra "II", BoletaList recibe `trimestre=2`

4. Seleccionar "III"
   **Expected:** Select muestra "III", BoletaList recibe `trimestre=3`

---

### TC-BOL-003: Filtro de Asignaturas — Admin (Todas)

**Priority:** P1 (High)
**Type:** Functional
**Role:** Admin / Docente-Orientador

**Objective:** Verificar que el admin pueda seleccionar "Todas" las asignaturas.

**Preconditions:**
- [x] Usuario con rol admin/docente-orientador
- [x] Grado con estudiantes y asignaturas cargadas

**Test Steps:**

1. En la sección "Asignaturas en boleta", verificar el Select con opciones "Todas (N)" y "Seleccionar..."
   **Expected:** Por defecto está seleccionado "Todas (N)"

2. Hacer clic en una asignatura (pill)
   **Expected:**
   - El Select cambia a "Seleccionar..."
   - La asignatura se desmarca visualmente (pierde estilo teal)
   - El contador cambia a "N-1 de N asignaturas seleccionadas"

3. Volver a seleccionar "Todas (N)" en el Select
   **Expected:** Todas las asignaturas vuelven a mostrarse como seleccionadas (pills teal), el texto muestra "Todas las asignaturas están seleccionadas"

---

### TC-BOL-004: Filtro de Asignaturas — Admin (Personalizado)

**Priority:** P1 (High)
**Type:** Functional
**Role:** Admin / Docente-Orientador

**Objective:** Verificar selección personalizada de asignaturas.

**Preconditions:**
- [x] Usuario admin
- [x] Grado con 3+ asignaturas

**Test Steps:**

1. Estando en "Todas", hacer clic en la primera asignatura
   **Expected:** Se desmarca esa asignatura, contador muestra "N-1 de N"

2. Hacer clic en una segunda asignatura diferente
   **Expected:** Se desmarca también, contador muestra "N-2 de N"

3. Hacer clic en la primera asignatura de nuevo
   **Expected:** Se vuelve a marcar (estilo teal), contador "N-1 de N"

4. Desmarcar hasta que solo quede 1 asignatura
   **Expected:** Una sola asignatura seleccionada, contador "1 de N"

5. Desmarcar esa última asignatura
   **Expected:** Select cambia a "Todas (N)", todas las asignaturas se marcan como seleccionadas

**Edge Cases:** 
- El estado "todas seleccionadas" se representa con `materiasEnBoleta.length === 0` — verificar que al tener 0 asignaturas seleccionadas manualmente se restablezca el modo "Todas"

---

### TC-BOL-005: Filtro de Asignaturas — No Admin (Oculto)

**Priority:** P2 (Medium)
**Type:** Functional
**Role:** Docente (no admin)

**Objective:** Verificar que docentes regulares NO vean la sección de filtro de asignaturas.

**Preconditions:**
- [x] Usuario con rol "docente"
- [x] Grado seleccionado con estudiantes

**Test Steps:**

1. Iniciar sesión como docente regular
   **Expected:** La sección "Asignaturas en boleta" NO aparece en la interfaz

2. Verificar que BoletaList recibe todas las asignaturas del grado (sin filtro)
   **Expected:** BoletaList se renderiza con `materias` = todas las asignaturas del grado

---

### TC-BOL-006: Tamaño de Papel — Carta

**Priority:** P1 (High)
**Type:** Functional

**Objective:** Verificar que seleccionar "Carta" actualiza `paperSize` a "letter".

**Preconditions:**
- [x] Grado seleccionado con estudiantes

**Test Steps:**

1. En "Opciones de impresión", seleccionar radio button "Carta"
   **Expected:**
   - Radio "Carta" queda seleccionado
   - Aparece texto "(215.9 × 279.4 mm)"
   - localStorage `ss_paperSize` = "letter"
   - BoletaList recibe `paperSize="letter"`

---

### TC-BOL-007: Tamaño de Papel — A4

**Priority:** P1 (High)
**Type:** Functional

**Objective:** Verificar que seleccionar "A4" actualiza `paperSize` a "a4".

**Preconditions:**
- [x] Grado seleccionado con estudiantes

**Test Steps:**

1. Seleccionar radio button "A4"
   **Expected:**
   - Radio "A4" queda seleccionado
   - Aparece texto "(210 × 297 mm)"
   - localStorage `ss_paperSize` = "a4"
   - BoletaList recibe `paperSize="a4"`

---

### TC-BOL-008: Modo de Asistencia — Automática

**Priority:** P1 (High)
**Type:** Functional

**Objective:** Verificar que el modo "Automática" configura correctamente los flags de asistencia.

**Preconditions:**
- [x] Grado seleccionado con estudiantes

**Test Steps:**

1. En el Select de "Asistencia", seleccionar "Automática"
   **Expected:**
   - `incluirAsistenciaBoleta = true`
   - `incluirAsistenciaManual = false`
   - `asistenciaManualHabilitado = false`
   - localStorage `ss_tipoAsistencia` = "auto"
   - BoletaList recibe `incluirAsistencia=true`

---

### TC-BOL-009: Modo de Asistencia — Espacio Manual

**Priority:** P1 (High)
**Type:** Functional

**Objective:** Verificar que el modo "Espacio Manual" configura correctamente los flags.

**Preconditions:**
- [x] Grado seleccionado con estudiantes

**Test Steps:**

1. Seleccionar "Espacio Manual" en el Select de Asistencia
   **Expected:**
   - `incluirAsistenciaBoleta = false`
   - `incluirAsistenciaManual = true`
   - `asistenciaManualHabilitado = false`
   - localStorage `ss_tipoAsistencia` = "manual_espacio"
   - BoletaList recibe `incluirAsistenciaManual=true`

---

### TC-BOL-010: Modo de Asistencia — Manual por Alumno

**Priority:** P1 (High)
**Type:** Functional

**Objective:** Verificar que el modo "Manual por Alumno" configura correctamente los flags.

**Preconditions:**
- [x] Grado seleccionado con estudiantes

**Test Steps:**

1. Seleccionar "Manual por Alumno" en el Select de Asistencia
   **Expected:**
   - `incluirAsistenciaBoleta = false`
   - `incluirAsistenciaManual = false`
   - `asistenciaManualHabilitado = true`
   - localStorage `ss_tipoAsistencia` = "manual_digital"

---

### TC-BOL-011: Persistencia en localStorage

**Priority:** P1 (High)
**Type:** Functional

**Objective:** Verificar que todas las opciones se persisten en localStorage al recargar la página.

**Preconditions:**
- [x] Haber cambiado configuraciones

**Test Steps:**

1. Configurar: Grado = X, Trimestre = II, Paper = A4, Asistencia = Manual por Alumno
2. Recargar la página (F5)
   **Expected:**
   - Las mismas configuraciones se restauran
   - `ss_paperSize` = "a4"
   - `ss_tipoAsistencia` = "manual_digital"
   - `ss_materiasBoleta` contiene las asignaturas seleccionadas
   - BoletaList se renderiza con las configuraciones restauradas

---

### TC-BOL-012: Dark Mode

**Priority:** P2 (Medium)
**Type:** UI/Visual

**Objective:** Verificar que los estilos dark mode se aplican correctamente.

**Preconditions:**
- [x] Grado seleccionado con estudiantes

**Test Steps:**

1. Cambiar a modo oscuro
   **Expected:**
   - Fondo del Card: `bg-[#1e293b]` (slate-800)
   - Secciones internas: `bg-slate-800/40` con `border-slate-700/50`
   - Labels en modo oscuro: `text-slate-400`
   - Selects: `bg-slate-800 border-slate-600 text-white`
   - Asignaturas seleccionadas: `bg-teal-600/20 text-teal-300 border-teal-500/50`
   - Asignaturas no seleccionadas: `bg-slate-800 text-slate-400 border-slate-600`
   - Barra de acento: `bg-gradient-to-r from-teal-500 to-emerald-400`

2. Cambiar a modo claro
   **Expected:**
   - Fondo del Card: `bg-gradient-to-br from-white to-slate-50/60`
   - Secciones internas: `bg-white` con `border-slate-200/70 shadow-sm`
   - Labels modo claro: `text-slate-500`

---

### TC-BOL-013: Animación de Entrada

**Priority:** P3 (Low)
**Type:** UI/Visual

**Objective:** Verificar que la animación de entrada con framer-motion funciona.

**Preconditions:**
- [x] Tab de Boletas no visitada previamente en la sesión

**Test Steps:**

1. Navegar a la pestaña "Boletas" por primera vez
   **Expected:**
   - El contenido del card aparece con un fade-in y slide-up (opacity 0→1, y: 12→0)
   - Duración: 350ms
   - Easing: easeOut

---

### TC-BOL-014: Estado Sin Estudiantes

**Priority:** P1 (High)
**Type:** Functional / Edge Case

**Objective:** Verificar el comportamiento cuando el grado seleccionado no tiene estudiantes.

**Preconditions:**
- [x] Seleccionar un grado sin estudiantes

**Test Steps:**

1. Seleccionar grado que no tiene estudiantes
   **Expected:**
   - No se muestran las secciones de opciones de impresión
   - No se muestra BoletaList
   - Solo se ven los selects de Grado y Trimestre

---

### TC-BOL-015: Integración BoletaList Props

**Priority:** P0 (Critical)
**Type:** Integration

**Objective:** Verificar que BoletaList recibe todos los props correctamente.

**Preconditions:**
- [x] Grado seleccionado con estudiantes
- [x] Trimestre seleccionado

**Test Steps:**

1. Inspeccionar los props que recibe BoletaList (usando React DevTools o logs)
   **Expected:**
   - `estudiantes`: array de estudiantes del grado
   - `calificaciones`: array de calificaciones
   - `materias`: array filtrado de asignaturas
   - `grado`: objeto del grado seleccionado
   - `trimestre`: 1, 2, o 3 según selección
   - `paperSize`: "letter" o "a4"
   - `incluirAsistencia`: boolean según modo
   - `mostrarRecuperacion`: boolean
   - `darkMode`: boolean
   - `porcentajes`: objeto con AC/AI/EX o undefined
   - `configuracion`: objeto con nombreDirectora y umbrales
   - `incluirAsistenciaManual`: boolean
   - `asistenciaManualHabilitado`: boolean
   - `asistenciaManualData`: objeto o undefined
   - `onAsistenciaManualChange`: función

---

## Regression Test Cases

### TC-REG-BOL-001: Cambio de Grado Resetea Asignatura

**Priority:** P2 (Medium)
**Type:** Regression

**Objective:** Verificar que cambiar de grado resetea `asignaturaSeleccionada` a "".

**Steps:**
1. Seleccionar un grado
2. Haber seleccionado previamente una asignatura en la pestaña Calificaciones
3. Cambiar a otro grado
   **Expected:** `asignaturaSeleccionada = ""` (se resetea)

---

### TC-REG-BOL-002: Persistencia Entre Sesiones

**Priority:** P2 (Medium)
**Type:** Regression

**Objective:** Verificar que las configuraciones persisten entre cierres de sesión.

**Steps:**
1. Configurar opciones de boleta
2. Cerrar sesión
3. Iniciar sesión de nuevo
4. Navegar a pestaña Boletas
   **Expected:** Las configuraciones previas se restauran desde localStorage

---

## Risk Assessment

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| BoletaList no recibe props correctos | Baja | Crítico | Validar props en TC-BOL-015 |
| localStorage no persiste opciones | Media | Alto | Verificar TC-BOL-011 |
| Dark mode rompe visibilidad de controles | Baja | Medio | Verificar TC-BOL-012 |
| Select de asignaturas no filtra correctamente | Media | Alto | Verificar TC-BOL-003, TC-BOL-004 |
| Grado sin estudiantes causa error | Baja | Medio | Verificar TC-BOL-014 |

---

## Entry Criteria

- [x] Código compila sin errores (`npm run build`)
- [x] Servidor de desarrollo funcionando
- [x] Datos de prueba cargados (grados, estudiantes, asignaturas)
- [x] Usuarios con diferentes roles creados

## Exit Criteria

- [x] Todos los P0 tests pasan
- [x] 90%+ de P1 tests pasan
- [x] No bugs críticos abiertos
- [ ] Bugs de alta severidad documentados y con plan de fix
