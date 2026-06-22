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
  promptGoogleLogin: () => void;
  escuelas: any[];
  escuelaSeleccionada: string;
  setEscuelaSeleccionada: (id: string) => void;
}

export default function LoginView({
  initialized, initSystem, loginForm, setLoginForm, handleLogin,
  loginError, loginLoading, googleLoading, promptGoogleLogin,
  escuelas, escuelaSeleccionada, setEscuelaSeleccionada,
}: LoginViewProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="min-h-screen flex flex-col relative bg-background overflow-hidden">
      <div className="absolute inset-0 page-atmosphere" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-primary/8 blur-3xl animate-blob" style={{ animationDelay: "-5s" }} />
        <div className="absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-emerald-500/8 blur-3xl animate-blob" style={{ animationDelay: "-9s" }} />
      </div>

      <main className="flex-1 flex flex-col lg:flex-row relative z-10">
        {/* Panel izquierdo: branding */}
        <motion.section
          className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col items-center justify-center p-10 xl:p-16 relative overflow-hidden"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary to-emerald-800/90" />
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center text-white max-w-md">
            <motion.div
              className="relative mb-6"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.2 }}
            >
              <div className="w-24 h-24 xl:w-28 xl:h-28 rounded-3xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-2xl flex items-center justify-center">
                {logoError ? <School className="h-12 w-12 text-white" /> : <img src="/logo-sistema.png" alt="Logo" className="h-16 w-16 xl:h-20 xl:w-20 object-contain" onError={() => setLogoError(true)} />}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white border-2 border-primary/80 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
            </motion.div>

            <motion.h1
              className="font-display text-3xl xl:text-4xl font-bold tracking-tight mb-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
            >
              Sistema de Calificaciones
            </motion.h1>
            <motion.p
              className="text-base xl:text-lg text-white/80 font-medium mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.5 }}
            >
              Precisión y Progreso
            </motion.p>

            <motion.div
              className="space-y-4 text-left w-full"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
            >
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-0.5">Gestión académica integral</h3>
                  <p className="text-sm text-white/75 leading-relaxed">Calificaciones, asistencia, boletas y reportes en una sola plataforma.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <School className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-0.5">Multi-escuela</h3>
                  <p className="text-sm text-white/75 leading-relaxed">Administración centralizada para centros educativos de El Salvador.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Panel derecho: formulario */}
        <section className="flex-1 flex flex-col items-center justify-start lg:justify-center px-4 sm:px-6 py-6 sm:py-10 overflow-y-auto">
          {/* Branding móvil */}
          <motion.div
            className="lg:hidden flex flex-col items-center mb-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center mb-3">
              {logoError ? <School className="h-8 w-8 text-primary-foreground" /> : <img src="/logo-sistema.png" alt="Logo" className="h-10 w-10 object-contain" onError={() => setLogoError(true)} />}
            </div>
            <h1 className="font-display text-lg font-bold text-foreground">Sistema de Calificaciones</h1>
            <p className="text-xs text-muted-foreground">Precisión y Progreso</p>
          </motion.div>

          <motion.div
            className="w-full max-w-xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {!initialized ? (
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
                  <School className="h-10 w-10 mx-auto mb-3 text-primary" />
                  <p className="text-sm text-muted-foreground mb-4">Inicializa el sistema para comenzar a gestionar calificaciones</p>
                  <Button onClick={initSystem} className="w-full h-12 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 press-feedback shine-on-hover">
                    Inicializar Sistema
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div className="bg-card border border-border rounded-2xl sm:rounded-3xl shadow-xl shadow-black/5 overflow-hidden">
                <div className="p-5 sm:p-8">
                  <div className="text-center mb-6">
                    <h2 className="font-display text-base sm:text-lg font-bold text-foreground mb-1">Bienvenido</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">Ingresa tus credenciales para continuar</p>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                    {/* Formulario de credenciales */}
                    <motion.form
                      onSubmit={handleLogin}
                      className="flex-1 space-y-3.5"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      <div className="space-y-1.5">
                        <Label className="text-[10px] sm:text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Seleccionar Escuela o Centro Escolar</Label>
                        <div className={`relative transition-all duration-200 ${focusedField === 'escuela' ? 'ring-2 ring-primary/20 rounded-xl' : ''}`}>
                          <Building2 className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors z-10 ${focusedField === 'escuela' ? 'text-primary' : 'text-muted-foreground/40'}`} aria-hidden="true" />
                          <Select value={escuelaSeleccionada} onValueChange={setEscuelaSeleccionada} required>
                            <SelectTrigger className="h-11 sm:h-12 pl-10 text-sm sm:text-base rounded-xl bg-card border-border focus:border-primary w-full">
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
                        <Label htmlFor="login-email" className="text-[10px] sm:text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Correo electrónico</Label>
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
                            className="h-11 sm:h-12 pl-10 text-sm sm:text-base rounded-xl bg-card border-border focus:border-primary"
                            onFocus={() => setFocusedField('email')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="login-password" className="text-[10px] sm:text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Contraseña</Label>
                        <div className={`relative transition-all duration-200 ${focusedField === 'password' ? 'ring-2 ring-primary/20 rounded-xl' : ''}`}>
                          <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focusedField === 'password' ? 'text-primary' : 'text-muted-foreground/40'}`} aria-hidden="true" />
                          <Input
                            id="login-password"
                            type="password"
                            autoComplete="current-password"
                            value={loginForm.password}
                            onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                            required
                            className="h-11 sm:h-12 pl-10 text-sm sm:text-base rounded-xl bg-card border-border focus:border-primary"
                            onFocus={() => setFocusedField('password')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </div>
                      </div>

                      {loginError && (
                        <motion.p
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`text-xs sm:text-sm text-center font-medium ${loginError.includes("no está registrada") ? "text-status-warning" : "text-status-error"}`}
                        >
                          {loginError}
                        </motion.p>
                      )}

                      <Button
                        type="submit"
                        className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-60 press-feedback shine-on-hover"
                        disabled={loginLoading || !escuelaSeleccionada}
                      >
                        {loginLoading ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            Ingresando…
                          </span>
                        ) : "Ingresar"}
                      </Button>
                    </motion.form>

                    {/* Separador */}
                    <div className="relative flex lg:flex-col items-center justify-center gap-3">
                      <div className="flex-1 h-px lg:h-auto lg:w-px bg-border" />
                      <span className="text-[10px] sm:text-xs text-muted-foreground/50 font-medium uppercase tracking-wider">o</span>
                      <div className="flex-1 h-px lg:h-auto lg:w-px bg-border" />
                    </div>

                    {/* Acceso con Google */}
                    <motion.div
                      className="flex-1 flex flex-col justify-center space-y-4"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                    >
                      <div className="text-center lg:text-left space-y-1">
                        <h3 className="font-display text-sm sm:text-base font-bold text-foreground">Acceso</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          Inicia sesión con tu cuenta institucional de El Salvador.
                        </p>
                      </div>

                      <motion.button
                        type="button"
                        onClick={promptGoogleLogin}
                        disabled={googleLoading}
                        whileHover={{ scale: 1.01, y: -1 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full h-12 sm:h-14 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm sm:text-base shadow-lg shadow-primary/25 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3 press-feedback shine-on-hover"
                      >
                        {googleLoading ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            Iniciando sesión…
                          </span>
                        ) : (
                          <>
                            <GoogleIcon className="h-5 w-5" />
                            <span>ENTRAR CON GOOGLE</span>
                          </>
                        )}
                      </motion.button>

                      <div className="flex items-center justify-center lg:justify-start gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="text-xs sm:text-sm font-medium text-foreground">@clases.edu.sv</span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Características */}
          <div className="w-full mt-6 sm:mt-8 lg:mt-10">
            <LoginFeatures />
          </div>

          {/* Footer */}
          <motion.footer
            className="w-full max-w-5xl mx-auto mt-6 sm:mt-8 px-4 py-5 border-t border-border/60 text-center space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <PrivacyPolicy />
              <span className="text-muted-foreground/30">|</span>
              <span className="text-xs sm:text-sm text-muted-foreground/60">
                Sistema de Gestión Educativa © {new Date().getFullYear()}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground/40 max-w-md mx-auto">
              Uso exclusivo para centros educativos oficiales de El Salvador.
            </p>
          </motion.footer>
        </section>
      </main>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#ffffff" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#ffffff" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#ffffff" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#ffffff" />
    </svg>
  );
}
