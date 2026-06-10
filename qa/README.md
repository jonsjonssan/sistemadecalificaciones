# QA Testing - Sistema de Calificaciones

Este directorio contiene toda la documentación y herramientas de QA testing para el Sistema de Calificaciones.

## 📁 Estructura

```
qa/
├── README.md                          # Este archivo
├── TEST_PLAN.md                       # Plan de testing completo
├── TEST_CASES.md                      # Casos de prueba detallados
├── TEST_EXECUTION_REPORT.md           # Reporte de ejecución de tests
└── run_tests.sh                       # Script de automatización de tests
```

## 🚀 Quick Start

### 1. Revisar Plan de Testing
```bash
cat qa/TEST_PLAN.md
```

### 2. Revisar Casos de Prueba
```bash
cat qa/TEST_CASES.md
```

### 3. Ejecutar Tests Automatizados
```bash
# Hacer ejecutable el script
chmod +x qa/run_tests.sh

# Ejecutar tests
./qa/run_tests.sh
```

### 4. Generar Reporte
Después de ejecutar los tests, actualizar `TEST_EXECUTION_REPORT.md` con los resultados.

## 📋 Documentos

### TEST_PLAN.md
Plan completo de testing que incluye:
- Executive summary
- Alcance (in scope / out of scope)
- Estrategia de testing
- Ambiente de pruebas
- Criterios de entrada/salida
- Evaluación de riesgos
- Cronograma

### TEST_CASES.md
Casos de prueba detallados organizados en:
- **Fechas de Trimestres Configurables** (6 casos)
- **Estadísticas Anuales Completas** (3 casos)
- **Suite de Regresión** (8 casos)

Cada caso incluye:
- ID único
- Prioridad (P0, P1, P2)
- Tipo (Functional, UI, Integration, Regression)
- Objetivo
- Preconditions
- Test steps con expected results
- Test data
- Post-conditions

### TEST_EXECUTION_REPORT.md
Reporte de ejecución que documenta:
- Resumen de resultados (pass/fail rate)
- Ejecución por prioridad
- Detalles de cada caso ejecutado
- Bugs encontrados
- Observaciones
- Recomendaciones
- Aprobación

### run_tests.sh
Script de automatización que verifica:
- Build de Next.js
- Compilación TypeScript
- Generación Prisma Client
- Servidor corriendo
- Endpoints API disponibles

## 🎯 Casos de Prueba por Prioridad

### P0 - Critical (8 casos)
Deben pasar antes de cualquier despliegue:
- TC-FECHA-001: Acceso a UI de configuración
- TC-FECHA-002: Configurar fechas T1
- TC-FECHA-003: Validación fechas inválidas
- TC-FECHA-005: API POST fechas
- TC-FECHA-006: Asistencia usa fechas
- TC-STAT-001: Dashboard promedios anuales
- TC-STAT-002: API stats todos estudiantes
- TC-REG-001: Login usuarios
- TC-REG-002: CRUD calificaciones
- TC-REG-003: Registro asistencia

### P1 - High (5 casos)
Importantes para funcionalidad completa:
- TC-FECHA-004: Restablecer fechas
- TC-STAT-003: Promedio con datos parciales
- TC-REG-004: Generación boletas
- TC-REG-005: Configuración umbrales
- TC-REG-006: Gestión usuarios

### P2 - Medium (4 casos)
Deseables pero no bloqueantes:
- TC-REG-007: Exportación reportes
- TC-REG-008: Dark mode toggle

##  Flujo de Trabajo QA

```
1. Planning
   ↓
2. Test Design (crear casos de prueba)
   ↓
3. Test Execution (ejecutar casos)
   ↓
4. Bug Reporting (documentar issues)
   ↓
5. Retesting (verificar fixes)
   ↓
6. Reporting (generar reporte final)
   ↓
7. Sign-off (aprobación para producción)
```

## 📊 Métricas

### Criterios de Aceptación
- **100%** de casos P0 ejecutados y pasados
- **90%+** de casos P1 pasados
- **0** bugs críticos abiertos
- **Suite de regresión** completada

### Pass Rate Calculation
```
Pass Rate = (Casos Pasados / Casos Ejecutados) × 100
```

**Ejemplo:**
- Ejecutados: 17
- Pasados: 17
- Pass Rate: 100% ✅

## 🐛 Bug Reporting

Cuando encuentres un bug:

1. **Documentar** en `TEST_EXECUTION_REPORT.md`
2. **Incluir:**
   - ID del caso de prueba fallido
   - Pasos para reproducir
   - Expected vs Actual behavior
   - Screenshots (si aplica)
   - Severidad y prioridad
3. **Crear issue** en GitHub con label `bug`

## 🤖 Automatización

### Ejecutar Tests Locales
```bash
./qa/run_tests.sh
```

### Integración con CI/CD
Agregar al workflow de GitHub Actions:
```yaml
- name: Run QA Tests
  run: |
    chmod +x qa/run_tests.sh
    ./qa/run_tests.sh
```

## 📝 Actualización de Documentos

### Después de cada release:
1. Actualizar `TEST_PLAN.md` con nueva versión
2. Agregar nuevos casos de prueba si hay nuevas features
3. Ejecutar suite completa y actualizar `TEST_EXECUTION_REPORT.md`
4. Actualizar métricas y cobertura

### Después de bug fixes:
1. Agregar caso de prueba para el bug fix (regresión)
2. Ejecutar caso específico
3. Actualizar reporte

## 🎓 Mejores Prácticas

### Writing Test Cases
- ✅ Ser específico y sin ambigüedad
- ✅ Incluir expected results para cada step
- ✅ Testear una cosa por caso
- ✅ Usar naming conventions consistentes
- ✅ Mantener casos mantenibles

### Bug Reporting
- ✅ Proveer pasos claros de reproducción
- ✅ Incluir screenshots/videos
- ✅ Especificar ambiente exacto
- ✅ Describir impacto en usuarios
- ✅ Asignar prioridad y severidad

### Regression Testing
- ✅ Automatizar tests repetitivos
- ✅ Mantener suite actualizada
- ✅ Priorizar critical paths
- ✅ Ejecutar smoke tests frecuentemente
- ✅ Actualizar suite después de cada release

## 📞 Contacto

Para preguntas sobre QA testing:
- Revisar documentación en este directorio
- Crear issue con label `question` o `qa`
- Contactar al QA Lead

---

**Última actualización:** 2026-06-10  
**Versión:** 1.0  
**Mantenido por:** QA Team
