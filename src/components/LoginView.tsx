"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, BookOpen, Lock, Mail, School } from "lucide-react";
import { useState } from "react";

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
}



export default function LoginView({
  initialized, initSystem, loginForm, setLoginForm, handleLogin,
  loginError, loginLoading, googleLoading, googleButtonRef,
}: LoginViewProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="min-h-screen flex flex-col safe-area-bottom relative bg-background">
      <div className="absolute inset-0 page-atmosphere" />

      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-6 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="w-full max-w-sm mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-2xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center">
                {logoError ? <School className="h-10 w-10 text-primary-foreground" /> : <img src="/0.png" alt="Logo" className="h-12 w-12 object-contain" onError={() => setLogoError(true)} />}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-400 border-2 border-background flex items-center justify-center">
                <GraduationCap className="h-3 w-3 text-white" />
              </div>
            </div>
            <h1 className="font-display text-xl text-foreground font-bold tracking-tight">Sistema de Calificaciones</h1>
            <p className="text-sm text-muted-foreground/70 mt-1 text-center leading-relaxed">
              Centro Escolar Católico<br />San José de la Montaña
            </p>
          </div>

          {!initialized ? (
            <motion.div
              className="space-y-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
                <BookOpen className="h-10 w-10 mx-auto mb-3 text-primary" />
                <p className="text-sm text-muted-foreground mb-4">Inicializa el sistema para comenzar a gestionar calificaciones</p>
                <Button onClick={initSystem} className="w-full h-12 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                  Inicializar Sistema
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.form
              onSubmit={handleLogin}
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Correo electrónico</Label>
                <div className={`relative transition-all duration-200 ${focusedField === 'email' ? 'ring-2 ring-primary/20 rounded-xl' : ''}`}>
                  <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focusedField === 'email' ? 'text-primary' : 'text-muted-foreground/40'}`} aria-hidden="true" />
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={loginForm.email}
                    onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                    placeholder="correo@ejemplo.edu"
                    required
                    className="h-12 pl-10 text-base rounded-xl bg-card border-border focus:border-primary"
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login-password" className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Contraseña</Label>
                <div className={`relative transition-all duration-200 ${focusedField === 'password' ? 'ring-2 ring-primary/20 rounded-xl' : ''}`}>
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focusedField === 'password' ? 'text-primary' : 'text-muted-foreground/40'}`} aria-hidden="true" />
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                    className="h-12 pl-10 text-base rounded-xl bg-card border-border focus:border-primary"
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
              </div>

              {loginError && (
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-sm text-center font-medium ${loginError.includes("no está registrada") ? "text-amber-600" : "text-red-500"}`}
                >
                  {loginError}
                </motion.p>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-60"
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Ingresando…
                  </span>
                ) : "Ingresar"}
              </Button>

              <div className="relative flex items-center justify-center py-1">
                <div className="flex-1 h-px bg-border" />
                <span className="px-3 text-xs text-muted-foreground/50 font-medium">o continúa con</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div ref={googleButtonRef} id="google-button-container" className="flex justify-center min-h-[40px]" />
              {googleLoading && (
                <p className="text-sm text-center text-muted-foreground/60">
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Iniciando sesión con Google...
                  </span>
                </p>
              )}
            </motion.form>
          )}
        </motion.div>

        <motion.p
          className="text-xs text-muted-foreground/40 mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          Sistema de Gestión Educativa © {new Date().getFullYear()}
        </motion.p>
      </motion.div>
    </div>
  );
}
