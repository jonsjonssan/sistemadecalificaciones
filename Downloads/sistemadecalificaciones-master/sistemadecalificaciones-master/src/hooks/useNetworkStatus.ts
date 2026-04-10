import { useState, useEffect, useCallback } from "react";

interface NetworkStatus {
  isOnline: boolean;
  lastChecked: Date;
  connectionType?: string;
}

/**
 * Hook para detectar el estado de conexión en tiempo real
 * Detecta cambios entre online/offline y tipo de conexión
 */
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    lastChecked: new Date(),
    connectionType: undefined,
  });

  const handleOnline = useCallback(() => {
    setNetworkStatus({
      isOnline: true,
      lastChecked: new Date(),
      connectionType: getConnectionType(),
    });
  }, []);

  const handleOffline = useCallback(() => {
    setNetworkStatus({
      isOnline: false,
      lastChecked: new Date(),
      connectionType: undefined,
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Event listeners para cambios de conexión
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Detectar tipo de conexión si está disponible
    const connectionType = getConnectionType();

    setNetworkStatus((prev) => ({
      ...prev,
      connectionType,
    }));

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return networkStatus;
}

/**
 * Obtiene el tipo de conexión desde Network Information API
 */
function getConnectionType(): string | undefined {
  if (typeof navigator === "undefined") return undefined;

  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      type?: string;
    };
  };

  if (nav.connection) {
    return nav.connection.effectiveType || nav.connection.type || undefined;
  }

  return undefined;
}

/**
 * Hook simplificado que solo retorna boolean
 */
export function useIsOnline(): boolean {
  const { isOnline } = useNetworkStatus();
  return isOnline;
}
