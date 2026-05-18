"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  return (
    <div className="min-h-screen flex items-center justify-center p-4 safe-area-bottom relative overflow-hidden bg-background">
      <div className="absolute inset-0 page-atmosphere" />
      <Card className="w-full max-w-sm sm:max-w-md mx-4 relative animate-scale-in bg-card border-border">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 flex items-center justify-center mb-3 overflow-hidden rounded-sm bg-primary/10 border border-primary/20">
            <img src="/0.png" alt="Logo" className="h-9 w-9 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <CardTitle className="font-display text-base sm:text-lg text-card-foreground">Sistema de Calificaciones</CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">Centro Escolar Católico San José de la Montaña</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {!initialized ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">Inicializa el sistema para comenzar</p>
              <Button onClick={initSystem} className="w-full mobile-button bg-primary text-primary-foreground hover:bg-primary/90">Inicializar Sistema</Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-3">
              <div><Label className="text-sm text-foreground">Email</Label><Input type="email" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} placeholder="correo@ejemplo.edu" required className="mobile-input" /></div>
              <div><Label className="text-sm text-foreground">Contraseña</Label><Input type="password" autoComplete="current-password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required className="mobile-input" /></div>
              {loginError && <p className={`text-sm text-center ${loginError.includes("no está registrada") ? "text-amber-600" : "text-red-500"}`}>{loginError}</p>}
              <Button type="submit" className="w-full mobile-button bg-primary text-primary-foreground hover:bg-primary/90" disabled={loginLoading}>{loginLoading ? "Ingresando..." : "Ingresar"}</Button>
              <div className="relative flex items-center justify-center">
                <div className="border-t w-full border-border" />
                <span className="px-2 text-xs bg-card text-muted-foreground">o</span>
              </div>
              <div ref={googleButtonRef} id="google-button-container" className="flex justify-center min-h-[40px]" />
              {googleLoading && <p className="text-sm text-center text-muted-foreground">Iniciando sesión con Google...</p>}
              <p className="text-sm font-medium text-center text-muted-foreground">Ingrese sus credenciales para continuar</p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
