# Product

## Register

product

## Users

Docentes y administradores del Colegio Católico CEC San José de la Montaña (Nicaragua), gestionando calificaciones, asistencia y boletas para estudiantes de 2° a 9° grado. Usan el sistema a diario durante la jornada escolar desde computadoras de escritorio en la sala de maestros, y ocasionalmente desde casa en laptop por la noche. Su tarea principal es registrar notas rápida y confiablemente, sin fricción.

## Product Purpose

Sistema interno de calificaciones escolares que reemplaza libros de notas físicos. Permite a docentes registrar calificaciones con auto-guardado, llevar asistencia diaria, generar boletas en PDF y dar visibilidad a administradores del avance académico por grado, asignatura y trimestre. El éxito es que los docentes confíen en el sistema al punto de no llevar respaldo en papel.

## Brand Personality

Tradicional, serio, confiable. La interfaz debe inspirar confianza institucional, no emoción ni entretenimiento. El tono es formal pero accesible, como un libro de actas bien llevado, no como una app moderna de productividad.

## Anti-references

- Nada recargado visualmente. Sin decoración innecesaria, sin sombras excesivas, sin gradientes, sin glassmorphism.
- Nada que parezca herramienta genérica SaaS. Esto no es Stripe ni Linear.
- Nada que parezca juguete o app infantil. Sin colores brillantes, sin ilustraciones grandes, sin animaciones gratuitas.

## Design Principles

1. **La herramienta desaparece.** El docente está ahí para poner notas, no para interactuar con la UI. Cada elemento decorativo que no sirve a la tarea es ruido.
2. **Confianza institucional.** La interfaz debe sentirse sólida, predecible, estable. No sorpresas, no movimientos innecesarios, no cambios de layout.
3. **Consistencia sobre creatividad.** Un solo vocabulario visual en toda la superficie. Mismos botones, mismos inputs, mismos colores. La familiaridad genera velocidad.
4. **Densidad controlada.** Los docentes necesitan ver muchos datos en una pantalla (20+ estudiantes, 10+ columnas de notas). La densidad es necesaria, pero la jerarquía visual evita la saturación.
5. **Sin artificio.** El color no decora, significa. Cada estado (aprobado, condicionado, reprobado, completo, incompleto, guardando, error) tiene un color que lo comunica.
6. **Resiliencia silenciosa.** El auto-guardado, la cola offline, el retry con backoff: el usuario nunca debería pensar en estos. Funcionan o fallan sin pedir intervención.

## Accessibility & Inclusion

- Contraste WCAG AA en todos los modos (claro/oscuro).
- Modo oscuro disponible para uso nocturno desde casa.
- Navegación por teclado en tabla de calificaciones (flechas arriba/abajo entre celdas).
- `prefers-reduced-motion` respetado: sin animaciones cuando el usuario las desactiva.
- Touch targets de 44px mínimo para uso en tablets si los docentes las usan.
