# Sistema de Calificaciones - Offline & Resiliencia

## Características Implementadas

Este sistema ahora cuenta con **soporte offline completo** y **resiliencia de red** para garantizar una experiencia de usuario robusta incluso en condiciones de conectividad deficientes.

---

## 🌐 1. Detección de Estado de Conexión

### Hook: `useNetworkStatus`
- **Ubicación**: `src/hooks/useNetworkStatus.ts`
- **Funcionalidad**: Detecta en tiempo real si el usuario está online u offline
- **Características**:
  - Detección automática de cambios online/offline
  - Información del tipo de conexión (4G, WiFi, etc.)
  - Evento de cambio de estado con notificaciones

```typescript
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const { isOnline, connectionType, lastChecked } = useNetworkStatus();
```

---

## 💾 2. IndexedDB - Almacenamiento Offline

### Módulo: `offlineDb`
- **Ubicación**: `src/lib/offline-database.ts`
- **Funcionalidad**: Base de datos local para almacenamiento offline
- **Características**:
  - Caché automática de datos con expiración configurable
  - Almacenamiento de estudiantes y calificaciones
  - Cola de sincronización para peticiones pendingentes
  - Limpieza automática de datos expirados

```typescript
import { offlineDb } from "@/lib/offline-database";

// Guardar en caché
await offlineDb.setCache("/api/calificaciones", data, 60); // 60 minutos

// Leer desde caché
const cached = await offlineDb.getCache("/api/calificaciones");

// Agregar a cola offline
await offlineDb.addToQueue({
  url: "/api/calificaciones",
  method: "POST",
  body: { ... },
});
```

---

## 🔄 3. Retry Logic & Circuit Breaker

### Módulo: `fetchWithCache`
- **Ubicación**: `src/lib/resilient-fetch.ts`
- **Funcionalidad**: Fetch con reintentos, circuit breaker y caché
- **Características**:
  - **Reintentos automáticos** (hasta 3 por defecto)
  - **Circuit Breaker**: Detiene peticiones si hay fallos repetidos
  - **Timeout configurable** (15s por defecto)
  - **Caché automático** de respuestas exitosas
  - **Cola offline** para peticiones POST/PUT/PATCH fallidas

```typescript
import { fetchWithCache } from "@/lib/resilient-fetch";

// Uso básico
const data = await fetchWithCache("/api/calificaciones", {
  method: "GET",
  cacheTime: 60, // minutos
  retries: 3,
  timeout: 15000, // ms
});

// Sincronizar cola offline
const result = await syncOfflineQueue();
```

---

## 🛡️ 4. Error Boundary

### Componente: `ErrorBoundary`
- **Ubicación**: `src/components/ErrorBoundary.tsx`
- **Funcionalidad**: Captura errores de React y muestra UI de fallback
- **Características**:
  - Previene pantallas blancas
  - UI de error amigable con detalles técnicos
  - Botones de "Intentar de nuevo" e "Ir al inicio"
  - Fallback personalizable

```typescript
import { ErrorBoundary } from "@/components/ErrorBoundary";

<ErrorBoundary>
  <MiComponente />
</ErrorBoundary>
```

---

## 📱 5. PWA (Progressive Web App)

### Archivos configurados:
- **`public/manifest.json`**: Configuración de la app PWA
- **`public/sw.js`**: Service Worker con caching inteligente
- **Iconos**: `icon-192x192.png`, `icon-512x512.png`

### Características:
- Instalable en dispositivos móviles y desktop
- Funciona offline con datos en caché
- Caching de recursos estáticos (HTML, CSS, JS, fonts)
- Caching de API responses (5 minutos)
- Actualización automática del Service Worker

---

## 🔔 6. Indicador de Estado de Conexión

### Componente: `NetworkStatusIndicator`
- **Ubicación**: `src/components/NetworkStatusIndicator.tsx`
- **Funcionalidad**: Indicador visual online/offline
- **Características**:
  - Barra superior roja cuando está offline
  - Notificación temporal al cambiar de estado
  - Botón de sincronización manual al restaurar conexión
  - Indicador discreto en modo desarrollo

---

## 🔧 Configuración

### next.config.ts
Actualizado con headers para:
- Service Worker (`Service-Worker-Allowed`)
- Cache-Control optimizado
- Seguridad (X-Frame-Options, X-XSS-Protection, etc.)

---

## 📊 Resumen de Tecnologías

| Característica | Estado | Tecnología |
|---|---|---|
| ✅ Service Workers | Implementado | Custom SW con Cache API |
| ✅ PWA Support | Implementado | manifest.json + icons |
| ✅ IndexedDB | Implementado | `idb` library |
| ✅ Network Resilience | Implementado | Retry + Circuit Breaker |
| ✅ Online/Offline Detection | Implementado | Custom hook |
| ✅ Cache API | Implementado | Service Worker + IndexedDB |
| ✅ Error Boundaries | Implementado | React Error Boundary |

---

## 🚀 Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

### Regenerar iconos PWA
```bash
node scripts/generate-pwa-icons.js
```

---

## 📝 Notas

- **Todos los datos se sincronizan automáticamente** cuando se restaura la conexión
- **El circuit breaker** protege contra fallos repetidos del servidor
- **La caché expira** automáticamente después del tiempo configurado
- **El Service Worker** se actualiza silenciosamente en segundo plano

---

## 🎯 Beneficios

1. **Experiencia offline**: Los usuarios pueden ver datos cacheados sin conexión
2. **Resiliencia**: Reintentos automáticos y protección contra fallos
3. **Notificaciones claras**: El usuario sabe cuándo está offline
4. **Sincronización automática**: Los datos pendientes se envían al restaurar conexión
5. **Sin pantallas blancas**: Error Boundary captura y muestra errores elegantemente

---

**Implementado en Abril 2026** ✅
