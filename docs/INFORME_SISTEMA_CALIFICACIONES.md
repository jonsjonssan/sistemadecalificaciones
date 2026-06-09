# INFORME TÉCNICO-PEDAGÓGICO

## Sistema de Gestión de Calificaciones Escolares

**Presentado ante:** Panel de Docentes y Directivos  
**Fecha:** Junio 2026  
**Elaborado por:** Equipo de Desarrollo del Sistema  
**Versión del sistema:** 0.2.0

---

## 1. INTRODUCCIÓN

El presente informe tiene como objetivo exponer ante el panel docente las características técnicas, pedagógicas y operativas del **Sistema de Gestión de Calificaciones Escolares** desarrollado para la institución. Este sistema nace como respuesta a la necesidad de digitalizar, centralizar y automatizar los procesos de evaluación académica, reemplazando los métodos manuales tradicionales por una plataforma web segura, confiable y de fácil uso.

El sistema permite registrar, calcular, almacenar y reportar las calificaciones de los estudiantes a lo largo del año escolar, brindando a docentes y directivos herramientas de análisis en tiempo real para la toma de decisiones pedagógicas fundamentadas.

---

## 2. LÓGICA DE FUNCIONAMIENTO

El sistema opera bajo un modelo de **tres trimestres académicos**, con una estructura jerárquica clara que refleja la organización natural de una institución educativa:

```
Año Escolar
  └── Grados (2° A, 3° A, ... 9° A)
        ├── Estudiantes
        └── Asignaturas (Matemáticas, Lengua, Ciencias...)
              └── Calificaciones por Trimestre
```

### Principios de diseño:

- **Centralización:** toda la información académica reside en una única base de datos segura, accesible desde cualquier dispositivo con conexión a internet.
- **Automatización:** los cálculos de promedios, estados y rankings se ejecutan automáticamente al registrar o modificar una calificación, eliminando errores humanos.
- **Multirol:** cada usuario accede únicamente a la información pertinente a su rol (Administrador, Directora, Codirectora, Docente, Docente Orientador).
- **Trazabilidad:** cada modificación queda registrada en un historial de auditoría, garantizando transparencia y responsabilidad.

---

## 3. TECNOLOGÍA EMPLEADA

El sistema ha sido construido con tecnologías modernas, robustas y de código abierto, garantizando su mantenimiento a largo plazo y su escalabilidad.

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Frontend** | Next.js 14 + React 18 + TypeScript | Framework líder para aplicaciones web interactivas, con renderizado rápido y tipado estricto. |
| **Estilos** | Tailwind CSS + shadcn/ui | Diseño responsivo y accesible, consistente en todos los dispositivos. |
| **Base de datos** | PostgreSQL (Neon Cloud) + Prisma ORM | Base de datos relacional robusta, con respaldo automático en la nube. |
| **Autenticación** | Sesiones HTTP + Google OAuth 2.0 | Acceso seguro con credenciales institucionales o cuenta Google. |
| **Visualización** | Recharts | Gráficos interactivos para estadísticas y reportes. |
| **Exportación** | jsPDF + jspdf-autotable | Generación de boletas y reportes en formato PDF. |
| **Pruebas** | Vitest + Playwright | Validación automatizada del 100% de la lógica de cálculo. |
| **Infraestructura** | Vercel (hosting) + Neon (base de datos) | Despliegue continuo, alta disponibilidad y escalado automático. |

---

## 4. ESTRUCTURA GENERAL DEL SISTEMA

### 4.1 Módulos principales

| Módulo | Descripción |
|--------|-------------|
| **Inicio (Dashboard)** | Panel de control con estadísticas institucionales: promedios por trimestre y anual, escala de desempeño, cuadro de honor y alertas. |
| **Notas** | Registro y edición de calificaciones por grado, asignatura y trimestre. |
| **Lista (Asistencia)** | Control diario de asistencia con modos automático y manual. |
| **Alumnos** | Gestión del registro de estudiantes por grado. |
| **Boletas** | Generación e impresión de boletas individuales en PDF. |
| **Enlaces** | Repositorio de recursos y enlaces educativos. |
| **Reportes** | Exportación de datos en formatos CSV y PDF. |
| **Avance** | Seguimiento del progreso de calificación por docente (solo admin). |
| **Administración** | Gestión de usuarios, configuración del sistema y auditoría (solo admin). |

### 4.2 Roles y permisos

| Rol | Acceso |
|-----|--------|
| **Administrador** | Control total del sistema: usuarios, configuración, reportes globales. |
| **Directora / Codirectora** | Visualización de estadísticas institucionales, reportes y avance docente. |
| **Docente** | Registro de calificaciones y asistencia de sus asignaturas asignadas. |
| **Docente Orientador** | Acceso ampliado a información de estudiantes para acompañamiento pedagógico. |

---

## 5. PROCESO DE REGISTRO Y CÁLCULO DE NOTAS

### 5.1 Configuración inicial (Administrador)

1. Se define el **año escolar** y los datos de la institución.
2. Se crean los **grados y secciones** (ej.: 2° "A", 3° "B").
3. Se registran los **estudiantes** en cada grado.
4. Se crean las **asignaturas** por grado.
5. Se registran los **docentes** y se les asignan sus materias.

### 5.2 Configuración por materia y trimestre (Docente)

Para cada asignatura y trimestre, el docente define:
- Número de **Actividades Cotidianas (AC)**.
- Número de **Actividades Integradoras (AI)**.
- Si aplica **Examen Trimestral**.
- **Porcentajes de ponderación** (deben sumar 100%).

**Configuración por defecto institucional:**

| Componente | Peso |
|-----------|------|
| Actividades Cotidianas (AC) | 35% |
| Actividades Integradoras (AI) | 35% |
| Examen Trimestral | 30% |

### 5.3 Registro de calificaciones

El docente ingresa las notas en una escala de **0 a 10** para cada estudiante:

```
Nota Final = (AC × 0.35) + (AI × 0.35) + (Examen × 0.30)
```

El sistema calcula automáticamente:
- **Promedio de Actividades Cotidianas (calificacionAC)**
- **Promedio de Actividades Integradoras (calificacionAI)**
- **Promedio Final ponderado**

### 5.4 Escala de desempeño y estados

| Rango | Estado | Color |
|-------|--------|-------|
| 0.00 – 4.49 | **Reprobado** | Rojo |
| 4.50 – 6.49 | **Condicionado** | Naranja |
| 6.50 – 10.00 | **Aprobado** | Verde |

Los umbrales son **configurables** por la administración del sistema, permitiendo adaptarlos a las normativas institucionales vigentes.

### 5.5 Recuperación académica

El sistema permite registrar una nota de **recuperación** por estudiante y materia. Esta nota se integra al promedio final según la fórmula institucional, reflejándose en la boleta y en los reportes estadísticos.

### 5.6 Cálculo del promedio anual

El promedio anual de cada grado se obtiene como el **promedio aritmético de los tres trimestres**:

```
Promedio Anual = (T1 + T2 + T3) / 3
```

Este cálculo se realiza automáticamente por el sistema, asegurando coherencia entre las vistas trimestrales y la vista anual.

---

## 6. CONTROLES DE VERIFICACIÓN

El sistema implementa múltiples capas de validación para garantizar la integridad y confiabilidad de los datos:

### 6.1 Validaciones de entrada
- Las notas deben estar dentro del rango **0–10**.
- Los porcentajes de ponderación deben sumar exactamente **100%**.
- No se permiten calificaciones duplicadas para el mismo estudiante, materia y trimestre.

### 6.2 Validaciones de consistencia
- El sistema verifica que el estudiante pertenezca al grado de la materia antes de guardar.
- Los docentes solo pueden modificar calificaciones de sus asignaturas asignadas.
- El cambio de trimestre con datos sin guardar solicita confirmación al usuario.

### 6.3 Trazabilidad y auditoría
- Cada modificación de calificación queda registrada en el **historial de calificaciones** (fecha, usuario, valor anterior, valor nuevo).
- Las acciones administrativas se registran en el **log de auditoría** (acciones, usuarios, entidades afectadas).
- Las sesiones de acceso se registran con fecha, hora y dirección IP.

### 6.4 Respaldo y recuperación
- La base de datos en la nube realiza **respaldos automáticos**.
- El sistema permite **importar calificaciones** desde archivos CSV, facilitando la migración desde sistemas anteriores.
- El **auto-guardado** detecta cambios pendientes y previene la pérdida de datos ante cierres accidentales.

### 6.5 Pruebas automatizadas
El sistema cuenta con **276 pruebas unitarias** que validan continuamente:
- Cálculos de promedios y ponderaciones.
- Clasificación de estados (Reprobado, Condicionado, Aprobado).
- Asignación y verificación de roles.
- Validaciones de seguridad y permisos.

---

## 7. VENTAJAS PARA LA GESTIÓN ACADÉMICA

### 7.1 Para el docente
- **Ahorro de tiempo:** los cálculos se realizan automáticamente; el docente solo ingresa las notas.
- **Visión clara del grupo:** el Cuadro de Honor y las Alertas identifican rápidamente a estudiantes destacados y en riesgo.
- **Seguimiento continuo:** el avance por trimestre permite detectar problemas a tiempo.
- **Flexibilidad:** la configuración de actividades y ponderaciones se adapta a cada materia.

### 7.2 Para la dirección
- **Monitoreo institucional:** el Dashboard muestra promedios por ciclo (Inicial, Primaria, Secundaria) y por trimestre en tiempo real.
- **Toma de decisiones basada en datos:** la Escala de Desempeño identifica grados y asignaturas que requieren intervención pedagógica.
- **Control de avance docente:** el módulo de Avance permite verificar el cumplimiento del registro de calificaciones.
- **Reportes automáticos:** generación de boletas y reportes institucionales sin trabajo manual.

### 7.3 Para la institución
- **Centralización:** toda la información académica en un solo lugar, accesible desde cualquier dispositivo.
- **Seguridad:** autenticación con roles, sesiones cifradas y respaldo en la nube.
- **Sostenibilidad:** reducción del uso de papel mediante boletas y reportes digitales.
- **Continuidad:** el sistema permanece disponible 24/7, incluso en modalidad virtual.

### 7.4 Para los estudiantes y familias
- **Transparencia:** las calificaciones están disponibles de forma inmediata tras su registro.
- **Retroalimentación oportuna:** los estados (Aprobado, Condicionado, Reprobado) se comunican claramente.
- **Boletas digitales:** acceso a reportes formales en formato PDF.

---

## 8. POSIBLES MEJORAS

Aunque el sistema cumple con los requisitos actuales, se identifican las siguientes oportunidades de mejora para futuras versiones:

### 8.1 Mejoras técnicas
| Mejora | Impacto |
|--------|---------|
| **Aplicación móvil nativa** (iOS/Android) | Acceso offline para docentes en zonas con conectividad limitada. |
| **Notificaciones push** | Alertas automáticas a padres sobre calificaciones, asistencia y citaciones. |
| **Modo offline con sincronización** | Registro de notas sin conexión, con sincronización automática al reconectar. |
| **Firma digital de boletas** | Validez legal de documentos académicos digitales. |

### 8.2 Mejoras pedagógicas
| Mejora | Impacto |
|--------|---------|
| **Análisis predictivo de rendimiento** | Identificación temprana de estudiantes en riesgo de deserción o reprobación. |
| **Rúbricas de evaluación integradas** | Evaluación por competencias con criterios detallados. |
| **Portafolio digital del estudiante** | Registro longitudinal del desempeño a lo largo de los años. |
| **Módulo de comunicación docente-padre** | Mensajería interna para seguimiento personalizado. |

### 8.3 Mejoras institucionales
| Mejora | Impacto |
|--------|---------|
| **Integración con plataformas LMS** (Moodle, Google Classroom) | Interoperabilidad con herramientas educativas existentes. |
| **Panel para padres de familia** | Consulta de calificaciones, asistencia y boletas en tiempo real. |
| **Reportes para el Ministerio de Educación** | Exportación en formatos oficiales requeridos. |
| **Analítica avanzada** | Dashboards comparativos entre años, grados y asignaturas. |

---

## 9. CONCLUSIONES

El Sistema de Gestión de Calificaciones Escolares representa un avance significativo en la modernización de los procesos académicos de la institución. Sus principales fortalezas son:

1. **Confiabilidad:** los cálculos automáticos eliminan errores humanos y garantizan consistencia en los promedios.
2. **Accesibilidad:** la plataforma web permite el acceso desde cualquier dispositivo, en cualquier momento.
3. **Seguridad:** los roles, permisos y trazabilidad protegen la integridad de la información.
4. **Pedagogía:** las herramientas de análisis (Dashboard, Escala de Desempeño, Alertas) apoyan la toma de decisiones docentes y directivas.
5. **Sostenibilidad:** la digitalización reduce costos operativos y el impacto ambiental.

El sistema está diseñado para crecer junto con la institución, incorporando las mejoras identificadas en futuras iteraciones. Se recomienda su adopción progresiva, acompañada de capacitación docente continua, para maximizar sus beneficios pedagógicos y operativos.

---

## ANEXO A: Glosario técnico

| Término | Definición |
|---------|-----------|
| **AC** | Actividades Cotidianas: evaluaciones formativas regulares. |
| **AI** | Actividades Integradoras: evaluaciones sumativas de mayor complejidad. |
| **Dashboard** | Panel de control con indicadores clave de rendimiento. |
| **Escala de Desempeño** | Clasificación de estudiantes en Reprobado, Condicionado y Aprobado. |
| **Promedio Ponderado** | Cálculo que asigna diferentes pesos a cada componente de evaluación. |
| **Trimestre** | Período académico de aproximadamente 3 meses; el año escolar comprende 3 trimestres. |
| **Umbral** | Valor mínimo para alcanzar un estado (ej.: 6.5 para Aprobado). |

---

## ANEXO B: Referencias técnicas

- Documentación del sistema: `/docs/` en el repositorio del proyecto.
- Reporte de pruebas QA: `QA_REPORT_DASHBOARD.md`.
- Código fuente: repositorio institucional privado.

---

*Documento elaborado para presentación ante el Panel de Docentes. Junio 2026.*
