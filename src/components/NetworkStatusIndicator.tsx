"use client";

import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useState, useEffect } from "react";
import { syncOfflineQueue } from "@/lib/resilient-fetch";

/**
 * Indicador visual del estado de conexión
 * Se muestra solo cuando está offline o cuando cambia el estado
 */
export function NetworkStatusIndicator() {
  const { isOnline, connectionType } = useNetworkStatus();
  const [showNotification, setShowNotification] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [prevStatus, setPrevStatus] = useState(isOnline);

  // Mostrar notificación temporal cuando cambia el estado
  useEffect(() => {
    if (isOnline !== prevStatus) {
      setShowNotification(true);
      setPrevStatus(isOnline);

      // Auto-ocultar después de 3 segundos
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 3000);

      // Si volvió online, intentar sincronizar
      if (isOnline) {
        handleSync();
      }

      return () => clearTimeout(timer);
    }
  }, [isOnline, prevStatus]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncOfflineQueue((completed, total) => {
        console.log(`[Sync] Sincronizando: ${completed}/${total}`);
      });
      console.log(`[Sync] Completado: ${result.success} exitosos, ${result.failed} fallidos`);
    } catch (error) {
      console.error("[Sync] Error sincronizando:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // No mostrar nada si está online y no hay notificación pendiente
  if (isOnline && !showNotification) {
    return null;
  }

  return (
    <>
      {/* Barra superior cuando está offline */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-500 to-orange-500 text-white">
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium">
            <WifiOff className="h-4 w-4" />
            <span>Estás sin conexión. Algunos datos pueden estar disponibles desde caché.</span>
            {isSyncing && (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            )}
          </div>
        </div>
      )}

      {/* Notificación temporal de cambio de estado */}
      {showNotification && (
        <div
          className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all animate-in fade-in slide-in-from-bottom-4 ${
            isOnline
              ? "bg-gradient-to-r from-teal-500 to-green-500 text-white"
              : "bg-gradient-to-r from-red-500 to-orange-500 text-white"
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4" />
              <span>
                ¡Conexión restaurada!
                {connectionType && ` (${connectionType})`}
              </span>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="ml-2 rounded-md bg-white/20 px-2 py-1 hover:bg-white/30 disabled:opacity-50"
              >
                {isSyncing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Sincronizar"
                )}
              </button>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <span>Sin conexión. Usando caché local.</span>
            </>
          )}
        </div>
      )}

      {/* Indicador discreto en esquina (siempre visible en dev) */}
      {process.env.NODE_ENV === "development" && (
        <div
          className={`fixed bottom-2 right-2 z-40 flex items-center gap-1 rounded-full px-2 py-1 text-xs opacity-60 hover:opacity-100 transition-opacity ${
            isOnline
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
          title={isOnline ? "Online" : "Offline"}
        >
          {isOnline ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
        </div>
      )}
    </>
  );
}
