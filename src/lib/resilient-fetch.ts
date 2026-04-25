import { offlineDb } from "./offline-database";

export interface FetchWithCacheOptions {
  cacheTime?: number; // minutos
  retries?: number;
  timeout?: number; // milisegundos
  useCache?: boolean;
  backgroundSync?: boolean;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailure: number | null;
  state: "closed" | "open" | "half-open";
}

// Estado del circuit breaker por endpoint
const circuitBreakers = new Map<string, CircuitBreakerState>();

function getCircuitBreaker(url: string): CircuitBreakerState {
  // Usar el pathname como clave para aislar endpoints
  const key = new URL(url, "http://localhost").pathname;
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, { failures: 0, lastFailure: null, state: "closed" });
  }
  return circuitBreakers.get(key)!;
}

const FAILURE_THRESHOLD = 5;
const RESET_TIMEOUT = 30000; // 30 segundos

/**
 * Fetch con caché offline, reintentos y circuit breaker
 * Reemplaza fetch() normal con resiliencia
 */
export async function fetchWithCache<T = unknown>(
  url: string,
  options: RequestInit & FetchWithCacheOptions = {}
): Promise<T> {
  const {
    cacheTime = 60,
    retries = 3,
    timeout = 15000,
    useCache = true,
    backgroundSync = true,
    ...fetchOptions
  } = options;

  // Si estamos offline, intentar desde caché
  if (!navigator.onLine && useCache) {
    const cached = await offlineDb.getCache<T>(url);
    if (cached) {
      return cached;
    }
    throw new NetworkError(
      "Sin conexión y sin datos en caché disponibles",
      url
    );
  }

  // Verificar circuit breaker
  const breaker = getCircuitBreaker(url);
  if (breaker.state === "open") {
    const timeSinceLastFailure = Date.now() - (breaker.lastFailure || 0);
    if (timeSinceLastFailure < RESET_TIMEOUT) {
      // Intentar desde caché si está disponible
      if (useCache) {
        const cached = await offlineDb.getCache<T>(url);
        if (cached) return cached;
      }
      throw new CircuitBreakerOpenError("Servicio temporalmente no disponible");
    } else {
      // Cambiar a half-open para probar
      breaker.state = "half-open";
    }
  }

  let lastError: Error | null = null;

  // Intentar con reintentos
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new HttpError(response.status, response.statusText, url);
      }

      const data = await response.json();

      // Guardar en caché para uso offline
      if (useCache && cacheTime > 0) {
        await offlineDb.setCache(url, data, cacheTime);
      }

      // Resetear circuit breaker si tuvo éxito
      if (breaker.failures > 0) {
        breaker.failures = 0;
        breaker.state = "closed";
      }

      return data as T;
    } catch (error: any) {
      lastError = error;

      // Si es AbortError, no reintentar
      if (error.name === "AbortError") {
        throw new TimeoutError(`Request timeout: ${url}`, timeout);
      }

      // Si estamos ahora offline, intentar caché
      if (!navigator.onLine && useCache) {
        const cached = await offlineDb.getCache<T>(url);
        if (cached) return cached;
        throw new NetworkError("Conexión perdida durante la petición", url);
      }

      // Actualizar circuit breaker
      breaker.failures += 1;
      breaker.lastFailure = Date.now();

      if (breaker.failures >= FAILURE_THRESHOLD) {
        breaker.state = "open";
      }

      // Si no es el último intento, esperar antes de reintentar
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await sleep(delay);
      }
    }
  }

  // Si estamos aquí, todos los reintentos fallaron
  // Agregar a cola offline si es método de escritura
  if (
    backgroundSync &&
    fetchOptions.method &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(fetchOptions.method.toUpperCase())
  ) {
    await offlineDb.addToQueue({
      url,
      method: fetchOptions.method.toUpperCase(),
      body: fetchOptions.body,
    });
  }

  throw lastError || new Error(`Unknown error fetching ${url}`);
}

/**
 * Fetch simplificado con caché (solo GET)
 */
export async function fetchCached<T = unknown>(
  url: string,
  cacheTime: number = 60
): Promise<T> {
  return fetchWithCache<T>(url, {
    method: "GET",
    cacheTime,
    useCache: true,
  });
}

/**
 * Sincroniza la cola de peticiones pendientes
 * Se llama cuando se restaura la conexión
 */
export async function syncOfflineQueue(
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  const queue = await offlineDb.getQueue();
  let success = 0;
  let failed = 0;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];

    // Máximo 3 reintentos
    if (item.retryCount >= 3) {
      await offlineDb.removeFromQueue(item.id);
      failed++;
      continue;
    }

    try {
      await fetchWithCache(item.url, {
        method: item.method,
        body: typeof item.body === "string" ? item.body : JSON.stringify(item.body),
        headers: { "Content-Type": "application/json" },
        retries: 2,
        useCache: false,
        backgroundSync: false,
      });

      await offlineDb.removeFromQueue(item.id);
      success++;
    } catch (error) {
      await offlineDb.incrementRetryCount(item.id);
      failed++;
    }

    onProgress?.(i + 1, queue.length);
  }

  return { success, failed };
}

/**
 * Obtiene el estado de todos los circuit breakers
 */
export function getCircuitBreakerState(): Map<string, CircuitBreakerState> {
  return new Map(circuitBreakers);
}

/**
 * Resetea manualmente todos los circuit breakers
 */
export function resetCircuitBreaker(): void {
  circuitBreakers.clear();
}

// ==================== Clases de Error ====================

export class NetworkError extends Error {
  constructor(
    message: string,
    public url: string
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends Error {
  constructor(
    message: string,
    public timeout: number
  ) {
    super(message);
    this.name = "TimeoutError";
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public url: string
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = "HttpError";
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircuitBreakerOpenError";
  }
}

// ==================== Helpers ====================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
