---
name: Sistema de Calificaciones
description: Gestión de calificaciones, asistencia y boletas para CEC San José de la Montaña
colors:
  primary: "#1b6b3a"
  primary-hover: "#15582e"
  neutral-bg: "#f4f6f3"
  neutral-surface: "#eaede8"
  neutral-text: "#000000"
  neutral-muted: "#000000"
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
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Roboto, system-ui, sans-serif"
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

**Creative North Star: "Pizarra y Tiza"**

Un sistema de calificaciones escolar que se siente como una pizarra bien organizada: contraste nítido, información clara, sin adornos. Negro profundo sobre blanco, con acentos en verde bosque institucional. El degradado lineal en el header evoca el horizonte de una pizarra al atardecer, pero sin interferir con la legibilidad.

Este sistema usa tres colores base: **negro**, **blanco** y **verde bosque**. Los colores semánticos (rojo, ámbar, azul) existen solo para estados funcionales: error, advertencia, información.

**Key Characteristics:**
- Alto contraste: texto negro puro sobre fondo blanco, blanco puro sobre fondo oscuro.
- Tipografía Roboto: geométrica, legible, neutral. Una sola familia para toda la interfaz.
- Degradado lineal sutil en el header para identidad institucional.
- Consistencia monolítica: un solo vocabulario visual en toda la superficie.
- Modo oscuro para uso nocturno, con fondos verde negruzco profundo.

## 2. Colors

La paleta es minimalista: negro, blanco y verde. El verde bosque es el color institucional. Los neutros se tintan hacia el verde para cohesionar sin competir.

### Primary
- **Verde Bosque** (`oklch(0.42 0.12 140)` / `#1b6b3a`): Acciones primarias, botones principales, encabezados de tabla activos, indicador de "aprobado". Es el color institucional.
- **Verde Bosque Hover** (`oklch(0.37 0.12 140)` / `#15582e`): Estado hover de botones primarios.

### Neutral
- **Fondo Página** (`oklch(0.97 0.005 140)` / `#f7f8f5`): Fondo general casi blanco, tintado verde tenue.
- **Superficie Elevada** (`oklch(0.90 0.03 140)` / `#dce6d8`): Fondos alternos, inputs, superficies secundarias.
- **Card** (`oklch(1 0 0)` / `#ffffff`): Fondo de tarjetas, popovers, modales.
- **Texto** (`oklch(0 0 0)` / `#000000`): Negro puro para máximo contraste.
- **Borde** (`oklch(0.65 0.02 140)` / `#8fa88b`): Bordes de componentes tintados verde.

### Semantic (mantenidos como están)
- **Destructivo / Error** (`oklch(0.50 0.20 28)` / `#b33a3a`): Botones destructivos, estado reprobado.
- **Éxito / Aprobado** (`oklch(0.52 0.12 145)` / `#2d7a4a`): Confirmaciones, guardado exitoso.
- **Advertencia / Condicionado** (`oklch(0.65 0.10 85)` / `#b8912a`): Estados parciales, advertencias.
- **Info** (`oklch(0.52 0.10 250)` / `#3a72b3`): Información contextual, ayuda.

### Header Gradient
El header usa un degradado lineal de 135 grados: desde verde bosque con baja opacidad hacia blanco puro (light) o desde verde bosque más intenso hacia fondo oscuro (dark). Esto le da identidad sin recargar.

## 3. Typography

**Body Font:** Roboto (400–700), con fallback `system-ui, sans-serif`
**Mono Font:** JetBrains Mono (400–600), solo para datos numéricos

Roboto es una sans-serif geométrica con excelente legibilidad en pantalla. Su neutralidad la hace ideal para interfaces de producto donde la herramienta debe desaparecer. Una sola familia cubre headings, botones, labels, cuerpo y datos.

### Hierarchy
- **Headline** (Roboto 700, 1.25rem, 1.3): Títulos de sección. Solo 1–2 por vista.
- **Title** (Roboto 600, 1rem, 1.4): Subtítulos, encabezados de panel y tabla.
- **Body** (Roboto 400, 0.875rem, 1.6): Texto corriente, celdas de tabla.
- **Label** (Roboto 500, 0.75rem, 1.4, +0.02em tracking): Labels de formulario, badges, tabs.
- **Caption** (Roboto 400, 0.6875rem, 1.4): Texto auxiliar, timestamps.
- **Mono** (JetBrains Mono 500, 0.8125rem): Inputs de notas numéricas.

## 4. Elevation

Sin cambios respecto a la versión anterior: capas tonales, sombras sutiles solo para elementos interactivos.

## 5. Components

Sin cambios en la estructura de componentes. Los colores de fondo, texto y borde se actualizan según la nueva paleta.

## 6. Do's and Don'ts

### Do:
- **Do** usar negro puro (`#000`) para texto sobre fondo claro, blanco puro (`#fff`) para texto sobre fondo oscuro.
- **Do** usar el degradado lineal en el header como único elemento decorativo en la interfaz.
- **Do** mantener los colores semánticos (rojo, ámbar, azul, verde) para estados funcionales.
- **Do** usar Roboto en 400/500/600/700 para toda la jerarquía tipográfica.

### Don't:
- **Don't** usar grises. Todo texto es negro puro o blanco puro. La jerarquía se logra con peso (weight) y tamaño, no con opacidad o matiz.
- **Don't** añadir gradientes decorativos fuera del header.
- **Don't** usar display fonts. Roboto es la única familia sans-serif.
