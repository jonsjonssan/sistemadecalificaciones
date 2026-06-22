"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Lock, Mail, School, Building2 } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoginFeatures from "@/components/LoginFeatures";
import PrivacyPolicy from "@/components/PrivacyPolicy";

interface LoginViewProps {
  initialized: boolean;
  initSystem: () => Promise<void>;
  loginForm: { email: string; password: string };
  setLoginForm: (f: { email: string; password: string }) => void;
  handleLogin: (e: React.FormEvent) => Promise<void>;
  loginError: string;
  loginLoading: boolean;
  googleLoading: boolean;
  googleButtonRef: React.RefObject<HTMLDivElement | null>;
  promptGoogleLogin: () => void;
  escuelas: any[];
  escuelaSeleccionada: string;
  setEscuelaSeleccionada: (id: string) => void;
}

export default function LoginView({
  initialized, initSystem, loginForm, setLoginForm, handleLogin,
  loginError, loginLoading, googleLoading, googleButtonRef, promptGoogleLogin,
  escuelas, escuelaSeleccionada, setEscuelaSeleccionada,
}: LoginViewProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center relative bg-background overflow-y-auto">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />

      <motion.div
        className="flex-1 flex flex-col items-center justify-center w-full max-w-md px-5 py-10 relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <motion.div
          className="flex flex-col items-center mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center mb-4">
            {logoError ? <School className="h-8 w-8 text-primary-foreground" /> : <img src="/logo-sistema.png" alt="Logo" className="h-10 w-10 object-contain" onError={() => setLogoError(true)} />}
          </div>
          <h1 className="font-display text-xl font-bold text-foreground tracking-tight">Sistema de Calificaciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Precisión y Progreso</p>
        </motion.div>

        {!initialized ? (
          <motion.div
            className="w-full text-center p-6 rounded-2xl bg-card border border-border shadow-sm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <School className="h-10 w-10 mx-auto mb-3 text-primary" />
            <p className="text-sm text-muted-foreground mb-4">Inicializa el sistema para comenzar a gestionar calificaciones</p>
            <Button onClick={initSystem} className="w-full h-11 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              Inicializar Sistema
            </Button>
          </motion.div>
        ) : (
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/[0.04] p-6 sm:p-8">
              <div className="text-center mb-6">
                <h2 className="font-display text-base font-bold text-foreground">Bienvenido</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Ingresa tus credenciales para continuar</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">Escuela o Centro Escolar</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 z-10" aria-hidden="true" />
                    <Select value={escuelaSeleccionada} onValueChange={setEscuelaSeleccionada} required>
                      <SelectTrigger className="h-11 pl-10 text-sm rounded-xl bg-card border-border focus:border-primary w-full">
                        <SelectValue placeholder="Selecciona una escuela..." />
                      </SelectTrigger>
                      <SelectContent>
                        {escuelas.map((escuela: any) => (
                          <SelectItem key={escuela.id} value={escuela.id}>
                            {escuela.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="login-email" className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">Correo electrónico</Label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focusedField === 'email' ? 'text-primary' : 'text-muted-foreground/40'}`} aria-hidden="true" />
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={loginForm.email}
                      onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                      placeholder="correo@ejemplo.edu"
                      required
                      className="h-11 pl-10 text-sm rounded-xl bg-card border-border focus:border-primary"
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="login-password" className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">Contraseña</Label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focusedField === 'password' ? 'text-primary' : 'text-muted-foreground/40'}`} aria-hidden="true" />
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      value={loginForm.password}
                      onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      className="h-11 pl-10 text-sm rounded-xl bg-card border-border focus:border-primary"
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                </div>

                {loginError && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`text-xs text-center font-medium ${loginError.includes("no está registrada") ? "text-status-warning" : "text-status-error"}`}
                  >
                    {loginError}
                  </motion.p>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-60"
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Ingresando…
                    </span>
                  ) : "Ingresar"}
                </Button>
              </form>

              {/* Separador */}
              <div className="relative flex items-center justify-center my-6">
                <div className="flex-1 h-px bg-border" />
                <span className="px-3 text-[10px] text-muted-foreground/50 font-medium uppercase tracking-wider">o</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Acceso institucional con Google */}
              <div className="p-4 rounded-xl bg-primary/[0.04] border border-primary/10 space-y-3">
                <div className="text-center space-y-0.5">
                  <h3 className="font-display text-sm font-bold text-foreground">Acceso institucional</h3>
                  <p className="text-[11px] text-muted-foreground">Usa tu cuenta oficial de El Salvador</p>
                </div>

                <div ref={googleButtonRef} id="google-button-container" className="flex justify-center min-h-[40px]" />

                {googleLoading && (
                  <p className="text-xs text-center text-muted-foreground/70">
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Iniciando sesión con Google...
                    </span>
                  </p>
                )}

                <div className="flex items-center justify-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-medium text-foreground">@clases.edu.sv</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Características */}
        <div className="w-full mt-8">
          <LoginFeatures />
        </div>

        {/* Footer */}
        <motion.footer
          className="w-full mt-8 pt-5 border-t border-border/60 text-center space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <PrivacyPolicy />
            <span className="text-muted-foreground/30">|</span>
            <span className="text-xs text-muted-foreground/60">
              Sistema de Gestión Educativa © {new Date().getFullYear()}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/40">Uso exclusivo para centros educativos oficiales de El Salvador.</p>
        </motion.footer>
      </motion.div>
    </div>
  );
}
