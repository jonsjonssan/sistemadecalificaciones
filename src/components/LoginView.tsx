"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Lock,
  Mail,
  School,
  Building2,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Network,
  Check,
} from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function LogoEscuela() {
  return (
    <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center">
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-9 h-9 sm:w-10 sm:h-10"
      >
        <path
          d="M24 6L6 18H10V38H18V26H30V38H38V18H42L24 6Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary-foreground"
        />
        <path
          d="M17 38V30H22V38"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary-foreground"
        />
        <path
          d="M26 38V30H31V38"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary-foreground"
        />
        <rect x="20" y="16" width="8" height="5" rx="1" fill="white" />
        <rect x="20" y="16" width="2.67" height="5" fill="#0047AB" />
        <rect x="25.33" y="16" width="2.67" height="5" fill="#0047AB" />
        <circle cx="24" cy="18.5" r="1" fill="#0047AB" />
      </svg>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

const infoFeatures = [
  {
    icon: ShieldCheck,
    title: "Gestión segura",
    description: "Protegemos tus datos con los más altos estándares.",
  },
  {
    icon: TrendingUp,
    title: "Información confiable",
    description: "Datos precisos para decisiones acertadas.",
  },
  {
    icon: Network,
    title: "Acceso centralizado",
    description: "Todo lo que necesitas en un solo lugar.",
  },
];

export default function LoginView({
  initialized,
  initSystem,
  loginForm,
  setLoginForm,
  handleLogin,
  loginError,
  loginLoading,
  googleLoading,
  googleButtonRef,
  promptGoogleLogin,
  escuelas,
  escuelaSeleccionada,
  setEscuelaSeleccionada,
}: LoginViewProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
      <div className="flex-1 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-[32px] sm:rounded-[40px] shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px] lg:min-h-[640px]">
              {/* Panel izquierdo */}
              <div className="relative flex flex-col justify-center p-8 sm:p-12 lg:p-14 bg-[#fafcfb]">
                {/* Patrón decorativo */}
                <div className="absolute top-6 right-6 opacity-[0.12]">
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                    {Array.from({ length: 6 }).map((_, row) =>
                      Array.from({ length: 6 }).map((_, col) => (
                        <circle
                          key={`${row}-${col}`}
                          cx={8 + col * 12}
                          cy={8 + row * 12}
                          r="2"
                          fill="currentColor"
                          className="text-primary"
                        />
                      ))
                    )}
                  </svg>
                </div>

                <div className="relative z-10 max-w-md">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="mb-8"
                  >
                    <LogoEscuela />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold leading-tight text-[#1a2e1a] mb-1">
                      Sistema de
                    </h1>
                    <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold leading-tight text-primary mb-4">
                      Calificaciones
                    </h1>
                    <p className="text-[11px] sm:text-xs font-bold tracking-[0.18em] text-[#5a6b5a] uppercase mb-4">
                      Precisión y Progreso
                    </p>
                    <div className="w-12 h-1 bg-primary rounded-full mb-6" />
                    <p className="text-sm sm:text-base text-[#5a6b5a] leading-relaxed mb-10 max-w-sm">
                      Plataforma integral para la gestión académica que impulsa el rendimiento y el éxito institucional.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="space-y-5"
                  >
                    {infoFeatures.map((feature) => {
                      const Icon = feature.icon;
                      return (
                        <div key={feature.title} className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-display text-sm font-bold text-[#1a2e1a] mb-0.5">
                              {feature.title}
                            </h3>
                            <p className="text-sm text-[#6b7280] leading-relaxed">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                </div>

                {/* Candado decorativo en el divisor */}
                <div className="hidden lg:flex absolute top-1/2 -right-6 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white border border-[#e8e6e0] shadow-md items-center justify-center">
                  <Lock className="h-5 w-5 text-[#9aaa9a]" />
                </div>
              </div>

              {/* Panel derecho */}
              <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-14 relative">
                <div className="max-w-md mx-auto w-full">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mb-8"
                  >
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1a2e1a] mb-2">
                      Acceso institucional
                    </h2>
                    <p className="text-sm text-[#6b7280]">
                      Usa tu cuenta oficial de El Salvador
                    </p>
                  </motion.div>

                  {!initialized ? (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="text-center p-8 rounded-3xl bg-[#fafcfb] border border-[#e8e6e0]"
                    >
                      <School className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <p className="text-[#5a6b5a] mb-5">
                        Inicializa el sistema para comenzar a gestionar calificaciones
                      </p>
                      <Button
                        onClick={initSystem}
                        className="w-full h-12 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                      >
                        Inicializar Sistema
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-[#4a5a4a]">
                            Escuela o Centro Escolar
                          </Label>
                          <div className="relative">
                            <Building2
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9aaa9a] z-10"
                              aria-hidden="true"
                            />
                            <Select
                              value={escuelaSeleccionada}
                              onValueChange={setEscuelaSeleccionada}
                            >
                              <SelectTrigger className="h-12 pl-11 text-sm rounded-xl bg-white border-[#e0ddd6] focus:border-primary focus:ring-primary w-full">
                                <SelectValue placeholder="Selecciona tu escuela o centro escolar" />
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
                          <Label
                            htmlFor="login-email"
                            className="text-xs font-semibold text-[#4a5a4a]"
                          >
                            Correo electrónico institucional
                          </Label>
                          <div className="relative">
                            <Mail
                              className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                                focusedField === "email" ? "text-primary" : "text-[#9aaa9a]"
                              }`}
                              aria-hidden="true"
                            />
                            <Input
                              id="login-email"
                              type="email"
                              autoComplete="email"
                              value={loginForm.email}
                              onChange={(e) =>
                                setLoginForm({ ...loginForm, email: e.target.value })
                              }
                              placeholder="correo@ejemplo.edu"
                              required
                              className="h-12 pl-11 text-sm rounded-xl bg-white border-[#e0ddd6] focus:border-primary focus:ring-primary"
                              onFocus={() => setFocusedField("email")}
                              onBlur={() => setFocusedField(null)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label
                            htmlFor="login-password"
                            className="text-xs font-semibold text-[#4a5a4a]"
                          >
                            Contraseña
                          </Label>
                          <div className="relative">
                            <Lock
                              className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                                focusedField === "password" ? "text-primary" : "text-[#9aaa9a]"
                              }`}
                              aria-hidden="true"
                            />
                            <Input
                              id="login-password"
                              type={showPassword ? "text" : "password"}
                              autoComplete="current-password"
                              value={loginForm.password}
                              onChange={(e) =>
                                setLoginForm({ ...loginForm, password: e.target.value })
                              }
                              required
                              className="h-12 pl-11 pr-11 text-sm rounded-xl bg-white border-[#e0ddd6] focus:border-primary focus:ring-primary"
                              onFocus={() => setFocusedField("password")}
                              onBlur={() => setFocusedField(null)}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9aaa9a] hover:text-[#6b7280] transition-colors"
                              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            ¿Olvidaste tu contraseña?
                          </button>
                        </div>

                        {loginError && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`text-xs text-center font-medium ${
                              loginError.includes("no está registrada")
                                ? "text-status-warning"
                                : "text-status-error"
                            }`}
                          >
                            {loginError}
                          </motion.p>
                        )}

                        <Button
                          type="submit"
                          className="w-full h-12 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-60 group"
                          disabled={loginLoading}
                        >
                          {loginLoading ? (
                            <span className="flex items-center gap-2">
                              <svg
                                className="animate-spin h-4 w-4"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  fill="none"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                              </svg>
                              Ingresando…
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              Ingresar al sistema
                              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </span>
                          )}
                        </Button>
                      </form>

                      {/* Separador */}
                      <div className="relative flex items-center justify-center my-6">
                        <div className="flex-1 h-px bg-[#e8e6e0]" />
                        <span className="px-4 text-xs text-[#9aaa9a]">o continúa con</span>
                        <div className="flex-1 h-px bg-[#e8e6e0]" />
                      </div>

                      {/* Google login */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={promptGoogleLogin}
                          disabled={googleLoading}
                          className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-[#e0ddd6] bg-white hover:bg-[#fafcfb] transition-colors disabled:opacity-60"
                        >
                          {googleLoading ? (
                            <span className="flex items-center gap-2 text-sm text-[#5a6b5a]">
                              <svg
                                className="animate-spin h-4 w-4"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  fill="none"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                              </svg>
                              Iniciando sesión…
                            </span>
                          ) : (
                            <>
                              <GoogleIcon className="h-5 w-5" />
                              <span className="text-sm font-medium text-[#1a2e1a]">
                                Iniciar sesión con Google
                              </span>
                            </>
                          )}
                        </button>
                        <div ref={googleButtonRef} className="sr-only" aria-hidden="true" />
                      </div>

                      <div className="flex items-center justify-center gap-2 mt-6">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-[#5a6b5a]">
                          Conexión segura y cifrada
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Características */}
      <LoginFeatures />

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="w-full bg-white border-t border-[#e8e6e0] py-8"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-3 w-3 text-primary" />
              </div>
              <span className="text-sm font-medium text-[#5a6b5a]">
                Seguridad y confianza en cada proceso
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center text-sm text-[#6b7280]">
              <div className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                <PrivacyPolicy />
              </div>
              <span className="text-[#d1d5db]">|</span>
              <span>Sistema de Gestión Educativa © {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
