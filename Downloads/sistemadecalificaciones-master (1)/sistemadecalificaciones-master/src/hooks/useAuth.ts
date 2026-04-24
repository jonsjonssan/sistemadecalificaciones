import { useState, useCallback } from "react";
import { UsuarioSesion } from "@/types";

interface UseAuthReturn {
  usuario: UsuarioSesion | null;
  loading: boolean;
  loginLoading: boolean;
  loginError: string;
  loginForm: { email: string; password: string };
  setUsuario: (u: UsuarioSesion | null) => void;
  setLoginForm: (form: { email: string; password: string }) => void;
  setLoginError: (error: string) => void;
  setLoginLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
  handleLogin: (e: React.FormEvent) => Promise<boolean>;
  handleLogout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  const checkAuth = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch("/api/auth/me", {
        cache: "no-store",
        signal: controller.signal,
        credentials: "include",
      });
      const data = await res.json();
      setUsuario(data.usuario);
    } catch (err) {
      console.error("Auth check failed:", err);
      setUsuario(null);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  const handleLogin = useCallback(
    async (e: React.FormEvent): Promise<boolean> => {
      e.preventDefault();
      setLoginLoading(true);
      setLoginError("");

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(loginForm),
        });
        const data = await res.json();
        if (res.ok) {
          setLoginForm({ email: "", password: "" });
          await checkAuth();
          return true;
        } else {
          setLoginError(data.error || "Error");
          return false;
        }
      } catch {
        setLoginError("Error de conexión");
        return false;
      } finally {
        setLoginLoading(false);
      }
    },
    [loginForm, checkAuth]
  );

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUsuario(null);
  }, []);

  return {
    usuario,
    loading,
    loginLoading,
    loginError,
    loginForm,
    setUsuario,
    setLoginForm,
    setLoginError,
    setLoginLoading,
    checkAuth,
    handleLogin,
    handleLogout,
  };
}