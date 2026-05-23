---
name: Sistema de Calificaciones
description: Gestión de calificaciones, asistencia y boletas para CEC San José de la Montaña
colors:
  primary: "#1d624a"
  primary-hover: "#17503c"
  neutral-bg: "#fcfdfa"
  neutral-surface: "#eff2ed"
  neutral-text: "#15241e"
  neutral-muted: "#5a6a62"
  destructive: "#b33a3a"
  success: "#256f45"
  warning: "#b8912a"
  info: "#1d5b94"
  chart-1: "#b85a2a"
  chart-2: "#256f45"
  chart-3: "#1d5b94"
  chart-4: "#c4a030"
  chart-5: "#b84a6a"
typography:
  display:
    fontFamily: "Outfit, system-ui, sans-serif"
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
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

**Creative North Star: "Esmeralda Imperial"**

Un sistema de calificaciones escolar que evoca el prestigio de la excelencia académica mediante una paleta refinada de color esmeralda y oro, complementada con un fondo cálido de alabastro. Diseñado para ofrecer una legibilidad impecable, un contraste nítido bajo cualquier condición de iluminación y una apariencia moderna libre de grises aburridos.

**Key Characteristics:**
- **Alto contraste refinado**: Textos en verde-carbono profundo sobre fondos cálidos de alabastro en modo claro, y menta luminosa sobre obsidiana en modo oscuro.
- **Tipografía Dual**: Tipografía Outfit para títulos y acentos (estética amigable y moderna), y Plus Jakarta Sans para el texto de contenido (legibilidad excepcional en pantalla).
- **Detalles dorados y degradados sutiles**: Para elementos activos, alertas o accesos importantes, aportando un toque premium de calidad.
- **Micro-interacciones**: Transiciones fluidas en hover de botones y celdas de tabla.

## 2. Colors

La paleta se centra en tonos esmeralda/jade, con acentos en oro champagne y neutros cálidos.

### Primary
- **Esmeralda Imperial** (`oklch(0.38 0.09 155)` / `#1d624a`): Botones principales, pestañas activas, aprobado institucional.
- **Esmeralda Hover** (`oklch(0.32 0.08 155)` / `#17503c`): Estados hover.
- **Menta Eléctrico** (`oklch(0.72 0.12 155)` / `#68dbab`): Primario en modo oscuro para alta legibilidad.

### Neutral
- **Fondo Página** (`oklch(0.985 0.004 155)` / `#fcfdfa`): Fondo claro sumamente suave para reducir el cansancio visual.
- **Superficie Elevada** (`oklch(0.94 0.012 155)` / `#eff2ed`): Fondos alternos, inputs.
- **Card** (`oklch(1 0 0)` / `#ffffff`): Superficies de tarjeta puras.
- **Texto** (`oklch(0.18 0.025 155)` / `#15241e`): Contraste óptimo y suave.
- **Borde** (`oklch(0.92 0.008 155)` / `#e1e6e0`): Bordes sutiles.

### Semantic
- **Destructivo / Error** (`oklch(0.50 0.18 28)` / `#b33a3a`): Estados reprobados o destructivos.
- **Éxito** (`oklch(0.55 0.15 155)`): Guardados exitosos.
- **Advertencia** (`oklch(0.72 0.13 85)`): Condicionados o alertas intermedias.
- **Info** (`oklch(0.52 0.14 220)`): Detalles e información contextual.

## 3. Typography

**Display Font:** Outfit (500–800), con fallback `system-ui, sans-serif`
**Body Font:** Plus Jakarta Sans (400–700), con fallback `system-ui, sans-serif`
**Mono Font:** JetBrains Mono (400–600), para números y calificaciones

### Hierarchy
- **Headline** (Outfit 700, 1.25rem, 1.2): Encabezados de sección y títulos de página.
- **Title** (Outfit 600, 1rem, 1.3): Subtítulos, encabezados de tarjeta.
- **Body** (Plus Jakarta Sans 400, 0.875rem, 1.6): Lectura de listas y celdas.
- **Label** (Plus Jakarta Sans 500, 0.75rem, 1.4, +0.02em): Etiquetas de formulario, botones.
- **Mono** (JetBrains Mono 500, 0.8125rem): Ingreso de notas y números.

## 4. Elevation & Radius

Se utilizan bordes redondeados medianamente amplios (`0.625rem`) y sombras sumamente suaves para separar paneles sin sobrecargar la pantalla.

## 5. Do's and Don'ts

### Do:
- Usar el verde esmeralda institucional para el contenido principal y botones primarios.
- Utilizar el degradado del header con opacidad moderada para la firma institucional.
- Emplear JetBrains Mono exclusivamente para números de calificaciones.

### Don't:
- Evitar grises puros. Todas las superficies y bordes deben contener una pizca de saturación esmeralda/jade (`hue 155`).
- No usar fuentes de tipo script o serifas pesadas; Outfit y Plus Jakarta Sans resuelven la personalidad del sistema.
