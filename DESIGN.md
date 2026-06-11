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
  destructive: "#704040"
  success: "#1d624a"
  warning: "#846c3e"
  info: "#5a6a62"
  chart-1: "oklch(0.35 0.07 155)"
  chart-2: "oklch(0.45 0.09 155)"
  chart-3: "oklch(0.55 0.07 155)"
  chart-4: "oklch(0.65 0.05 155)"
  chart-5: "oklch(0.75 0.03 155)"
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

**Creative North Star: "Esmeralda Sobria"**

Un sistema de calificaciones escolar que comunica seriedad institucional y claridad académica mediante una paleta monocromática verde-esmeralda con variaciones de luminosidad. El color no decora: significa. Cada tono tiene un propósito semántico inequívoco.

**Key Characteristics:**
- **Paleta monocromática**: Todo el sistema vive en el hue 155 (verde-esmeralda). Los colores de estado (aprobado, condicionado, reprobado) son variaciones desaturadas que comunican sin competir visualmente.
- **Neutrales con tinte verde**: No existen grises puros. Todos los neutros carry un chroma sutil (0.004-0.015) hacia el hue 155.
- **Sin colores eléctricos**: El modo oscuro reduce la luminosidad del primario a oklch(0.62 0.09) para evitar el efecto "neón". La misma lógica cromática rige ambos modos.
- **Gráficas monocromáticas**: Los gráficos usan exclusivamente variaciones de luminosidad del verde. No hay paleta arcoíris.

## 2. Colors

### Estrategia: Restrained

Un solo hue (155) como color estructural dominante. Los colores semánticos son desaturados (chroma ≤0.07) para no competir con el verde primario.

### Primary
- **Esmeralda Institucional** (`oklch(0.38 0.09 155)` / `#1d624a`): Botones principales, pestañas activas, estado aprobado, datos positivos.
- **Esmeralda Hover** (`oklch(0.32 0.08 155)` / `#17503c`): Estados hover de elementos primarios.
- **Verde Oscuro Dark Mode** (`oklch(0.62 0.09 155)`): Primario en modo oscuro. No eléctrico, legible.

### Neutral
- **Fondo Página** (`oklch(0.985 0.004 155)`): Fondo claro con tinte verde sutil.
- **Superficie Elevada** (`oklch(0.94 0.012 155)`): Fondos alternos, inputs, secondary.
- **Card** (`oklch(0.995 0.002 155)`): Superficies de tarjeta, casi blanco con pizca de verde.
- **Texto** (`oklch(0.18 0.025 155)`): Verde-carbono profundo para contraste óptimo.
- **Borde** (`oklch(0.91 0.008 155)`): Bordes sutiles con tinte verde.
- **Muted Foreground** (`oklch(0.48 0.015 155)`): Texto secundario, labels.

### Semantic (desaturados)
- **Status Success** (`oklch(0.40 0.07 155)`): Aprobado, presente, completado. Muted bg: `oklch(0.96 0.015 155)`.
- **Status Warning** (`oklch(0.52 0.04 85)`): Condicionado, tarde, alerta media. Muted bg: `oklch(0.96 0.008 85)`.
- **Status Error** (`oklch(0.44 0.05 28)`): Reprobado, ausente, error. Muted bg: `oklch(0.96 0.006 28)`.
- **Destructive** (`oklch(0.46 0.07 28)`): Acciones destructivas, toasts de error.

### Chart Palette (monocromática)
- **Chart 1** (`oklch(0.35 0.07 155)`): Verde más oscuro.
- **Chart 2** (`oklch(0.45 0.09 155)`): Verde medio-oscuro (≈primary).
- **Chart 3** (`oklch(0.55 0.07 155)`): Verde medio.
- **Chart 4** (`oklch(0.65 0.05 155)`): Verde medio-claro.
- **Chart 5** (`oklch(0.75 0.03 155)`): Verde más claro.

### Dark Mode
| Token | oklch | Nota |
|---|---|---|
| background | `oklch(0.14 0.012 155)` | Obsidiana con tinte verde |
| foreground | `oklch(0.90 0.008 155)` | Verde menta suave, no eléctrico |
| primary | `oklch(0.62 0.09 155)` | Verde visible sin brillar |
| status-success | `oklch(0.62 0.08 155)` | Verde claro moderado |
| status-warning | `oklch(0.65 0.04 85)` | Warm desaturado |
| status-error | `oklch(0.55 0.06 28)` | Warm-dark desaturado |
| chart-1 | `oklch(0.62 0.09 155)` | Invertido: más claro primero |

## 3. Reglas de Uso

### Gráficas
- Usar exclusivamente la chart palette (5 tonos de verde por luminosidad).
- Para distribución aprobado/condicionado/reprobado: primary / `oklch(0.52 0.04 85)` / `oklch(0.44 0.05 28)`.
- No usar colores fuera del hue 155 ±10 para datos.

### Estados de Notas
- Aprobado: `text-status-success` sobre `bg-status-success-muted`.
- Condicionado: `text-status-warning` sobre `bg-status-warning-muted`.
- Reprobado: `text-status-error` sobre `bg-status-error-muted`.
- Nunca usar rojo saturado ni amarillo brillante.

### Interacciones
- Hover: box-shadow inset con opacidad 0.06-0.10, no cambios de background dramáticos.
- Focus: ring con `oklch(0.38 0.09 155 / 0.3)`.
- Active: leve incremento de opacidad del shadow.

### Exportación PDF/HTML
- Header: `#1d624a` (primary).
- Aprobado: `#1d624a`. Condicionado: `#846c3e`. Reprobado: `#704040`.
- Fondos de celda: neutros con tinte verde sutil, nunca colores saturados.

## 4. Typography

**Display Font:** Outfit (500-800), con fallback `system-ui, sans-serif`
**Body Font:** Plus Jakarta Sans (400-700), con fallback `system-ui, sans-serif`
**Mono Font:** JetBrains Mono (400-600), para números y calificaciones

### Hierarchy
- **Headline** (Outfit 700, 1.25rem, 1.2): Encabezados de sección.
- **Title** (Outfit 600, 1rem, 1.3): Subtítulos, encabezados de tarjeta.
- **Body** (Plus Jakarta Sans 400, 0.875rem, 1.6): Lectura de listas y celdas.
- **Label** (Plus Jakarta Sans 500, 0.75rem, 1.4, +0.02em): Etiquetas.
- **Mono** (JetBrains Mono 500, 0.8125rem): Ingreso de notas y números.

## 5. Elevation & Radius

- Radius base: `0.625rem` (10px).
- Sombras: verdes-tintadas, nunca grises puros. Cuatro niveles de elevación.

## 6. Do's and Don'ts

### Do:
- Usar el verde esmeralda institucional como color estructural dominante.
- Comunicar estados con variaciones desaturadas dentro de la misma familia.
- Mantener la misma lógica cromática en ambos modos (claro/oscuro).
- Usar JetBrains Mono exclusivamente para números de calificaciones.

### Don't:
- No usar colores saturados fuera del hue 155 para datos o estados.
- No usar grises puros. Todos los neutros llevan tinte verde (chroma 0.004-0.015).
- No usar "verde eléctrico" en dark mode. El primario oscuro es oklch(0.62 0.09), no 0.72 0.12.
- No usar rojo brillante, amarillo brillante, ni azul para indicadores de estado.
- No mezclar más de 2 niveles de luminosidad del verde en un mismo componente.
