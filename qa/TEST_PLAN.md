# Plan de QA Testing - Sistema de Calificaciones

## Executive Summary

**Producto:** Sistema de Calificaciones Escolar  
**Versión:** v2.6.0  
**Fecha:** 2026-06-10  
**Tester:** QA Team  
**Build:** ff41383 (master)

### Objetivos
- Validar nuevas funcionalidades: fechas de trimestres configurables y estadísticas anuales completas
- Verificar que no se rompió funcionalidad existente (regresión)
- Asegurar calidad del producto antes de despliegue a producción

### Alcance

**In Scope:**
- Configuración de fechas de trimestres (UI + API)
- Cálculo de estadísticas anuales con todos los estudiantes
- Asistencia filtrada por fechas configurables
- Dashboard con promedios anuales correctos
- Roles y permisos de administrador

**Out of Scope:**
- Performance testing bajo carga
- Security penetration testing
- Mobile responsive (cubierto parcialmente)

---

## Test Strategy

### Tipos de Testing
1. **Functional Testing** - Validar lógica de negocio
2. **UI Testing** - Verificar interfaz de usuario
3. **Integration Testing** - API + Frontend
4. **Regression Testing** - Funcionalidad existente

### Enfoque
- Black box testing
- Positive y negative testing
- Boundary value analysis
- Exploratory testing

---

## Test Environment

**Requisitos:**
- Node.js 20+
- PostgreSQL (Neon)
- Navegador: Chrome 120+, Firefox 121+
- Resolución: 1920x1080, 1366x768, 375px (mobile)

**Datos de Prueba:**
- Usuario admin: admin@example.com / admin123
- Usuario docente: docente@example.com / docente123
- Grados: 2° A, 3° A, 4° A, 5° A, 6° A, 7° A, 8° A, 9° A
- Estudiantes: 25+ por grado
- Materias: Comunicación, Matemática, Ciencias, etc.

---

## Entry Criteria

- [x] Build compilado exitosamente
- [x] Base de datos migrada
- [x] Variables de entorno configuradas
- [x] Usuarios de prueba creados
- [x] Datos de ejemplo cargados

## Exit Criteria

- [ ] 100% de casos P0 ejecutados y pasados
- [ ] 90%+ de casos P1 pasados
- [ ] 0 bugs críticos abiertos
- [ ] Suite de regresión completada
- [ ] Documentación actualizada

---

## Risk Assessment

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| API POST no funciona | Baja | Alto | Test manual de endpoint |
| Fechas inválidas causan crash | Media | Alto | Validación en frontend + backend |
| Stats anuales incorrectas | Media | Alto | Verificar cálculos manualmente |
| Regresión en asistencia | Baja | Alto | Suite de regresión completa |

---

## Test Deliverables

1. Este documento (test plan)
2. Casos de prueba detallados
3. Reporte de ejecución
4. Bug reports (si aplica)
5. Test summary report

---

## Schedule

| Fase | Duración | Fecha |
|------|----------|-------|
| Planning | 1 día | 2026-06-10 |
| Test Design | 1 día | 2026-06-11 |
| Execution | 2 días | 2026-06-12-13 |
| Reporting | 0.5 día | 2026-06-14 |

---

## Roles y Responsabilidades

| Rol | Responsable | Tareas |
|-----|-------------|--------|
| QA Lead | Por definir | Planificación, reporting |
| Tester | Por definir | Ejecución, bug reporting |
| Developer | Por definir | Fix de bugs |

---

## Aprobación

| Rol | Nombre | Fecha | Estado |
|-----|--------|-------|--------|
| QA Manager | | | Pendiente |
| Product Owner | | | Pendiente |
| Tech Lead | | | Pendiente |
