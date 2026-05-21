---
name: Sistema de Calificaciones
description: Gestión de calificaciones, asistencia y boletas para CEC San José de la Montaña
colors:
  primary: "#1b6b3a"
  primary-hover: "#15582e"
  neutral-bg: "#f4f6f3"
  neutral-surface: "#eaede8"
  neutral-text: "#1a1f1a"
  neutral-muted: "#6a7268"
  destructive: "#b33a3a"
  success: "#2d7a4a"
  warning: "#b8912a"
  info: "#3a72b3"
  chart-1: "#b85a2a"
  chart-2: "#2d7a4a"
  chart-3: "#3a5a8a"
  chart-4: "#c4a030"
  chart-5: "#b84a6a"
typography:
  body:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.02em"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  card:
    backgroundColor: "#ffffff"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.lg}"
    padding: "16px"
  badge:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
---

# Design System: Sistema de Calificaciones

## 1. Overview

**Creative North Star: "El Libro de Actas"**

Un sistema de calificaciones escolar que se siente como un libro de actas bien llevado: serio, ordenado, confiable. No hay decoración ni gestos innecesarios. Cada elemento visual existe porque cumple una función: identificar un estado, guiar una tarea, marcar una prioridad. La interfaz es densa por necesidad (los docentes necesitan ver 20+ estudiantes y 10+ columnas de notas en una pantalla), pero la jerarquía cromática evita que esa densidad se convierta en saturación.

Este sistema rechaza explícitamente la estética "SaaS moderno": sin gradientes, sin glassmorphism, sin sombras excesivas, sin ilustraciones decorativas. El color no decora, significa.

**Key Characteristics:**
- Institucional sin ser frío. Formal sin ser rígido.
- Densidad controlada: mucha información, jerarquizada por color y tipografía.
- Consistencia monolítica: un solo vocabulario visual en toda la superficie.
- Modo oscuro para uso nocturno, con la misma seriedad que el modo claro.

## 2. Colors

La paleta gira en torno a un verde bosque institucional. El verde no es un acento decorativo: es el color de la acción principal, del estado "aprobado", de la identidad de la escuela. Los neutros se tintan suavemente hacia el verde para cohesionar sin saturar.

### Primary
- **Verde Bosque** (`oklch(0.42 0.10 140)` / `#1b6b3a`): Acciones primarias, botones principales, encabezados de tabla activos, indicador de "aprobado". Es el color institucional del colegio.
- **Verde Bosque Hover** (`oklch(0.37 0.09 140)` / `#15582e`): Estado hover de botones primarios y elementos activos.

### Neutral
- **Fondo Página** (`oklch(0.96 0.004 140)` / `#f4f6f3`): Fondo general de la interfaz en modo claro. Verde muy tenue, casi blanco.
- **Superficie Elevada** (`oklch(0.93 0.006 140)` / `#eaede8`): Fondos alternos, inputs, superficies secundarias.
- **Texto Principal** (`oklch(0.15 0.008 140)` / `#1a1f1a`): Texto base. Negro ligeramente teñido de verde.
- **Texto Secundario** (`oklch(0.50 0.01 140)` / `#6a7268`): Metadatos, labels secundarios, texto deshabilitado.
- **Borde** (`oklch(0.85 0.008 140)` / `#d1d6cf`): Bordes de componentes, divisores.
- **Card** (`#ffffff`): Fondo de tarjetas, popovers, modales.

### Semantic
- **Destructivo** (`oklch(0.50 0.18 28)` / `#b33a3a`): Botones y estados de error, eliminación, reprobado.
- **Éxito** (`oklch(0.52 0.12 145)` / `#2d7a4a`): Confirmaciones, indicador "guardado", estado completo.
- **Advertencia** (`oklch(0.65 0.10 85)` / `#b8912a`): Estados parciales, condicionado, advertencias.
- **Info** (`oklch(0.52 0.10 250)` / `#3a72b3`): Información contextual, enlaces, ayuda.

### Named Rules
**La Regla del Significado.** El verde no es decoración. Cada vez que aparece verde en la interfaz, responde a una pregunta: ¿es una acción primaria? ¿es un estado aprobado? ¿es la identidad institucional? Si no responde a ninguna, no uses verde.

## 3. Typography

**Body Font:** Sora (variable 400–700), con fallback `system-ui, sans-serif`
**Mono Font:** JetBrains Mono (variable 400–600), para datos numéricos y notas

No hay display font. En una herramienta de producto, una sola sans-serif bien afinada cubre headings, botones, labels, cuerpo y datos. Syne se usó inicialmente como display pero se eliminó por ser inconsistente con el registro de producto.

**Character:** Sora es humanista con suficiente personalidad para ser reconocible, pero lo suficientemente neutral para no distraer. Su calidez moderada complementa el verde institucional sin competir con él.

### Hierarchy
- **Headline** (Sora 700, 1.25rem, 1.3): Títulos de sección y encabezados de tarjeta. Solo 1–2 por vista.
- **Title** (Sora 600, 1rem, 1.4): Subtítulos, títulos de panel, encabezados de tabla.
- **Body** (Sora 400, 0.875rem, 1.6): Texto corriente, celdas de tabla, párrafos. Máximo 75 caracteres por línea en prosa (las tablas pueden exceder).
- **Label** (Sora 500, 0.75rem, 1.4, +0.02em letter-spacing): Labels de formulario, badges, metadatos. También botones pequeños y tabs.
- **Caption** (Sora 400, 0.6875rem, 1.4): Texto auxiliar, notas al pie, timestamps.
- **Mono** (JetBrains Mono 500, 0.8125rem): Inputs de notas numéricas, promedios, datos de calificaciones.

### Named Rules
**La Regla de la Una Familia.** Sin display fonts en una herramienta de producto. Sora en todos los pesos es suficiente para crear jerarquía sin cambiar de familia.

## 4. Elevation

El sistema usa capas tonales (lightness del fondo) en lugar de sombras para crear jerarquía. Las sombras existen pero son sutiles: solo para distinguir elementos interactivos (cards hover, dropdowns) del contenido estático.

**Shadow Vocabulary:**
- **Sombrilla de Card** (`0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`): Cards en reposo. Apenas perceptible, solo separa la card del fondo.
- **Sombrilla de Elevación** (`0 4px 12px rgba(0,0,0,0.08)`): Menús desplegables, modales, elementos flotantes.
- **Sombrilla de Enfoque** (`0 0 0 2px oklch(0.42 0.10 140 / 0.6)`): Anillo de enfoque en inputs y botones. Reemplaza outline nativo.

**Named Rules**
**La Regla Plana.** Las superficies son planas en reposo. Sin gradientes, sin sombras decorativas. La elevación solo aparece como respuesta a estado (hover, focus, active).

## 5. Components

### Buttons
- **Shape:** Rectangulares con esquinas suavemente redondeadas (6px radius). Sin bordes.
- **Primary:** Fondo verde bosque (`#1b6b3a`), texto blanco. Padding: 8px 16px en desktop, 12px 20px en mobile (touch target 44px). Hover: fondo más oscuro (`#15582e`). Active: `#114a25`. Transition: 150ms ease.
- **Ghost:** Sin fondo, texto verde bosque en hover. Padding idéntico a primary. Para acciones secundarias en paneles con fondo.
- **Outline:** Borde 1px solid `var(--border)`, texto `var(--foreground)`. Para acciones terciarias (exportar, refrescar).
- **Destructive:** Fondo rojo (`#b33a3a`), texto blanco. Para borrar calificaciones. Solo visible para administradores.

### Inputs / Fields
- **Style:** Fondo `var(--muted)`, borde 1px solid `var(--border)`, radius 6px.
- **Focus:** Anillo verde bosque de 2px (`oklch(0.42 0.10 140 / 0.4)`) + border transparente.
- **Error:** Borde rojo (`oklch(0.50 0.18 28)`).
- **Disabled:** Fondo `var(--muted)` con opacidad 0.5, texto `var(--muted-foreground)`.
- **Grade Input:** Mono font, fondo transparente, sin bordes (hereda del contenedor de tabla). Focus: outline azul claro.

### Cards / Containers
- **Corner Style:** 10px radius para cards de sección, 6px para cards internas.
- **Background:** Blanco puro en light mode (`var(--card) = #ffffff`), tono elevado en dark.
- **Shadow:** La sombrilla de card (`0 1px 3px rgba(0,0,0,0.06)`).
- **Internal Padding:** 16px (mobile: 12px).

### Tabs
- **Style:** Lista horizontal con scroll en desktop, bottom bar fija en mobile.
- **Active:** Fondo verde bosque + texto blanco.
- **Inactive:** Texto `var(--muted-foreground)` + hover hacia `var(--foreground)`.
- **Mobile Bottom Bar:** Fondo `var(--card)`, borde superior, icono + label, 44px height mínimo.

### Tables
- **Style:** Sin bordes verticales internos, solo borde horizontal sutil en `var(--border)`.
- **Header:** Fondo slate oscuro en light mode, slate claro en dark mode. Texto blanco.
- **Sticky Columns:** Primeras 2 columnas (N° + nombre) fijas con sombra derecha (`4px 0 8px -4px rgba(0,0,0,0.08)`).
- **Mobile:** Transformación a card layout con `data-label` para mostrar headers en cada fila.

### Badges / Status Indicators
- **Shape:** Pill (border-radius 4px), padding 2px 8px.
- **Approved:** Fondo verde bosque claro, texto verde oscuro.
- **Conditioned:** Fondo amarillo claro, texto amarillo oscuro.
- **Failed:** Fondo rojo claro, texto rojo oscuro.
- **Incomplete:** Fondo gris claro, texto gris.
- **Completion Bar:** 3 colores (verde = completo, amarillo = parcial, gris = vacío) en barra de 4px height.

## 6. Do's and Don'ts

### Do:
- **Do** usar verde bosque para acciones primarias y solo para eso. Una superficie tiene máximo 1 botón primario.
- **Do** usar la tabla móvil con `data-label` en responsive. Los docentes necesitan ver los datos en cualquier pantalla.
- **Do** usar el modo oscuro para uso nocturno. Mantener el mismo verde bosque primario, solo ajustar luminosidad.
- **Do** mantener la densidad de información. 20 estudiantes + 10 columnas es normal. La jerarquía cromática evita el caos.
- **Do** usar mono font en inputs de notas para alineación numérica.
- **Do** usar la barra de completitud para que el docente sepa cuánto falta sin tener que contar.

### Don't:
- **Don't** recargar visualmente. Sin gradientes, sin glassmorphism, sin sombras decorativas, sin ilustraciones.
- **Don't** usar display fonts (Syne, Serif, etc.) en UI de producto. Una sola familia sans.
- **Don't** usar `#000` o `#fff` puros. Tintar hacia el verde en cada neutro.
- **Don't** usar `border-left` o `border-right` de más de 1px como acento decorativo. Usar badges, iconos, o nada.
- **Don't** poner texto con gradiente (`background-clip: text` con gradient). Color sólido + weight contrastante.
- **Don't** usar cards con icono + heading + texto repetidas. La tabla es el patrón correcto para datos tabulares.
- **Don't** usar modales como primera opción. Preferir expansión inline o paneles laterales.
- **Don't** animar propiedades de layout (width, height, top, left). Usar opacity/transform.
