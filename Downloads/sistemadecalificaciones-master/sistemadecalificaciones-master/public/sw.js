// Service Worker para sistema de calificaciones
// Estrategia de caché: Network First con fallback a cache

const CACHE_NAME = "sistema-calificaciones-v1";
const RUNTIME_CACHE = "runtime-cache-v1";

// Recursos estáticos para caché inicial
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/logo.svg",
];

// Estrategia de caché para diferentes tipos de peticiones
const CACHE_STRATEGIES = {
  // Páginas HTML: Network first, cache fallback
  pages: {
    pattern: /^\/(?!api|_next|static)/,
    strategy: "network-first" as const,
    cacheName: CACHE_NAME,
  },
  // API calls: Network first, short cache
  api: {
    pattern: /^\/api\//,
    strategy: "network-first" as const,
    cacheName: RUNTIME_CACHE,
    maxAge: 5 * 60 * 1000, // 5 minutos
  },
  // Next.js static assets: Cache first
  static: {
    pattern: /^\/_next\/static\//,
    strategy: "cache-first" as const,
    cacheName: "static-cache-v1",
  },
  // Imágenes: Cache first
  images: {
    pattern: /\.(png|jpg|jpeg|gif|svg|webp|ico)$/,
    strategy: "cache-first" as const,
    cacheName: "images-cache-v1",
  },
  // Fonts: Cache first
  fonts: {
    pattern: /\.(woff2?|ttf|otf|eot)$/,
    strategy: "cache-first" as const,
    cacheName: "fonts-cache-v1",
  },
};

// Instalación del Service Worker
self.addEventListener("install", (event: ExtendableEvent) => {
  console.log("[SW] Installing Service Worker...");
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching static assets");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.error("[SW] Failed to cache static assets:", err);
        return Promise.resolve();
      });
    })
  );

  // Activar inmediatamente
  self.skipWaiting();
});

// Activación y limpieza de caché viejo
self.addEventListener("activate", (event: ExtendableEvent) => {
  console.log("[SW] Activating Service Worker...");
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Eliminar cachés de versiones anteriores
            return (
              name.startsWith("sistema-calificaciones-") ||
              name.startsWith("runtime-cache-") ||
              name.startsWith("static-cache-") ||
              name.startsWith("images-cache-") ||
              name.startsWith("fonts-cache-")
            ) && name !== CACHE_NAME && name !== RUNTIME_CACHE;
          })
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );

  // Tomar control de todas las páginas
  self.clients.claim();
});

// Estrategia de fetch con caché
async function fetchWithStrategy(
  request: Request,
  strategy: "network-first" | "cache-first",
  cacheName: string,
  maxAge?: number
): Promise<Response> {
  const cache = await caches.open(cacheName);

  if (strategy === "cache-first") {
    // Cache First: Intentar desde caché primero
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Verificar si está expirado
      if (maxAge) {
        const cachedDate = cachedResponse.headers.get("sw-cache-date");
        if (cachedDate) {
          const age = Date.now() - parseInt(cachedDate, 10);
          if (age < maxAge) {
            return cachedResponse;
          }
        }
      } else {
        return cachedResponse;
      }
    }

    // Fetch de red y actualizar caché
    try {
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        // Clonar respuesta para guardar en caché
        const responseToCache = networkResponse.clone();
        const headers = new Headers(responseToCache.headers);
        headers.set("sw-cache-date", Date.now().toString());
        
        const cachedResponse = new Response(await responseToCache.blob(), {
          status: responseToCache.status,
          statusText: responseToCache.statusText,
          headers,
        });
        
        await cache.put(request, cachedResponse);
      }

      return networkResponse;
    } catch (error) {
      console.error("[SW] Network request failed:", error);
      throw error;
    }
  } else {
    // Network First: Intentar red primero
    try {
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        // Guardar en caché para uso futuro
        const responseToCache = networkResponse.clone();
        const headers = new Headers(responseToCache.headers);
        headers.set("sw-cache-date", Date.now().toString());
        
        const cachedResponse = new Response(await responseToCache.blob(), {
          status: responseToCache.status,
          statusText: responseToCache.statusText,
          headers,
        });
        
        await cache.put(request, cachedResponse);
      }

      return networkResponse;
    } catch (error) {
      console.log("[SW] Network failed, trying cache...");
      
      // Fallback a caché
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        console.log("[SW] Serving from cache");
        return cachedResponse;
      }

      // Si es una petición de página, servir página offline
      if (request.headers.get("Accept")?.includes("text/html")) {
        const offlinePage = await cache.match("/");
        if (offlinePage) {
          return offlinePage;
        }
      }

      throw error;
    }
  }
}

// Interceptación de peticiones
self.addEventListener("fetch", (event: FetchEvent) => {
  const url = new URL(event.request.url);

  // Ignorar peticiones que no son GET
  if (event.request.method !== "GET") {
    return;
  }

  // Encontrar estrategia para esta petición
  const strategyConfig = Object.values(CACHE_STRATEGIES).find((s) =>
    s.pattern.test(url.pathname)
  );

  if (strategyConfig) {
    event.respondWith(
      fetchWithStrategy(
        event.request,
        strategyConfig.strategy,
        strategyConfig.cacheName,
        (strategyConfig as any).maxAge
      ).catch((error) => {
        console.error("[SW] All strategies failed:", error);
        
        // Fallback final para páginas
        if (event.request.headers.get("Accept")?.includes("text/html")) {
          return caches.match("/");
        }
        
        // Retornar respuesta de error genérica
        return new Response("Offline - No hay datos en caché disponibles", {
          status: 503,
          statusText: "Service Unavailable",
          headers: new Headers({
            "Content-Type": "text/plain",
          }),
        });
      })
    );
  }
});

// Sincronización en segundo plano (Background Sync)
self.addEventListener("sync", (event: SyncEvent) => {
  console.log("[SW] Background sync triggered:", event.tag);
  
  if (event.tag === "sync-calificaciones") {
    event.waitUntil(syncCalificaciones());
  }
});

async function syncCalificaciones() {
  // Esta función se comunica con la app principal
  // para sincronizar datos pendientes
  const clients = await self.clients.matchAll();
  
  for (const client of clients) {
    client.postMessage({
      type: "SYNC_REQUEST",
      tag: "sync-calificaciones",
    });
  }
}

// Manejo de mensajes desde la app
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  console.log("[SW] Message received:", event.data);
  
  if (event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.delete(event.data.cacheName || RUNTIME_CACHE)
    );
  }
  
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Notificación de actualización disponible
self.addEventListener("updatefound", (event: Event) => {
  const newWorker = (event.target as ServiceWorkerContainer).controller;
  
  if (newWorker) {
    newWorker.addEventListener("statechange", () => {
      if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
        // Nueva versión disponible
        navigator.serviceWorker.controller.postMessage({
          type: "UPDATE_AVAILABLE",
        });
      }
    });
  }
});

console.log("[SW] Service Worker loaded");
