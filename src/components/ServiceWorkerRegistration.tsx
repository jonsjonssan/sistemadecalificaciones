"use client";

import { useEffect, useState } from "react";

/**
 * Componente para registrar el Service Worker
 * Se monta una sola vez en la app
 */
export function ServiceWorkerRegistration() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Registrar Service Worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        console.log("[App] Service Worker registered:", registration.scope);
        setIsRegistered(true);

        // Escuchar actualizaciones
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });

        // Escuchar mensajes del SW
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data.type === "UPDATE_AVAILABLE") {
            setUpdateAvailable(true);
          }
        });
      } catch (error) {
        console.error("[App] Service Worker registration failed:", error);
      }
    };

    registerSW();

    // Cleanup
    return () => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "CLEANUP",
        });
      }
    };
  }, []);

  const handleUpdate = () => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SKIP_WAITING",
      });
      window.location.reload();
    }
  };

  if (updateAvailable) {
    return (
      <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-teal-600 px-4 py-3 text-white shadow-lg">
        <p className="text-sm font-medium">Nueva versión disponible</p>
        <button
          onClick={handleUpdate}
          className="mt-2 rounded-md bg-white px-3 py-1 text-xs font-medium text-teal-600 hover:bg-teal-50 transition-colors"
        >
          Actualizar ahora
        </button>
      </div>
    );
  }

  return null;
}
