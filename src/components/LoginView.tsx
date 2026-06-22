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
    <div className="min-h-screen flex flex-col items-center relative bg-[#f8f7f4] overflow-y-auto">
      {/* Fondo atmosférico */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-emerald-300/10 blur-[100px]" />
      </div>

      <motion.div
        className="flex-1 flex flex-col items-center justify-center w-full max-w-md lg:max-w-2xl px-5 py-10 relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <motion.div
          className="flex flex-col items-center mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <motion.div
            className="w-20 h-20 rounded-[22px] bg-primary shadow-xl shadow-primary/20 flex items-center justify-center mb-5"
            initial={{ scale: 0.8, rotate: -6 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          >
            {logoError ? <School className="h-10 w-10 text-primary-foreground" /> : <img src="/logo-sistema.png" alt="Logo" className="h-12 w-12 object-contain" onError={() => setLogoError(true)} />}
          </motion.div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1a2e1a] tracking-tight text-center">Sistema de Calificaciones</h1>
          <p className="text-sm text-[#5a6b5a] mt-1 font-medium tracking-wide uppercase text-[10px]">Precisión y Progreso</p>
        </motion.div>

        {!initialized ? (
          <motion.div
            className="w-full text-center p-8 rounded-3xl bg-white border border-[#e8e6e0] shadow-xl shadow-black/[0.03]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <School className="h-12 w-12 mx-auto mb-4 text-primary" />
            <p className="text-[#5a6b5a] mb-5">Inicializa el sistema para comenzar a gestionar calificaciones</p>
            <Button onClick={initSystem} className="w-full h-12 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              Inicializar Sistema
            </Button>
          </motion.div>
        ) : (
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-white border border-[#e8e6e0] rounded-[28px] shadow-2xl shadow-black/[0.05] p-7 sm:p-10">
              <div className="text-center mb-8">
                <h2 className="font-display text-xl font-bold text-[#1a2e1a] mb-1">Bienvenido</h2>
                <p className="text-sm text-[#7a8a7a]">Ingresa tus credenciales institucionales</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-[#5a6b5a] uppercase tracking-wider">Escuela o Centro Escolar</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9aaa9a] z-10" aria-hidden="true" />
                    <Select value={escuelaSeleccionada} onValueChange={setEscuelaSeleccionada} required>
                      <SelectTrigger className="h-12 pl-11 text-sm rounded-xl bg-[#fafaf8] border-[#e0ddd6] focus:border-primary focus:ring-primary w-full">
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

                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-[11px] font-bold text-[#5a6b5a] uppercase tracking-wider">Correo electrónico</Label>
                  <div className="relative">
                    <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focusedField === 'email' ? 'text-primary' : 'text-[#9aaa9a]'}`} aria-hidden="true" />
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={loginForm.email}
                      onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                      placeholder="correo@ejemplo.edu"
                      required
                      className="h-12 pl-11 text-sm rounded-xl bg-[#fafaf8] border-[#e0ddd6] focus:border-primary focus:ring-primary"
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-[11px] font-bold text-[#5a6b5a] uppercase tracking-wider">Contraseña</Label>
                  <div className="relative">
                    <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focusedField === 'password' ? 'text-primary' : 'text-[#9aaa9a]'}`} aria-hidden="true" />
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      value={loginForm.password}
                      onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      className="h-12 pl-11 text-sm rounded-xl bg-[#fafaf8] border-[#e0ddd6] focus:border-primary focus:ring-primary"
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
                  className="w-full h-12 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-60"
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
              <div className="relative flex items-center justify-center my-7">
                <div className="flex-1 h-px bg-[#e8e6e0]" />
                <span className="px-4 text-[11px] text-[#9aaa9a] font-semibold uppercase tracking-wider">o</span>
                <div className="flex-1 h-px bg-[#e8e6e0]" />
              </div>

              {/* Acceso institucional con Google */}
              <div className="p-5 rounded-2xl bg-[#f4f6f4] border border-[#e0e6e0] space-y-3">
                <div className="text-center space-y-0.5">
                  <h3 className="font-display text-sm font-bold text-[#1a2e1a]">Acceso institucional</h3>
                  <p className="text-[11px] text-[#7a8a7a]">Usa tu cuenta oficial de El Salvador</p>
                </div>

                <div ref={googleButtonRef} id="google-button-container" className="flex justify-center min-h-[44px]" />

                {googleLoading && (
                  <p className="text-xs text-center text-[#7a8a7a]">
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
                  <span className="text-xs font-semibold text-[#1a2e1a]">@clases.edu.sv</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Características */}
        <div className="w-full mt-10">
          <LoginFeatures />
        </div>

        {/* Footer */}
        <motion.footer
          className="w-full mt-10 pt-6 border-t border-[#e8e6e0] text-center space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <PrivacyPolicy />
            <span className="text-[#c8c6c0]">|</span>
            <span className="text-xs text-[#9aaa9a]">
              Sistema de Gestión Educativa © {new Date().getFullYear()}
            </span>
          </div>
          <p className="text-[10px] text-[#b8b8b0]">Uso exclusivo para centros educativos oficiales de El Salvador.</p>
        </motion.footer>
      </motion.div>
    </div>
  );
}
