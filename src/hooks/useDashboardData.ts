"use client";

import { useState, useEffect, useCallback, useRef, useMemo, useDeferredValue } from "react";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { isAdmin, canDeleteUsers } from "@/utils/roleHelpers";
import { isSuperAdmin } from "@/utils/roleHelpers";
import { parseNotas, contarEstados } from "@/utils/gradeCalculations";
import type { Usuario, UsuarioSesion, Estudiante, Asignatura, AsignaturaConGrado, Calificacion, Grado, ConfigActividad, ConfigActividadPartial, ConfiguracionSistema } from "@/types";

interface UserState {
  activeTab?: string;
  gradoSeleccionado?: string;
  asignaturaSeleccionada?: string;
  trimestreSeleccionado?: string;
}

function saveUserState(state: UserState) {
  if (typeof window === "undefined") return;
  try {
    const key = "ss_userState";
    const existing = JSON.parse(localStorage.getItem(key) || "{}");
    localStorage.setItem(key, JSON.stringify({ ...existing, ...state }));
  } catch { }
}

function loadUserState(): UserState {
  if (typeof window === "undefined") return {};
  try {
    const key = "ss_userState";
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch { return {}; }
}

export function useDashboardData() {
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === "dark";

  // Auth state (local for login flow)
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [escuelaSeleccionada, setEscuelaSeleccionada] = useState<string>("");
  const [escuelas, setEscuelas] = useState<any[]>([]);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Data
  const [grados, setGrados] = useState<Grado[]>([]);
  const [gradosFiltrados, setGradosFiltrados] = useState<Grado[]>([]);
  const [asignaturasFiltradas, setAsignaturasFiltradas] = useState<Asignatura[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [todasAsignaturas, setTodasAsignaturas] = useState<AsignaturaConGrado[]>([]);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [configActual, setConfigActual] = useState<ConfigActividadPartial | null>(null);
  const [configsGrado, setConfigsGrado] = useState<ConfigActividad[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);

  // Selections
  const [gradoSeleccionado, setGradoSeleccionado] = useState<string>("");
  const [trimestreSeleccionado, setTrimestreSeleccionado] = useState<string>("");
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState<string>("");

  // UI
  const [activeTab, setActiveTab] = useState("dashboard");
  const checkIsAdmin = (rol: string) => isAdmin(rol);
  const checkCanDeleteUsers = (user: typeof usuario) => canDeleteUsers(user);
  const canDelete = checkCanDeleteUsers;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [listaDialogOpen, setListaDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editUsuarioId, setEditUsuarioId] = useState<string | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ actual: "", nueva: "", confirmar: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [nuevoEstudiante, setNuevoEstudiante] = useState({ nombre: "", email: "" });
  const [listaEstudiantes, setListaEstudiantes] = useState("");
  const [saving, setSaving] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const navItems = [
    { value: "dashboard", icon: undefined, label: "Inicio" },
    { value: "calificaciones", icon: undefined, label: "Notas" },
    { value: "asistencia", icon: undefined, label: "Lista" },
    { value: "estudiantes", icon: undefined, label: "Alumnos" },
    { value: "boletas", icon: undefined, label: "Boletas" },
    { value: "enlaces", icon: undefined, label: "Enlaces" },
    { value: "reportes", icon: undefined, label: "Reportes" },
    ...(usuario?.rol && isAdmin(usuario.rol) ? [{ value: "avance", icon: undefined, label: "Avance" }] : []),
    ...(usuario?.rol && isAdmin(usuario.rol) ? [{ value: "admin", icon: undefined, label: "Admin" }] : []),
  ];

  const [materiasEnBoleta, setMateriasEnBoleta] = useState<string[]>([]);
  const [mostrarRecuperacion, setMostrarRecuperacion] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const r = localStorage.getItem("ss_mostrarRecuperacion");
        return r !== null ? JSON.parse(r) : true;
      } catch { return true; }
    }
    return true;
  });

  const [expandedBoleta, setExpandedBoleta] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<ConfigActividadPartial | null>(null);
  const [configAplicarATodas, setConfigAplicarATodas] = useState(false);
  const [importData, setImportData] = useState("");
  const [nuevoUsuario, setNuevoUsuario] = useState({ email: "", password: "", nombre: "", rol: "docente", materiasAsignadas: [] as string[] });
  const [configuracion, setConfiguracion] = useState<ConfiguracionSistema | null>(null);
  const [nuevoAño, setNuevoAño] = useState(2026);
  const [añoDialogOpen, setAñoDialogOpen] = useState(false);
  const [añoLoading, setAñoLoading] = useState(false);

  const [umbrales, setUmbrales] = useState({
    umbralRecuperacion: 5.0,
    umbralCondicionado: 4.5,
    umbralAprobado: 6.5,
    notaMinima: 0.0,
    notaMaxima: 10.0,
    maxHistorialCelda: 10,
    usarIntervaloReprobado: true,
    usarIntervaloCondicionado: true,
    usarIntervaloAprobado: true,
  });
  const [umbralesLoading, setUmbralesLoading] = useState(false);

  const [fechasTrimestres, setFechasTrimestres] = useState({
    fechaInicioT1: null as string | null,
    fechaFinT1: null as string | null,
    fechaInicioT2: null as string | null,
    fechaFinT2: null as string | null,
    fechaInicioT3: null as string | null,
    fechaFinT3: null as string | null,
  });
  const [fechasTrimestresLoading, setFechasTrimestresLoading] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<{ id: string; nombre: string } | null>(null);
  const [resetPasswordForm, setResetPasswordForm] = useState({ password: "docente123" });
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [perfilDialogOpen, setPerfilDialogOpen] = useState(false);
  const [borrarCalifDialogOpen, setBorrarCalifDialogOpen] = useState(false);
  const [borrarCalifTipo, setBorrarCalifTipo] = useState<"alumno" | "grado" | null>(null);
  const [borrarCalifEstudianteId, setBorrarCalifEstudianteId] = useState<string | null>(null);
  const [borrarCalifLoading, setBorrarCalifLoading] = useState(false);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const emitActionRef = useRef<(accion: string, descripcion: string, extra?: { grado?: string; asignatura?: string; estudiante?: string }) => void>(() => {});
  const handlePresenceEmit = useCallback((emit: typeof emitActionRef.current) => {
    emitActionRef.current = emit;
  }, []);

  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [promedioDecimal, setPromedioDecimal] = useState<boolean>(false);
  const [paperSize, setPaperSize] = useState<"letter" | "a4">("letter");
  const [incluirAsistenciaBoleta, setIncluirAsistenciaBoleta] = useState<boolean>(true);
  const [incluirAsistenciaManual, setIncluirAsistenciaManual] = useState<boolean>(false);
  const [asistenciaManualHabilitado, setAsistenciaManualHabilitado] = useState<boolean>(false);
  const [asistenciaManualData, setAsistenciaManualData] = useState<{[key: string]: { asistencias: string; inasistencias: string; tardanzas: string; justificadas: string; totalDias: string; observaciones: string }}>({});
  const [tipoAsistencia, setTipoAsistencia] = useState<"auto" | "manual_espacio" | "manual_digital">("auto");
  const [mostrarAsistencia, setMostrarAsistencia] = useState<boolean>(true);
  const observacionesSaveTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const asistenciaManualDataRef = useRef(asistenciaManualData);
  const gradoSeleccionadoRef = useRef(gradoSeleccionado);

  const [promedioAsignatura, setPromedioAsignatura] = useState<number | null>(null);


  const [busquedaEstudiante, setBusquedaEstudiante] = useState("");
  const busquedaDeferred = useDeferredValue(busquedaEstudiante);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState({ accion: "", usuarioId: "", entidad: "", fechaDesde: "", fechaHasta: "" });
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);

  const [historialPopup, setHistorialPopup] = useState<{
    calificacionId: string;
    tipoCampo: string;
    campoLabel: string;
    anchorRef: React.RefObject<HTMLElement | null>;
  } | null>(null);
  const activeHistoryCell = historialPopup
    ? { calificacionId: historialPopup.calificacionId, tipoCampo: historialPopup.tipoCampo }
    : null;

  // Load persisted state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const tb = localStorage.getItem("ss_tab");
      if (tb) {
        queueMicrotask(() => setActiveTab(tb));
      } else if (usuario && isSuperAdmin(usuario.rol)) {
        queueMicrotask(() => setActiveTab("superadmin"));
      }
      const gr = localStorage.getItem("ss_grado"); if (gr) queueMicrotask(() => setGradoSeleccionado(gr));
      const mt = localStorage.getItem("ss_materia"); if (mt) queueMicrotask(() => setAsignaturaSeleccionada(mt));
      const tr = localStorage.getItem("ss_trimestre"); if (tr) queueMicrotask(() => setTrimestreSeleccionado(tr));

      const wizardDismissed = localStorage.getItem("ss_wizard_dismissed");
      const wizardShownThisSession = sessionStorage.getItem("ss_wizard_shown_session");

      if (!wizardDismissed && !wizardShownThisSession && usuario) {
        queueMicrotask(() => setShowWizard(true));
        sessionStorage.setItem("ss_wizard_shown_session", "true");
      }
    }
  }, [usuario]);

  // Persist selections
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("ss_tab", activeTab);
    if (gradoSeleccionado) localStorage.setItem("ss_grado", gradoSeleccionado);
    if (asignaturaSeleccionada) localStorage.setItem("ss_materia", asignaturaSeleccionada);
    if (trimestreSeleccionado) localStorage.setItem("ss_trimestre", trimestreSeleccionado);
    localStorage.setItem("ss_promedio_decimal", JSON.stringify(promedioDecimal));
    localStorage.setItem("ss_paperSize", paperSize);
    localStorage.setItem("ss_tipoAsistencia", JSON.stringify(tipoAsistencia));
    localStorage.setItem("ss_asistenciaManualData", JSON.stringify(asistenciaManualData));
  }, [activeTab, gradoSeleccionado, asignaturaSeleccionada, trimestreSeleccionado, promedioDecimal, paperSize, tipoAsistencia, asistenciaManualData]);

  // Load persisted state from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ss_promedio_decimal");
      if (saved !== null) { try { queueMicrotask(() => setPromedioDecimal(JSON.parse(saved))); } catch { } }
      const savedPaperSize = localStorage.getItem("ss_paperSize");
      if (savedPaperSize === "a4" || savedPaperSize === "letter") { queueMicrotask(() => setPaperSize(savedPaperSize)); }
      const savedTipoAsistencia = localStorage.getItem("ss_tipoAsistencia");
      if (savedTipoAsistencia) {
        try {
          const parsed = JSON.parse(savedTipoAsistencia);
          if (["auto", "manual_espacio", "manual_digital"].includes(parsed)) { queueMicrotask(() => setTipoAsistencia(parsed)); }
        } catch { }
      } else {
        const savedIncluirAsistencia = localStorage.getItem("ss_incluirAsistenciaBoleta");
        if (savedIncluirAsistencia) { try { queueMicrotask(() => setIncluirAsistenciaBoleta(JSON.parse(savedIncluirAsistencia))); } catch { } }
        const savedAsistenciaManual = localStorage.getItem("ss_incluirAsistenciaManual");
        if (savedAsistenciaManual) { try { queueMicrotask(() => setIncluirAsistenciaManual(JSON.parse(savedAsistenciaManual))); } catch { } }
        const savedAsistManualEnabled = localStorage.getItem("ss_asistenciaManualHabilitado");
        if (savedAsistManualEnabled) { try { queueMicrotask(() => setAsistenciaManualHabilitado(JSON.parse(savedAsistManualEnabled))); } catch { } }
      }
      const savedAsistManualData = localStorage.getItem("ss_asistenciaManualData");
      if (savedAsistManualData) { try { queueMicrotask(() => setAsistenciaManualData(JSON.parse(savedAsistManualData))); } catch { } }
    }
  }, []);

  useEffect(() => { asistenciaManualDataRef.current = asistenciaManualData; }, [asistenciaManualData]);

  useEffect(() => { gradoSeleccionadoRef.current = gradoSeleccionado; }, [gradoSeleccionado]);

  // Al cambiar de grado: primero forzar guardado pendiente, luego limpiar estado
  useEffect(() => {
    if (gradoSeleccionadoRef.current && gradoSeleccionadoRef.current !== gradoSeleccionado) {
      const oldGradoId = gradoSeleccionadoRef.current;
      const data = asistenciaManualDataRef.current;
      const effectiveTrimestre = trimestreSeleccionado || "1";
      const gradoOld = gradosFiltrados.find(g => g.id === oldGradoId);
      const año = gradoOld?.año || new Date().getFullYear();
      for (const [estudianteId, entry] of Object.entries(data)) {
        if (!entry) continue;
        const tieneDatos = entry.observaciones || entry.asistencias || entry.inasistencias || entry.tardanzas || entry.justificadas || entry.totalDias;
        if (!tieneDatos) continue;
        const blob = new Blob([JSON.stringify({ estudianteId, gradoId: oldGradoId, trimestre: effectiveTrimestre, año, ...entry })], { type: "application/json" });
        navigator.sendBeacon("/api/observaciones", blob);
      }
      observacionesSaveTimersRef.current.forEach(t => clearTimeout(t));
      observacionesSaveTimersRef.current.clear();
      setAsistenciaManualData({});
    }
  }, [gradoSeleccionado, trimestreSeleccionado, gradosFiltrados]);

  // Load observaciones
  useEffect(() => {
    if (!gradoSeleccionado) return;
    const effectiveTrimestre = trimestreSeleccionado || "1";
    const grado = gradosFiltrados.find(g => g.id === gradoSeleccionado);
    if (!grado) return;
    const año = grado.año || new Date().getFullYear();
    const controller = new AbortController();
    fetch(`/api/observaciones?gradoId=${gradoSeleccionado}&trimestre=${effectiveTrimestre}&año=${año}`, {
      credentials: "include", signal: controller.signal,
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data || controller.signal.aborted) return;
        setAsistenciaManualData(prev => {
          const updated = { ...prev };
          for (const [estudianteId, entry] of Object.entries(data as Record<string, any>)) {
            updated[estudianteId] = {
              asistencias: entry.asistencias ?? prev[estudianteId]?.asistencias ?? '',
              inasistencias: entry.inasistencias ?? prev[estudianteId]?.inasistencias ?? '',
              tardanzas: entry.tardanzas ?? prev[estudianteId]?.tardanzas ?? '',
              justificadas: entry.justificadas ?? prev[estudianteId]?.justificadas ?? '',
              totalDias: entry.totalDias ?? prev[estudianteId]?.totalDias ?? '',
              observaciones: entry.observaciones || prev[estudianteId]?.observaciones || '',
            };
          }
          return updated;
        });
      })
      .catch(err => { if (err?.name !== 'AbortError') console.error("Error loading observaciones:", err); });
    return () => controller.abort();
  }, [gradoSeleccionado, trimestreSeleccionado, gradosFiltrados]);

  // Auth
  const checkAuth = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store", signal: controller.signal, credentials: "include" });
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

  useEffect(() => { checkAuth(); }, []);

  const initSystem = async () => {
    try {
      const res = await fetch("/api/init", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Sistema inicializado", description: "Usuario administrador creado correctamente" });
        setInitialized(true);
      } else {
        toast({ title: data.error || "Error al inicializar", variant: "destructive" });
      }
    } catch { toast({ title: "Error al inicializar", variant: "destructive" }); }
  };

  const handleGoogleLogin = async (response: any) => {
    setGoogleLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (res.ok && data.usuario) {
        setUsuario(data.usuario);
        if (isSuperAdmin(data.usuario.rol)) {
          setActiveTab("superadmin");
        }
      } else {
        setLoginError(data.error || "Error al iniciar sesión con Google");
      }
    } catch { setLoginError("Error de conexión"); }
    finally { setGoogleLoading(false); }
  };

  const initGoogleButton = () => {
    if (!googleButtonRef.current || !(window as any).google) return;
    (window as any).google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "588360712961-5r5mloqlefuq7nghgetgcr18evctl3sp.apps.googleusercontent.com",
      callback: handleGoogleLogin,
      auto_select: false,
    });
    (window as any).google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      width: "100%",
      text: "signin_with",
      shape: "rectangular",
      logo_alignment: "center",
    });
  };

  const promptGoogleLogin = () => {
    if (typeof window === "undefined" || !(window as any).google) return;
    (window as any).google.accounts.id.prompt();
  };

  useEffect(() => {
    if (typeof window === "undefined" || usuario) return;
    if ((window as any).google) {
      queueMicrotask(() => initGoogleButton());
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => queueMicrotask(() => initGoogleButton());
    document.head.appendChild(script);
  }, [usuario, initialized]);

  useEffect(() => {
    fetch("/api/init", { cache: "no-store" })
      .then(res => res.json())
      .then(data => { if (data.initialized) setInitialized(true); })
      .catch(() => {});
  }, []);

  // Cargar escuelas disponibles
  useEffect(() => {
    fetch("/api/escuelas", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (data.escuelas && data.escuelas.length > 0) {
          setEscuelas(data.escuelas);
        }
      })
      .catch(() => {});
  }, []);

  // Data loading functions
  const loadGrados = useCallback(async () => {
    try {
      const res = await fetch("/api/grados", { cache: "no-store", credentials: "include" });
      if (res.ok) { const data = await res.json(); setGrados(data); }
      else { console.error("Error al cargar grados:", res.status); setGrados([]); }
    } catch { console.error("Error al cargar grados"); setGrados([]); }
  }, []);

  const loadEstudiantes = useCallback(async () => {
    if (!gradoSeleccionado) return;
    try {
      const res = await fetch(`/api/estudiantes?gradoId=${gradoSeleccionado}`, { cache: "no-store", credentials: "include" });
      if (res.ok) { const data = await res.json(); setEstudiantes(data); }
      else { console.error("Error al cargar estudiantes:", res.status); setEstudiantes([]); }
    } catch { console.error("Error al cargar estudiantes"); setEstudiantes([]); }
  }, [gradoSeleccionado]);

  const loadAsignaturas = useCallback(async () => {
    if (!gradoSeleccionado) return;
    try {
      const res = await fetch(`/api/materias?gradoId=${gradoSeleccionado}`, { cache: "no-store", credentials: "include" });
      if (res.ok) { const data = await res.json(); setAsignaturas(data); }
      else { console.error("Error al cargar asignaturas:", res.status); setAsignaturas([]); }
    } catch { console.error("Error al cargar asignaturas"); setAsignaturas([]); }
  }, [gradoSeleccionado]);

  const loadTodasAsignaturas = useCallback(async () => {
    try {
      const res = await fetch("/api/materias?todas=true", { cache: "no-store", credentials: "include" });
      if (res.ok) { const data = await res.json(); setTodasAsignaturas(Array.isArray(data) ? data : []); }
      else { setTodasAsignaturas([]); }
    } catch { setTodasAsignaturas([]); }
  }, []);

  const loadConfig = useCallback(async () => {
    if (!asignaturaSeleccionada || !trimestreSeleccionado) return;
    try {
      const res = await fetch(`/api/config-actividades?materiaId=${asignaturaSeleccionada}&trimestre=${trimestreSeleccionado}`, { cache: "no-store", credentials: "include" });
      if (res.ok) { const data = await res.json(); setConfigActual(data); }
      else { setConfigActual({ numActividadesCotidianas: 4, numActividadesIntegradoras: 1, tieneExamen: true, numExamenes: 1, porcentajeAC: 35, porcentajeAI: 35, porcentajeExamen: 30 }); }
    } catch { setConfigActual({ numActividadesCotidianas: 4, numActividadesIntegradoras: 1, tieneExamen: true, numExamenes: 1, porcentajeAC: 35, porcentajeAI: 35, porcentajeExamen: 30 }); }
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
      const res = await fetch(`/api/calificaciones?gradoId=${gradoSeleccionado}&materiaId=${asignaturaSeleccionada}&trimestre=${trimestreSeleccionado}&_=${Date.now()}`, { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCalificaciones(data);
        const promsFinalesValidos = data.filter((c: Calificacion) => c.promedioFinal !== null).map((c: Calificacion) => c.promedioFinal);
        if (promsFinalesValidos.length > 0) {
          const suma = promsFinalesValidos.reduce((a: number, b: number) => a + b, 0);
          setPromedioAsignatura(Math.round((suma / promsFinalesValidos.length) * 100) / 100);
        } else { setPromedioAsignatura(null); }
      } else {
        console.error("Error al cargar calificaciones:", res.status);
        setCalificaciones([]);
      }
    } catch { console.error("Error al cargar calificaciones"); setCalificaciones([]); }
  }, [gradoSeleccionado, trimestreSeleccionado, asignaturaSeleccionada]);

  const loadUsuarios = useCallback(async () => {
    try {
      const res = await fetch("/api/usuarios", { cache: "no-store", credentials: "include" });
      if (res.ok) setUsuarios(await res.json());
    } catch { setUsuarios([]); }
  }, []);

  const loadConfiguracion = useCallback(async () => {
    try {
      const res = await fetch("/api/configuracion", { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConfiguracion(data);
        if (data.umbralRecuperacion != null) setUmbrales((prev: typeof umbrales) => ({
          ...prev,
          umbralRecuperacion: data.umbralRecuperacion,
          umbralCondicionado: data.umbralCondicionado ?? prev.umbralCondicionado,
          umbralAprobado: data.umbralAprobado ?? prev.umbralAprobado,
          notaMinima: data.notaMinima ?? prev.notaMinima,
          notaMaxima: data.notaMaxima ?? prev.notaMaxima,
          maxHistorialCelda: data.maxHistorialCelda ?? prev.maxHistorialCelda,
        }));
        setFechasTrimestres({
          fechaInicioT1: data.fechaInicioT1 ?? null,
          fechaFinT1: data.fechaFinT1 ?? null,
          fechaInicioT2: data.fechaInicioT2 ?? null,
          fechaFinT2: data.fechaFinT2 ?? null,
          fechaInicioT3: data.fechaInicioT3 ?? null,
          fechaFinT3: data.fechaFinT3 ?? null,
        });
      }
    } catch { }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    if (!usuario || !isAdmin(usuario.rol)) return;
    setAuditLoading(true);
    try {
      const params = new URLSearchParams({ page: String(auditPage), limit: "20" });
      if (auditFilter.accion) params.set("accion", auditFilter.accion);
      if (auditFilter.fechaDesde) params.set("fechaDesde", auditFilter.fechaDesde);
      if (auditFilter.fechaHasta) params.set("fechaHasta", auditFilter.fechaHasta);
      const res = await fetch(`/api/audit?${params}`, { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || data.data || []);
        setAuditTotalPages(data.totalPages || 1);
        setAuditTotal(data.total || 0);
      }
    } catch { setAuditLogs([]); }
    finally { setAuditLoading(false); }
  }, [usuario, auditPage, auditFilter]);

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ ...loginForm, escuelaId: escuelaSeleccionada }) });
      const data = await res.json();
      if (res.ok && data.usuario) {
        setUsuario(data.usuario);
        const savedState = loadUserState();
        if (isSuperAdmin(data.usuario.rol)) {
          setActiveTab("superadmin");
        } else if (savedState.activeTab) {
          setActiveTab(savedState.activeTab);
        }
      } else {
        setLoginError(data.error || "Credenciales inválidas");
      }
    } catch { setLoginError("Error de conexión"); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUsuario(null);
    setGrados([]);
  };

  // Grade operations
  const forceSaveRefs = useRef<Map<string, () => Promise<void>>>(new Map());
  const dirtyStudentsRef = useRef<Set<string>>(new Set());
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const trimestreRef = useRef(trimestreSeleccionado);
  useEffect(() => { trimestreRef.current = trimestreSeleccionado; }, [trimestreSeleccionado]);
  const materiaRef = useRef(asignaturaSeleccionada);
  useEffect(() => { materiaRef.current = asignaturaSeleccionada; }, [asignaturaSeleccionada]);

  const handleRegisterForceSave = useCallback((studentId: string, saveFn: (() => Promise<void>) | null) => {
    if (saveFn) { forceSaveRefs.current.set(studentId, saveFn); }
    else { forceSaveRefs.current.delete(studentId); }
  }, []);

  const handleDirtyChange = useCallback((studentId: string, isDirty: boolean) => {
    if (isDirty) { dirtyStudentsRef.current.add(studentId); }
    else { dirtyStudentsRef.current.delete(studentId); }
  }, []);

  const handleTrimestreChange = useCallback((val: string) => {
    if (dirtyStudentsRef.current.size > 0) {
      if (!window.confirm("Tienes cambios sin guardar en el trimestre actual. Si cambias de trimestre los perderás. ¿Continuar?")) {
        return;
      }
    }
    dirtyStudentsRef.current.clear();
    forceSaveRefs.current.clear();
    setAsistenciaManualData({});
    setTrimestreSeleccionado(val);
  }, []);

  const handleSaveCalificacion = useCallback(async (estudianteId: string, materiaId: string, data: { actividadesCotidianas: (number | null)[]; actividadesIntegradoras: (number | null)[]; actividadesExamen?: (number | null)[]; examenTrimestral?: number | null; recuperacion?: number | null; }): Promise<Calificacion> => {
    const est = estudiantes.find(e => e.id === estudianteId);
    const mat = asignaturas.find(a => a.id === materiaId);
    const estGrado = grados.find(g => g.id === est?.gradoId);
    const matGrado = grados.find(g => g.id === mat?.gradoId);
    const mismoGrado = estGrado && matGrado && estGrado.numero === matGrado.numero && estGrado.seccion === matGrado.seccion;
    if (!est || !mat || !mismoGrado) {
      const nombreEst = est?.nombre ?? estudianteId;
      const nombreMat = mat?.nombre ?? materiaId;
      toast({ title: "Inconsistencia de datos", description: `El estudiante "${nombreEst}" no pertenece al grado de la materia "${nombreMat}".`, variant: "destructive" });
      throw new Error("GRADE_MISMATCH");
    }
    setAutoSaveStatus("saving");
    setSaving(true);
    const trimestre = parseInt(trimestreRef.current);
    try {
      const res = await fetch("/api/calificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ estudianteId, materiaId, trimestre, actividadesCotidianas: JSON.stringify(data.actividadesCotidianas), actividadesIntegradoras: JSON.stringify(data.actividadesIntegradoras), actividadesExamen: data.actividadesExamen ? JSON.stringify(data.actividadesExamen) : undefined, examenTrimestral: data.examenTrimestral, recuperacion: data.recuperacion }),
      });
      if (res.ok) {
        const saved: Calificacion = await res.json();
        setCalificaciones(prev => {
          const idx = prev.findIndex(c => c.estudianteId === estudianteId && c.materiaId === materiaId && c.trimestre === trimestre);
          if (idx >= 0) { const next = [...prev]; next[idx] = { ...saved, estudiante: prev[idx].estudiante, asignatura: prev[idx].asignatura }; return next; }
          return [...prev, { ...saved, estudiante: undefined, asignatura: undefined }];
        });
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2000);
        const est2 = estudiantes.find(e => e.id === estudianteId);
        const mat2 = asignaturas.find(a => a.id === materiaId);
        emitActionRef.current("Editando calificación", `Calificó a ${est2?.nombre ?? estudianteId} en ${mat2?.nombre ?? materiaId}`, { grado: gradoSeleccionado, asignatura: mat2?.nombre, estudiante: est2?.nombre });
        return saved;
      } else {
        const err = await res.json();
        console.error("Error API:", err);
        setAutoSaveStatus("idle");
        if (err.code === "GRADE_MISMATCH") toast({ title: `Error: ${err.error}`, description: err.message, variant: "destructive" });
        else if (err.code === "MATERIA_FORBIDDEN" || err.code === "GRADO_FORBIDDEN") toast({ title: `Sin permiso`, description: err.message, variant: "destructive" });
        throw new Error(err.error || "Error al guardar calificación");
      }
    } catch (e) {
      console.error("Error conexión:", e);
      setAutoSaveStatus("idle");
      throw e;
    } finally { setSaving(false); }
  }, [estudiantes, asignaturas, grados, gradoSeleccionado, toast]);

  const handleGuardarTodo = useCallback(async () => {
    if (!gradoSeleccionado || !asignaturaSeleccionada || !estudiantes.length) {
      toast({ title: "Selecciona grado y asignatura primero" }); return;
    }
    setSaving(true);
    const trimestre = parseInt(trimestreSeleccionado);
    const mat = asignaturas.find(a => a.id === asignaturaSeleccionada);
    const estudiantesConsistentes = estudiantes.filter(est => mat && est.gradoId === mat.gradoId);
    const omitidos = estudiantes.length - estudiantesConsistentes.length;
    if (omitidos > 0) {
      toast({ title: `Advertencia: ${omitidos} estudiante${omitidos > 1 ? "s" : ""} omitido${omitidos > 1 ? "s" : ""}`, description: "No pertenecen al grado de la materia seleccionada.", variant: "destructive" });
    }

    const forceEntries = Array.from(forceSaveRefs.current.entries());
    const forceStudentIds = new Set(forceEntries.map(([id]) => id));
    const forceResults = await Promise.allSettled(forceEntries.map(([_, saveFn]) => saveFn()));
    const forceErrors = forceResults.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    forceSaveRefs.current.clear();

    const califsSnapshot = calificaciones;
    // Excluir estudiantes ya guardados via forceSave para evitar doble POST
    const saves = estudiantesConsistentes
      .filter(est => !forceStudentIds.has(est.id))
      .map(async (est) => {
      const calif = califsSnapshot.find(c => c.estudianteId === est.id && c.materiaId === asignaturaSeleccionada && c.trimestre === trimestre);
      if (!calif) return null;
      return fetch("/api/calificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          estudianteId: est.id, materiaId: asignaturaSeleccionada, trimestre,
          actividadesCotidianas: calif.actividadesCotidianas, actividadesIntegradoras: calif.actividadesIntegradoras,
          actividadesExamen: calif.actividadesExamen, examenTrimestral: calif.examenTrimestral, recuperacion: calif.recuperacion,
        }),
      });
    }).filter(Boolean) as Promise<Response>[];

    try {
      if (forceStudentIds.size > 0) {
        if (forceErrors.length > 0) toast({ title: `${forceErrors.length} calificación${forceErrors.length > 1 ? 'es' : ''} no se pudo${forceErrors.length > 1 ? 'n' : ''} guardar`, variant: "destructive" });
        else if (saves.length === 0) toast({ title: "Calificaciones guardadas" });
      }
      if (saves.length > 0) {
        const results = await Promise.all(saves);
        const ok = results.filter(r => r.ok).length;
        const errores = results.filter(r => !r.ok);
        if (errores.length > 0) {
          const firstErr = errores[0];
          const errData = await firstErr.json().catch(() => ({ error: "Error desconocido" }));
          toast({ title: `Error al guardar`, description: errData.message || `${errores.length} calificación${errores.length > 1 ? "es" : ""} no se pudo${errores.length > 1 ? "n" : ""} guardar`, variant: "destructive" });
        }
        if (ok > 0) toast({ title: `${ok} calificación${ok > 1 ? "es" : ""} guardada${ok > 1 ? "s" : ""}` });
      } else if (forceStudentIds.size === 0) { toast({ title: "No hay calificaciones para guardar" }); }
      loadCalificaciones();
      const mat2 = asignaturas.find(a => a.id === asignaturaSeleccionada);
      const grado = grados.find(g => g.id === gradoSeleccionado);
      emitActionRef.current("Guardando calificaciones", `Guardó calificaciones en ${mat2?.nombre ?? asignaturaSeleccionada} de ${grado ? `${grado.numero}° "${grado.seccion}"` : gradoSeleccionado}`, { grado: gradoSeleccionado, asignatura: mat2?.nombre });
    } catch (e) {
      console.error("Error:", e);
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally { setSaving(false); }
  }, [gradoSeleccionado, asignaturaSeleccionada, estudiantes, calificaciones, trimestreSeleccionado, toast, loadCalificaciones]);

  const handleSaveConfig = async () => {
    if (!editConfig) return;
    const total = editConfig.porcentajeAC + editConfig.porcentajeAI + (editConfig.tieneExamen ? editConfig.porcentajeExamen : 0);
    if (Math.abs(total - 100) > 0.1) { toast({ title: `Porcentajes deben sumar 100% (${total.toFixed(1)}%)`, variant: "destructive" }); return; }
    if (!asignaturaSeleccionada) { toast({ title: "No hay materia seleccionada", variant: "destructive" }); return; }
    if (!gradoSeleccionado) { toast({ title: "No hay grado seleccionado", variant: "destructive" }); return; }
    try {
      const trimestreNum = parseInt(trimestreSeleccionado);
      const payload = { materiaId: asignaturaSeleccionada, trimestre: trimestreNum, numActividadesCotidianas: Number(editConfig.numActividadesCotidianas), numActividadesIntegradoras: Number(editConfig.numActividadesIntegradoras), tieneExamen: Boolean(editConfig.tieneExamen), numExamenes: Number(editConfig.numExamenes ?? 1), porcentajeAC: Number(editConfig.porcentajeAC), porcentajeAI: Number(editConfig.porcentajeAI), porcentajeExamen: Number(editConfig.porcentajeExamen), aplicarATodasLasMateriasDelGrado: Boolean(configAplicarATodas), gradoId: gradoSeleccionado };
      const res = await fetch("/api/config-actividades", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error || "Error al guardar configuración", variant: "destructive" }); return; }
      setConfigDialogOpen(false);
      await loadConfig();
      await loadConfigsGrado();
      await loadCalificaciones();
      toast({ title: configAplicarATodas ? "Configuración aplicada a todas las materias del grado" : "Configuración guardada" });
    } catch (err) { console.error("Error:", err); toast({ title: "Error de red", variant: "destructive" }); }
  };

  const handleShowHistory = useCallback((calificacionId: string, tipoCampo: string, campoLabel: string, anchorRef: React.RefObject<HTMLElement | null>) => {
    if (!calificacionId || calificacionId === "undefined" || calificacionId === "null") {
      toast({ title: "Sin historial", description: "La calificación aún no ha sido guardada.", variant: "destructive" });
      return;
    }
    setHistorialPopup({ calificacionId, tipoCampo, campoLabel, anchorRef });
  }, [toast]);

  const handleCloseHistory = useCallback(() => { setHistorialPopup(null); }, []);

  // File operations
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportData(await file.text());
    toast({ title: "Archivo cargado" });
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

  const handleImport = async () => {
    if (!importData || !asignaturaSeleccionada || !configActual) return;
    const lines = importData.split('\n').filter(l => l.trim());
    if (lines.length < 2) return;
    const headers = lines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase());
    const nombreIdx = headers.findIndex(h => h.includes('nombre') || h.includes('estudiante') || h.includes('alumno'));
    const acCols: number[] = []; const aiCols: number[] = []; let examenCol: number | null = null; let recupCol: number | null = null;
    headers.forEach((h, i) => { if (/^ac\d*$/.test(h)) acCols.push(i); if (/^ai\d*$/.test(h)) aiCols.push(i); if (/^(examen|ex)$/.test(h)) examenCol = i; if (/^(recup|recuperacion|rec)$/.test(h)) recupCol = i; });
    let importados = 0; let errores = 0;
    const trimestreNum = parseInt(trimestreSeleccionado);
    if (isNaN(trimestreNum) || trimestreNum < 1 || trimestreNum > 3) { toast({ title: "Selecciona un trimestre válido antes de importar", variant: "destructive" }); return; }
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[,;\t]/).map(c => c.trim());
      if (nombreIdx < 0 || nombreIdx >= cols.length) continue;
      const nombreBusqueda = cols[nombreIdx].toLowerCase();
      const est = estudiantes.find(e => e.nombre.toLowerCase().includes(nombreBusqueda) || nombreBusqueda.includes(e.nombre.toLowerCase().split(',')[0].trim()));
      if (!est) continue;
      const acNotas: (number | null)[] = acCols.map(idx => { const val = parseFloat(cols[idx]); return isNaN(val) ? null : Math.min(10, Math.max(0, val)); });
      const aiNotas: (number | null)[] = aiCols.map(idx => { const val = parseFloat(cols[idx]); return isNaN(val) ? null : Math.min(10, Math.max(0, val)); });
      const examenVal = examenCol !== null ? (() => { const v = parseFloat(cols[examenCol!]); return isNaN(v) ? null : Math.min(10, Math.max(0, v)); })() : null;
      const recupVal = recupCol !== null ? (() => { const v = parseFloat(cols[recupCol!]); return isNaN(v) ? null : Math.min(10, Math.max(0, v)); })() : null;
      const res = await fetch("/api/calificaciones", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ estudianteId: est.id, materiaId: asignaturaSeleccionada, trimestre: trimestreNum, actividadesCotidianas: acNotas, actividadesIntegradoras: aiNotas, examenTrimestral: examenVal, recuperacion: recupVal }),
      });
      if (!res.ok) { errores++; continue; }
      importados++;
    }
    setImportDialogOpen(false); setImportData(""); loadCalificaciones();
    toast({ title: `${importados} calificaciones importadas${errores > 0 ? `, ${errores} errores` : ''}` });
  };

  // Sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) { setSortDirection(sortDirection === "asc" ? "desc" : "asc"); }
    else { setSortColumn(column); setSortDirection("asc"); }
  };

  const filteredAndSortedStudents = useMemo(() => {
    const califMap = new Map<string, Calificacion>();
    const matId = asignaturaSeleccionada;
    const trim = parseInt(trimestreSeleccionado);
    for (const c of calificaciones) { if (c.materiaId === matId && c.trimestre === trim) califMap.set(c.estudianteId, c); }
    const getPromedioFinal = (estId: string) => califMap.get(estId)?.promedioFinal ?? null;
    const getPromedioAC = (estId: string) => {
      const calif = califMap.get(estId);
      if (calif?.calificacionAC === null || calif?.calificacionAC === undefined) return null;
      if (!configActual) return calif.calificacionAC;
      return calif.calificacionAC * (configActual.porcentajeAC / 100);
    };
    const getPromedioAI = (estId: string) => {
      const calif = califMap.get(estId);
      if (calif?.calificacionAI === null || calif?.calificacionAI === undefined) return null;
      if (!configActual) return calif.calificacionAI;
      return calif.calificacionAI * (configActual.porcentajeAI / 100);
    };
    const getExamen = (estId: string) => califMap.get(estId)?.examenTrimestral ?? null;
    return estudiantes
      .filter(est => {
        if (!busquedaDeferred) return true;
        return est.nombre.toLowerCase().includes(busquedaDeferred.toLowerCase());
      })
      .filter(est => {
        if (filtroEstado === "todos") return true;
        const pf = getPromedioFinal(est.id);
        if (pf === null) return true;
        if (filtroEstado === "aprobados") return pf >= (configuracion?.umbralAprobado ?? 6.5);
        if (filtroEstado === "riesgo") return pf < (configuracion?.umbralCondicionado ?? 4.5) || (pf >= (configuracion?.umbralCondicionado ?? 4.5) && pf < (configuracion?.umbralAprobado ?? 6.5));
        if (filtroEstado === "honor") {
          const todosProms = estudiantes.map(e => getPromedioFinal(e.id)).filter((p): p is number => p !== null);
          const sorted = [...todosProms].sort((a, b) => b - a);
          const top10 = sorted.slice(0, 10);
          const minHonor = top10.length > 0 ? Math.min(...top10) : Number.MAX_VALUE;
          const maxHonor = top10.length > 0 ? Math.max(...top10) : 0;
          const gap = maxHonor - minHonor;
          const threshold = gap < 0.5 ? minHonor : (top10.length >= 10 ? sorted[9] : 0);
          return pf >= threshold;
        }
        return true;
      })
      .sort((a, b) => {
        if (!sortColumn) return a.numero - b.numero;
        let cmp = 0;
        if (sortColumn === "nombre") cmp = a.nombre.localeCompare(b.nombre);
        else if (sortColumn === "promFinal") cmp = (getPromedioFinal(a.id) ?? -1) - (getPromedioFinal(b.id) ?? -1);
        else if (sortColumn === "promAC") cmp = (getPromedioAC(a.id) ?? -1) - (getPromedioAC(b.id) ?? -1);
        else if (sortColumn === "promAI") cmp = (getPromedioAI(a.id) ?? -1) - (getPromedioAI(b.id) ?? -1);
        else if (sortColumn === "examen") cmp = (getExamen(a.id) ?? -1) - (getExamen(b.id) ?? -1);
        else cmp = a.numero - b.numero;
        return sortDirection === "asc" ? cmp : -cmp;
      });
  }, [estudiantes, calificaciones, asignaturaSeleccionada, trimestreSeleccionado, configActual, busquedaDeferred, filtroEstado, sortColumn, sortDirection, configuracion]);

  const estadosCompletitud = useMemo(() => contarEstados(estudiantes, calificaciones, asignaturaSeleccionada, parseInt(trimestreSeleccionado), configActual), [estudiantes, calificaciones, asignaturaSeleccionada, trimestreSeleccionado, configActual]);

  // Insertar promedios de grado cuando cambian las calificaciones
  const promedioGrado = useMemo(() => {
    const trimmed = parseInt(trimestreSeleccionado);
    if (!isNaN(trimmed) && calificaciones.length > 0) {
      const promsFinalesValidos = calificaciones.filter(c => c.promedioFinal !== null && c.materiaId === asignaturaSeleccionada && c.trimestre === trimmed).map(c => c.promedioFinal as number);
      if (promsFinalesValidos.length > 0) {
        const suma = promsFinalesValidos.reduce((a, b) => a + b, 0);
        return Math.round((suma / promsFinalesValidos.length) * 100) / 100;
      }
    }
    return null;
  }, [calificaciones, asignaturaSeleccionada, trimestreSeleccionado]);

  // Load data on mount
  useEffect(() => {
    if (usuario) {
      queueMicrotask(() => setDataLoading(true));
      Promise.all([loadGrados(), loadTodasAsignaturas(), loadUsuarios(), loadConfiguracion()])
        .catch(() => {})
        .finally(() => setDataLoading(false));
    }
  }, [usuario]);

  // Load dependent data
  useEffect(() => { if (gradoSeleccionado) { Promise.all([loadEstudiantes(), loadAsignaturas(), loadConfigsGrado()]); } }, [gradoSeleccionado]);
  useEffect(() => { if (gradoSeleccionado && asignaturaSeleccionada && trimestreSeleccionado) { Promise.all([loadCalificaciones(), loadConfig()]); } }, [asignaturaSeleccionada, trimestreSeleccionado]);

  // Filter grados
  useEffect(() => {
    if (!usuario) { queueMicrotask(() => setGradosFiltrados([])); return; }
    queueMicrotask(() => {
      if (isAdmin(usuario.rol)) { setGradosFiltrados(grados); }
      else {
        const gradoIdsAsignaturas = new Set((usuario.asignaturasAsignadas || []).map((m: any) => m.gradoId));
        const filtrados = grados.filter((g: any) => gradoIdsAsignaturas.has(g.id));
        setGradosFiltrados(filtrados);
        if (filtrados.length > 0 && !filtrados.some((g: any) => g.id === gradoSeleccionado)) setGradoSeleccionado(filtrados[0].id);
      }
    });
  }, [usuario, grados, gradoSeleccionado]);

  // Filter asignaturas
  useEffect(() => {
    if (!usuario || !gradoSeleccionado) { queueMicrotask(() => setAsignaturasFiltradas(asignaturas)); return; }
    queueMicrotask(() => {
      if (isAdmin(usuario.rol)) { setAsignaturasFiltradas(asignaturas); }
      else {
        const asignaturasDelGrado = new Set(usuario.asignaturasAsignadas?.filter((m: any) => m.gradoId === gradoSeleccionado)?.map((m: any) => m.id) || []);
        const filtradas = asignaturas.filter(m => asignaturasDelGrado.has(m.id));
        setAsignaturasFiltradas(filtradas);
        if (filtradas.length > 0 && !filtradas.some(m => m.id === asignaturaSeleccionada)) setAsignaturaSeleccionada(filtradas[0].id);
        else if (filtradas.length === 0) setAsignaturaSeleccionada("");
      }
    });
  }, [usuario, gradoSeleccionado, asignaturas, asignaturaSeleccionada]);

  // Load audit logs
  useEffect(() => {
    if (usuario && isAdmin(usuario.rol)) queueMicrotask(() => loadAuditLogs());
  }, [auditPage, auditFilter, usuario, loadAuditLogs]);

  const handleNavigate = useCallback((direction: 'up' | 'down', currentIndex: number) => {
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= filteredAndSortedStudents.length) return;
    const nextEst = filteredAndSortedStudents[newIndex];
    const inputId = `calif-${nextEst.id}-${asignaturaSeleccionada}-${trimestreSeleccionado}-0`;
    setTimeout(() => {
      const el = document.getElementById(inputId);
      if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }, 50);
  }, [filteredAndSortedStudents, asignaturaSeleccionada, trimestreSeleccionado]);

  // Refrescar
  const handleRefrescar = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadCalificaciones(), loadConfig(), loadEstudiantes(), loadAsignaturas()]);
      toast({ title: "Datos actualizados" });
    } catch { toast({ title: "Error al refrescar", variant: "destructive" }); }
    finally { setRefreshing(false); }
  }, [loadCalificaciones, loadConfig, loadEstudiantes, loadAsignaturas, toast]);

  // Export functions
  const handleExportarPDF = useCallback(async () => {
    if (!gradoSeleccionado || !asignaturaSeleccionada || !estudiantes.length) { toast({ title: "Selecciona grado, asignatura y estudiantes" }); return; }
    const grado = gradosFiltrados.find(g => g.id === gradoSeleccionado);
    const mat = asignaturas.find(a => a.id === asignaturaSeleccionada);
    if (!grado || !mat) { toast({ title: "Grado o materia no encontrados" }); return; }

    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: paperSize === "a4" ? "a4" : "letter" });

    doc.setFontSize(10);
    doc.text(`Calificaciones - ${grado.numero}° "${grado.seccion}" - ${mat.nombre}`, 14, 14);
    doc.setFontSize(8);
    doc.text(`Trimestre: ${trimestreSeleccionado}`, 14, 20);

    const body = estudiantes.map(est => {
      const calif = calificaciones.find(c => c.estudianteId === est.id && c.materiaId === asignaturaSeleccionada && c.trimestre === parseInt(trimestreSeleccionado));
      const acs = calif ? parseNotas(calif.actividadesCotidianas, configActual?.numActividadesCotidianas ?? 4) : Array(configActual?.numActividadesCotidianas ?? 4).fill("-");
      const ais = calif ? parseNotas(calif.actividadesIntegradoras, configActual?.numActividadesIntegradoras ?? 1) : Array(configActual?.numActividadesIntegradoras ?? 1).fill("-");
      const examen = calif?.examenTrimestral != null ? String(calif.examenTrimestral) : "-";
      const pf = calif?.promedioFinal != null ? (promedioDecimal ? calif.promedioFinal.toFixed(2) : calif.promedioFinal.toFixed(0)) : "-";
      return [est.nombre, ...acs, ...ais, examen, pf];
    });

    autoTable(doc, {
      head: [["Estudiante", ...Array(configActual?.numActividadesCotidianas ?? 4).fill("AC"), ...Array(configActual?.numActividadesIntegradoras ?? 1).fill("AI"), "Examen", "Prom."]],
      body,
      startY: 24,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [30, 58, 138] },
    });
    doc.save(`calificaciones_${grado.numero}${grado.seccion}_${mat.nombre}_T${trimestreSeleccionado}.pdf`);
  }, [gradoSeleccionado, asignaturaSeleccionada, estudiantes, gradosFiltrados, asignaturas, calificaciones, trimestreSeleccionado, configActual, promedioDecimal, paperSize, toast]);

  const handleExportarExcel = useCallback(() => {
    const headers = ["Estudiante"];
    const acCount = configActual?.numActividadesCotidianas ?? 4;
    const aiCount = configActual?.numActividadesIntegradoras ?? 1;
    for (let i = 1; i <= acCount; i++) headers.push(`AC${i}`);
    for (let i = 1; i <= aiCount; i++) headers.push(`AI${i}`);
    if (configActual?.tieneExamen) headers.push("Examen");
    headers.push("Promedio");

    const rows = estudiantes.map(est => {
      const calif = calificaciones.find(c => c.estudianteId === est.id && c.materiaId === asignaturaSeleccionada && c.trimestre === parseInt(trimestreSeleccionado));
      const acs = calif ? parseNotas(calif.actividadesCotidianas, acCount) : Array(acCount).fill("");
      const ais = calif ? parseNotas(calif.actividadesIntegradoras, aiCount) : Array(aiCount).fill("");
      const examen = calif?.examenTrimestral != null ? String(calif.examenTrimestral) : "";
      const pf = calif?.promedioFinal != null ? String(promedioDecimal ? calif.promedioFinal.toFixed(2) : calif.promedioFinal.toFixed(0)) : "";
      return [est.nombre, ...acs, ...ais, ...(configActual?.tieneExamen ? [examen] : []), pf];
    });

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `calificaciones_T${trimestreSeleccionado}.csv`;
    a.click();
  }, [estudiantes, calificaciones, asignaturaSeleccionada, trimestreSeleccionado, configActual, promedioDecimal]);

  // User management
  const handleAddUsuario = async () => {
    try {
      const isEdit = !!editUsuarioId;
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit ? { ...nuevoUsuario, id: editUsuarioId } : nuevoUsuario;
      const res = await fetch("/api/usuarios", { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) { toast({ title: isEdit ? "Usuario actualizado" : "Usuario creado" }); setUserDialogOpen(false); setEditUsuarioId(null); setNuevoUsuario({ email: "", password: "", nombre: "", rol: "docente", materiasAsignadas: [] }); loadUsuarios(); }
      else { toast({ title: data.error || (isEdit ? "Error al actualizar usuario" : "Error al crear usuario"), variant: "destructive" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleToggleUsuario = async (id: string, activo: boolean) => {
    try {
      const res = await fetch("/api/usuarios", { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id, activo: !activo }) });
      if (res.ok) { toast({ title: `Usuario ${!activo ? "desbloqueado" : "bloqueado"}` }); loadUsuarios(); }
      else { toast({ title: "Error", variant: "destructive" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleDeleteUsuario = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este usuario?")) return;
    try {
      const res = await fetch(`/api/usuarios?id=${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { toast({ title: "Usuario eliminado" }); loadUsuarios(); }
      else { toast({ title: "Error", variant: "destructive" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const openResetPassword = (user: { id: string; nombre: string }) => {
    setResetPasswordUser(user);
    setResetPasswordForm({ password: "docente123" });
    setResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;
    setResetPasswordLoading(true);
    try {
      const res = await fetch("/api/admin/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ usuarioId: resetPasswordUser.id, nuevaPassword: resetPasswordForm.password }) });
      const data = await res.json();
      if (res.ok) { toast({ title: "Contraseña restablecida", description: `Nueva contraseña: ${resetPasswordForm.password}` }); setResetPasswordDialogOpen(false); }
      else { toast({ title: data.error || "Error", variant: "destructive" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setResetPasswordLoading(false); }
  };

  const abrirEditarUsuario = (u: Usuario) => {
    setEditUsuarioId(u.id);
    setNuevoUsuario({ email: u.email, password: "", nombre: u.nombre, rol: u.rol, materiasAsignadas: (u.materias || []).map((m: any) => m.id) });
    setUserDialogOpen(true);
  };

  // Student management
  const handleAddEstudiante = async () => {
    if (!gradoSeleccionado || !nuevoEstudiante.nombre.trim()) { toast({ title: "Completa los campos requeridos" }); return; }
    try {
      const res = await fetch("/api/estudiantes", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ nombre: nuevoEstudiante.nombre, email: nuevoEstudiante.email, gradoId: gradoSeleccionado }) });
      if (res.ok) { toast({ title: "Estudiante agregado" }); setDialogOpen(false); setNuevoEstudiante({ nombre: "", email: "" }); loadEstudiantes(); }
      else { toast({ title: "Error", variant: "destructive" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleAddMultipleEstudiantes = async () => {
    if (!gradoSeleccionado || !listaEstudiantes.trim()) { toast({ title: "Ingresa al menos un nombre" }); return; }
    try {
      const lines = listaEstudiantes.split('\n').filter(l => l.trim());
      const estudiantesData = lines.map(line => {
        const parts = line.split(',').map(p => p.trim());
        return { nombre: parts[0], email: parts[1] || "", gradoId: gradoSeleccionado };
      });
      let creados = 0;
      for (const est of estudiantesData) {
        const res = await fetch("/api/estudiantes", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(est) });
        if (res.ok) creados++;
      }
      toast({ title: `${creados} estudiantes agregados` });
      setListaDialogOpen(false); setListaEstudiantes(""); loadEstudiantes();
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleReordenarEstudiantes = async (nuevos: Estudiante[]) => {
    setEstudiantes(nuevos);
    try {
      const res = await fetch("/api/estudiantes", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ ordenes: nuevos.map((e, i) => ({ id: e.id, orden: i + 1 })) }) });
      if (!res.ok) { toast({ title: "Error al reordenar", variant: "destructive" }); loadEstudiantes(); }
    } catch { loadEstudiantes(); }
  };

  const handleDeleteEstudiante = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este estudiante?")) return;
    try {
      const res = await fetch(`/api/estudiantes?id=${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { toast({ title: "Estudiante eliminado" }); loadEstudiantes(); }
      else { toast({ title: "Error", variant: "destructive" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleUpdateEstudiante = async (id: string, data: { nombre?: string; email?: string; activo?: boolean }) => {
    try {
      const res = await fetch(`/api/estudiantes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
      if (res.ok) { toast({ title: "Estudiante actualizado" }); loadEstudiantes(); }
      else { toast({ title: "Error", variant: "destructive" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleChangePassword = async () => {
    if (passwordForm.nueva !== passwordForm.confirmar) { toast({ title: "Las contraseñas no coinciden", variant: "destructive" }); return; }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/cambiar-password", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ actual: passwordForm.actual, nueva: passwordForm.nueva }) });
      const data = await res.json();
      if (res.ok) { toast({ title: "Contraseña cambiada" }); setPasswordDialogOpen(false); setPasswordForm({ actual: "", nueva: "", confirmar: "" }); }
      else { toast({ title: data.error || "Error", variant: "destructive" }); }
    } catch { toast({ title: "Error de red", variant: "destructive" }); }
    finally { setPasswordLoading(false); }
  };

  const observacionesRetryRef = useRef<Record<string, { count: number; timer: NodeJS.Timeout | null }>>({});

  const handleAsistenciaManualChange = useCallback((estudianteId: string, field: string, value: string) => {
    setAsistenciaManualData(prev => {
      const current = prev[estudianteId] || { asistencias: '', inasistencias: '', tardanzas: '', justificadas: '', totalDias: '', observaciones: '' };
      return { ...prev, [estudianteId]: { ...current, [field]: value } };
    });
    if (observacionesSaveTimersRef.current.has(estudianteId)) clearTimeout(observacionesSaveTimersRef.current.get(estudianteId)!);
    if (observacionesRetryRef.current[estudianteId]?.timer) {
      clearTimeout(observacionesRetryRef.current[estudianteId].timer!);
    }
    const doSave = async (retryCount = 0) => {
      const entry = asistenciaManualDataRef.current[estudianteId];
      if (!entry || !gradoSeleccionado) return;
      const effectiveTrimestre = trimestreSeleccionado || "1";
      const grado = gradosFiltrados.find(g => g.id === gradoSeleccionado);
      const año = grado?.año || new Date().getFullYear();
      try {
        const res = await fetch("/api/observaciones", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ estudianteId, gradoId: gradoSeleccionado, trimestre: effectiveTrimestre, año, ...entry }) });
        if (!res.ok) {
          const errBody = await res.text();
          console.error(`[observaciones] Error ${res.status} al guardar:`, errBody);
          toast({ title: "Error al guardar observaciones", variant: "destructive" });
        }
      } catch (e) {
        console.error("[observaciones] Error de red al guardar:", e);
        if (retryCount < 4) {
          const delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
          observacionesRetryRef.current[estudianteId] = {
            count: retryCount + 1,
            timer: setTimeout(() => doSave(retryCount + 1), delay),
          };
        } else {
          toast({ title: "Error de red al guardar observaciones", variant: "destructive" });
        }
      }
    };
    const timer = setTimeout(() => doSave(0), 2000);
    observacionesSaveTimersRef.current.set(estudianteId, timer);
  }, [gradoSeleccionado, trimestreSeleccionado, gradosFiltrados, toast]);

  const handleBorrarCalifAlumno = async () => {
    if (!borrarCalifEstudianteId || !asignaturaSeleccionada || !trimestreSeleccionado) return;
    setBorrarCalifLoading(true);
    try {
      const res = await fetch(`/api/calificaciones?estudianteId=${borrarCalifEstudianteId}&materiaId=${asignaturaSeleccionada}&trimestre=${trimestreSeleccionado}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        const est = estudiantes.find(e => e.id === borrarCalifEstudianteId);
        const mat = asignaturas.find(a => a.id === asignaturaSeleccionada);
        emitActionRef.current("Borrando calificación", `Borró calificaciones de ${est?.nombre ?? borrarCalifEstudianteId} en ${mat?.nombre ?? asignaturaSeleccionada}`, { grado: gradoSeleccionado, asignatura: mat?.nombre, estudiante: est?.nombre });
        toast({ title: "Calificaciones del alumno borradas" }); setBorrarCalifDialogOpen(false); loadCalificaciones();
      } else { toast({ title: "Error al borrar", variant: "destructive" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setBorrarCalifLoading(false); }
  };

  const handleBorrarCalifGrado = async () => {
    if (!gradoSeleccionado || !asignaturaSeleccionada || !trimestreSeleccionado) return;
    setBorrarCalifLoading(true);
    try {
      const res = await fetch(`/api/calificaciones?gradoId=${gradoSeleccionado}&materiaId=${asignaturaSeleccionada}&trimestre=${trimestreSeleccionado}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const mat = asignaturas.find(a => a.id === asignaturaSeleccionada);
        const grado = grados.find(g => g.id === gradoSeleccionado);
        emitActionRef.current("Borrando calificaciones", `Borró ${data.borradas} calificaciones en ${mat?.nombre ?? asignaturaSeleccionada} de ${grado ? `${grado.numero}° "${grado.seccion}"` : gradoSeleccionado}`, { grado: gradoSeleccionado, asignatura: mat?.nombre });
        toast({ title: `${data.borradas} calificaciones borradas` }); setBorrarCalifDialogOpen(false); loadCalificaciones();
      } else { toast({ title: "Error al borrar", variant: "destructive" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setBorrarCalifLoading(false); }
  };

  const handleGuardarUmbrales = async () => {
    setUmbralesLoading(true);
    try {
      const res = await fetch("/api/configuracion", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(umbrales) });
      const data = await res.json();
      if (res.ok) { toast({ title: "Umbrales guardados" }); setConfiguracion(data); }
      else { toast({ title: data.error || "Error", variant: "destructive" }); }
    } catch { toast({ title: "Error de red", variant: "destructive" }); }
    finally { setUmbralesLoading(false); }
  };

  const handleGuardarFechasTrimestres = async () => {
    setFechasTrimestresLoading(true);
    try {
      const res = await fetch("/api/configuracion", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(fechasTrimestres) });
      const data = await res.json();
      if (res.ok) { toast({ title: "Fechas de trimestres guardadas" }); setConfiguracion(data); }
      else { toast({ title: data.error || "Error", variant: "destructive" }); }
    } catch { toast({ title: "Error de red", variant: "destructive" }); }
    finally { setFechasTrimestresLoading(false); }
  };

  const handleResetFechasTrimestres = () => {
    setFechasTrimestres({
      fechaInicioT1: null,
      fechaFinT1: null,
      fechaInicioT2: null,
      fechaFinT2: null,
      fechaInicioT3: null,
      fechaFinT3: null,
    });
  };

  const handleCambiarAño = async () => {
    setAñoLoading(true);
    try {
      const res = await fetch("/api/configuracion", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ añoEscolar: nuevoAño }) });
      if (res.ok) { toast({ title: "Año escolar cambiado" }); setAñoDialogOpen(false); loadConfiguracion(); }
      else { toast({ title: "Error", variant: "destructive" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setAñoLoading(false); }
  };

  const handleResetSistema = async () => {
    if (!window.confirm("¿Estás seguro de finalizar el año escolar? Se borrarán TODAS las calificaciones. Esta acción no se puede deshacer.")) return;
    if (!window.confirm("CONFIRMACIÓN FINAL: ¿Estás ABSOLUTAMENTE SEGURO? Se perderán todas las calificaciones y datos de asistencia del año actual.")) return;
    try {
      const res = await fetch("/api/admin/reset-sistema", { method: "POST", credentials: "include" });
      if (res.ok) { toast({ title: "Año escolar finalizado. Las calificaciones han sido eliminadas." }); loadCalificaciones(); loadEstudiantes(); }
      else { toast({ title: "Error", variant: "destructive" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleRepararAsignaciones = async () => {
    try {
      const res = await fetch("/api/admin/reparar-asignaciones", { method: "POST", credentials: "include" });
      if (res.ok) { toast({ title: "Asignaciones reparadas" }); }
      else { toast({ title: "Error", variant: "destructive" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleDeleteAuditLogs = async () => {
    if (!window.confirm("¿Borrar todos los registros de auditoría?")) return;
    try {
      const res = await fetch("/api/audit", { method: "DELETE", credentials: "include" });
      if (res.ok) { toast({ title: "Registros de auditoría borrados" }); setAuditLogs([]); setAuditTotal(0); }
      else { toast({ title: "Error", variant: "destructive" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const imprimirListadoEstudiantesPDF = useCallback(async () => {
    if (!gradoSeleccionado) { toast({ title: "Selecciona un grado" }); return; }
    const grado = gradosFiltrados.find(g => g.id === gradoSeleccionado);
    if (!grado) return;
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: paperSize === "a4" ? "a4" : "letter" });
    doc.setFontSize(12);
    doc.text(`Listado de Estudiantes - ${grado.numero}° "${grado.seccion}"`, 14, 14);
    doc.setFontSize(8);
    doc.text(`Total: ${estudiantes.length} estudiantes`, 14, 20);
    autoTable(doc, {
      head: [["N°", "Nombre", "Email"]],
      body: estudiantes.map((e, i) => [String(i + 1), e.nombre, e.email || ""]),
      startY: 24,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] },
    });
    doc.save(`listado_estudiantes_${grado.numero}${grado.seccion}_${new Date().getFullYear()}.pdf`);
  }, [estudiantes, gradosFiltrados, gradoSeleccionado, paperSize, toast]);

  // Refresh helpers
  const reCargarDatos = useCallback(async () => {
    await Promise.all([
      loadGrados(), loadTodasAsignaturas(), loadUsuarios(), loadConfiguracion(),
      loadEstudiantes(), loadAsignaturas(), loadCalificaciones(),
    ]);
  }, [loadGrados, loadTodasAsignaturas, loadUsuarios, loadConfiguracion, loadEstudiantes, loadAsignaturas, loadCalificaciones]);

  // Beforeunload save
  const handleBeforeUnload = useCallback(() => {
    if (usuario) {
      saveUserState({ gradoSeleccionado, asignaturaSeleccionada, trimestreSeleccionado, activeTab });
      localStorage.setItem(`sis_last_session_${usuario.id}`, new Date().toISOString());
    }
  }, [usuario, gradoSeleccionado, asignaturaSeleccionada, trimestreSeleccionado, activeTab]);

  // Load tab state from saved
  useEffect(() => {
    if (usuario) {
      const savedState = loadUserState();
      if (savedState?.activeTab) queueMicrotask(() => setActiveTab(savedState.activeTab ?? "calificaciones"));
    }
  }, [usuario]);

  useEffect(() => {
    const handleB = (e: BeforeUnloadEvent) => {
      if (usuario) {
        forceSaveRefs.current.forEach((saveFn) => { saveFn().catch(() => {}); });
        forceSaveRefs.current.clear();
        if (saving) { e.preventDefault(); e.returnValue = ""; fetch("/api/auth/logout", { method: "POST", credentials: "include", keepalive: true }).catch(() => {}); }
      }
      handleBeforeUnload();
      const data = asistenciaManualDataRef.current;
      if (gradoSeleccionado) {
        const effectiveTrimestre = trimestreSeleccionado || "1";
        const grado = gradosFiltrados.find(g => g.id === gradoSeleccionado);
        const año = grado?.año || new Date().getFullYear();
        for (const [estudianteId, entry] of Object.entries(data)) {
          if (!entry) continue;
          const tieneDatos = entry.observaciones || entry.asistencias || entry.inasistencias || entry.tardanzas || entry.justificadas || entry.totalDias;
          if (!tieneDatos) continue;
          const blob = new Blob([JSON.stringify({ estudianteId, gradoId: gradoSeleccionado, trimestre: effectiveTrimestre, año, ...entry })], { type: "application/json" });
          navigator.sendBeacon("/api/observaciones", blob);
        }
      }
    };
    const handleV = () => {
      if (document.visibilityState === "hidden" && usuario) {
        forceSaveRefs.current.forEach((saveFn) => { saveFn().catch(() => {}); });
        handleBeforeUnload();
      }
    };
    window.addEventListener("beforeunload", handleB);
    document.addEventListener("visibilitychange", handleV);
    return () => { window.removeEventListener("beforeunload", handleB); document.removeEventListener("visibilitychange", handleV); };
  }, [usuario, saving, handleBeforeUnload, gradoSeleccionado, trimestreSeleccionado, gradosFiltrados]);

  const dataReady = usuario && grados.length > 0;

  return {
    // Auth
    usuario, setUsuario, loading, dataLoading, loginForm, setLoginForm, loginError, loginLoading, googleLoading, googleButtonRef,
    initialized, initSystem, checkAuth, handleLogin, handleLogout, promptGoogleLogin,
    escuelas, escuelaSeleccionada, setEscuelaSeleccionada,
    grados, gradosFiltrados, asignaturasFiltradas, estudiantes, asignaturas, todasAsignaturas, calificaciones,
    configActual, configsGrado, usuarios, configuracion,
    gradoSeleccionado, trimestreSeleccionado, asignaturaSeleccionada, activeTab,
    setGradoSeleccionado, setTrimestreSeleccionado, setAsignaturaSeleccionada, setActiveTab,
    darkMode, theme, setTheme,
    checkIsAdmin, canDelete,
    // Dialogs
    dialogOpen, setDialogOpen,
    configDialogOpen, setConfigDialogOpen,
    importDialogOpen, setImportDialogOpen,
    listaDialogOpen, setListaDialogOpen,
    userDialogOpen, setUserDialogOpen,
    editUsuarioId, setEditUsuarioId,
    passwordDialogOpen, setPasswordDialogOpen,
    passwordForm, setPasswordForm, passwordLoading,
    nuevoEstudiante, setNuevoEstudiante,
    listaEstudiantes, setListaEstudiantes,
    saving, configLoading, setConfigLoading, importLoading, setImportLoading,
    menuAbierto, setMenuAbierto,
    navItems,
    materiasEnBoleta, setMateriasEnBoleta,
    mostrarRecuperacion, setMostrarRecuperacion,
    expandedBoleta, setExpandedBoleta,
    editConfig, setEditConfig,
    configAplicarATodas, setConfigAplicarATodas,
    importData, setImportData,
    nuevoUsuario, setNuevoUsuario,
    nuevoAño, setNuevoAño,
    añoDialogOpen, setAñoDialogOpen, añoLoading,
    umbrales, setUmbrales, umbralesLoading,
    resetPasswordDialogOpen, setResetPasswordDialogOpen,
    resetPasswordUser, resetPasswordForm, setResetPasswordForm, resetPasswordLoading,
    perfilDialogOpen, setPerfilDialogOpen,
    borrarCalifDialogOpen, setBorrarCalifDialogOpen,
    borrarCalifTipo, setBorrarCalifTipo,
    borrarCalifEstudianteId, setBorrarCalifEstudianteId, borrarCalifLoading,
    sectionLoading, setSectionLoading,
    showWizard, setShowWizard,
    refreshing, setRefreshing,
    emitActionRef, handlePresenceEmit,
    autoSaveStatus, quickActionsOpen, setQuickActionsOpen,
    promedioDecimal, setPromedioDecimal,
    paperSize, setPaperSize,
    incluirAsistenciaBoleta, setIncluirAsistenciaBoleta,
    incluirAsistenciaManual, setIncluirAsistenciaManual,
    asistenciaManualHabilitado, setAsistenciaManualHabilitado,
    asistenciaManualData, setAsistenciaManualData,
    tipoAsistencia, setTipoAsistencia,
    mostrarAsistencia, setMostrarAsistencia,
    promedioAsignatura, promedioGrado,
    busquedaEstudiante, setBusquedaEstudiante, filtroEstado, setFiltroEstado,
    sortColumn, sortDirection, handleSort,
    filteredAndSortedStudents, estadosCompletitud,
    auditLogs, auditLoading, auditFilter, setAuditFilter, auditPage, setAuditPage, auditTotalPages, auditTotal, loadAuditLogs,
    historialPopup, setHistorialPopup, activeHistoryCell,
    handleShowHistory, handleCloseHistory,
    handleSaveCalificacion, handleGuardarTodo, handleSaveConfig,
    handleRegisterForceSave, handleDirtyChange, handleTrimestreChange,
    handleRefrescar,
    handleFileUpload, generateTemplate, handleImport,
    handleExportarPDF, handleExportarExcel,
    forceSaveRefs, dirtyStudentsRef, inputRefs,
    handleAddUsuario, handleToggleUsuario, handleDeleteUsuario,
    openResetPassword, handleResetPassword, abrirEditarUsuario,
    handleAddEstudiante, handleAddMultipleEstudiantes,
    handleReordenarEstudiantes, handleDeleteEstudiante, handleUpdateEstudiante,
    handleChangePassword,
    handleAsistenciaManualChange,
    handleBorrarCalifAlumno, handleBorrarCalifGrado,
    handleGuardarUmbrales, handleCambiarAño, handleResetSistema, handleRepararAsignaciones,
    handleDeleteAuditLogs,
    fechasTrimestres, setFechasTrimestres, fechasTrimestresLoading, handleGuardarFechasTrimestres, handleResetFechasTrimestres,
    imprimirListadoEstudiantesPDF,
    handleNavigate,
    reCargarDatos,
    dataReady,
    loadGrados, loadEstudiantes, loadAsignaturas, loadTodasAsignaturas, loadConfig, loadConfigsGrado, loadCalificaciones, loadUsuarios, loadConfiguracion,
    setUsuarios,
    observacionesSaveTimersRef,
    asistenciaManualDataRef,
  };
}
