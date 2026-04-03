"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  LogOut, Users, User, ClipboardList, FileText, Plus, RefreshCw,
  School, Save, Printer, ChevronDown, ChevronUp, Settings, Upload,
  Download, Trash2, ListPlus, UserPlus, Key, Calendar, LayoutDashboard, CalendarDays
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Dashboard from "@/components/Dashboard";
import AsistenciaBoard from "@/components/AsistenciaBoard";
import { EstudiantesTable } from "@/components/EstudiantesTable";

// Interfaces
interface UsuarioSesion { id: string; email: string; nombre: string; rol: string; gradosAsignados?: { id: string; numero: number; seccion: string; }[]; asignaturasAsignadas?: { id: string; nombre: string; gradoId: string; gradoNumero?: number; gradoSeccion?: string; }[]; }
interface AsignaturaConGrado { id: string; nombre: string; gradoId: string; grado?: { id: string; numero: number; seccion: string; }; gradoNumero?: number; }
interface Usuario { 
  id: string; 
  email: string; 
  nombre: string; 
  rol: string; 
  activo: boolean; 
  gradosComoTutor?: { id: string; numero: number; seccion: string; año: number; }[]; 
  materias?: AsignaturaConGrado[];
}
interface Estudiante { id: string; numero: number; nombre: string; gradoId: string; activo: boolean; orden?: number; }
interface Asignatura { id: string; nombre: string; gradoId: string; }
interface ConfigActividad { id: string; materiaId: string; trimestre: number; numActividadesCotidianas: number; numActividadesIntegradoras: number; tieneExamen: boolean; porcentajeAC: number; porcentajeAI: number; porcentajeExamen: number; asignaturaNombre?: string; }
type ConfigActividadPartial = Partial<ConfigActividad> & { numActividadesCotidianas: number; numActividadesIntegradoras: number; tieneExamen: boolean; porcentajeAC: number; porcentajeAI: number; porcentajeExamen: number; };
interface Calificacion { id: string; estudianteId: string; materiaId: string; trimestre: number; actividadesCotidianas: string | null; calificacionAC: number | null; actividadesIntegradoras: string | null; calificacionAI: number | null; examenTrimestral: number | null; promedioFinal: number | null; recuperacion: number | null; estudiante?: Estudiante; asignatura?: Asignatura; config?: ConfigActividad; }
interface Grado { id: string; numero: number; seccion: string; año: number; docenteId: string | null; docente?: { id: string; nombre: string; email: string; }; _count?: { estudiantes: number; materias: number; }; }
interface ConfiguracionSistema { id: string; añoEscolar: number; escuela: string; }

// Utilidades
const calcularPromedio = (notas: (number | null)[]): number | null => {
  const validas = notas.filter(n => n !== null && !isNaN(n!)) as number[];
  return validas.length ? validas.reduce((a, b) => a + b, 0) / validas.length : null;
};
const calcularPromedioFinal = (ac: number | null, ai: number | null, et: number | null, cfg: ConfigActividadPartial, recup: number | null = null): number | null => {
  if (ac === null && ai === null && et === null) return null;
  const pctAC = cfg.porcentajeAC ?? 35;
  const pctAI = cfg.porcentajeAI ?? 35;
  const pctEx = cfg.porcentajeExamen ?? 30;
  let base = (ac ?? 0) * pctAC / 100 + (ai ?? 0) * pctAI / 100 + (et ?? 0) * pctEx / 100;
  if (recup !== null) base = Math.min(10, base + recup);
  return base;
};
const parseNotas = (json: string | null, count: number): (number | null)[] => {
  if (!json) return Array(count).fill(null);
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? [...arr.map((n: number) => !isNaN(n) ? n : null), ...Array(Math.max(0, count - arr.length)).fill(null)].slice(0, count) : Array(count).fill(null);
  } catch { return Array(count).fill(null); }
};

export default function Home() {
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === "dark";
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Datos
  const [grados, setGrados] = useState<Grado[]>([]);
  const [gradosFiltrados, setGradosFiltrados] = useState<Grado[]>([]);
  const [asignaturasFiltradas, setAsignaturasFiltradas] = useState<Asignatura[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [todasAsignaturas, setTodasAsignaturas] = useState<AsignaturaConGrado[]>([]);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [configActual, setConfigActual] = useState<ConfigActividadPartial | null>(null);
  const [configsGrado, setConfigsGrado] = useState<ConfigActividad[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  
  // Selecciones
  const [gradoSeleccionado, setGradoSeleccionado] = useState<string>("");
  const [trimestreSeleccionado, setTrimestreSeleccionado] = useState<string>("1");
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState<string>("");
  
  // UI
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [listaDialogOpen, setListaDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editUsuarioId, setEditUsuarioId] = useState<string | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ actual: "", nueva: "", confirmar: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [nuevoEstudiante, setNuevoEstudiante] = useState({ nombre: "" });
  const [listaEstudiantes, setListaEstudiantes] = useState("");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [materiasEnBoleta, setMateriasEnBoleta] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const v = localStorage.getItem("ss_materiasBoleta");
      return v ? JSON.parse(v) : [];
    }
    return [];
  });
  const [expandedBoleta, setExpandedBoleta] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<ConfigActividadPartial | null>(null);
  const [configAplicarATodas, setConfigAplicarATodas] = useState(false);
  const [importData, setImportData] = useState("");
  const [nuevoUsuario, setNuevoUsuario] = useState({ 
    email: "", 
    password: "", 
    nombre: "", 
    rol: "docente", 
    gradosAsignados: [] as string[],
    materiasAsignadas: [] as string[]
  });
  const [configuracion, setConfiguracion] = useState<ConfiguracionSistema | null>(null);
  const [nuevoAño, setNuevoAño] = useState(2026);
  const [añoDialogOpen, setAñoDialogOpen] = useState(false);
  const [añoLoading, setAñoLoading] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<{id: string; nombre: string} | null>(null);
  const [resetPasswordForm, setResetPasswordForm] = useState({ password: "docente123" });
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [perfilDialogOpen, setPerfilDialogOpen] = useState(false);
  const [borrarCalifDialogOpen, setBorrarCalifDialogOpen] = useState(false);
  const [borrarCalifTipo, setBorrarCalifTipo] = useState<"alumno" | "grado" | null>(null);
  const [borrarCalifEstudianteId, setBorrarCalifEstudianteId] = useState<string | null>(null);
  const [borrarCalifLoading, setBorrarCalifLoading] = useState(false);
  const [sectionLoading, setSectionLoading] = useState(false);

  // Promedios
  const [promedioAsignatura, setPromedioAsignatura] = useState<number | null>(null);
  const [promedioGrado, setPromedioGrado] = useState<number | null>(null);

  // Audit & Sessions
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loginSessions, setLoginSessions] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState({ accion: "", usuarioId: "", entidad: "", fechaDesde: "", fechaHasta: "" });
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);

  // Persistence: Cargar de localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const tb = localStorage.getItem("ss_tab"); if (tb) setActiveTab(tb);
      const gr = localStorage.getItem("ss_grado"); if (gr) setGradoSeleccionado(gr);
      const mt = localStorage.getItem("ss_materia"); if (mt) setAsignaturaSeleccionada(mt);
      const tr = localStorage.getItem("ss_trimestre"); if (tr) setTrimestreSeleccionado(tr);
    }
  }, []);

  // Persistence: Guardar en localStorage
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("ss_tab", activeTab); }, [activeTab]);
  useEffect(() => { if (typeof window !== "undefined" && gradoSeleccionado) localStorage.setItem("ss_grado", gradoSeleccionado); }, [gradoSeleccionado]);
  useEffect(() => { if (typeof window !== "undefined" && asignaturaSeleccionada) localStorage.setItem("ss_materia", asignaturaSeleccionada); }, [asignaturaSeleccionada]);
  useEffect(() => { if (typeof window !== "undefined" && trimestreSeleccionado) localStorage.setItem("ss_trimestre", trimestreSeleccionado); }, [trimestreSeleccionado]);

  // Auth
  const checkAuth = useCallback(async () => {
    // Timeout de seguridad de 10 segundos para no quedar atrapado en el spinner
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store", signal: controller.signal, credentials: "include" });
      const data = await res.json();
      setUsuario(data.usuario);
    } catch (err) { 
      console.error("Auth check failed:", err);
      setUsuario(null); 
    }
    finally { 
      clearTimeout(timeoutId);
      setLoading(false); 
    }
  }, []);

  const initSystem = async () => {
    try {
      const res = await fetch("/api/init", { method: "POST", credentials: "include" });
      const data = await res.json();
      toast({ title: "Sistema inicializado", description: "Usuario administrador creado correctamente" });
      setInitialized(true);
    } catch { toast({ title: "Error al inicializar", variant: "destructive" }); }
  };

  // Carga de datos
  const loadGrados = useCallback(async () => {
    try {
      const res = await fetch("/api/grados", { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setGrados(data);
      } else {
        console.error("Error al cargar grados:", res.status);
        setGrados([]);
      }
    } catch { 
      console.error("Error al cargar grados"); 
      setGrados([]);
    }
  }, []);

  const loadEstudiantes = useCallback(async () => {
    if (!gradoSeleccionado) return;
    try {
      const res = await fetch(`/api/estudiantes?gradoId=${gradoSeleccionado}`, { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setEstudiantes(data);
      } else {
        console.error("Error al cargar estudiantes:", res.status);
        setEstudiantes([]);
      }
    } catch { 
      console.error("Error al cargar estudiantes"); 
      setEstudiantes([]);
    }
  }, [gradoSeleccionado]);

  const loadAsignaturas = useCallback(async () => {
    if (!gradoSeleccionado) return;
    try {
      const res = await fetch(`/api/materias?gradoId=${gradoSeleccionado}`, { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAsignaturas(data);
      } else {
        console.error("Error al cargar asignaturas:", res.status);
        setAsignaturas([]);
      }
    } catch { 
      console.error("Error al cargar asignaturas"); 
      setAsignaturas([]);
    }
  }, [gradoSeleccionado]);

  const loadTodasAsignaturas = useCallback(async () => {
    try {
      const res = await fetch("/api/materias?todas=true", { cache: "no-store", credentials: "include" });
      setTodasAsignaturas(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadConfig = useCallback(async () => {
    if (!asignaturaSeleccionada || !trimestreSeleccionado) return;
    try {
      const res = await fetch(`/api/config-actividades?materiaId=${asignaturaSeleccionada}&trimestre=${trimestreSeleccionado}`, { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConfigActual(data);
      } else {
        console.error("Error al cargar config:", res.status);
        setConfigActual({ numActividadesCotidianas: 4, numActividadesIntegradoras: 1, tieneExamen: true, porcentajeAC: 35, porcentajeAI: 35, porcentajeExamen: 30 });
      }
    } catch { 
      console.error("Error al cargar config"); 
      setConfigActual({ numActividadesCotidianas: 4, numActividadesIntegradoras: 1, tieneExamen: true, porcentajeAC: 35, porcentajeAI: 35, porcentajeExamen: 30 });
    }
  }, [asignaturaSeleccionada, trimestreSeleccionado]);

  const loadConfigsGrado = useCallback(async () => {
    if (!gradoSeleccionado || !trimestreSeleccionado) return;
    try {
      const res = await fetch(`/api/config-actividades?gradoId=${gradoSeleccionado}&trimestre=${trimestreSeleccionado}`, { cache: "no-store", credentials: "include" });
      if (res.ok) setConfigsGrado(await res.json());
    } catch { setConfigsGrado([]); }
  }, [gradoSeleccionado, trimestreSeleccionado]);

  const loadCalificaciones = useCallback(async () => {
    if (!gradoSeleccionado || !trimestreSeleccionado || !asignaturaSeleccionada) return;
    try {
      const res = await fetch(`/api/calificaciones?gradoId=${gradoSeleccionado}&materiaId=${asignaturaSeleccionada}&trimestre=${trimestreSeleccionado}`, { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCalificaciones(data);
        
        // Calcular promedio por asignatura
        const promsFinalesValidos = data.filter((c: Calificacion) => c.promedioFinal !== null).map((c: Calificacion) => c.promedioFinal);
        if (promsFinalesValidos.length > 0) {
          const suma = promsFinalesValidos.reduce((a: number, b: number) => a + b, 0);
          setPromedioAsignatura(Math.round((suma / promsFinalesValidos.length) * 100) / 100);
        } else {
          setPromedioAsignatura(null);
        }
      } else {
        console.error("Error al cargar calificaciones:", res.status);
        setCalificaciones([]);
        setPromedioAsignatura(null);
      }
    } catch { 
      console.error("Error al cargar calificaciones"); 
      setCalificaciones([]);
      setPromedioAsignatura(null);
    }
  }, [gradoSeleccionado, trimestreSeleccionado, asignaturaSeleccionada]);

  const loadPromedioGrado = useCallback(async () => {
    if (!gradoSeleccionado || !trimestreSeleccionado) return;
    try {
      const res = await fetch(`/api/calificaciones/promedio-grado?gradoId=${gradoSeleccionado}&trimestre=${trimestreSeleccionado}`, { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPromedioGrado(data.promedio);
      } else {
        setPromedioGrado(null);
      }
    } catch {
      setPromedioGrado(null);
    }
  }, [gradoSeleccionado, trimestreSeleccionado]);

  const loadUsuarios = useCallback(async () => {
    try {
      const res = await fetch("/api/usuarios", { cache: "no-store", credentials: "include" });
      if (res.ok) setUsuarios(await res.json());
    } catch { /* no auth */ }
  }, []);

  const loadConfiguracion = useCallback(async () => {
    try {
      const res = await fetch("/api/configuracion", { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConfiguracion(data);
        setNuevoAño(data.añoEscolar);
      }
    } catch { /* ignore */ }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams({ page: String(auditPage), limit: "20" });
      if (auditFilter.accion) params.set("accion", auditFilter.accion);
      if (auditFilter.usuarioId) params.set("usuarioId", auditFilter.usuarioId);
      if (auditFilter.entidad) params.set("entidad", auditFilter.entidad);
      if (auditFilter.fechaDesde) params.set("fechaDesde", auditFilter.fechaDesde);
      if (auditFilter.fechaHasta) params.set("fechaHasta", auditFilter.fechaHasta);
      const res = await fetch(`/api/audit?${params}`, { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        setAuditTotalPages(data.totalPages || 1);
        setAuditTotal(data.total || 0);
      }
    } catch { /* ignore */ }
    finally { setAuditLoading(false); }
  }, [auditFilter, auditPage]);

  const handleDeleteAuditLogs = useCallback(async () => {
    if (!confirm("¿Borrar todos los registros de auditoría? Esta acción no se puede deshacer.")) return;
    setAuditLoading(true);
    try {
      const res = await fetch("/api/audit", { method: "DELETE", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        toast({ title: "Registros borrados", description: `${data.deleted} registro(s) eliminado(s)` });
        setAuditPage(1);
        loadAuditLogs();
      } else {
        toast({ title: "Error", description: "No autorizado", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "No se pudieron borrar los registros", variant: "destructive" });
    } finally { setAuditLoading(false); }
  }, [loadAuditLogs, toast]);

  const loadLoginSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/login-sessions?limit=100", { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setLoginSessions(data.sessions || []);
      }
    } catch { /* ignore */ }
  }, []);

  // Persistencia del estado del usuario
  const getStorageKey = () => usuario ? `sis_state_${usuario.id}` : null;

  const saveUserState = useCallback((state: { gradoSeleccionado?: string; asignaturaSeleccionada?: string; trimestreSeleccionado?: string; activeTab?: string }) => {
    const key = getStorageKey();
    if (!key) return;
    try {
      const existing = localStorage.getItem(key);
      const currentState = existing ? JSON.parse(existing) : {};
      const newState = { ...currentState, ...state, lastSaved: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(newState));
    } catch (e) { console.error("Error saving user state:", e); }
  }, [usuario]);

  const loadUserState = useCallback(() => {
    const key = getStorageKey();
    if (!key) return null;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  }, [usuario]);

  // Handlers
  const handleLogin = async (e: React.FormEvent) => {
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
        // Immediately call checkAuth to get full user data
        await checkAuth();
      } else { 
        setLoginError(data.error || "Error"); 
      }
    } catch { setLoginError("Error de conexión"); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = async () => {
    // Guardar estado actual antes de cerrar
    saveUserState({ gradoSeleccionado, asignaturaSeleccionada, trimestreSeleccionado });
    
    // Limpiar localStorage del usuario
    if (usuario?.id) {
      localStorage.removeItem(`sis_state_${usuario.id}`);
      localStorage.removeItem(`sis_last_session_${usuario.id}`);
    }
    
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUsuario(null);
    setGrados([]);
    setGradosFiltrados([]);
    setAsignaturas([]);
    setAsignaturasFiltradas([]);
    setEstudiantes([]);
    setCalificaciones([]);
    setConfigActual(null);
    setConfigsGrado([]);
    setGradoSeleccionado("");
    setAsignaturaSeleccionada("");
  };

  const handleChangePassword = async () => {
    if (!passwordForm.actual || !passwordForm.nueva || !passwordForm.confirmar) {
      toast({ title: "Complete todos los campos", variant: "destructive" });
      return;
    }
    if (passwordForm.nueva !== passwordForm.confirmar) {
      toast({ title: "Las contraseñas nuevas no coinciden", variant: "destructive" });
      return;
    }
    if (passwordForm.nueva.length < 6) {
      toast({ title: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" });
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/cambiar-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ passwordActual: passwordForm.actual, passwordNuevo: passwordForm.nueva }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Contraseña actualizada correctamente" });
        setPasswordForm({ actual: "", nueva: "", confirmar: "" });
        setPasswordDialogOpen(false);
      } else {
        toast({ title: data.error || "Error al cambiar contraseña", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAddEstudiante = async () => {
    console.log("[handleAddEstudiante] nombre:", nuevoEstudiante.nombre, "gradoId:", gradoSeleccionado);
    if (!nuevoEstudiante.nombre || !gradoSeleccionado) {
      console.log("[handleAddEstudiante] Early return - faltan datos");
      return;
    }
    try {
      console.log("[handleAddEstudiante] Enviando POST...");
      const res = await fetch("/api/estudiantes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nombre: nuevoEstudiante.nombre, gradoId: gradoSeleccionado }),
      });
      console.log("[handleAddEstudiante] Response status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("[handleAddEstudiante] Success:", data);
        setNuevoEstudiante({ nombre: "" });
        setDialogOpen(false);
        loadEstudiantes();
        toast({ title: "Estudiante agregado" });
      } else {
        const errorData = await res.json();
        console.log("[handleAddEstudiante] Error:", errorData);
        toast({ title: "Error al agregar", description: errorData.error || res.statusText, variant: "destructive" });
      }
    } catch (err) {
      console.log("[handleAddEstudiante] Exception:", err);
      toast({ title: "Error al agregar", description: err instanceof Error ? err.message : "Error de conexión", variant: "destructive" });
    }
  };

  const handleAddMultipleEstudiantes = async () => {
    const nombres = listaEstudiantes.split('\n').map(n => n.trim()).filter(n => n);
    console.log("[handleAddMultiple] nombres:", nombres.length, "gradoId:", gradoSeleccionado);
    if (!nombres.length || !gradoSeleccionado) {
      console.log("[handleAddMultiple] Early return - faltan datos");
      return;
    }
    try {
      console.log("[handleAddMultiple] Enviando PUT...");
      const res = await fetch("/api/estudiantes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ estudiantes: nombres, gradoId: gradoSeleccionado }),
      });
      console.log("[handleAddMultiple] Response status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("[handleAddMultiple] Success:", data);
        setListaEstudiantes("");
        setListaDialogOpen(false);
        loadEstudiantes();
        loadGrados();
        toast({ title: `${nombres.length} estudiantes agregados` });
      } else {
        const errorData = await res.json();
        console.log("[handleAddMultiple] Error:", errorData);
        toast({ title: "Error al agregar", description: errorData.error || res.statusText, variant: "destructive" });
      }
    } catch (err) {
      console.log("[handleAddMultiple] Exception:", err);
      toast({ title: "Error al agregar", description: err instanceof Error ? err.message : "Error de conexión", variant: "destructive" });
    }
  };

  const handleDeleteEstudiante = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return;
    try {
      const res = await fetch(`/api/estudiantes?id=${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { loadEstudiantes(); loadCalificaciones(); loadGrados(); toast({ title: "Estudiante eliminado" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const [reordenandoEstudiantes, setReordenandoEstudiantes] = useState(false);
  const handleReordenarEstudiantes = async (nuevoOrden: Estudiante[]) => {
    setEstudiantes(nuevoOrden);
    try {
      const ordenes = nuevoOrden.map((est, idx) => ({ id: est.id, orden: idx }));
      await fetch("/api/estudiantes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ordenes }),
      });
    } catch { toast({ title: "Error al guardar orden", variant: "destructive" }); }
  };

  const moverEstudiante = (index: number, direccion: 'arriba' | 'abajo') => {
    if (!usuario || usuario.rol !== "admin") return;
    const nuevos = [...estudiantes];
    const nuevoIndex = direccion === 'arriba' ? index - 1 : index + 1;
    if (nuevoIndex < 0 || nuevoIndex >= nuevos.length) return;
    const temp = nuevos[index];
    nuevos[index] = nuevos[nuevoIndex];
    nuevos[nuevoIndex] = temp;
    handleReordenarEstudiantes(nuevos);
  };

  const dirtyRowsRef = useRef<Map<string, { estudianteId: string; materiaId: string; data: any }>>(new Map());
  const trimestreRef = useRef(trimestreSeleccionado);
  useEffect(() => { trimestreRef.current = trimestreSeleccionado; }, [trimestreSeleccionado]);
  const materiaRef = useRef(asignaturaSeleccionada);
  useEffect(() => { materiaRef.current = asignaturaSeleccionada; }, [asignaturaSeleccionada]);

  const handleSaveCalificacion = useCallback(async (estudianteId: string, materiaId: string, data: { actividadesCotidianas: (number | null)[]; actividadesIntegradoras: (number | null)[]; examenTrimestral: number | null; recuperacion: number | null; }) => {
    setSaving(true);
    const trimestre = parseInt(trimestreRef.current);
    try {
      const res = await fetch("/api/calificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ estudianteId, materiaId, trimestre, actividadesCotidianas: JSON.stringify(data.actividadesCotidianas), actividadesIntegradoras: JSON.stringify(data.actividadesIntegradoras), examenTrimestral: data.examenTrimestral, recuperacion: data.recuperacion }),
      });
      if (res.ok) {
        const saved = await res.json();
        setCalificaciones(prev => {
          const idx = prev.findIndex(c => c.estudianteId === estudianteId && c.materiaId === materiaId && c.trimestre === trimestre);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...saved, estudiante: prev[idx].estudiante, asignatura: prev[idx].asignatura };
            return next;
          }
          return [...prev, { ...saved, estudiante: undefined, asignatura: undefined }];
        });
      } else {
        const err = await res.json();
        console.error("Error API:", err);
      }
    } catch (e) {
      console.error("Error conexión:", e);
    } finally { setSaving(false); }
  }, []);

  const handleGuardarTodo = useCallback(async () => {
    if (!gradoSeleccionado || !asignaturaSeleccionada || !estudiantes.length) {
      toast({ title: "Selecciona grado y asignatura primero" });
      return;
    }
    setSaving(true);
    const trimestre = parseInt(trimestreSeleccionado);
    const saves = estudiantes.map(async (est) => {
      const calif = calificaciones.find(c => c.estudianteId === est.id && c.materiaId === asignaturaSeleccionada && c.trimestre === trimestre);
      if (!calif) return null;
      return fetch("/api/calificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          estudianteId: est.id,
          materiaId: asignaturaSeleccionada,
          trimestre,
          actividadesCotidianas: calif.actividadesCotidianas,
          actividadesIntegradoras: calif.actividadesIntegradoras,
          examenTrimestral: calif.examenTrimestral,
          recuperacion: calif.recuperacion,
        }),
      });
    }).filter(Boolean);
    try {
      const results = await Promise.all(saves);
      const ok = results.filter(r => r && r.ok).length;
      if (ok > 0) {
        toast({ title: `${ok} calificaciones guardadas en Neon` });
        loadCalificaciones();
      } else {
        toast({ title: "No hay calificaciones para guardar" });
      }
    } catch (e) {
      console.error("Error:", e);
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally { setSaving(false); }
  }, [gradoSeleccionado, asignaturaSeleccionada, estudiantes, calificaciones, trimestreSeleccionado, toast, loadCalificaciones]);

  const handleSaveConfig = async () => {
    if (!editConfig) { console.error("[handleSaveConfig] editConfig es null"); return; }
    console.log("[handleSaveConfig] Guardando config:", { editConfig, configAplicarATodas, gradoSeleccionado, asignaturaSeleccionada, trimestreSeleccionado });
    const total = editConfig.porcentajeAC + editConfig.porcentajeAI + (editConfig.tieneExamen ? editConfig.porcentajeExamen : 0);
    if (Math.abs(total - 100) > 0.1) { toast({ title: `Porcentajes deben sumar 100% (${total.toFixed(1)}%)`, variant: "destructive" }); return; }
    if (!asignaturaSeleccionada) { toast({ title: "No hay materia seleccionada", variant: "destructive" }); return; }
    if (!gradoSeleccionado) { toast({ title: "No hay grado seleccionado", variant: "destructive" }); return; }
    try {
      const trimestreNum = parseInt(trimestreSeleccionado);
      console.log("[handleSaveConfig] Trimestre parseado:", trimestreNum, "tipo:", typeof trimestreNum);
      
      const payload = {
        materiaId: asignaturaSeleccionada,
        trimestre: trimestreNum,
        numActividadesCotidianas: Number(editConfig.numActividadesCotidianas),
        numActividadesIntegradoras: Number(editConfig.numActividadesIntegradoras),
        tieneExamen: Boolean(editConfig.tieneExamen),
        porcentajeAC: Number(editConfig.porcentajeAC),
        porcentajeAI: Number(editConfig.porcentajeAI),
        porcentajeExamen: Number(editConfig.porcentajeExamen),
        aplicarATodasLasMateriasDelGrado: Boolean(configAplicarATodas),
        gradoId: gradoSeleccionado,
      };
      console.log("[handleSaveConfig] Enviando payload:", JSON.stringify(payload));
      const res = await fetch("/api/config-actividades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log("[handleSaveConfig] Respuesta:", { status: res.status, data });
      if (!res.ok) { toast({ title: data.error || "Error al guardar configuración", variant: "destructive" }); return; }
      setConfigDialogOpen(false);
      console.log("[handleSaveConfig] Calling loadConfig()...");
      await loadConfig();
      console.log("[handleSaveConfig] loadConfig() completado");
      await loadConfigsGrado();
      await loadCalificaciones();
      console.log("[handleSaveConfig] Todo cargado, configActual:", configActual);
      toast({ title: configAplicarATodas ? "Configuración aplicada a todas las materias del grado" : "Configuración guardada" });
    } catch (err) { console.error("[handleSaveConfig] Error:", err); toast({ title: "Error de red", variant: "destructive" }); }
  };

  const handleBorrarCalifAlumno = async () => {
    if (!borrarCalifEstudianteId || !asignaturaSeleccionada || !trimestreSeleccionado) return;
    setBorrarCalifLoading(true);
    try {
      const res = await fetch(`/api/calificaciones?estudianteId=${borrarCalifEstudianteId}&materiaId=${asignaturaSeleccionada}&trimestre=${trimestreSeleccionado}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) {
        toast({ title: "Calificaciones del alumno borradas" });
        setBorrarCalifDialogOpen(false);
        loadCalificaciones();
      } else {
        toast({ title: "Error al borrar", variant: "destructive" });
      }
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setBorrarCalifLoading(false); }
  };

  const handleBorrarCalifGrado = async () => {
    if (!gradoSeleccionado || !asignaturaSeleccionada || !trimestreSeleccionado) return;
    setBorrarCalifLoading(true);
    try {
      const res = await fetch(`/api/calificaciones?gradoId=${gradoSeleccionado}&materiaId=${asignaturaSeleccionada}&trimestre=${trimestreSeleccionado}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        toast({ title: `${data.borradas} calificaciones borradas` });
        setBorrarCalifDialogOpen(false);
        loadCalificaciones();
      } else {
        toast({ title: "Error al borrar", variant: "destructive" });
      }
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setBorrarCalifLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportData(await file.text());
    toast({ title: "Archivo cargado" });
  };

  const handleImport = async () => {
    if (!importData || !asignaturaSeleccionada || !configActual) return;
    const lines = importData.split('\n').filter(l => l.trim());
    if (lines.length < 2) return;
    const headers = lines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase());
    const nombreIdx = headers.findIndex(h => h.includes('nombre') || h.includes('estudiante') || h.includes('alumno'));
    
    const acCols: number[] = [];
    const aiCols: number[] = [];
    let examenCol: number | null = null;
    let recupCol: number | null = null;
    
    headers.forEach((h, i) => {
      if (/^ac\d*$/.test(h)) acCols.push(i);
      if (/^ai\d*$/.test(h)) aiCols.push(i);
      if (/^(examen|ex)$/.test(h)) examenCol = i;
      if (/^(recup|recuperacion|rec)$/.test(h)) recupCol = i;
    });
    
    let importados = 0;
    let errores = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[,;\t]/).map(c => c.trim());
      if (nombreIdx < 0 || nombreIdx >= cols.length) continue;
      const nombreBusqueda = cols[nombreIdx].toLowerCase();
      const est = estudiantes.find(e => e.nombre.toLowerCase().includes(nombreBusqueda) || nombreBusqueda.includes(e.nombre.toLowerCase().split(',')[0].trim()));
      if (!est) continue;
      
      const acNotas: (number | null)[] = acCols.map(idx => {
        const val = parseFloat(cols[idx]);
        return isNaN(val) ? null : Math.min(10, Math.max(0, val));
      });
      
      const aiNotas: (number | null)[] = aiCols.map(idx => {
        const val = parseFloat(cols[idx]);
        return isNaN(val) ? null : Math.min(10, Math.max(0, val));
      });
      
      const examenVal = examenCol !== null ? (() => { const v = parseFloat(cols[examenCol!]); return isNaN(v) ? null : Math.min(10, Math.max(0, v)); })() : null;
      const recupVal = recupCol !== null ? (() => { const v = parseFloat(cols[recupCol!]); return isNaN(v) ? null : Math.min(10, Math.max(0, v)); })() : null;
      
      const res = await fetch("/api/calificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          estudianteId: est.id,
          materiaId: asignaturaSeleccionada,
          trimestre: parseInt(trimestreSeleccionado),
          actividadesCotidianas: acNotas,
          actividadesIntegradoras: aiNotas,
          examenTrimestral: examenVal,
          recuperacion: recupVal,
        }),
      });
      if (!res.ok) { errores++; continue; }
      importados++;
    }
    setImportDialogOpen(false); setImportData(""); loadCalificaciones();
    toast({ title: `${importados} calificaciones importadas${errores > 0 ? `, ${errores} errores` : ''}` });
  };

  const generateTemplate = () => {
    if (!configActual || !estudiantes.length) return;
    let csv = "Estudiante";
    for (let i = 1; i <= configActual.numActividadesCotidianas; i++) csv += `,AC${i}`;
    for (let i = 1; i <= configActual.numActividadesIntegradoras; i++) csv += `,AI${i}`;
    if (configActual.tieneExamen) csv += ",Examen";
    csv += "\n" + estudiantes.map(e => e.nombre + ",".repeat(configActual.numActividadesCotidianas + configActual.numActividadesIntegradoras + (configActual.tieneExamen ? 1 : 0))).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `plantilla_${trimestreSeleccionado}T.csv`;
    a.click();
  };

  const handleAddUsuario = async () => {
    // Si estamos editando y no hay password, está bien. Si es nuevo, exige password.
    if (!nuevoUsuario.email || (!editUsuarioId && !nuevoUsuario.password) || !nuevoUsuario.nombre) {
      toast({ title: "Complete los campos obligatorios", variant: "destructive" });
      return;
    }
    try {
      const isEdit = !!editUsuarioId;
      console.log("[handleAddUsuario] Enviando:", nuevoUsuario);
      const res = await fetch("/api/usuarios", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(isEdit ? { id: editUsuarioId, ...nuevoUsuario } : nuevoUsuario),
      });
      const data = await res.json();
      console.log("[handleAddUsuario] Respuesta:", res.status, data);
      if (res.ok) { 
        setNuevoUsuario({ email: "", password: "", nombre: "", rol: "docente", gradosAsignados: [], materiasAsignadas: [] }); 
        setEditUsuarioId(null);
        setUserDialogOpen(false); 
        loadUsuarios(); 
        toast({ title: isEdit ? "Usuario actualizado" : "Usuario creado" }); 
      }
      else { toast({ title: data.error, variant: "destructive" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const abrirEditarUsuario = (u: Usuario) => {
    setNuevoUsuario({
      email: u.email,
      password: "",
      nombre: u.nombre,
      rol: u.rol,
      gradosAsignados: u.gradosComoTutor?.map((g) => g.id) || [],
      materiasAsignadas: u.materias?.map((m) => m.id) || []
    });
    setEditUsuarioId(u.id);
    setUserDialogOpen(true);
  };

  const handleDeleteUsuario = async (id: string) => {
    if (!confirm("¿Eliminar este usuario? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/usuarios?id=${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        loadUsuarios(); 
        toast({ title: "Usuario eliminado correctamente" });
      } else {
        toast({ title: data.error || "Error al eliminar usuario", variant: "destructive" });
      }
    } catch { toast({ title: "Error de conexión", variant: "destructive" }); }
  };

  const openResetPassword = (u: { id: string; nombre: string }) => {
    setResetPasswordUser(u);
    setResetPasswordForm({ password: u.nombre.includes("Admin") || u.nombre.includes("Administrador") ? "admin123" : "docente123" });
    setResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;
    setResetPasswordLoading(true);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ usuarioId: resetPasswordUser.id, nuevaPassword: resetPasswordForm.password }),
      });
      if (res.ok) {
        toast({ title: "Contraseña restablecida correctamente" });
        setResetPasswordDialogOpen(false);
      } else {
        const data = await res.json();
        toast({ title: data.error || "Error", variant: "destructive" });
      }
    } catch { toast({ title: "Error de conexión", variant: "destructive" }); }
    finally { setResetPasswordLoading(false); }
  };

  const handleToggleUsuario = async (id: string, activo: boolean) => {
    try {
      await fetch("/api/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, activo: !activo }),
      });
      loadUsuarios(); toast({ title: `Usuario ${!activo ? 'activado' : 'desactivado'}` });
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleResetSistema = async () => {
    if (!confirm("⚠️ ¿Estás seguro de FINALIZAR el año escolar? Esto eliminará TODOS los estudiantes, calificaciones y asistencias. Los usuarios y configuraciones se conservarán.")) return;
    setAñoLoading(true);
    try {
      const res = await fetch("/api/admin/reset-sistema", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) { toast({ title: "Sistema resetado" }); await Promise.all([loadGrados(), loadEstudiantes(), loadCalificaciones()]); }
      else { toast({ title: "Error", description: data.error, variant: "destructive" }); }
    } catch { toast({ title: "Error de conexión", variant: "destructive" }); }
    finally { setAñoLoading(false); }
  };

  const handleRepararAsignaciones = async () => {
    if (!confirm("⚠️ Esto reparará las asignaciones de docentes: creará materias faltantes y asignará materias a los docentes. ¿Continuar?")) return;
    setAñoLoading(true);
    try {
      const res = await fetch("/api/admin/reparar-asignaciones", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Reparación completada", description: `${data.asignacionesCreadas} asignaciones creadas, ${data.tutoresAsignados} tutores asignados, ${data.materiasCreadas} materias creadas` });
        await Promise.all([loadGrados(), loadUsuarios(), loadTodasAsignaturas()]);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch { toast({ title: "Error de conexión", variant: "destructive" }); }
    finally { setAñoLoading(false); }
  };

  const handleReinicializar = async () => {
    if (!confirm("⚠️ Esto re-aplicará todas las asignaciones de docentes a grados y materias. ¿Continuar?")) {
      return;
    }
    setAñoLoading(true);
    try {
      const res = await fetch("/api/init", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Sistema reinicializado", description: data.message });
        await Promise.all([loadGrados(), loadUsuarios(), loadTodasAsignaturas(), loadConfiguracion()]);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" });
    } finally {
      setAñoLoading(false);
    }
  };

  const handleCambiarAño = async () => {
    setAñoLoading(true);
    try {
      const res = await fetch("/api/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ añoEscolar: nuevoAño }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfiguracion(data);
        setAñoDialogOpen(false);
        // Recargar todos los datos
        loadGrados();
        loadTodasAsignaturas();
        toast({ title: `Año escolar cambiado a ${nuevoAño}` });
      } else {
        const err = await res.json();
        toast({ title: err.error || "Error al cambiar año", variant: "destructive" });
      }
    } catch { 
      toast({ title: "Error de conexión", variant: "destructive" }); 
    } finally {
      setAñoLoading(false);
    }
  };

  const getCalificacion = (estudianteId: string) => calificaciones.find(c => c.estudianteId === estudianteId && c.materiaId === asignaturaSeleccionada);

  // Agrupar asignaturas por grado para el selector
  const asignaturasPorGrado = todasAsignaturas.reduce((acc, m) => {
    const key = m.grado?.numero || 0;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<number, AsignaturaConGrado[]>);

  // Asignaturas de grados 6-9 para asignación
  const asignaturasGradosSuperiores = todasAsignaturas.filter(m => m.grado && m.grado.numero >= 6);
  // Grados 2-5 para asignación de tutor
  const gradosInferiores = grados.filter(g => g.numero >= 2 && g.numero <= 5);
  // Grados 6-9
  const gradosSuperiores = grados.filter(g => g.numero >= 6);

  // Effects
  // Auth
  useEffect(() => { checkAuth(); }, [checkAuth]);
  
  // Carga inicial de datos estructurales
  useEffect(() => { 
    if (usuario) { 
      setDataLoading(true);
      Promise.all([loadGrados(), loadUsuarios(), loadTodasAsignaturas(), loadConfiguracion()]).finally(() => setDataLoading(false));
    } 
  }, [usuario, loadGrados, loadUsuarios, loadTodasAsignaturas, loadConfiguracion]);
  // Carga de datos base (estudiantes y materias del grado)
  useEffect(() => { 
    if (gradoSeleccionado) {
      setSectionLoading(true);
      Promise.all([loadEstudiantes(), loadAsignaturas()]).finally(() => setSectionLoading(false));
    }
  }, [gradoSeleccionado, loadEstudiantes, loadAsignaturas]);

  // Carga de configuración y calificaciones sincronizada
  useEffect(() => { 
    if (gradoSeleccionado && asignaturaSeleccionada && trimestreSeleccionado) {
      setCalificaciones([]);
      setSectionLoading(true);
      Promise.all([loadConfig(), loadCalificaciones(), loadConfigsGrado()]).finally(() => setSectionLoading(false));
    }
  }, [gradoSeleccionado, asignaturaSeleccionada, trimestreSeleccionado]);
  
  // Cargar promedio del grado cuando cambie el grado o trimestre
  useEffect(() => {
    if (gradoSeleccionado && trimestreSeleccionado) {
      loadPromedioGrado();
    }
  }, [gradoSeleccionado, trimestreSeleccionado, loadPromedioGrado]);
  // Auto-selección inicial de grado - restaurar estado guardado o usar primero disponible
  useEffect(() => {
    if (gradosFiltrados && gradosFiltrados.length > 0 && !gradoSeleccionado) {
      const savedState = loadUserState();
      if (savedState?.gradoSeleccionado && gradosFiltrados.some(g => g.id === savedState.gradoSeleccionado)) {
        setGradoSeleccionado(savedState.gradoSeleccionado);
        if (savedState.trimestreSeleccionado) {
          setTrimestreSeleccionado(savedState.trimestreSeleccionado);
        }
        saveUserState({ gradoSeleccionado: savedState.gradoSeleccionado, trimestreSeleccionado: savedState.trimestreSeleccionado });
      } else {
        setGradoSeleccionado(gradosFiltrados[0].id);
        saveUserState({ gradoSeleccionado: gradosFiltrados[0].id });
      }
    }
  }, [ gradosFiltrados, gradoSeleccionado, loadUserState, saveUserState ]);

  // Auto-selección de asignatura restaurada o primera disponible
  useEffect(() => {
    if (asignaturasFiltradas && asignaturasFiltradas.length > 0 && !asignaturaSeleccionada) {
      const savedState = loadUserState();
      if (savedState?.asignaturaSeleccionada && asignaturasFiltradas.some(m => m.id === savedState.asignaturaSeleccionada)) {
        setAsignaturaSeleccionada(savedState.asignaturaSeleccionada);
        saveUserState({ asignaturaSeleccionada: savedState.asignaturaSeleccionada });
      } else {
        setAsignaturaSeleccionada(asignaturasFiltradas[0].id);
        saveUserState({ asignaturaSeleccionada: asignaturasFiltradas[0].id });
      }
    }
  }, [asignaturasFiltradas, asignaturaSeleccionada, loadUserState, saveUserState]);

  // Guardar estado automáticamente cuando cambie la selección
  useEffect(() => {
    if (usuario && (gradoSeleccionado || asignaturaSeleccionada || activeTab)) {
      const timeoutId = setTimeout(() => {
        saveUserState({ gradoSeleccionado, asignaturaSeleccionada, trimestreSeleccionado, activeTab });
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [gradoSeleccionado, asignaturaSeleccionada, trimestreSeleccionado, activeTab, usuario, saveUserState]);

  // Cargar tab activo al iniciar sesión
  useEffect(() => {
    if (usuario) {
      const savedState = loadUserState();
      if (savedState?.activeTab) {
        setActiveTab(savedState.activeTab);
      }
    }
  }, [usuario, loadUserState]);

  // Guardar estado antes de cerrar la pestaña - intentar guardar datos primero
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (usuario && saving) {
        // Si hay datos sin guardar, intentar guardarlos
        e.preventDefault();
        // Intentar guardar sin esperar respuesta ( navigator.sendBeacon no funciona bien con fetch)
        try {
          await fetch("/api/auth/logout", { 
            method: "POST", 
            credentials: "include",
            keepalive: true 
          });
        } catch {}
      }
      
      // Guardar estado en localStorage
      if (usuario) {
        saveUserState({ gradoSeleccionado, asignaturaSeleccionada, trimestreSeleccionado, activeTab });
        localStorage.setItem(`sis_last_session_${usuario.id}`, new Date().toISOString());
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && usuario) {
        // Cuando la pestaña se oculta, guardar estado
        saveUserState({ gradoSeleccionado, asignaturaSeleccionada, trimestreSeleccionado, activeTab });
        localStorage.setItem(`sis_last_session_${usuario.id}`, new Date().toISOString());
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [usuario, gradoSeleccionado, asignaturaSeleccionada, trimestreSeleccionado, saveUserState, saving, activeTab]);

  // Filtrar grados según el usuario
  useEffect(() => {
    if (!usuario) {
      setGradosFiltrados([]);
      return;
    }
    
    if (usuario.rol === "admin") {
      setGradosFiltrados(grados);
    } else {
      const gradoIdsTutor = new Set((usuario.gradosAsignados || []).map((g: any) => g.id));
      const gradoIdsAsignaturas = new Set((usuario.asignaturasAsignadas || []).map((m: any) => m.gradoId));
      const todosIds = new Set([...gradoIdsTutor, ...gradoIdsAsignaturas]);
      
      const filtrados = grados.filter((g: any) => todosIds.has(g.id));
      
      setGradosFiltrados(filtrados);
      
      if (filtrados.length > 0 && !filtrados.some((g: any) => g.id === gradoSeleccionado)) {
        setGradoSeleccionado(filtrados[0].id);
      }
    }
  }, [usuario, grados, gradoSeleccionado]);

  // Filtrar materias según el usuario
  useEffect(() => {
    if (!usuario || !gradoSeleccionado) {
      setAsignaturasFiltradas(asignaturas);
      return;
    }
    
    if (usuario.rol === "admin") {
      // Admin ve todas las asignaturas
      setAsignaturasFiltradas(asignaturas);
    } else {
      // Filtrar solo las asignaturas explícitamente asignadas en este grado (sin excepciones)
      const asignaturasDelGrado = new Set(
        usuario.asignaturasAsignadas
          ?.filter(m => m.gradoId === gradoSeleccionado)
          ?.map(m => m.id) || []
      );
      const filtradas = asignaturas.filter(m => asignaturasDelGrado.has(m.id));
      setAsignaturasFiltradas(filtradas);
      
      // Si la asignatura seleccionada no está en las filtradas, seleccionar la primera
      if (filtradas.length > 0 && !filtradas.some(m => m.id === asignaturaSeleccionada)) {
        setAsignaturaSeleccionada(filtradas[0].id);
      } else if (filtradas.length === 0) {
        setAsignaturaSeleccionada("");
      }
    }
  }, [usuario, gradoSeleccionado, asignaturas, asignaturaSeleccionada]);

  // Loading
  const dataReady = usuario && grados.length > 0;
  if (loading || dataLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><RefreshCw className="h-12 w-8 animate-spin text-teal-600" /></div>;

  // Login
  if (!usuario) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-600 to-emerald-700 p-4 safe-area-bottom">
      <Card className="w-full max-w-sm sm:max-w-md shadow-2xl mx-4">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 bg-white rounded-xl flex items-center justify-center mb-3 shadow-lg"><School className="h-10 w-7 text-teal-600" /></div>
          <CardTitle className="text-base sm:text-xl">Sistema de Calificaciones</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Centro Escolar Católico San José de la Montaña</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {!initialized ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">Inicializa el sistema para comenzar</p>
              <Button onClick={initSystem} className="w-full bg-teal-600 hover:bg-teal-700 mobile-button">Inicializar Sistema</Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-3">
              <div><Label className="text-sm">Email</Label><Input type="email" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} placeholder="correo@ejemplo.edu" required className="mobile-input" /></div>
              <div><Label className="text-sm">Contraseña</Label><Input type="password" autoComplete="current-password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} required className="mobile-input" /></div>
              {loginError && <p className="text-sm text-red-500 text-center">{loginError}</p>}
              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 mobile-button" disabled={loginLoading}>{loginLoading ? "Ingresando..." : "Ingresar"}</Button>
              <p className="text-sm font-medium text-center text-muted-foreground">Ingrese sus credenciales para continuar</p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Main
  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'bg-[#0f172a] text-white' : 'bg-slate-100 text-slate-900'} safe-area-bottom`}>
      <header className={`shadow-lg ${darkMode ? 'bg-[#1e293b] text-white border-b border-slate-700' : 'bg-teal-600 text-white'} mobile-header`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0"><School className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" /><div className="min-w-0"><h1 className="text-xs sm:text-sm font-bold truncate">Sistema de Calificaciones</h1><p className={`text-xs font-medium truncate ${darkMode ? 'text-slate-400' : 'text-teal-100'}`}>CEC San José de la Montaña</p></div></div>
          <div className="flex items-center gap-1 sm:gap-3">
            {configuracion && (
              <Badge className={`text-xs font-medium px-1.5 sm:px-2 py-0.5 ${darkMode ? 'bg-slate-700 text-slate-200' : 'bg-teal-700 text-white'}`}>
                Año {configuracion.añoEscolar}
              </Badge>
            )}
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className={`p-1.5 sm:p-2 rounded-lg transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-yellow-400' : 'bg-teal-700 hover:bg-teal-800 text-white'}`} title={darkMode ? "Modo claro" : "Modo oscuro"}>
              {darkMode ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <div className={`text-right text-xs font-medium hidden sm:block ${darkMode ? '' : ''}`}><p className="font-medium cursor-pointer hover:underline" onClick={() => setPerfilDialogOpen(true)}>{usuario.nombre}</p><p className={`capitalize ${darkMode ? 'text-slate-400' : 'text-teal-200'}`}>{usuario.rol}</p></div>
            <Button variant="ghost" size="sm" onClick={() => setPerfilDialogOpen(true)} className={`h-8 sm:h-10 px-1.5 sm:px-2 text-xs ${darkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-white hover:bg-teal-700'}`}><User className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" /><span className="hidden sm:inline">Perfil</span></Button>
            <Button variant="ghost" size="sm" onClick={() => setPasswordDialogOpen(true)} className={`h-8 sm:h-10 px-1.5 sm:px-2 text-xs ${darkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-white hover:bg-teal-700'}`}><Key className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" /><span className="hidden sm:inline">Clave</span></Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Cerrar sesión" className={`h-8 sm:h-10 px-1.5 sm:px-2 text-xs ${darkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-white hover:bg-teal-700'}`}><LogOut className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" /><span className="hidden sm:inline">Salir</span></Button>
          </div>
        </div>
      </header>

      {/* Diálogo de cambio de contraseña */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cambiar Contraseña</DialogTitle><DialogDescription>Actualiza tu contraseña de acceso al sistema.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-base font-medium">Contraseña Actual</Label><Input type="password" value={passwordForm.actual} onChange={e => setPasswordForm({...passwordForm, actual: e.target.value})} /></div>
            <div><Label className="text-base font-medium">Nueva Contraseña</Label><Input type="password" value={passwordForm.nueva} onChange={e => setPasswordForm({...passwordForm, nueva: e.target.value})} /></div>
            <div><Label className="text-base font-medium">Confirmar Nueva Contraseña</Label><Input type="password" value={passwordForm.confirmar} onChange={e => setPasswordForm({...passwordForm, confirmar: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setPasswordDialogOpen(false); setPasswordForm({ actual: "", nueva: "", confirmar: "" }); }}>Cancelar</Button>
            <Button size="sm" onClick={handleChangePassword} disabled={passwordLoading} className="bg-teal-600">{passwordLoading ? "Guardando..." : "Cambiar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-3 py-2 sm:py-3 pb-24 md:pb-3">
        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); saveUserState({ activeTab: val }); }}>
          <TabsList className={`shadow-md h-10 overflow-x-auto rounded-md hidden md:inline-flex w-auto shrink-0 hide-scrollbar justify-start space-x-1 ${darkMode ? 'bg-[#1e293b] border border-slate-700' : 'bg-white'}`} role="tablist" aria-label="Secciones del sistema">
            <TabsTrigger id="tab-dashboard" value="dashboard" className={`text-sm font-medium px-3 gap-1 shrink-0 ${darkMode ? 'data-[state=active]:bg-slate-700 data-[state=active]:text-teal-400' : ''}`}><LayoutDashboard className="h-4 w-4" />Inicio</TabsTrigger>
            <TabsTrigger id="tab-calificaciones" value="calificaciones" className={`text-sm font-medium px-3 gap-1 shrink-0 ${darkMode ? 'data-[state=active]:bg-slate-700 data-[state=active]:text-teal-400' : ''}`}><ClipboardList className="h-4 w-4" />Calificaciones</TabsTrigger>
            <TabsTrigger id="tab-asistencia" value="asistencia" className={`text-sm font-medium px-3 gap-1 shrink-0 ${darkMode ? 'data-[state=active]:bg-slate-700 data-[state=active]:text-teal-400' : ''}`}><CalendarDays className="h-4 w-4" />Asistencia</TabsTrigger>
            <TabsTrigger value="estudiantes" aria-label="Ver estudiantes" className={`text-sm font-medium px-3 gap-1 shrink-0 ${darkMode ? 'data-[state=active]:bg-slate-700 data-[state=active]:text-teal-400' : ''}`}><Users className="h-4 w-4" />Estudiantes</TabsTrigger>
            <TabsTrigger value="boletas" aria-label="Ver boletas" className={`text-sm font-medium px-3 gap-1 shrink-0 ${darkMode ? 'data-[state=active]:bg-slate-700 data-[state=active]:text-teal-400' : ''}`}><FileText className="h-4 w-4" />Boletas</TabsTrigger>
            {usuario.rol === "admin" && <TabsTrigger value="admin" aria-label="Administración" className={`text-sm font-medium px-3 gap-1 shrink-0 ${darkMode ? 'data-[state=active]:bg-slate-700 data-[state=active]:text-teal-400' : ''}`}><Settings className="h-4 w-4" />Admin</TabsTrigger>}
          </TabsList>

          {/* Mobile bottom nav */}
          <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 border-t ${darkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200'} safe-area-bottom`}>
            <div className="flex justify-around items-center h-14">
              {[
                { value: "dashboard", icon: LayoutDashboard, label: "Inicio" },
                { value: "calificaciones", icon: ClipboardList, label: "Notas" },
                { value: "asistencia", icon: CalendarDays, label: "Asist." },
                { value: "estudiantes", icon: Users, label: "Estud." },
                { value: "boletas", icon: FileText, label: "Boletas" },
                ...(usuario.rol === "admin" ? [{ value: "admin", icon: Settings, label: "Admin" }] : []),
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => { setActiveTab(item.value); saveUserState({ activeTab: item.value }); }}
                  className={`flex flex-col items-center justify-center flex-1 h-full text-xs transition-colors ${
                    activeTab === item.value
                      ? (darkMode ? 'text-teal-400' : 'text-teal-600')
                      : (darkMode ? 'text-slate-500' : 'text-slate-400')
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] mt-0.5">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="mt-3">
            <Dashboard 
              usuario={usuario}
              grados={grados}
              totalEstudiantes={grados.reduce((sum, g) => sum + (g._count?.estudiantes || 0), 0)}
              totalAsignaturas={todasAsignaturas.length}
              totalDocentes={usuarios.filter(u => u.rol === "docente" && u.activo).length}
              asignaturasAsignadas={(usuario.asignaturasAsignadas || []).map((m: any) => ({
                id: m.id,
                nombre: m.nombre,
                grado: m.gradoNumero ? { numero: m.gradoNumero, seccion: m.gradoSeccion || "" } : undefined
              }))}
            />
          </TabsContent>

          {/* Asistencia */}
          <TabsContent value="asistencia" className="mt-3">
            <AsistenciaBoard 
              grados={gradosFiltrados}
              asignaturas={asignaturasFiltradas}
              estudiantes={estudiantes}
              gradoInicial={gradoSeleccionado}
              asignaturaInicial={asignaturaSeleccionada}
              isAdmin={usuario.rol === "admin"}
            />
          </TabsContent>

          {/* Calificaciones */}
          <TabsContent value="calificaciones" className="mt-3 space-y-3">
            {(!gradosFiltrados || gradosFiltrados.length === 0) ? (
              <Card className="shadow-sm">
                <CardContent className="p-6 text-center">
                  <School className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  <h3 className="text-lg font-medium text-slate-600 mb-2">No hay grados disponibles</h3>
                  <p className="text-slate-500">
                    {usuario.rol === "admin" 
                      ? "No existen grados registrados en el sistema. Crea un grado desde la pestaña Admin."
                      : "No tienes grados o materias asignados. Contacta al administrador."}
                  </p>
                </CardContent>
              </Card>
            ) : (
            <Card className={`shadow-lg border ${darkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200'}`}>
              <CardContent className="p-2 sm:p-3">
                <div className="flex flex-wrap items-end gap-2 sm:gap-3">
                  <div className="flex-1 min-w-[120px] sm:min-w-[140px]"><Label className={`text-sm font-medium mb-1 block ${darkMode ? 'text-slate-300' : ''}`}>Grado</Label><Select value={gradoSeleccionado || ""} onValueChange={(val) => { setGradoSeleccionado(val); saveUserState({ gradoSeleccionado: val }); }}><SelectTrigger className={`h-11 sm:h-12 text-sm ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}`}><SelectValue placeholder="Seleccionar grado" /></SelectTrigger><SelectContent>{ gradosFiltrados && gradosFiltrados.length > 0 ? gradosFiltrados.map(g => <SelectItem key={g.id} value={g.id} className="text-sm">{g.numero}° "{g.seccion}" - {g.año}</SelectItem>) : <SelectItem value="no-grados" disabled>No hay grados</SelectItem>}</SelectContent></Select></div>

                  <div className="flex-1 min-w-[140px] sm:min-w-[180px]"><Label className={`text-sm font-medium mb-1 block ${darkMode ? 'text-slate-300' : ''}`}>Asignatura</Label><Select value={asignaturaSeleccionada || ""} onValueChange={(val) => { setAsignaturaSeleccionada(val); saveUserState({ asignaturaSeleccionada: val }); }}><SelectTrigger className={`h-11 sm:h-12 text-sm ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}`}><SelectValue placeholder="Seleccionar materia" /></SelectTrigger><SelectContent>{asignaturasFiltradas && asignaturasFiltradas.length > 0 ? asignaturasFiltradas.map(m => <SelectItem key={m.id} value={m.id} className="text-sm">{m.nombre}</SelectItem>) : <SelectItem value="no-materias" disabled>No hay materias</SelectItem>}</SelectContent></Select></div>
                  <div className="w-20 sm:w-28"><Label className={`text-sm font-medium mb-1 block ${darkMode ? 'text-slate-300' : ''}`}>Trimestre</Label><Select value={trimestreSeleccionado} onValueChange={setTrimestreSeleccionado}><SelectTrigger className={`h-11 sm:h-12 text-sm ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1" className="text-sm">I</SelectItem><SelectItem value="2" className="text-sm">II</SelectItem><SelectItem value="3" className="text-sm">III</SelectItem></SelectContent></Select></div>
                  {configActual && <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${darkMode ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-50'}`}><span>{configActual.numActividadesCotidianas} AC ({configActual.porcentajeAC}%)</span><span>•</span><span>{configActual.numActividadesIntegradoras} AI ({configActual.porcentajeAI}%)</span>{configActual.tieneExamen && <><span>•</span><span>Ex ({configActual.porcentajeExamen}%)</span></>}</div>}
                  <Button size="sm" aria-label={saving ? "Guardando calificaciones" : "Guardar todas las calificaciones"} className={`h-11 sm:h-12 font-semibold text-sm ${darkMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} mobile-button`} onClick={handleGuardarTodo} disabled={saving}><Save className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" /><span className="hidden sm:inline">{saving ? 'Guardando...' : 'Guardar Todo'}</span><span className="sm:hidden">{saving ? '...' : 'Guardar'}</span></Button>
                  <Button size="sm" variant="outline" className={`h-11 sm:h-12 text-sm ${darkMode ? 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700' : ''} mobile-button`} onClick={() => { setEditConfig(configActual); setConfigDialogOpen(true); }}><Settings className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" /><span className="hidden sm:inline">Config</span></Button>
                  <Button size="sm" variant="outline" className={`h-11 sm:h-12 text-sm ${darkMode ? 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700' : ''} mobile-button`} onClick={() => setImportDialogOpen(true)}><Upload className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" /><span className="hidden sm:inline">Importar</span></Button>
                  {usuario.rol === "admin" && (
                    <Button size="sm" variant="destructive" className={`h-11 sm:h-12 text-sm ${darkMode ? 'bg-red-700 hover:bg-red-600 border-red-600' : ''} mobile-button`} onClick={() => { setBorrarCalifTipo("grado"); setBorrarCalifDialogOpen(true); }}><Trash2 className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" /><span className="hidden sm:inline">Borrar Todo</span></Button>
                  )}
                </div>
              </CardContent>
            </Card>

            )}
            {gradoSeleccionado && asignaturaSeleccionada && (
              <Card className={`shadow-xl border overflow-hidden ${darkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200'}`}>
                <CardContent className="p-0">
                  <div className="table-scroll-container">
                    <table className="w-full text-sm sm:text-base font-medium border-collapse">
                      <thead><tr className={darkMode ? 'bg-gradient-to-r from-slate-700 to-slate-600 text-white' : 'bg-gradient-to-r from-slate-700 to-slate-600 text-white'}>
                        <th className={`w-10 p-2 text-center font-semibold sticky-col shadow-right left-0 z-20 border-r border-b ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-700 border-slate-500'}`}>N°</th>
                        <th className={`min-w-[140px] sm:min-w-[180px] p-2 text-left font-semibold sticky-col shadow-right left-10 z-20 border-r border-b ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-700 border-slate-500'}`}>Estudiante</th>
                        {configActual ? (
                          <>
                            <th colSpan={configActual.numActividadesCotidianas} className={`p-2 text-center font-semibold border-l border-b ${darkMode ? 'border-slate-600' : 'border-slate-500'}`}>Act. Cotidianas</th>
                            <th className={`w-16 p-2 text-center font-semibold border-l border-b ${darkMode ? 'bg-blue-900/60 border-slate-600 text-blue-300' : 'bg-blue-50 border-slate-500 text-blue-700'}`}>Prom AC</th>
                            <th colSpan={configActual.numActividadesIntegradoras} className={`p-2 text-center font-semibold border-l border-b ${darkMode ? 'border-slate-600' : 'border-slate-500'}`}>Act. Integradoras</th>
                            <th className={`w-16 p-2 text-center font-semibold border-l border-b ${darkMode ? 'bg-purple-900/60 border-slate-600 text-purple-300' : 'bg-purple-50 border-slate-500 text-purple-700'}`}>Prom AI</th>
                            {configActual.tieneExamen && <th className={`w-16 p-2 text-center font-semibold border-l border-b ${darkMode ? 'border-slate-600' : 'border-slate-500'}`}>Examen</th>}
                            {configActual.tieneExamen && <th className={`w-16 p-2 text-center font-semibold border-l border-b ${darkMode ? 'bg-amber-900/60 border-slate-600 text-amber-300' : 'bg-amber-50 border-slate-500 text-amber-700'}`}>Prom Ex</th>}
                            <th className={`w-14 p-2 text-center font-semibold border-l border-b ${darkMode ? 'border-slate-600' : 'border-slate-500'}`}>Rec.</th>
                            <th className={`w-18 p-2 text-center font-semibold border-l border-b ${darkMode ? 'bg-emerald-800/80 border-emerald-700 text-emerald-100' : 'bg-emerald-600 border-emerald-500'}`}>Prom. Final</th>
                            <th className={`w-12 p-2 text-center font-semibold border-l border-b ${darkMode ? 'border-slate-600' : 'border-slate-500'}`} title="Estado de guardado">💾</th>
                          </>
                        ) : (
                          <>
                            <th colSpan={4} className={`p-2 text-center font-semibold border-l border-b ${darkMode ? 'border-slate-600' : 'border-slate-500'}`}>Act. Cotidianas</th>
                            <th className={`w-16 p-2 text-center font-semibold border-l border-b ${darkMode ? 'bg-blue-900/60 border-slate-600 text-blue-300' : 'bg-blue-50 border-slate-500 text-blue-700'}`}>Prom AC</th>
                            <th colSpan={1} className={`p-2 text-center font-semibold border-l border-b ${darkMode ? 'border-slate-600' : 'border-slate-500'}`}>Act. Integradoras</th>
                            <th className={`w-16 p-2 text-center font-semibold border-l border-b ${darkMode ? 'bg-purple-900/60 border-slate-600 text-purple-300' : 'bg-purple-50 border-slate-500 text-purple-700'}`}>Prom AI</th>
                            <th className={`w-16 p-2 text-center font-semibold border-l border-b ${darkMode ? 'border-slate-600' : 'border-slate-500'}`}>Examen</th>
                            <th className={`w-16 p-2 text-center font-semibold border-l border-b ${darkMode ? 'bg-amber-900/60 border-slate-600 text-amber-300' : 'bg-amber-50 border-slate-500 text-amber-700'}`}>Prom Ex</th>
                            <th className={`w-14 p-2 text-center font-semibold border-l border-b ${darkMode ? 'border-slate-600' : 'border-slate-500'}`}>Rec.</th>
                            <th className={`w-18 p-2 text-center font-semibold border-l border-b ${darkMode ? 'bg-emerald-800/80 border-emerald-700 text-emerald-100' : 'bg-emerald-600 border-emerald-500'}`}>Prom. Final</th>
                            <th className={`w-12 p-2 text-center font-semibold border-l border-b ${darkMode ? 'border-slate-600' : 'border-slate-500'}`} title="Estado de guardado">💾</th>
                          </>
                        )}
                      </tr></thead>
                      <tbody>
                        {sectionLoading ? (
                          Array.from({ length: 5 }).map((_, idx) => (
                            <tr key={`skel-${idx}`} className={idx % 2 === 0 ? (darkMode ? 'bg-[#1e293b]' : '') : (darkMode ? 'bg-slate-800/50' : 'bg-slate-50/50')}>
                              <td className="p-2 text-center"><Skeleton className={`h-4 w-6 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></td>
                              <td className="p-2"><Skeleton className={`h-4 w-40 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></td>
                              <td className="p-2"><Skeleton className={`h-8 w-16 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></td>
                              <td className="p-2"><Skeleton className={`h-8 w-16 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></td>
                              <td className="p-2"><Skeleton className={`h-8 w-16 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></td>
                              <td className="p-2"><Skeleton className={`h-8 w-16 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></td>
                              <td className="p-2"><Skeleton className={`h-8 w-16 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></td>
                              <td className="p-2"><Skeleton className={`h-8 w-16 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></td>
                              <td className="p-2"><Skeleton className={`h-8 w-16 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></td>
                              <td className="p-2"><Skeleton className={`h-8 w-16 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></td>
                              <td className="p-2"><Skeleton className={`h-8 w-16 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></td>
                              <td className="p-2"><Skeleton className={`h-4 w-4 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></td>
                            </tr>
                          ))
                        ) : (estudiantes || []).map((est, idx) => {
                          const calif = getCalificacion(est.id);
                          return <CalificacionRow key={`${est.id}-${asignaturaSeleccionada}-${trimestreSeleccionado}-${configActual?.numActividadesCotidianas ?? 4}-${configActual?.numActividadesIntegradoras ?? 1}`} estudiante={est} materiaId={asignaturaSeleccionada} trimestre={trimestreSeleccionado} calificacion={calif} config={configActual} onSave={handleSaveCalificacion} saving={saving} darkMode={darkMode} evenRow={idx % 2 === 0} isAdmin={usuario.rol === "admin"} onBorrar={(estId) => { setBorrarCalifEstudianteId(estId); setBorrarCalifTipo("alumno"); setBorrarCalifDialogOpen(true); }} />
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Resumen de promedios */}
                  <div className={`flex flex-wrap gap-4 p-3 mt-2 border-t ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
                      <div className={`text-xs font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Promedio por Asignatura</div>
                      <div className={`text-lg font-bold ${darkMode ? 'text-blue-400' : 'text-blue-800'}`}>
                        {sectionLoading ? <Skeleton className={`h-5 w-12 ${darkMode ? 'bg-blue-800' : 'bg-blue-200'}`} /> : (promedioAsignatura !== null ? promedioAsignatura.toFixed(2) : "—")}
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-emerald-50 border border-emerald-200'}`}>
                      <div className={`text-xs font-medium ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Promedio del Grado</div>
                      <div className={`text-lg font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
                        {sectionLoading ? <Skeleton className={`h-5 w-12 ${darkMode ? 'bg-emerald-800' : 'bg-emerald-200'}`} /> : (promedioGrado !== null ? promedioGrado.toFixed(2) : "—")}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Estudiantes */}
          <TabsContent value="estudiantes" className="mt-3">
            <Card className={`shadow-sm ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
              <CardHeader className={`py-3 px-4 flex-row items-center justify-between space-y-0 ${darkMode ? 'border-slate-700' : ''}`}>
                <div><CardTitle className="text-base">Lista de Estudiantes</CardTitle><CardDescription className={`text-sm sm:text-base font-medium ${darkMode ? 'text-slate-400' : ''}`}>Gestiona los estudiantes por grado</CardDescription></div>
                {(usuario.rol === "admin" || usuario.rol === "docente") && (
                <div className="flex gap-2">
                  <Dialog open={listaDialogOpen} onOpenChange={setListaDialogOpen}>
                    <DialogTrigger asChild><Button size="sm" variant="outline" className={`h-10 text-xs sm:text-sm ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}><ListPlus className="h-5 w-5 mr-1" />Lista</Button></DialogTrigger>
                    <DialogContent className={`max-w-md ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
                      <DialogHeader><DialogTitle>Agregar Lista de Estudiantes</DialogTitle><DialogDescription>Ingresa los nombres de los estudiantes, uno por línea.</DialogDescription></DialogHeader>
                      <div className="space-y-2"><Label>Un nombre por línea</Label><textarea className={`w-full h-48 p-2 text-sm border rounded-md ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}`} value={listaEstudiantes} onChange={e => setListaEstudiantes(e.target.value)} placeholder="Apellido, Nombre&#10;Apellido, Nombre&#10;..." /></div>
                      <DialogFooter><Button variant="outline" size="sm" onClick={() => { setListaDialogOpen(false); setListaEstudiantes(""); }}>Cancelar</Button><Button size="sm" onClick={handleAddMultipleEstudiantes} className="bg-teal-600">Agregar {listaEstudiantes.split('\n').filter(n => n.trim()).length}</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild><Button size="sm" className={`h-10 text-xs sm:text-sm ${darkMode ? 'bg-teal-600 hover:bg-teal-500' : 'bg-teal-600'}`}><Plus className="h-5 w-5 mr-1" />Uno</Button></DialogTrigger>
                    <DialogContent className={`max-w-sm ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
                      <DialogHeader><DialogTitle>Agregar Estudiante</DialogTitle><DialogDescription>Ingresa el nombre completo del nuevo estudiante.</DialogDescription></DialogHeader>
                      <div className="space-y-2"><Label>Nombre completo</Label><Input value={nuevoEstudiante.nombre} onChange={e => setNuevoEstudiante({ nombre: e.target.value })} placeholder="Apellidos, Nombres" /></div>
                      <DialogFooter><Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button size="sm" onClick={handleAddEstudiante} className="bg-teal-600">Guardar</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mb-3"><Select value={gradoSeleccionado} onValueChange={setGradoSeleccionado}><SelectTrigger className={`w-full md:w-[250px] h-10 sm:h-12 text-xs sm:text-sm ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}`}><SelectValue /></SelectTrigger><SelectContent>{gradosFiltrados.map(g => <SelectItem key={g.id} value={g.id} className="text-sm">{g.numero}° "{g.seccion}" ({g._count?.estudiantes || 0})</SelectItem>)}</SelectContent></Select></div>
                <div className={`rounded border ${darkMode ? 'border-slate-700' : ''}`}>
                  <EstudiantesTable
                    estudiantes={estudiantes}
                    darkMode={darkMode}
                    isAdmin={usuario.rol === "admin"}
                    loading={sectionLoading}
                    onReorder={handleReordenarEstudiantes}
                    onDelete={handleDeleteEstudiante}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Boletas */}
          <TabsContent value="boletas" className="mt-3">
            <Card className={`shadow-sm ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
              <CardHeader className={`py-3 px-4 ${darkMode ? 'border-slate-700' : ''}`}><CardTitle className="text-base">Generación de Boletas</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <div className="flex-1"><Label className="text-sm sm:text-base font-medium">Grado</Label><Select value={gradoSeleccionado} onValueChange={setGradoSeleccionado}><SelectTrigger className={`h-10 sm:h-12 text-xs sm:text-sm ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}`}><SelectValue /></SelectTrigger><SelectContent>{gradosFiltrados.map(g => <SelectItem key={g.id} value={g.id} className="text-sm">{g.numero}° "{g.seccion}"</SelectItem>)}</SelectContent></Select></div>
                  <div className="w-full sm:w-32"><Label className="text-sm sm:text-base font-medium">Trimestre</Label><Select value={trimestreSeleccionado} onValueChange={setTrimestreSeleccionado}><SelectTrigger className={`h-10 sm:h-12 text-xs sm:text-sm ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">I</SelectItem><SelectItem value="2">II</SelectItem><SelectItem value="3">III</SelectItem></SelectContent></Select></div>
                </div>
                {gradoSeleccionado && estudiantes.length > 0 && (
                  <>
                    {usuario.rol === "admin" && (
                      <div className="space-y-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Label className="text-xs sm:text-sm font-medium whitespace-nowrap">Asignaturas en boleta:</Label>
                          <Select value={materiasEnBoleta.length === 0 ? "todas" : "personalizado"} onValueChange={(v) => { if (v === "todas") { setMateriasEnBoleta([]); if (typeof window !== "undefined") localStorage.setItem("ss_materiasBoleta", JSON.stringify([])); } }}>
                            <SelectTrigger className={`w-32 h-8 text-xs ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todas" className="text-xs">Todas ({asignaturasFiltradas.length})</SelectItem>
                              <SelectItem value="personalizado" className="text-xs">Seleccionar...</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {materiasEnBoleta.length > 0 ? `${materiasEnBoleta.length} seleccionada(s)` : 'Todas las asignaturas'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {asignaturasFiltradas.map(m => (
                            <button
                              key={m.id}
                              onClick={() => {
                                const next = materiasEnBoleta.includes(m.id)
                                  ? materiasEnBoleta.filter(id => id !== m.id)
                                  : [...materiasEnBoleta, m.id];
                                setMateriasEnBoleta(next);
                                if (typeof window !== "undefined") localStorage.setItem("ss_materiasBoleta", JSON.stringify(next));
                              }}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                                materiasEnBoleta.length > 0 && materiasEnBoleta.includes(m.id)
                                  ? (darkMode ? 'bg-teal-700 text-white border-teal-600' : 'bg-teal-600 text-white border-teal-600')
                                  : (darkMode ? 'bg-slate-800 text-slate-300 border-slate-600 hover:border-teal-600' : 'bg-white text-slate-700 border-slate-300 hover:border-teal-400')
                              }`}
                            >
                              {m.nombre}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <BoletaList estudiantes={estudiantes} calificaciones={calificaciones} materias={materiasEnBoleta.length > 0 ? asignaturasFiltradas.filter(m => materiasEnBoleta.includes(m.id)) : asignaturasFiltradas} grado={gradosFiltrados.find(g => g.id === gradoSeleccionado)} trimestre={parseInt(trimestreSeleccionado)} expandedBoleta={expandedBoleta} setExpandedBoleta={setExpandedBoleta} darkMode={darkMode} />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin */}
          {usuario.rol === "admin" && (
            <TabsContent value="admin" className="mt-3 space-y-3 sm:space-y-4">
              {/* Gestión de Usuarios */}
              <Card className={`shadow-sm ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
                <CardHeader className={`py-3 px-4 flex-row items-center justify-between space-y-0 ${darkMode ? 'border-slate-700' : ''}`}>
                  <div><CardTitle className="text-sm sm:text-base">Gestión de Usuarios</CardTitle><CardDescription className={`text-xs ${darkMode ? 'text-slate-400' : ''}`}>Crea y administra usuarios del sistema</CardDescription></div>
                  <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                    <DialogTrigger asChild><Button size="sm" className={`h-7 text-xs ${darkMode ? 'bg-teal-600 hover:bg-teal-500' : 'bg-teal-600'}`} onClick={() => { setEditUsuarioId(null); setNuevoUsuario({ email: "", password: "", nombre: "", rol: "docente", gradosAsignados: [], materiasAsignadas: [] }); }}><UserPlus className="h-3.5 w-3.5 mr-1" />Nuevo Usuario</Button></DialogTrigger>
                    <DialogContent className={`max-w-lg max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
                      <DialogHeader><DialogTitle>{editUsuarioId ? "Editar Usuario" : "Crear Usuario"}</DialogTitle><DialogDescription>Completa la información del usuario del sistema.</DialogDescription></DialogHeader>
                      <div className="space-y-3">
                        <div><Label className="text-xs">Nombre</Label><Input value={nuevoUsuario.nombre} onChange={e => setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})} placeholder="Nombre completo" /></div>
                        <div><Label className="text-xs">Email</Label><Input type="email" value={nuevoUsuario.email} onChange={e => setNuevoUsuario({...nuevoUsuario, email: e.target.value})} placeholder="correo@escuela.edu" /></div>
                        <div><Label className="text-xs">Contraseña</Label><Input type="password" value={nuevoUsuario.password} onChange={e => setNuevoUsuario({...nuevoUsuario, password: e.target.value})} placeholder="••••••••" /></div>
                        <div><Label className="text-xs">Rol</Label><Select value={nuevoUsuario.rol} onValueChange={v => setNuevoUsuario({...nuevoUsuario, rol: v})}><SelectTrigger className={`h-8 ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Administrador</SelectItem><SelectItem value="docente">Docente</SelectItem></SelectContent></Select></div>
                        
                        {/* Grados 2-5: Tutor */}
                        <div>
                          <Label className="text-xs">Tutor de Grados (2° a 5°)</Label>
                          <p className={`text-[10px] mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>El usuario será tutor del grado completo</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {gradosInferiores.map(g => (
                              <label key={g.id} className={`flex items-center gap-1 text-xs p-1.5 border rounded cursor-pointer ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                                <input 
                                  type="checkbox" 
                                  checked={nuevoUsuario.gradosAsignados.includes(g.id)} 
                                  onChange={e => setNuevoUsuario({
                                    ...nuevoUsuario, 
                                    gradosAsignados: e.target.checked 
                                      ? [...nuevoUsuario.gradosAsignados, g.id] 
                                      : nuevoUsuario.gradosAsignados.filter(id => id !== g.id)
                                  })} 
                                  className="h-3 w-3" 
                                />
                                {g.numero}°{g.seccion}
                              </label>
                            ))}
                          </div>
                        </div>
                        
                        {/* Grados 6-9: Materias específicas */}
                        <div>
                          <Label className="text-xs">Asignaturas Asignadas (6° a 9°)</Label>
                          <p className={`text-[10px] mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>El usuario califica estas asignaturas específicas</p>
                          <div className={`border rounded max-h-48 overflow-y-auto ${darkMode ? 'border-slate-700' : ''}`}>
                            {gradosSuperiores.map(grado => (
                              <div key={grado.id} className={`border-b last:border-b-0 ${darkMode ? 'border-slate-700' : ''}`}>
                                <div className={`px-2 py-1 text-xs font-medium ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>{grado.numero}° "{grado.seccion}"</div>
                                <div className="p-2 grid grid-cols-2 gap-1">
                                  {todasAsignaturas.filter(m => m.gradoId === grado.id).map(m => (
                                    <label key={m.id} className={`flex items-center gap-1 text-xs p-1 rounded cursor-pointer ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                                      <input 
                                        type="checkbox" 
                                        checked={nuevoUsuario.materiasAsignadas.includes(m.id)} 
                                        onChange={e => setNuevoUsuario({
                                          ...nuevoUsuario, 
                                          materiasAsignadas: e.target.checked 
                                            ? [...nuevoUsuario.materiasAsignadas, m.id] 
                                            : nuevoUsuario.materiasAsignadas.filter(id => id !== m.id)
                                        })} 
                                        className="h-3 w-3" 
                                      />
                                      {m.nombre}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter><Button variant="outline" size="sm" onClick={() => setUserDialogOpen(false)}>Cancelar</Button><Button size="sm" onClick={handleAddUsuario} className="bg-teal-600">{editUsuarioId ? "Guardar" : "Crear"}</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className={`rounded border overflow-x-auto ${darkMode ? 'border-slate-700' : ''}`}>
                    <Table className="text-xs">
                      <TableHeader><TableRow className={darkMode ? 'bg-slate-800' : 'bg-slate-100'}><TableHead className="h-8">Nombre</TableHead><TableHead>Email</TableHead><TableHead className="w-20">Rol</TableHead><TableHead className="w-20">Estado</TableHead><TableHead className="min-w-[200px]">Asignaciones</TableHead><TableHead className="w-20 text-center">Acciones</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {usuarios.map(u => (
                          <TableRow key={u.id} className={darkMode ? 'border-slate-700' : ''}>
                            <TableCell className={`font-medium ${darkMode ? 'text-white' : ''}`}>{u.nombre}</TableCell>
                            <TableCell className={darkMode ? 'text-slate-400' : ''}>{u.email}</TableCell>
                            <TableCell><Badge variant={u.rol === "admin" ? "default" : "secondary"} className={`text-[10px] ${u.rol === "admin" ? '' : (darkMode ? 'bg-slate-700 text-slate-300' : '')}`}>{u.rol === "admin" ? "Admin" : "Docente"}</Badge></TableCell>
                            <TableCell><Badge variant={u.activo ? "default" : "destructive"} className={`text-[10px] ${u.activo ? (darkMode ? 'bg-teal-600' : 'bg-teal-600') : ''}`}>{u.activo ? "Activo" : "Inactivo"}</Badge></TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                {u.gradosComoTutor && u.gradosComoTutor.length > 0 && (
                                  <div><span className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Tutor: </span>{u.gradosComoTutor.map(g => `${g.numero}°${g.seccion}`).join(", ")}</div>
                                )}
                                {u.materias && u.materias.length > 0 && (
                                  <div><span className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Asignaturas: </span>{u.materias.map(m => `${m.nombre} (${m.gradoNumero}º)`).join(", ")}</div>
                                )}
                                {(!u.gradosComoTutor || u.gradosComoTutor.length === 0) && (!u.materias || u.materias.length === 0) && "-"}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button size="sm" variant="ghost" className={`h-6 w-6 p-0 mr-1 ${darkMode ? 'text-amber-400' : 'text-amber-500'}`} title="Editar" onClick={() => abrirEditarUsuario(u as Usuario)}><Settings className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 mr-1" title={u.activo ? "Bloquear" : "Desbloquear"} onClick={() => handleToggleUsuario(u.id, u.activo)}>{u.activo ? "🔒" : "🔓"}</Button>
                              <Button size="sm" variant="ghost" className={`h-6 w-6 p-0 mr-1 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} title="Restablecer contraseña" onClick={() => openResetPassword({ id: u.id, nombre: u.nombre })}>🔑</Button>
                              <Button size="sm" variant="ghost" className={`h-6 w-6 p-0 ${darkMode ? 'text-red-400' : 'text-red-500'}`} title="Eliminar" onClick={() => handleDeleteUsuario(u.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Info de Grados */}
              <Card className={`shadow-sm ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
                <CardHeader className={`py-3 px-4 ${darkMode ? 'border-slate-700' : ''}`}><CardTitle className="text-sm sm:text-base">Grados Registrados</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {grados.map(g => <div key={g.id} className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50'}`}><p className={`font-medium text-xs sm:text-sm ${darkMode ? 'text-white' : ''}`}>{g.numero}° "{g.seccion}"</p><p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{g._count?.estudiantes || 0} estudiantes • {g.docente?.nombre || "Sin docente"}</p></div>)}
                  </div>
                </CardContent>
              </Card>

              {/* Configuración del Sistema - Año Escolar */}
              <Card className={`shadow-sm ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
                <CardHeader className={`py-3 px-4 flex-row items-center justify-between space-y-0 ${darkMode ? 'border-slate-700' : ''}`}>
                  <div><CardTitle className="text-sm sm:text-base">Año Escolar</CardTitle><CardDescription className={`text-xs ${darkMode ? 'text-slate-400' : ''}`}>Configure el año lectivo actual del sistema</CardDescription></div>
                  <Dialog open={añoDialogOpen} onOpenChange={setAñoDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className={`h-7 text-xs ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}>
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        Cambiar Año
                      </Button>
                    </DialogTrigger>
                    <DialogContent className={`max-w-sm ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
                      <DialogHeader><DialogTitle>Cambiar Año Escolar</DialogTitle><DialogDescription>El nuevo año solo mostrará datos correspondientes a ese período.</DialogDescription></DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Año Escolar</Label>
                          <Input 
                            type="number" 
                            value={nuevoAño} 
                            onChange={e => setNuevoAño(parseInt(e.target.value) || 2026)} 
                            min={2020} 
                            max={2100}
                            className={`h-8 ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}`}
                          />
                        </div>
                        <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                          Al cambiar el año escolar, el sistema mostrará únicamente los datos correspondientes a ese año.
                        </p>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setAñoDialogOpen(false)}>Cancelar</Button>
                        <Button size="sm" onClick={handleCambiarAño} disabled={añoLoading} className="bg-teal-600">
                          {añoLoading ? "Guardando..." : "Cambiar"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                    <div className={`flex-1 p-4 rounded-lg border ${darkMode ? 'bg-teal-900/30 border-teal-800' : 'bg-teal-50 border-teal-200'}`}>
                      <p className={`text-2xl font-bold ${darkMode ? 'text-teal-300' : 'text-teal-700'}`}>{configuracion?.añoEscolar || 2026}</p>
                      <p className={`text-xs ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>Año lectivo actual</p>
                    </div>
                    <div className={`flex-1 p-4 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50'}`}>
                      <p className={`text-lg font-medium ${darkMode ? 'text-white' : ''}`}>{grados.length}</p>
                      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Grados activos</p>
                    </div>
                    <div className={`flex-1 p-4 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50'}`}>
                      <p className={`text-lg font-medium ${darkMode ? 'text-white' : ''}`}>{todasAsignaturas.length}</p>
                      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Asignaturas</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className={`border-t justify-between py-3 px-4 flex-col sm:flex-row gap-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50'}`}>
                  <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Versión 1.2.0 | © 2026 CEC San José de la Montaña</div>
                  <Button variant="outline" size="sm" onClick={handleRepararAsignaciones} disabled={añoLoading} className="h-8 text-xs sm:text-sm w-full sm:w-auto">
                    <Settings className="h-4 w-4 mr-1" /> Reparar Asignaciones
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleResetSistema} className="h-8 text-xs sm:text-sm w-full sm:w-auto">
                    <Trash2 className="h-4 w-4 mr-1" /> Finalizar Año
                  </Button>
                </CardFooter>
              </Card>

              {/* Panel de Auditoría */}
              <Card className={`shadow-sm ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
                <CardHeader className={`py-3 px-4 ${darkMode ? 'border-slate-700' : ''}`}>
                  <CardTitle className="text-sm sm:text-base">Historial de Auditoría</CardTitle>
                  <CardDescription className={`text-xs ${darkMode ? 'text-slate-400' : ''}`}>Registro de quién digitó o borró calificaciones</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Button size="sm" variant="outline" className={`h-8 text-xs ${darkMode ? 'border-slate-600' : ''}`} onClick={loadAuditLogs} disabled={auditLoading}>
                      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${auditLoading ? 'animate-spin' : ''}`} /> Actualizar
                    </Button>
                    {usuario.rol === "admin" && (
                      <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={handleDeleteAuditLogs} disabled={auditLoading || auditTotal === 0}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Borrar todo
                      </Button>
                    )}
                    <select
                      value={auditFilter.accion}
                      onChange={e => { setAuditFilter(f => ({ ...f, accion: e.target.value })); setAuditPage(1); }}
                      className={`h-8 text-xs rounded border px-2 ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300'}`}
                    >
                      <option value="">Todas las acciones</option>
                      <option value="UPDATE">Digitó</option>
                      <option value="DELETE">Borró</option>
                    </select>
                    <input
                      type="date"
                      value={auditFilter.fechaDesde}
                      onChange={e => { setAuditFilter(f => ({ ...f, fechaDesde: e.target.value })); setAuditPage(1); }}
                      className={`h-8 text-xs rounded border px-2 ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300'}`}
                      placeholder="Desde"
                    />
                    <input
                      type="date"
                      value={auditFilter.fechaHasta}
                      onChange={e => { setAuditFilter(f => ({ ...f, fechaHasta: e.target.value })); setAuditPage(1); }}
                      className={`h-8 text-xs rounded border px-2 ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300'}`}
                      placeholder="Hasta"
                    />
                    {(auditFilter.accion || auditFilter.fechaDesde || auditFilter.fechaHasta) && (
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setAuditFilter({ accion: "", usuarioId: "", entidad: "", fechaDesde: "", fechaHasta: "" }); setAuditPage(1); }}>
                        Limpiar
                      </Button>
                    )}
                    <span className={`text-xs ml-auto ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {auditTotal} registro(s)
                    </span>
                  </div>
                  <div className={`rounded border overflow-x-auto ${darkMode ? 'border-slate-700' : ''}`}>
                    <table className="w-full text-xs">
                      <thead><tr className={darkMode ? 'bg-slate-800' : 'bg-slate-100'}>
                        <th className="p-2 text-left">Fecha</th>
                        <th className="p-2 text-left">Usuario</th>
                        <th className="p-2 text-left">Acción</th>
                        <th className="p-2 text-left">Grado</th>
                      </tr></thead>
                      <tbody>
                        {auditLoading ? <tr><td colSpan={4} className="p-4 text-center text-slate-500">Cargando...</td></tr> :
                          auditLogs.length === 0 ? <tr><td colSpan={4} className="p-4 text-center text-slate-500">No hay registros</td></tr> :
                          auditLogs.map((log) => (
                            <tr key={log.id} className={`border-t ${darkMode ? 'border-slate-700' : ''}`}>
                              <td className="p-2 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('es-DO')}</td>
                              <td className="p-2 font-medium">{log.usuario?.nombre || 'Desconocido'}</td>
                              <td className="p-2">
                                <Badge variant={log.accion === 'DELETE' ? 'destructive' : 'default'} className={`text-[10px] ${log.accion === 'DELETE' ? '' : (darkMode ? 'bg-teal-600' : 'bg-teal-600')}`}>
                                  {log.accion === 'DELETE' ? 'Borró' : 'Digitó'}
                                </Badge>
                              </td>
                              <td className={`p-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{log.grado || '—'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {auditTotalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        Página {auditPage} de {auditTotalPages}
                      </span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={auditPage <= 1} onClick={() => setAuditPage(p => Math.max(1, p - 1))}>
                          Anterior
                        </Button>
                        {Array.from({ length: Math.min(5, auditTotalPages) }, (_, i) => {
                          let pageNum: number;
                          if (auditTotalPages <= 5) {
                            pageNum = i + 1;
                          } else if (auditPage <= 3) {
                            pageNum = i + 1;
                          } else if (auditPage >= auditTotalPages - 2) {
                            pageNum = auditTotalPages - 4 + i;
                          } else {
                            pageNum = auditPage - 2 + i;
                          }
                          return (
                            <Button key={pageNum} size="sm" variant={auditPage === pageNum ? "default" : "outline"} className={`h-7 w-7 text-xs p-0 ${auditPage === pageNum ? '' : (darkMode ? 'border-slate-600' : '')}`} onClick={() => setAuditPage(pageNum)}>
                              {pageNum}
                            </Button>
                          );
                        })}
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={auditPage >= auditTotalPages} onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))}>
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Dialogs */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className={`max-w-sm mx-4 ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
          <DialogHeader><DialogTitle className="text-base">Configurar Actividades</DialogTitle><DialogDescription className="text-sm">Define cuántas actividades y sus porcentajes por trimestre.</DialogDescription></DialogHeader>
          {editConfig && <div className="space-y-3">
            <div><Label className="text-sm">Actividades Cotidianas</Label><div className="flex items-center gap-2 mt-1"><Input type="number" min="1" max="10" value={editConfig.numActividadesCotidianas} onChange={e => setEditConfig({...editConfig, numActividadesCotidianas: parseInt(e.target.value) || 1})} className={`w-16 h-11 text-base ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}`} /><span className="text-sm">u.</span><Input type="number" min="0" max="100" value={editConfig.porcentajeAC} onChange={e => setEditConfig({...editConfig, porcentajeAC: parseFloat(e.target.value) || 0})} className={`w-16 h-11 text-base ml-auto ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}`} /><span className="text-sm">%</span></div></div>
            <div><Label className="text-sm">Actividades Integradoras</Label><div className="flex items-center gap-2 mt-1"><Input type="number" min="1" max="10" value={editConfig.numActividadesIntegradoras} onChange={e => setEditConfig({...editConfig, numActividadesIntegradoras: parseInt(e.target.value) || 1})} className={`w-16 h-11 text-base ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}`} /><span className="text-sm">u.</span><Input type="number" min="0" max="100" value={editConfig.porcentajeAI} onChange={e => setEditConfig({...editConfig, porcentajeAI: parseFloat(e.target.value) || 0})} className={`w-16 h-11 text-base ml-auto ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}`} /><span className="text-sm">%</span></div></div>
            <div className="flex items-center justify-between"><Label className="text-sm">Examen</Label><div className="flex items-center gap-2"><input type="checkbox" checked={editConfig.tieneExamen} onChange={e => setEditConfig({...editConfig, tieneExamen: e.target.checked})} className="h-5 w-5" />{editConfig.tieneExamen && <><Input type="number" min="0" max="100" value={editConfig.porcentajeExamen} onChange={e => setEditConfig({...editConfig, porcentajeExamen: parseFloat(e.target.value) || 0})} className={`w-16 h-11 text-base ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}`} /><span className="text-sm">%</span></>}</div></div>
            <div className={`p-3 rounded-lg text-sm flex justify-between ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><span>Total:</span><span className={`font-bold ${Math.abs(editConfig.porcentajeAC + editConfig.porcentajeAI + (editConfig.tieneExamen ? editConfig.porcentajeExamen : 0) - 100) > 0.1 ? 'text-red-500' : (darkMode ? 'text-teal-400' : 'text-teal-600')}`}>{(editConfig.porcentajeAC + editConfig.porcentajeAI + (editConfig.tieneExamen ? editConfig.porcentajeExamen : 0)).toFixed(1)}%</span></div>
            <div className={`flex items-center gap-2 mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <input type="checkbox" id="aplicarATodas" checked={configAplicarATodas} onChange={e => setConfigAplicarATodas(e.target.checked)} className="h-5 w-5 text-teal-600" />
              <Label htmlFor="aplicarATodas" className="text-sm font-medium">Aplicar a todas las materias de este grado</Label>
            </div>
          </div>}
          <DialogFooter className="flex-row gap-2 sm:gap-0"><Button variant="outline" size="sm" className="flex-1 sm:flex-initial" onClick={() => setConfigDialogOpen(false)}>Cancelar</Button><Button size="sm" className="flex-1 sm:flex-initial bg-teal-600" onClick={handleSaveConfig}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className={`max-w-lg ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
          <DialogHeader><DialogTitle>Importar Calificaciones</DialogTitle><DialogDescription>Carga un archivo CSV con las notas de los estudiantes.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={generateTemplate} className={`flex-1 text-xs ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}><Download className="h-3.5 w-3.5 mr-1" />Plantilla</Button>
              <Button size="sm" variant="outline" onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()} className={`flex-1 text-xs ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}><Upload className="h-3.5 w-3.5 mr-1" />Cargar</Button>
              <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            </div>
            {importData && <pre className={`p-2 rounded max-h-32 overflow-auto text-[10px] ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>{importData.slice(0, 500)}</pre>}
            <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Primera fila: Estudiante, AC1, AC2... AI1... Examen. Filas siguientes: datos.</p>
          </div>
          <DialogFooter><Button variant="outline" size="sm" onClick={() => { setImportDialogOpen(false); setImportData(""); }}>Cancelar</Button><Button size="sm" onClick={handleImport} disabled={!importData} className="bg-teal-600">Importar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogo para borrar calificaciones */}
      <Dialog open={borrarCalifDialogOpen} onOpenChange={setBorrarCalifDialogOpen}>
        <DialogContent className={`sm:max-w-[400px] ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2"><Trash2 className="h-5 w-5" />Borrar Calificaciones</DialogTitle>
            <DialogDescription>
              {borrarCalifTipo === "grado" 
                ? `Esto borrará TODAS las calificaciones del grado "${estudiantes[0]?.nombre ? 'seleccionado' : ''}" en la materia y trimestre seleccionados. Esta acción no se puede deshacer.`
                : "Esto borrará las calificaciones del estudiante seleccionado. Esta acción no se puede deshacer."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBorrarCalifDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={borrarCalifTipo === "grado" ? handleBorrarCalifGrado : handleBorrarCalifAlumno} disabled={borrarCalifLoading}>
              {borrarCalifLoading ? "Borrando..." : "Borrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogo para restablecer contraseña */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className={`sm:max-w-[400px] ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
          <DialogHeader>
            <DialogTitle>Restablecer Contraseña</DialogTitle>
            <DialogDescription>Nueva contraseña para: <strong>{resetPasswordUser?.nombre}</strong></DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Nueva Contraseña</Label>
            <Input 
              type="password"
              value={resetPasswordForm.password}
              onChange={(e) => setResetPasswordForm({ password: e.target.value })}
              placeholder="Ingresa la nueva contraseña"
              className={`mt-1 ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}`}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleResetPassword} disabled={resetPasswordLoading || !resetPasswordForm.password} className="bg-teal-600">
              {resetPasswordLoading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogo de perfil de usuario */}
      <Dialog open={perfilDialogOpen} onOpenChange={setPerfilDialogOpen}>
        <DialogContent className={`max-w-md ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Mi Perfil</DialogTitle>
            <DialogDescription>Información de tu cuenta y asignaciones.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className={`p-4 rounded-lg space-y-3 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <div>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Nombre</p>
                <p className={`font-medium text-lg ${darkMode ? 'text-white' : ''}`}>{usuario.nombre}</p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Email</p>
                <p className={`font-medium ${darkMode ? 'text-white' : ''}`}>{usuario.email}</p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Rol</p>
                <p className={`font-medium capitalize ${darkMode ? 'text-white' : ''}`}>{usuario.rol}</p>
              </div>
            </div>
            
            {usuario.gradosAsignados && usuario.gradosAsignados.length > 0 && (
              <div>
                <p className={`text-xs mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Grados como Tutor</p>
                <div className="flex flex-wrap gap-1">
                  {usuario.gradosAsignados.map((g: any) => (
                    <Badge key={g.id} variant="outline" className={darkMode ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50'}>{g.numero}° "{g.seccion}"</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {usuario.asignaturasAsignadas && usuario.asignaturasAsignadas.length > 0 && (
              <div>
                <p className={`text-xs mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Materias Asignadas</p>
                <div className="flex flex-wrap gap-1">
                  {usuario.asignaturasAsignadas.map((m: any) => (
                    <Badge key={m.id} variant="outline" className={darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : ''}>{m.nombre} ({m.gradoNumero}°)</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {(!usuario.gradosAsignados || usuario.gradosAsignados.length === 0) && 
             (!usuario.asignaturasAsignadas || usuario.asignaturasAsignadas.length === 0) && (
              <p className={`text-sm italic ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>No tienes grados o materias asignados. Contacta al administrador.</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setPerfilDialogOpen(false)} className="bg-teal-600">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className={`py-2 text-center text-xs hidden md:block ${darkMode ? 'bg-[#1e293b] text-slate-500' : 'bg-slate-800 text-slate-400'}`}>© 2026 Centro Escolar Católico San José de la Montaña</footer>

      {/* Bottom Nav Bar para Móviles */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t flex justify-around items-center px-1 py-1.5 z-50 safe-area-bottom ${darkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200'}`} aria-label="Navegación principal">
        <button onClick={() => { setActiveTab("dashboard"); saveUserState({ activeTab: "dashboard" }); }} aria-label="Ir a Dashboard" className={`flex flex-col items-center p-1.5 px-2 rounded-xl transition-colors ${activeTab === "dashboard" ? (darkMode ? "text-teal-400 bg-slate-800" : "text-teal-700 bg-teal-50") : (darkMode ? "text-slate-500" : "text-slate-500")}`}><LayoutDashboard className="h-5 w-5 mb-0.5" /><span className="text-[9px] sm:text-[10px] font-medium">Inicio</span></button>
        <button onClick={() => { setActiveTab("calificaciones"); saveUserState({ activeTab: "calificaciones" }); }} aria-label="Ir a Calificaciones" className={`flex flex-col items-center p-1.5 px-2 rounded-xl transition-colors ${activeTab === "calificaciones" ? (darkMode ? "text-teal-400 bg-slate-800" : "text-teal-700 bg-teal-50") : (darkMode ? "text-slate-500" : "text-slate-500")}`}><ClipboardList className="h-5 w-5 mb-0.5" /><span className="text-[9px] sm:text-[10px] font-medium">Notas</span></button>
        <button onClick={() => { setActiveTab("asistencia"); saveUserState({ activeTab: "asistencia" }); }} aria-label="Ir a Asistencia" className={`flex flex-col items-center p-1.5 px-2 rounded-xl transition-colors ${activeTab === "asistencia" ? (darkMode ? "text-teal-400 bg-slate-800" : "text-teal-700 bg-teal-50") : (darkMode ? "text-slate-500" : "text-slate-500")}`}><CalendarDays className="h-5 w-5 mb-0.5" /><span className="text-[9px] sm:text-[10px] font-medium">Lista</span></button>
        <button onClick={() => { setActiveTab("estudiantes"); saveUserState({ activeTab: "estudiantes" }); }} aria-label="Ir a Estudiantes" className={`flex flex-col items-center p-1.5 px-2 rounded-xl transition-colors ${activeTab === "estudiantes" ? (darkMode ? "text-teal-400 bg-slate-800" : "text-teal-700 bg-teal-50") : (darkMode ? "text-slate-500" : "text-slate-500")}`}><Users className="h-5 w-5 mb-0.5" /><span className="text-[9px] sm:text-[10px] font-medium">Alumnos</span></button>
        {usuario.rol === "admin" && (
          <button onClick={() => { setActiveTab("admin"); saveUserState({ activeTab: "admin" }); }} aria-label="Ir a Administración" className={`flex flex-col items-center p-1.5 px-2 rounded-xl transition-colors ${activeTab === "admin" ? (darkMode ? "text-teal-400 bg-slate-800" : "text-teal-700 bg-teal-50") : (darkMode ? "text-slate-500" : "text-slate-500")}`}><Settings className="h-5 w-5 mb-0.5" /><span className="text-[9px] sm:text-[10px] font-medium">Admin</span></button>
        )}
      </nav>
    </div>
  );
}

// Componentes
const NotaInput = React.memo(({ value, onChange, darkMode }: { value: string | number; onChange: (v: string) => void; darkMode: boolean }) => {
  const inputBg = darkMode ? 'focus:bg-slate-700/60 text-white placeholder-slate-500' : 'focus:bg-teal-50/60 placeholder-slate-300';
  return (
    <input
      type="number"
      inputMode="decimal"
      min="0"
      max="10"
      step="0.1"
      className={`w-10 sm:w-12 h-7 sm:h-8 text-xs sm:text-sm font-medium text-center border border-transparent focus:border-teal-400/50 bg-transparent rounded-md transition-all ${inputBg}`}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
});

const CalificacionRow = React.memo(function CalificacionRow({ estudiante, materiaId, trimestre, calificacion, config, onSave, saving, darkMode, evenRow, isAdmin, onBorrar }: { estudiante: Estudiante; materiaId: string; trimestre: string; calificacion?: Calificacion; config: ConfigActividadPartial | null; onSave: (id: string, matId: string, data: { actividadesCotidianas: (number | null)[]; actividadesIntegradoras: (number | null)[]; examenTrimestral: number | null; recuperacion: number | null; }) => void; saving: boolean; darkMode: boolean; evenRow: boolean; isAdmin?: boolean; onBorrar?: (estudianteId: string) => void; }) {
  const numAC = config?.numActividadesCotidianas ?? 4;
  const numAI = config?.numActividadesIntegradoras ?? 1;
  const tieneExamen = config?.tieneExamen ?? true;
  
  const key = `${materiaId}-${trimestre}-${calificacion?.id || 'none'}-${numAC}-${numAI}`;
  
  const [acNotas, setAcNotas] = useState<(number | null)[]>(() => parseNotas(calificacion?.actividadesCotidianas ?? null, numAC));
  const [aiNotas, setAiNotas] = useState<(number | null)[]>(() => parseNotas(calificacion?.actividadesIntegradoras ?? null, numAI));
  const [examen, setExamen] = useState<number | null>(() => calificacion?.examenTrimestral ?? null);
  const [recup, setRecup] = useState<number | null>(() => calificacion?.recuperacion ?? null);
  const [dirty, setDirty] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      const newAC = parseNotas(calificacion?.actividadesCotidianas ?? null, numAC);
      const newAI = parseNotas(calificacion?.actividadesIntegradoras ?? null, numAI);
      const newEx = calificacion?.examenTrimestral ?? null;
      const newRc = calificacion?.recuperacion ?? null;
      setAcNotas(newAC);
      setAiNotas(newAI);
      setExamen(newEx);
      setRecup(newRc);
      setDirty(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [key, numAC, numAI, calificacion?.actividadesCotidianas, calificacion?.actividadesIntegradoras, calificacion?.examenTrimestral, calificacion?.recuperacion]);
  
  const stateRef = useRef({ dirty, acNotas, aiNotas, examen, recup });
  useEffect(() => { stateRef.current = { dirty, acNotas, aiNotas, examen, recup }; }, [dirty, acNotas, aiNotas, examen, recup]);

  const promAC = calcularPromedio(acNotas), promAI = calcularPromedio(aiNotas);
  const promACPeso = config && promAC !== null ? promAC * (config.porcentajeAC / 100) : (promAC !== null ? promAC * 0.35 : null);
  const promAIPeso = config && promAI !== null ? promAI * (config.porcentajeAI / 100) : (promAI !== null ? promAI * 0.30 : null);
  const promExPeso = config && config.tieneExamen && examen !== null ? examen * (config.porcentajeExamen / 100) : (examen !== null ? examen * 0.35 : null);
  const promFinal = config ? calcularPromedioFinal(promAC, promAI, examen, config, recup) : (promAC !== null || promAI !== null || examen !== null ? ((promAC ?? 0) * 0.35 + (promAI ?? 0) * 0.30 + (examen ?? 0) * 0.35) : null);
  const parseVal = useCallback((v: string): number | null => { const n = parseFloat(v); return isNaN(n) ? null : Math.min(10, Math.max(0, n)); }, []);
  
  const updateAC = useCallback((i: number, v: string) => { setAcNotas(n => { const arr = [...n]; arr[i] = parseVal(v); return arr; }); setDirty(true); }, [parseVal]);
  const updateAI = useCallback((i: number, v: string) => { setAiNotas(n => { const arr = [...n]; arr[i] = parseVal(v); return arr; }); setDirty(true); }, [parseVal]);
  const handleExamen = useCallback((v: string) => { setExamen(parseVal(v)); setDirty(true); }, [parseVal]);
  const handleRecup = useCallback((v: string) => { setRecup(parseVal(v)); setDirty(true); }, [parseVal]);

  useEffect(() => {
    return () => {
      if (stateRef.current.dirty) {
        onSave(estudiante.id, materiaId, { actividadesCotidianas: stateRef.current.acNotas, actividadesIntegradoras: stateRef.current.aiNotas, examenTrimestral: stateRef.current.examen, recuperacion: stateRef.current.recup });
      }
    };
  }, [estudiante.id, materiaId, onSave]);

  useEffect(() => {
    if (!dirty) return;
    const handler = setTimeout(() => {
      onSave(estudiante.id, materiaId, { actividadesCotidianas: stateRef.current.acNotas, actividadesIntegradoras: stateRef.current.aiNotas, examenTrimestral: stateRef.current.examen, recuperacion: stateRef.current.recup });
      setDirty(false);
    }, 800);
    return () => clearTimeout(handler);
  }, [acNotas, aiNotas, examen, recup, dirty, estudiante.id, materiaId, onSave]);

  const rowBg = evenRow
    ? (darkMode ? 'bg-[#1e293b] hover:bg-slate-700/80' : 'bg-white hover:bg-slate-50')
    : (darkMode ? 'bg-slate-800/60 hover:bg-slate-700/80' : 'bg-slate-50/50 hover:bg-slate-100');
  const cellBorder = darkMode ? 'border-slate-600/60' : 'border-slate-200';
  const stickyBg = evenRow
    ? (darkMode ? 'bg-[#1e293b]' : 'bg-white')
    : (darkMode ? 'bg-slate-800/60' : 'bg-slate-50/50');
  const promACBg = darkMode ? 'bg-blue-900/50' : 'bg-blue-50/70';
  const promAIBg = darkMode ? 'bg-purple-900/50' : 'bg-purple-50/70';
  const promExBg = darkMode ? 'bg-amber-900/50' : 'bg-amber-50/70';
  const finalBg = darkMode ? 'bg-emerald-900/60' : 'bg-emerald-50/80';
  const hasData = acNotas.some(n=>n!==null) || aiNotas.some(n=>n!==null) || examen!==null;
  const statusIcon = saving && dirty ? <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 text-teal-500 animate-spin mx-auto" /> : (!dirty && hasData) ? <span title="Guardado">✅</span> : <span className={darkMode ? 'text-slate-600' : 'text-slate-300'}>-</span>;
  const finalBadgeClass = promFinal !== null && promFinal >= 6 ? (darkMode ? 'bg-emerald-700/80 text-emerald-100 ring-1 ring-emerald-500' : 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200') : promFinal !== null ? (darkMode ? 'bg-rose-700/80 text-rose-100 ring-1 ring-rose-500' : 'bg-rose-100 text-rose-800 ring-1 ring-rose-200') : (darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400');

  if (!config) {
    return (
      <tr className={`border-b transition-colors ${rowBg}`}>
        <td className={`p-2 text-center font-semibold sticky-col shadow-right left-0 z-10 border-r ${stickyBg} ${cellBorder}`}>{estudiante.numero}</td>
        <td className={`p-2 font-medium sticky-col shadow-right left-10 z-10 whitespace-nowrap border-r ${stickyBg} ${cellBorder}`}>{estudiante.nombre}</td>
        {Array.from({ length: numAC }).map((_, i) => <td key={`ac-${i}`} className={`p-1 border-l ${cellBorder}`}><NotaInput value={acNotas[i] ?? ""} onChange={v => updateAC(i, v)} darkMode={darkMode} /></td>)}
        <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promACBg} text-base`}>{promACPeso !== null ? promACPeso.toFixed(2) : "-"}</td>
        {Array.from({ length: numAI }).map((_, i) => <td key={`ai-${i}`} className={`p-1 border-l ${cellBorder}`}><NotaInput value={aiNotas[i] ?? ""} onChange={v => updateAI(i, v)} darkMode={darkMode} /></td>)}
        <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promAIBg} text-base`}>{promAIPeso !== null ? promAIPeso.toFixed(2) : "-"}</td>
        {tieneExamen && <td className={`p-1 border-l ${cellBorder}`}><NotaInput value={examen ?? ""} onChange={handleExamen} darkMode={darkMode} /></td>}
        {tieneExamen && <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promExBg} text-base`}>{promExPeso !== null ? promExPeso.toFixed(2) : "-"}</td>}
        <td className={`p-1 border-l ${cellBorder}`}><NotaInput value={recup ?? ""} onChange={handleRecup} darkMode={darkMode} /></td>
        <td className={`p-2 text-center border-l ${cellBorder} ${finalBg}`}><span className={`inline-block px-2 py-0.5 rounded-md text-xs sm:text-sm font-bold shadow ${finalBadgeClass}`}>{promFinal !== null ? promFinal.toFixed(2) : "-"}</span></td>
        <td className={`p-2 border-l ${cellBorder} text-center`}>{statusIcon}</td>
        {isAdmin && onBorrar && <td className={`p-1 border-l ${cellBorder} text-center`}><button onClick={() => onBorrar(estudiante.id)} title="Borrar calificaciones de este alumno" className="text-red-500 hover:text-red-700 p-1">🗑️</button></td>}
      </tr>
    );
  }

  return (
    <tr className={`border-b transition-colors ${rowBg}`}>
      <td className={`p-2 text-center font-semibold sticky-col shadow-right left-0 z-10 border-r ${stickyBg} ${cellBorder}`}>{estudiante.numero}</td>
      <td className={`p-2 font-medium sticky-col shadow-right left-10 z-10 whitespace-nowrap border-r ${stickyBg} ${cellBorder}`}>{estudiante.nombre}</td>
      {acNotas.map((n, i) => <td key={`ac-${i}`} className={`p-1 border-l ${cellBorder}`}><NotaInput value={n ?? ""} onChange={v => updateAC(i, v)} darkMode={darkMode} /></td>)}
      <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promACBg} text-sm sm:text-base`}>{promACPeso !== null ? promACPeso.toFixed(2) : "-"}</td>
      {aiNotas.map((n, i) => <td key={`ai-${i}`} className={`p-1 border-l ${cellBorder}`}><NotaInput value={n ?? ""} onChange={v => updateAI(i, v)} darkMode={darkMode} /></td>)}
      <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promAIBg} text-sm sm:text-base`}>{promAIPeso !== null ? promAIPeso.toFixed(2) : "-"}</td>
      {config.tieneExamen && <td className={`p-1 border-l ${cellBorder}`}><NotaInput value={examen ?? ""} onChange={handleExamen} darkMode={darkMode} /></td>}
      {config.tieneExamen && <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promExBg} text-sm sm:text-base`}>{promExPeso !== null ? promExPeso.toFixed(2) : "-"}</td>}
      <td className={`p-1 border-l ${cellBorder}`}><NotaInput value={recup ?? ""} onChange={handleRecup} darkMode={darkMode} /></td>
      <td className={`p-2 text-center border-l ${cellBorder} ${finalBg}`}><span className={`inline-block px-2 py-0.5 rounded-md text-xs sm:text-sm font-bold shadow ${finalBadgeClass}`}>{promFinal !== null ? promFinal.toFixed(2) : "-"}</span></td>
      <td className={`p-2 border-l ${cellBorder} text-center`}>{statusIcon}</td>
    </tr>
  );
});

interface SortableEstudianteRowProps {
  est: Estudiante;
  idx: number;
  estudiantes: Estudiante[];
  darkMode: boolean;
  onDelete: () => void;
  onReorder: (nuevos: Estudiante[]) => void;
}

function BoletaList({ estudiantes, calificaciones, materias, grado, trimestre, expandedBoleta, setExpandedBoleta, darkMode }: { estudiantes: Estudiante[]; calificaciones: Calificacion[]; materias: Asignatura[]; grado?: Grado; trimestre: number; expandedBoleta: string | null; setExpandedBoleta: (id: string | null) => void; darkMode: boolean; }) {
  const [resumenAsistencia, setResumenAsistencia] = useState<any[]>([]);
  const [todasCalificaciones, setTodasCalificaciones] = useState<Calificacion[]>([]);
  const [resumenAsistenciaAnual, setResumenAsistenciaAnual] = useState<any[]>([]);
  const [loadingAsistencia, setLoadingAsistencia] = useState(true);
  const [loadingAnual, setLoadingAnual] = useState(true);

  useEffect(() => {
    const fetchAsistencia = async () => {
      if (!grado?.id) return;
      setLoadingAsistencia(true);
      try {
        const res = await fetch(`/api/asistencia/resumen?gradoId=${grado.id}&trimestre=${trimestre}`, { credentials: "include" });
        if (res.ok) setResumenAsistencia(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoadingAsistencia(false); }
    };
    fetchAsistencia();
  }, [grado?.id, trimestre]);

  useEffect(() => {
    const fetchDatosAnuales = async () => {
      if (!grado?.id) return;
      setLoadingAnual(true);
      try {
        const resCal = await fetch(`/api/calificaciones?gradoId=${grado.id}`, { credentials: "include" });
        if (resCal.ok) setTodasCalificaciones(await resCal.json());
        
        const resAsist = await fetch(`/api/asistencia/resumen?gradoId=${grado.id}&anual=true`, { credentials: "include" });
        if (resAsist.ok) setResumenAsistenciaAnual(await resAsist.json());
      } catch (e) { console.error(e); }
      finally { setLoadingAnual(false); }
    };
    fetchDatosAnuales();
  }, [grado?.id]);

  const getCalifs = (id: string) => todasCalificaciones.length > 0 
    ? todasCalificaciones.filter(c => c.estudianteId === id && c.trimestre === trimestre)
    : calificaciones.filter(c => c.estudianteId === id && c.trimestre === trimestre);
  const calcProm = (c: Calificacion[]) => { 
    const notas = materias.map(m => {
      const cal = c.find(x => x.materiaId === m.id);
      if (!cal || cal.promedioFinal === null || cal.promedioFinal === undefined) return null;
      return cal.promedioFinal;
    }).filter((x): x is number => x !== null && x > 0);
    return notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null; 
  };
  
  const getTrimestreRomano = (t: number) => {
    const romanos = ['I', 'II', 'III'];
    return romanos[t - 1] || t.toString();
  };

  const getEstadoFinal = (promedio: number | null) => {
    if (promedio === null) return 'PENDIENTE';
    return promedio >= 6 ? 'APROBADO' : 'REPROBADO';
  };

  const getAsistInfo = (id: string) => resumenAsistencia.find(r => r.id === id) || { asistencias: 0, ausencias: 0, tardanzas: 0, total: 0 };

  const imprimir = async (id: string) => {
    const est = estudiantes.find(e => e.id === id);
    if (!est) return;
    const califs = getCalifs(id);

    const prom = calcProm(califs);
    const estadoFinal = getEstadoFinal(prom);
    const año = grado?.año || new Date().getFullYear();
    const fechaImpresion = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });

    // Crear tabla de asignaturas
    let tablaAsignaturas = materias.map(m => {
      const c = califs.find(x => x.materiaId === m.id);
      const notaFinal = c?.promedioFinal?.toFixed(1) ?? '-';
      const recupVal = c?.recuperacion !== null && c?.recuperacion !== undefined ? c.recuperacion.toFixed(1) : '-';
      const estado = c?.promedioFinal !== null && c?.promedioFinal !== undefined 
        ? (c.promedioFinal >= 6 ? 'A' : 'R') 
        : '-';
      return `<tr>
        <td style="text-align:left;padding:6px 8px">${m.nombre}</td>
        <td>${c?.calificacionAC?.toFixed(1) ?? '-'}</td>
        <td>${c?.calificacionAI?.toFixed(1) ?? '-'}</td>
        <td>${c?.examenTrimestral?.toFixed(1) ?? '-'}</td>
        <td>${recupVal}</td>
        <td style="font-weight:bold">${notaFinal}</td>
        <td style="font-weight:bold;color:${estado === 'A' ? '#059669' : estado === 'R' ? '#dc2626' : '#666'}">${estado}</td>
      </tr>`;
    }).join('');

    const asist = getAsistInfo(id);

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Boleta de Calificaciones - ${est.nombre}</title>
  <style>
    @page { size: letter; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #333; }
    .boleta { max-width: 190mm; margin: 0 auto; padding: 5mm; }
    
    .header { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 15px; }
    .logo { width: 70px; height: 70px; object-fit: contain; }
    .header-text { text-align: center; flex: 1; }
    .header-text h1 { font-size: 13pt; font-weight: bold; margin-bottom: 3px; text-transform: uppercase; }
    .header-text h2 { font-size: 10pt; font-weight: normal; margin-bottom: 2px; }
    .header-text .codigo { font-size: 8pt; color: #555; }
    
    .titulo-boleta { text-align: center; background: #f3f4f6; padding: 8px; margin: 15px 0; border: 1px solid #333; }
    .titulo-boleta h3 { font-size: 12pt; text-transform: uppercase; letter-spacing: 1px; }
    
    .info-estudiante { display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px; background: #fafafa; border: 1px solid #ddd; border-radius: 4px; }
    .info-estudiante p { margin: 3px 0; }
    .info-estudiante .label { font-weight: bold; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th, td { border: 1px solid #333; padding: 5px 8px; text-align: center; }
    th { background: #e5e7eb; font-weight: bold; font-size: 9pt; }
    td { font-size: 10pt; }
    
    .resumen { display: flex; justify-content: space-between; margin: 20px 0; padding: 10px; background: #f0fdf4; border: 2px solid #059669; border-radius: 4px; }
    .resumen-item { text-align: center; }
    .resumen-item .valor { font-size: 16pt; font-weight: bold; color: #059669; }
    .resumen-item.reprobado .valor { color: #dc2626; }
    .resumen-item .etiqueta { font-size: 9pt; color: #666; }
    
    .seccion-asistencia { margin: 15px 0; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
    .seccion-asistencia-header { background: #f8fafc; padding: 6px 10px; border-bottom: 1px solid #ddd; font-weight: bold; font-size: 9pt; display: flex; justify-content: space-between; }
    .asistencia-grid { display: grid; grid-template-columns: repeat(4, 1fr); padding: 10px; text-align: center; }
    .asistencia-item .n { font-size: 12pt; font-weight: bold; }
    .asistencia-item .l { font-size: 8pt; color: #666; text-transform: uppercase; }
    .asistencia-asist { color: #059669; }
    .asistencia-aus { color: #dc2626; }
    .asistencia-tard { color: #d97706; }
    
    .firmas { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
    .firma { text-align: center; width: 45%; }
    .firma .linea { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; }
    .firma .nombre { font-weight: bold; font-size: 10pt; }
    .firma .cargo { font-size: 8pt; color: #555; }
    
    .pie { margin-top: 30px; text-align: center; font-size: 8pt; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
    .pie p { margin: 2px 0; }
    
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="boleta">
    <div class="header">
      <img src="${window.location.origin}/api/logo" alt="Logo" class="logo" onerror="this.style.display='none'">
      <div class="header-text">
        <h1>Centro Escolar Católico San José de la Montaña</h1>
        <h2>Centro Educativo Católico</h2>
        <p class="codigo">Código: 88125 | Departamento: 06-San Salvador | Municipio: 0614 San Salvador</p>
      </div>
      <img src="${window.location.origin}/api/logo" alt="Logo" class="logo" onerror="this.style.display='none'">
    </div>

    <div class="titulo-boleta">
      <h3>Boleta de Calificaciones - Trimestre ${getTrimestreRomano(trimestre)}</h3>
    </div>

    <div class="info-estudiante">
      <div>
        <p><span class="label">Estudiante:</span> ${est.nombre}</p>
        <p><span class="label">Grado:</span> ${grado?.numero}° Grado "${grado?.seccion}"</p>
      </div>
      <div style="text-align: right;">
        <p><span class="label">Año Lectivo:</span> ${año}</p>
        <p><span class="label">N° de Lista:</span> ${est.numero}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 32%">Asignatura</th>
          <th style="width: 11%">Prom. A.C.<br><small>(35%)</small></th>
          <th style="width: 11%">Prom. A.I.<br><small>(35%)</small></th>
          <th style="width: 11%">Examen<br><small>(30%)</small></th>
          <th style="width: 10%">Recup.</th>
          <th style="width: 12%">Promedio<br>Final</th>
          <th style="width: 13%">Estado</th>
        </tr>
      </thead>
      <tbody>
        ${tablaAsignaturas}
      </tbody>
    </table>

    <div class="seccion-asistencia">
      <div class="seccion-asistencia-header">
        <span>RESUMEN DE ASISTENCIA</span>
        <span>Período: Trimestre ${getTrimestreRomano(trimestre)}</span>
      </div>
      <div class="asistencia-grid">
        <div class="asistencia-item">
          <div class="n asistencia-asist">${asist.asistencias}</div>
          <div class="l">Asistencias</div>
        </div>
        <div class="asistencia-item">
          <div class="n asistencia-aus">${asist.ausencias}</div>
          <div class="l">Inasistencias</div>
        </div>
        <div class="asistencia-item">
          <div class="n asistencia-tard">${asist.tardanzas}</div>
          <div class="l">Tardanzas</div>
        </div>
        <div class="asistencia-item">
          <div class="n">${asist.total}</div>
          <div class="l">Total Días</div>
        </div>
      </div>
    </div>

    <div class="resumen">
      <div class="resumen-item">
        <div class="valor">${prom?.toFixed(2) ?? 'N/A'}</div>
        <div class="etiqueta">Promedio General</div>
      </div>
      <div class="resumen-item ${estadoFinal === 'REPROBADO' ? 'reprobado' : ''}">
        <div class="valor">${estadoFinal}</div>
        <div class="etiqueta">Estado Final</div>
      </div>
      <div class="resumen-item">
        <div class="valor">${getTrimestreRomano(trimestre)} Trimestre</div>
        <div class="etiqueta">Período Evaluado</div>
      </div>
    </div>

    <div class="firmas">
      <div class="firma">
        <div class="linea">
          <p class="nombre">________________________________</p>
          <p class="cargo">Firma del Docente</p>
        </div>
      </div>
      <div class="firma">
        <div class="linea">
          <p class="nombre">________________________________</p>
          <p class="cargo">Firma de la Directora</p>
          <p class="cargo">Centro Escolar Católico San José de la Montaña</p>
        </div>
      </div>
    </div>

    <div class="pie">
      <p>Fecha de impresión: ${fechaImpresion}</p>
      <p>Código: 88125 | Departamento: 06-San Salvador | Municipio: 0614 San Salvador</p>
    </div>
  </div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  };

  const imprimirTodas = async () => {
    if (!estudiantes.length) return;
    
    let allBoletasHtml = '';
    const año = grado?.año || new Date().getFullYear();
    const fechaImpresion = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });

    for (const est of estudiantes) {
      const califs = getCalifs(est.id);
      const prom = calcProm(califs);
      const estadoFinal = getEstadoFinal(prom);
      const asist = getAsistInfo(est.id);

      let tablaAsignaturas = materias.map(m => {
        const c = califs.find(x => x.materiaId === m.id);
        const notaFinal = c?.promedioFinal?.toFixed(1) ?? '-';
        const recupVal = c?.recuperacion !== null && c?.recuperacion !== undefined ? c.recuperacion.toFixed(1) : '-';
        const estado = c?.promedioFinal !== null && c?.promedioFinal !== undefined 
          ? (c.promedioFinal >= 6 ? 'A' : 'R') 
          : '-';
        return `<tr>
          <td style="text-align:left;padding:6px 8px">${m.nombre}</td>
          <td>${c?.calificacionAC?.toFixed(1) ?? '-'}</td>
          <td>${c?.calificacionAI?.toFixed(1) ?? '-'}</td>
          <td>${c?.examenTrimestral?.toFixed(1) ?? '-'}</td>
          <td>${recupVal}</td>
          <td style="font-weight:bold">${notaFinal}</td>
          <td style="font-weight:bold;color:${estado === 'A' ? '#059669' : estado === 'R' ? '#dc2626' : '#666'}">${estado}</td>
        </tr>`;
      }).join('');

      allBoletasHtml += `
      <div class="boleta" style="page-break-after: always;">
        <div class="header">
          <img src="${window.location.origin}/api/logo" alt="Logo" class="logo" onerror="this.style.display='none'">
          <div class="header-text">
            <h1>Centro Escolar Católico San José de la Montaña</h1>
            <h2>Centro Educativo Católico</h2>
            <p class="codigo">Código: 88125 | Departamento: 06-San Salvador | Municipio: 0614 San Salvador</p>
          </div>
          <img src="${window.location.origin}/api/logo" alt="Logo" class="logo" onerror="this.style.display='none'">
        </div>

        <div class="titulo-boleta">
          <h3>Boleta de Calificaciones - Trimestre ${getTrimestreRomano(trimestre)}</h3>
        </div>

        <div class="info-estudiante">
          <div>
            <p><span class="label">Estudiante:</span> ${est.nombre}</p>
            <p><span class="label">Grado:</span> ${grado?.numero}° Grado "${grado?.seccion}"</p>
          </div>
          <div style="text-align: right;">
            <p><span class="label">Año Lectivo:</span> ${año}</p>
            <p><span class="label">N° de Lista:</span> ${est.numero}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 32%">Asignatura</th>
              <th style="width: 11%">Prom. A.C.<br><small>(35%)</small></th>
              <th style="width: 11%">Prom. A.I.<br><small>(35%)</small></th>
              <th style="width: 11%">Examen<br><small>(30%)</small></th>
              <th style="width: 10%">Recup.</th>
              <th style="width: 12%">Promedio<br>Final</th>
              <th style="width: 13%">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${tablaAsignaturas}
          </tbody>
        </table>

        <div class="seccion-asistencia">
          <div class="seccion-asistencia-header">
            <span>RESUMEN DE ASISTENCIA</span>
            <span>Período: Trimestre ${getTrimestreRomano(trimestre)}</span>
          </div>
          <div class="asistencia-grid">
            <div class="asistencia-item">
              <div class="n asistencia-asist">${asist.asistencias}</div>
              <div class="l">Asistencias</div>
            </div>
            <div class="asistencia-item">
              <div class="n asistencia-aus">${asist.ausencias}</div>
              <div class="l">Inasistencias</div>
            </div>
            <div class="asistencia-item">
              <div class="n asistencia-tard">${asist.tardanzas}</div>
              <div class="l">Tardanzas</div>
            </div>
            <div class="asistencia-item">
              <div class="n">${asist.total}</div>
              <div class="l">Total Días</div>
            </div>
          </div>
        </div>

        <div class="resumen">
          <div class="resumen-item">
            <div class="valor">${prom?.toFixed(2) ?? 'N/A'}</div>
            <div class="etiqueta">Promedio General</div>
          </div>
          <div class="resumen-item ${estadoFinal === 'REPROBADO' ? 'reprobado' : ''}">
            <div class="valor">${estadoFinal}</div>
            <div class="etiqueta">Estado Final</div>
          </div>
          <div class="resumen-item">
            <div class="valor">${getTrimestreRomano(trimestre)} Trimestre</div>
            <div class="etiqueta">Período Evaluado</div>
          </div>
        </div>

        <div class="firmas">
          <div class="firma">
            <div class="linea">
              <p class="nombre">________________________________</p>
              <p class="cargo">Firma del Docente</p>
            </div>
          </div>
          <div class="firma">
            <div class="linea">
              <p class="nombre">________________________________</p>
              <p class="cargo">Firma de la Directora</p>
              <p class="cargo">Centro Escolar Católico San José de la Montaña</p>
            </div>
          </div>
        </div>

        <div class="pie">
          <p>Fecha de impresión: ${fechaImpresion}</p>
          <p>Código: 88125 | Departamento: 06-San Salvador | Municipio: 0614 San Salvador</p>
        </div>
      </div>`;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Boletas de Calificaciones - ${grado?.numero}° ${grado?.seccion}</title>
  <style>
    @page { size: letter; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #333; }
    .boleta { max-width: 190mm; margin: 0 auto; padding: 5mm; }
    
    .header { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 15px; }
    .logo { width: 70px; height: 70px; object-fit: contain; }
    .header-text { text-align: center; flex: 1; }
    .header-text h1 { font-size: 13pt; font-weight: bold; margin-bottom: 3px; text-transform: uppercase; }
    .header-text h2 { font-size: 10pt; font-weight: normal; margin-bottom: 2px; }
    .header-text .codigo { font-size: 8pt; color: #555; }
    
    .titulo-boleta { text-align: center; background: #f3f4f6; padding: 8px; margin: 15px 0; border: 1px solid #333; }
    .titulo-boleta h3 { font-size: 12pt; text-transform: uppercase; letter-spacing: 1px; }
    
    .info-estudiante { display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px; background: #fafafa; border: 1px solid #ddd; border-radius: 4px; }
    .info-estudiante p { margin: 3px 0; }
    .info-estudiante .label { font-weight: bold; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th, td { border: 1px solid #333; padding: 5px 8px; text-align: center; }
    th { background: #e5e7eb; font-weight: bold; font-size: 9pt; }
    td { font-size: 10pt; }
    
    .resumen { display: flex; justify-content: space-between; margin: 20px 0; padding: 10px; background: #f0fdf4; border: 2px solid #059669; border-radius: 4px; }
    .resumen-item { text-align: center; }
    .resumen-item .valor { font-size: 16pt; font-weight: bold; color: #059669; }
    .resumen-item.reprobado .valor { color: #dc2626; }
    .resumen-item .etiqueta { font-size: 9pt; color: #666; }
    
    .firmas { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
    .firma { text-align: center; width: 45%; }
    .firma .linea { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; }
    .firma .nombre { font-weight: bold; font-size: 10pt; }
    .firma .cargo { font-size: 8pt; color: #555; }
    
    .pie { margin-top: 30px; text-align: center; font-size: 8pt; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
    .pie p { margin: 2px 0; }
    
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  ${allBoletasHtml}
</body>
</html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  };

  const imprimirAnual = async (id: string) => {
    const est = estudiantes.find(e => e.id === id);
    if (!est) return;
    
    const año = grado?.año || new Date().getFullYear();
    const fechaImpresion = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });
    const asistAnual = resumenAsistenciaAnual.find(r => r.id === id) || { asistencias: 0, ausencias: 0, tardanzas: 0, total: 0 };

    // Filtrar calificaciones de este estudiante para todo el año
    const califsEst = todasCalificaciones.filter(c => c.estudianteId === id);

    let tablaAsignaturas = materias.map(m => {
      const c1 = califsEst.find(c => c.materiaId === m.id && c.trimestre === 1);
      const c2 = califsEst.find(c => c.materiaId === m.id && c.trimestre === 2);
      const c3 = califsEst.find(c => c.materiaId === m.id && c.trimestre === 3);
      
      const n1 = c1?.promedioFinal;
      const n2 = c2?.promedioFinal;
      const n3 = c3?.promedioFinal;
      
      const notasValidas = [n1, n2, n3].filter((n): n is number => n !== null && n !== undefined);
      const promAnual = notasValidas.length ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length : null;
      const estado = promAnual !== null ? (promAnual >= 6 ? 'APROBADO' : 'REPROBADO') : '-';

      return `<tr>
        <td style="text-align:left;padding:6px 8px">${m.nombre}</td>
        <td>${n1?.toFixed(1) ?? '-'}</td>
        <td>${n2?.toFixed(1) ?? '-'}</td>
        <td>${n3?.toFixed(1) ?? '-'}</td>
        <td style="font-weight:bold">${promAnual?.toFixed(1) ?? '-'}</td>
        <td style="font-weight:bold;color:${estado === 'APROBADO' ? '#059669' : estado === 'REPROBADO' ? '#dc2626' : '#666'}">${estado}</td>
      </tr>`;
    }).join('');

    const promGralAnual = () => {
      const notasFinales = materias.map(m => {
        const califs = califsEst.filter(c => c.materiaId === m.id);
        const sums = califs.map(c => c.promedioFinal).filter((n): n is number => n !== null && n !== undefined);
        return sums.length ? sums.reduce((a, b) => a + b, 0) / sums.length : null;
      }).filter((n): n is number => n !== null);
      return notasFinales.length ? notasFinales.reduce((a, b) => a + b, 0) / notasFinales.length : null;
    };

    const pFinal = promGralAnual();

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Boleta Anual Consolidada - ${est.nombre}</title>
  <style>
    @page { size: letter; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #333; }
    .boleta { max-width: 190mm; margin: 0 auto; padding: 5mm; }
    .header { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 15px; }
    .logo { width: 70px; height: 70px; object-fit: contain; }
    .header-text { text-align: center; flex: 1; }
    .header-text h1 { font-size: 13pt; font-weight: bold; margin-bottom: 3px; text-transform: uppercase; }
    .titulo-boleta { text-align: center; background: #1e293b; color: white; padding: 8px; margin: 15px 0; border: 1px solid #333; }
    .info-estudiante { display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; }
    .info-estudiante .label { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th, td { border: 1px solid #333; padding: 6px; text-align: center; }
    th { background: #e5e7eb; font-weight: bold; font-size: 9pt; }
    .resumen-anual { display: flex; justify-content: space-between; margin: 20px 0; padding: 15px; background: #f8fafc; border: 2px solid #1e293b; }
    .resumen-item .valor { font-size: 18pt; font-weight: bold; }
    .seccion-asistencia { margin: 15px 0; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
    .seccion-asistencia-header { background: #f8fafc; padding: 6px 10px; border-bottom: 1px solid #ddd; font-weight: bold; font-size: 9pt; }
    .asistencia-grid { display: grid; grid-template-columns: repeat(4, 1fr); padding: 10px; text-align: center; }
    .asistencia-item .n { font-size: 12pt; font-weight: bold; }
    .asistencia-item .l { font-size: 8pt; color: #666; }
    .firmas { display: flex; justify-content: space-between; margin-top: 50px; }
    .firma { text-align: center; width: 45%; border-top: 1px solid #333; padding-top: 5px; }
  </style>
</head>
<body>
  <div class="boleta">
    <div class="header">
      <img src="${window.location.origin}/api/logo" alt="Logo" class="logo">
      <div class="header-text">
        <h1>Centro Escolar Católico San José de la Montaña</h1>
        <p>Código: 88125 | San Salvador</p>
      </div>
      <img src="${window.location.origin}/api/logo" alt="Logo" class="logo">
    </div>
    <div class="titulo-boleta">
      <h3>BOLETA DE CALIFICACIONES CONSOLIDADA - ANUAL</h3>
    </div>
    <div class="info-estudiante">
      <div>
        <p><span class="label">Estudiante:</span> ${est.nombre}</p>
        <p><span class="label">Grado:</span> ${grado?.numero}° Grado "${grado?.seccion}"</p>
      </div>
      <div style="text-align: right;">
        <p><span class="label">Año Lectivo:</span> ${año}</p>
        <p><span class="label">N° Lista:</span> ${est.numero}</p>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 35%">Asignatura</th>
          <th style="width: 12%">Trim. I</th>
          <th style="width: 12%">Trim. II</th>
          <th style="width: 12%">Trim. III</th>
          <th style="width: 14%">Promedio Anual</th>
          <th style="width: 15%">Resultado</th>
        </tr>
      </thead>
      <tbody>
        ${tablaAsignaturas}
      </tbody>
    </table>
    <div class="seccion-asistencia">
      <div class="seccion-asistencia-header">RESUMEN DE ASISTENCIA ANUAL (TOTAL ACUMULADO)</div>
      <div class="asistencia-grid">
        <div class="asistencia-item"><div class="n" style="color:#059669">${asistAnual.asistencias}</div><div class="l">Asistencias</div></div>
        <div class="asistencia-item"><div class="n" style="color:#dc2626">${asistAnual.ausencias}</div><div class="l">Inasistencias</div></div>
        <div class="asistencia-item"><div class="n" style="color:#d97706">${asistAnual.tardanzas}</div><div class="l">Tardanzas</div></div>
        <div class="asistencia-item"><div class="n">${asistAnual.total}</div><div class="l">Total Días</div></div>
      </div>
    </div>
    <div class="resumen-anual">
      <div class="resumen-item">
        <div class="valor" style="color:#1e293b">${pFinal?.toFixed(2) ?? 'N/A'}</div>
        <div class="etiqueta">PROMEDIO FINAL ANUAL</div>
      </div>
      <div class="resumen-item">
        <div class="valor" style="color:${pFinal && pFinal >= 6 ? '#059669' : '#dc2626'}">${pFinal && pFinal >= 6 ? 'APROBADO' : 'REPROBADO'}</div>
        <div class="etiqueta">ESTADO FINAL</div>
      </div>
    </div>
    <div class="firmas">
      <div class="firma"><p>Firma del Docente</p></div>
      <div class="firma"><p>Firma de la Directora</p></div>
    </div>
  </div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  const imprimirTodasAnual = async () => {
    if (!estudiantes.length) return;
    
    let allBoletasHtml = '';
    const año = grado?.año || new Date().getFullYear();
    const fechaImpresion = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });

    for (const est of estudiantes) {
      const asistAnual = resumenAsistenciaAnual.find(r => r.id === est.id) || { asistencias: 0, ausencias: 0, tardanzas: 0, total: 0 };
      const califsEst = todasCalificaciones.filter(c => c.estudianteId === est.id);

      let tablaAsignaturas = materias.map(m => {
        const c1 = califsEst.find(c => c.materiaId === m.id && c.trimestre === 1);
        const c2 = califsEst.find(c => c.materiaId === m.id && c.trimestre === 2);
        const c3 = califsEst.find(c => c.materiaId === m.id && c.trimestre === 3);
        const n1 = c1?.promedioFinal, n2 = c2?.promedioFinal, n3 = c3?.promedioFinal;
        const notasValidas = [n1, n2, n3].filter((n): n is number => n !== null && n !== undefined);
        const promAnual = notasValidas.length ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length : null;
        const estado = promAnual !== null ? (promAnual >= 6 ? 'APROBADO' : 'REPROBADO') : '-';
        return `<tr><td style="text-align:left;padding:6px 8px">${m.nombre}</td><td>${n1?.toFixed(1) ?? '-'}</td><td>${n2?.toFixed(1) ?? '-'}</td><td>${n3?.toFixed(1) ?? '-'}</td><td style="font-weight:bold">${promAnual?.toFixed(1) ?? '-'}</td><td style="font-weight:bold;color:${estado === 'APROBADO' ? '#059669' : estado === 'REPROBADO' ? '#dc2626' : '#666'}">${estado}</td></tr>`;
      }).join('');

      const notasFinales = materias.map(m => {
        const califs = califsEst.filter(c => c.materiaId === m.id);
        const sums = califs.map(c => c.promedioFinal).filter((n): n is number => n !== null && n !== undefined);
        return sums.length ? sums.reduce((a, b) => a + b, 0) / sums.length : null;
      }).filter((n): n is number => n !== null);
      const pFinal = notasFinales.length ? notasFinales.reduce((a, b) => a + b, 0) / notasFinales.length : null;

      allBoletasHtml += `
      <div class="boleta" style="page-break-after: always;">
        <div class="header">
          <img src="${window.location.origin}/api/logo" alt="Logo" class="logo">
          <div class="header-text"><h1>Centro Escolar Católico San José de la Montaña</h1><p>Código: 88125 | San Salvador</p></div>
          <img src="${window.location.origin}/api/logo" alt="Logo" class="logo">
        </div>
        <div class="titulo-boleta"><h3>BOLETA DE CALIFICACIONES CONSOLIDADA - ANUAL</h3></div>
        <div class="info-estudiante">
          <div><p><span class="label">Estudiante:</span> ${est.nombre}</p><p><span class="label">Grado:</span> ${grado?.numero}° Grado "${grado?.seccion}"</p></div>
          <div style="text-align: right;"><p><span class="label">Año Lectivo:</span> ${año}</p><p><span class="label">N° Lista:</span> ${est.numero}</p></div>
        </div>
        <table>
          <thead><tr><th style="width: 35%">Asignatura</th><th style="width: 12%">Trim. I</th><th style="width: 12%">Trim. II</th><th style="width: 12%">Trim. III</th><th style="width: 14%">Promedio Anual</th><th style="width: 15%">Resultado</th></tr></thead>
          <tbody>${tablaAsignaturas}</tbody>
        </table>
        <div class="seccion-asistencia">
          <div class="seccion-asistencia-header">RESUMEN DE ASISTENCIA ANUAL (TOTAL ACUMULADO)</div>
          <div class="asistencia-grid">
            <div class="asistencia-item"><div class="n" style="color:#059669">${asistAnual.asistencias}</div><div class="l">Asistencias</div></div>
            <div class="asistencia-item"><div class="n" style="color:#dc2626">${asistAnual.ausencias}</div><div class="l">Inasistencias</div></div>
            <div class="asistencia-item"><div class="n" style="color:#d97706">${asistAnual.tardanzas}</div><div class="l">Tardanzas</div></div>
            <div class="asistencia-item"><div class="n">${asistAnual.total}</div><div class="l">Total Días</div></div>
          </div>
        </div>
        <div class="resumen-anual">
          <div class="resumen-item"><div class="valor" style="color:#1e293b">${pFinal?.toFixed(2) ?? 'N/A'}</div><div class="etiqueta">PROMEDIO FINAL ANUAL</div></div>
          <div class="resumen-item"><div class="valor" style="color:${pFinal && pFinal >= 6 ? '#059669' : '#dc2626'}">${pFinal && pFinal >= 6 ? 'APROBADO' : 'REPROBADO'}</div><div class="etiqueta">ESTADO FINAL</div></div>
        </div>
        <div class="firmas"><div class="firma"><p>Firma del Docente</p></div><div class="firma"><p>Firma de la Directora</p></div></div>
      </div>`;
    }

    const html = `<!DOCTYPE html><html><head><title>Boletas Consolidadas - ${grado?.numero}° ${grado?.seccion}</title>
    <style>
      @page { size: letter; margin: 15mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #333; }
      .boleta { max-width: 190mm; margin: 0 auto; padding: 5mm; }
      .header { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 15px; }
      .logo { width: 70px; height: 70px; object-fit: contain; }
      .header-text { text-align: center; flex: 1; }
      .header-text h1 { font-size: 13pt; font-weight: bold; margin-bottom: 3px; text-transform: uppercase; }
      .titulo-boleta { text-align: center; background: #1e293b; color: white; padding: 8px; margin: 15px 0; border: 1px solid #333; }
      .info-estudiante { display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; }
      .info-estudiante .label { font-weight: bold; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
      th, td { border: 1px solid #333; padding: 6px; text-align: center; }
      th { background: #e5e7eb; font-weight: bold; font-size: 9pt; }
      .resumen-anual { display: flex; justify-content: space-between; margin: 20px 0; padding: 15px; background: #f8fafc; border: 2px solid #1e293b; }
      .resumen-item .valor { font-size: 18pt; font-weight: bold; }
      .seccion-asistencia { margin: 15px 0; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
      .seccion-asistencia-header { background: #f8fafc; padding: 6px 10px; border-bottom: 1px solid #ddd; font-weight: bold; font-size: 9pt; }
      .asistencia-grid { display: grid; grid-template-columns: repeat(4, 1fr); padding: 10px; text-align: center; }
      .asistencia-item .n { font-size: 12pt; font-weight: bold; }
      .asistencia-item .l { font-size: 8pt; color: #666; }
      .firmas { display: flex; justify-content: space-between; margin-top: 50px; }
      .firma { text-align: center; width: 45%; border-top: 1px solid #333; padding-top: 5px; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>${allBoletasHtml}</body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  return (
    <div className="space-y-1.5">
      {(loadingAsistencia || loadingAnual) && (
        <div className="space-y-2 mb-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className={`shadow-sm ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
              <div className="p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className={`h-3 w-5 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <Skeleton className={`h-3 w-36 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <Skeleton className={`h-4 w-16 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className={`h-6 w-14 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <Skeleton className={`h-6 w-14 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <Skeleton className={`h-4 w-4 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {(estudiantes || []).map(est => {
        const califs = getCalifs(est.id), prom = calcProm(califs), open = expandedBoleta === est.id;
        return (
          <Card key={est.id} className={`shadow-sm ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
            <div className={`p-2.5 flex items-center justify-between cursor-pointer ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`} onClick={() => setExpandedBoleta(open ? null : est.id)}>
              <div className="flex items-center gap-2"><span className={`text-xs w-5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{est.numero}</span><span className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-white' : ''}`}>{est.nombre}</span><Badge variant={prom !== null && prom >= 6 ? "default" : prom !== null ? "destructive" : "secondary"} className={`text-[10px] h-5 ${prom !== null && prom >= 6 ? (darkMode ? 'bg-teal-600' : 'bg-teal-600') : ''}`}>Prom: {prom !== null ? prom.toFixed(1) : "N/A"}</Badge></div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" title="Consolidado Anual" className={`h-6 px-2 text-xs ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} onClick={e => { e.stopPropagation(); imprimirAnual(est.id); }}>
                  <FileText className="h-3.5 w-3.5 mr-1" />Anual
                </Button>
                <Button size="sm" variant="ghost" title="Imprimir Trimestre" className={`h-6 px-2 text-xs ${darkMode ? 'text-slate-300' : ''}`} onClick={e => { e.stopPropagation(); imprimir(est.id); }}>
                  <Printer className="h-3 w-3 mr-1" />Boleta
                </Button>
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
            {open && <div className={`border-t p-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50'}`}><Table className="text-xs"><TableHeader><TableRow className={`h-7 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}><TableHead>Asignatura</TableHead><TableHead className="text-center">Prom. A.C.</TableHead><TableHead className="text-center">Prom. A.I.</TableHead><TableHead className="text-center">Examen</TableHead><TableHead className="text-center">Recup.</TableHead><TableHead className="text-center font-bold">Promedio</TableHead></TableRow></TableHeader><TableBody>{materias.map(m => { const c = califs.find(x => x.materiaId === m.id); return <TableRow key={m.id} className={`h-7 ${darkMode ? 'border-slate-700' : ''}`}><TableCell className={`font-medium ${darkMode ? 'text-white' : ''}`}>{m.nombre}</TableCell><TableCell className="text-center">{c?.calificacionAC?.toFixed(1) ?? "-"}</TableCell><TableCell className="text-center">{c?.calificacionAI?.toFixed(1) ?? "-"}</TableCell><TableCell className="text-center">{c?.examenTrimestral?.toFixed(1) ?? "-"}</TableCell><TableCell className="text-center">{c?.recuperacion !== null && c?.recuperacion !== undefined ? c.recuperacion.toFixed(1) : "-"}</TableCell><TableCell className="text-center"><Badge variant={c?.promedioFinal !== null && c?.promedioFinal !== undefined && c.promedioFinal >= 6 ? "default" : "secondary"} className={`text-[10px] ${c?.promedioFinal !== null && c?.promedioFinal !== undefined && c.promedioFinal >= 6 ? 'bg-teal-600' : ''}`}>{c?.promedioFinal?.toFixed(1) ?? "-"}</Badge></TableCell></TableRow>; })}</TableBody></Table></div>}
          </Card>
        );
      })}
    </div>
  );
}
