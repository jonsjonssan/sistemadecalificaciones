import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "sistema-calificaciones-db";
const DB_VERSION = 1;

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  expiry: number;
  key: string;
}

export interface OfflineQueueItem {
  id: string;
  url: string;
  method: string;
  body?: unknown;
  timestamp: number;
  retryCount: number;
}

/**
 * Clase para manejar la base de datos IndexedDB
 * Proporciona caché offline y cola de sincronización
 */
class OfflineDatabase {
  private db: IDBPDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Inicializa la conexión a IndexedDB
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        this.db = await openDB(DB_NAME, DB_VERSION, {
          upgrade(db, oldVersion, newVersion) {
            // Store para caché de datos
            if (!db.objectStoreNames.contains("cache")) {
              db.createObjectStore("cache", { keyPath: "key" });
            }

            // Store para cola de peticiones pendientes
            if (!db.objectStoreNames.contains("offlineQueue")) {
              const queueStore = db.createObjectStore("offlineQueue", {
                keyPath: "id",
              });
              queueStore.createIndex("timestamp", "timestamp");
            }

            // Store para datos de estudiantes (uso frecuente)
            if (!db.objectStoreNames.contains("estudiantes")) {
              const estudiantesStore = db.createObjectStore("estudiantes", {
                keyPath: "id",
              });
              estudiantesStore.createIndex("grado", "grado");
              estudiantesStore.createIndex("lastUpdated", "lastUpdated");
            }

            // Store para calificaciones
            if (!db.objectStoreNames.contains("calificaciones")) {
              const calificacionesStore = db.createObjectStore("calificaciones", {
                keyPath: "id",
              });
              calificacionesStore.createIndex("estudianteId", "estudianteId");
              calificacionesStore.createIndex("materia", "materia");
              calificacionesStore.createIndex("trimestre", "trimestre");
              calificacionesStore.createIndex("lastUpdated", "lastUpdated");
            }

            // Store para configuraciones
            if (!db.objectStoreNames.contains("configuraciones")) {
              db.createObjectStore("configuraciones", { keyPath: "key" });
            }
          },
        });

        this.isInitialized = true;
      } catch (error) {
        console.error("Error initializing IndexedDB:", error);
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Guarda datos en la caché con tiempo de expiración
   */
  async setCache<T>(
    key: string,
    data: T,
    expiryMinutes: number = 60
  ): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + expiryMinutes * 60 * 1000,
      key,
    };

    try {
      await this.db.put("cache", entry);
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  }

  /**
   * Obtiene datos de la caché si no han expirado
   */
  async getCache<T>(key: string): Promise<T | null> {
    if (!this.db) await this.init();
    if (!this.db) return null;

    try {
      const entry = await this.db.get("cache", key);

      if (!entry) return null;

      // Verificar si expiró
      if (Date.now() > entry.expiry) {
        await this.db.delete("cache", key);
        return null;
      }

      return entry.data as T;
    } catch (error) {
      console.error("Error reading from cache:", error);
      return null;
    }
  }

  /**
   * Elimina una entrada específica de la caché
   */
  async removeCache(key: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    try {
      await this.db.delete("cache", key);
    } catch (error) {
      console.error("Error removing from cache:", error);
    }
  }

  /**
   * Limpia toda la caché expirada
   */
  async clearExpiredCache(): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    try {
      const tx = this.db.transaction("cache", "readwrite");
      const store = tx.objectStore("cache");
      const allEntries = await store.getAll();

      const now = Date.now();
      for (const entry of allEntries) {
        if (now > entry.expiry) {
          await store.delete(entry.key);
        }
      }

      await tx.done;
    } catch (error) {
      console.error("Error clearing expired cache:", error);
    }
  }

  /**
   * Agrega una petición a la cola offline para sincronizar después
   */
  async addToQueue(item: Omit<OfflineQueueItem, "id" | "timestamp" | "retryCount">): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const queueItem: OfflineQueueItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    try {
      await this.db.add("offlineQueue", queueItem);
    } catch (error) {
      console.error("Error adding to offline queue:", error);
    }
  }

  /**
   * Obtiene todas las peticiones pendientes de la cola
   */
  async getQueue(): Promise<OfflineQueueItem[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    try {
      const items = await this.db.getAll("offlineQueue");
      return items.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error("Error reading offline queue:", error);
      return [];
    }
  }

  /**
   * Elimina una petición de la cola después de sincronizar
   */
  async removeFromQueue(id: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    try {
      await this.db.delete("offlineQueue", id);
    } catch (error) {
      console.error("Error removing from queue:", error);
    }
  }

  /**
   * Incrementa el contador de reintentos de una petición
   */
  async incrementRetryCount(id: string): Promise<number> {
    if (!this.db) await this.init();
    if (!this.db) return 0;

    try {
      const item = await this.db.get("offlineQueue", id);
      if (!item) return 0;

      item.retryCount += 1;
      await this.db.put("offlineQueue", item);
      return item.retryCount;
    } catch (error) {
      console.error("Error incrementing retry count:", error);
      return 0;
    }
  }

  /**
   * Guarda estudiantes en IndexedDB
   */
  async saveEstudiante(estudiante: any): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    try {
      const data = {
        ...estudiante,
        lastUpdated: Date.now(),
      };
      await this.db.put("estudiantes", data);
    } catch (error) {
      console.error("Error saving estudiante:", error);
    }
  }

  /**
   * Obtiene todos los estudiantes almacenados
   */
  async getAllEstudiantes(): Promise<any[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    try {
      return await this.db.getAll("estudiantes");
    } catch (error) {
      console.error("Error getting estudiantes:", error);
      return [];
    }
  }

  /**
   * Guarda calificaciones en IndexedDB
   */
  async saveCalificacion(calificacion: any): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    try {
      const data = {
        ...calificacion,
        id: calificacion.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        lastUpdated: Date.now(),
      };
      await this.db.put("calificaciones", data);
    } catch (error) {
      console.error("Error saving calificacion:", error);
    }
  }

  /**
   * Obtiene todas las calificaciones almacenadas
   */
  async getAllCalificaciones(): Promise<any[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    try {
      return await this.db.getAll("calificaciones");
    } catch (error) {
      console.error("Error getting calificaciones:", error);
      return [];
    }
  }

  /**
   * Guarda configuración
   */
  async setConfig(key: string, value: any): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    try {
      await this.db.put("configuraciones", { key, value, lastUpdated: Date.now() });
    } catch (error) {
      console.error("Error saving config:", error);
    }
  }

  /**
   * Obtiene configuración
   */
  async getConfig<T>(key: string): Promise<T | null> {
    if (!this.db) await this.init();
    if (!this.db) return null;

    try {
      const entry = await this.db.get("configuraciones", key);
      return entry?.value || null;
    } catch (error) {
      console.error("Error getting config:", error);
      return null;
    }
  }

  /**
   * Limpia toda la base de datos
   */
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    try {
      const stores = ["cache", "offlineQueue", "estudiantes", "calificaciones", "configuraciones"];
      for (const store of stores) {
        if (this.db.objectStoreNames.contains(store)) {
          await this.db.clear(store);
        }
      }
    } catch (error) {
      console.error("Error clearing all:", error);
    }
  }

  /**
   * Obtiene el tamaño aproximado de la base de datos
   */
  async getStorageSize(): Promise<number> {
    if (typeof window !== "undefined" && navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  }
}

// Singleton instance
export const offlineDb = new OfflineDatabase();

// Auto-inicializar
if (typeof window !== "undefined") {
  offlineDb.init().catch(console.error);
}
