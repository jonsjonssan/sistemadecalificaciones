import { useEffect, useCallback } from "react";
import { UsuarioSesion } from "@/types";

interface UsePersistenceReturn {
  saveUserState: (state: {
    gradoSeleccionado?: string;
    asignaturaSeleccionada?: string;
    trimestreSeleccionado?: string;
    activeTab?: string;
  }) => void;
  loadUserState: () => {
    gradoSeleccionado?: string;
    asignaturaSeleccionada?: string;
    trimestreSeleccionado?: string;
    activeTab?: string;
  } | null;
}

export function usePersistence(usuario: UsuarioSesion | null): UsePersistenceReturn {
  const getStorageKey = () => (usuario ? `sis_state_${usuario.id}` : null);

  const saveUserState = useCallback(
    (state: {
      gradoSeleccionado?: string;
      asignaturaSeleccionada?: string;
      trimestreSeleccionado?: string;
      activeTab?: string;
    }) => {
      const key = getStorageKey();
      if (!key) return;
      try {
        const existing = localStorage.getItem(key);
        const currentState = existing ? JSON.parse(existing) : {};
        const newState = {
          ...currentState,
          ...state,
          lastSaved: new Date().toISOString(),
        };
        localStorage.setItem(key, JSON.stringify(newState));
      } catch (e) {
        console.error("Error saving user state:", e);
      }
    },
    [usuario]
  );

  const loadUserState = useCallback(() => {
    const key = getStorageKey();
    if (!key) return null;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [usuario]);

  return {
    saveUserState,
    loadUserState,
  };
}