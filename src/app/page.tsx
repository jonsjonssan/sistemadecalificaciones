"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  LogOut, Users, ClipboardList, FileText, Plus, RefreshCw,
  School, Save, Printer, ChevronDown, ChevronUp, Settings, Upload,
  Download, Trash2, ListPlus, UserPlus, Key, Calendar, LayoutDashboard, CalendarDays
} from "lucide-react";
import Dashboard from "@/components/Dashboard";
import AsistenciaBoard from "@/components/AsistenciaBoard";

// Interfaces
interface UsuarioSesion { id: string; email: string; nombre: string; rol: string; gradosAsignados?: { id: string; numero: number; seccion: string; }[]; materiasAsignadas?: { id: string; nombre: string; gradoId: string; gradoNumero?: number; }[]; }
interface MateriaConGrado { id: string; nombre: string; gradoId: string; grado?: { id: string; numero: number; seccion: string; }; }
interface Usuario { 
  id: string; 
  email: string; 
  nombre: string; 
  rol: string; 
  activo: boolean; 
  gradosComoTutor?: { id: string; numero: number; seccion: string; año: number; }[]; 
  materias?: MateriaConGrado[];
}
interface Estudiante { id: string; numero: number; nombre: string; gradoId: string; activo: boolean; }
interface Materia { id: string; nombre: string; gradoId: string; }
interface ConfigActividad { id: string; materiaId: string; trimestre: number; numActividadesCotidianas: number; numActividadesIntegradoras: number; tieneExamen: boolean; porcentajeAC: number; porcentajeAI: number; porcentajeExamen: number; materiaNombre?: string; }
interface Calificacion { id: string; estudianteId: string; materiaId: string; trimestre: number; actividadesCotidianas: string | null; calificacionAC: number | null; actividadesIntegradoras: string | null; calificacionAI: number | null; examenTrimestral: number | null; promedioFinal: number | null; recuperacion: number | null; estudiante?: Estudiante; materia?: Materia; config?: ConfigActividad; }
interface Grado { id: string; numero: number; seccion: string; año: number; docenteId: string | null; docente?: { id: string; nombre: string; email: string; }; _count?: { estudiantes: number; materias: number; }; }
interface ConfiguracionSistema { id: string; añoEscolar: number; escuela: string; }

// Utilidades
const calcularPromedio = (notas: (number | null)[]): number | null => {
  const validas = notas.filter(n => n !== null && !isNaN(n!)) as number[];
  return validas.length ? validas.reduce((a, b) => a + b, 0) / validas.length : null;
};
const calcularPromedioFinal = (ac: number | null, ai: number | null, et: number | null, cfg: ConfigActividad): number | null => {
  if (ac === null && ai === null && et === null) return null;
  const t = (ac !== null ? cfg.porcentajeAC : 0) + (ai !== null ? cfg.porcentajeAI : 0) + (et !== null && cfg.tieneExamen ? cfg.porcentajeExamen : 0);
  if (!t) return null;
  return ((ac ?? 0) * cfg.porcentajeAC / 100 + (ai ?? 0) * cfg.porcentajeAI / 100 + (et ?? 0) * cfg.porcentajeExamen / 100) / (t / 100);
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
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Datos
  const [grados, setGrados] = useState<Grado[]>([]);
  const [gradosFiltrados, setGradosFiltrados] = useState<Grado[]>([]);
  const [materiasFiltradas, setMateriasFiltradas] = useState<Materia[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [todasMaterias, setTodasMaterias] = useState<MateriaConGrado[]>([]);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [configActual, setConfigActual] = useState<ConfigActividad | null>(null);
  const [configsGrado, setConfigsGrado] = useState<ConfigActividad[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  
  // Selecciones
  const [gradoSeleccionado, setGradoSeleccionado] = useState<string>("");
  const [trimestreSeleccionado, setTrimestreSeleccionado] = useState<string>("1");
  const [materiaSeleccionada, setMateriaSeleccionada] = useState<string>("");
  
  // UI
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [listaDialogOpen, setListaDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ actual: "", nueva: "", confirmar: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [nuevoEstudiante, setNuevoEstudiante] = useState({ nombre: "" });
  const [listaEstudiantes, setListaEstudiantes] = useState("");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [expandedBoleta, setExpandedBoleta] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<ConfigActividad | null>(null);
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

  // Auth
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUsuario(data.usuario);
    } catch { setUsuario(null); }
    finally { setLoading(false); }
  }, []);

  const initSystem = async () => {
    try {
      const res = await fetch("/api/init", { method: "POST" });
      const data = await res.json();
      toast({ title: "Sistema inicializado", description: "Usuario administrador creado correctamente" });
      setInitialized(true);
    } catch { toast({ title: "Error al inicializar", variant: "destructive" }); }
  };

  // Carga de datos
  const loadGrados = useCallback(async () => {
    try {
      const res = await fetch("/api/grados");
      const data = await res.json();
      setGrados(data);
      if (data.length && !gradoSeleccionado) setGradoSeleccionado(data[0].id);
    } catch { toast({ title: "Error al cargar grados", variant: "destructive" }); }
  }, [gradoSeleccionado, toast]);

  const loadEstudiantes = useCallback(async () => {
    if (!gradoSeleccionado) return;
    try {
      const res = await fetch(`/api/estudiantes?gradoId=${gradoSeleccionado}`);
      setEstudiantes(await res.json());
    } catch { toast({ title: "Error al cargar estudiantes", variant: "destructive" }); }
  }, [gradoSeleccionado, toast]);

  const loadMaterias = useCallback(async () => {
    if (!gradoSeleccionado) return;
    try {
      const res = await fetch(`/api/materias?gradoId=${gradoSeleccionado}`);
      const data = await res.json();
      setMaterias(data);
      if (data.length && !materiaSeleccionada) setMateriaSeleccionada(data[0].id);
    } catch { toast({ title: "Error al cargar materias", variant: "destructive" }); }
  }, [gradoSeleccionado, materiaSeleccionada, toast]);

  const loadTodasMaterias = useCallback(async () => {
    try {
      const res = await fetch("/api/materias?todas=true");
      setTodasMaterias(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadConfig = useCallback(async () => {
    if (!materiaSeleccionada || !trimestreSeleccionado) return;
    try {
      const res = await fetch(`/api/config-actividades?materiaId=${materiaSeleccionada}&trimestre=${trimestreSeleccionado}`);
      setConfigActual(await res.json());
    } catch { toast({ title: "Error al cargar configuración", variant: "destructive" }); }
  }, [materiaSeleccionada, trimestreSeleccionado, toast]);

  const loadConfigsGrado = useCallback(async () => {
    if (!gradoSeleccionado || !trimestreSeleccionado) return;
    try {
      const res = await fetch(`/api/config-actividades?gradoId=${gradoSeleccionado}&trimestre=${trimestreSeleccionado}`);
      setConfigsGrado(await res.json());
    } catch { toast({ title: "Error al cargar configuraciones", variant: "destructive" }); }
  }, [gradoSeleccionado, trimestreSeleccionado, toast]);

  const loadCalificaciones = useCallback(async () => {
    if (!gradoSeleccionado || !trimestreSeleccionado) return;
    try {
      const res = await fetch(`/api/calificaciones?gradoId=${gradoSeleccionado}&trimestre=${trimestreSeleccionado}`);
      setCalificaciones(await res.json());
    } catch { toast({ title: "Error al cargar calificaciones", variant: "destructive" }); }
  }, [gradoSeleccionado, trimestreSeleccionado, toast]);

  const loadUsuarios = useCallback(async () => {
    try {
      const res = await fetch("/api/usuarios");
      if (res.ok) setUsuarios(await res.json());
    } catch { /* no auth */ }
  }, []);

  const loadConfiguracion = useCallback(async () => {
    try {
      const res = await fetch("/api/configuracion");
      if (res.ok) {
        const data = await res.json();
        setConfiguracion(data);
        setNuevoAño(data.añoEscolar);
      }
    } catch { /* ignore */ }
  }, []);

  // Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (res.ok) { 
        setLoginForm({ email: "", password: "" });
        // Recargar datos completos del usuario incluyendo asignaciones
        await checkAuth();
      } else { 
        setLoginError(data.error || "Error"); 
      }
    } catch { setLoginError("Error de conexión"); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUsuario(null);
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
    if (!nuevoEstudiante.nombre || !gradoSeleccionado) return;
    try {
      const res = await fetch("/api/estudiantes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevoEstudiante.nombre, gradoId: gradoSeleccionado }),
      });
      if (res.ok) { setNuevoEstudiante({ nombre: "" }); setDialogOpen(false); loadEstudiantes(); toast({ title: "Estudiante agregado" }); }
    } catch { toast({ title: "Error al agregar", variant: "destructive" }); }
  };

  const handleAddMultipleEstudiantes = async () => {
    if (!listaEstudiantes.trim() || !gradoSeleccionado) return;
    const nombres = listaEstudiantes.split('\n').map(n => n.trim()).filter(n => n);
    if (!nombres.length) return;
    try {
      const res = await fetch("/api/estudiantes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estudiantes: nombres, gradoId: gradoSeleccionado }),
      });
      if (res.ok) { setListaEstudiantes(""); setListaDialogOpen(false); loadEstudiantes(); loadGrados(); toast({ title: `${nombres.length} estudiantes agregados` }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleDeleteEstudiante = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return;
    try {
      const res = await fetch(`/api/estudiantes?id=${id}`, { method: "DELETE" });
      if (res.ok) { loadEstudiantes(); loadCalificaciones(); loadGrados(); toast({ title: "Estudiante eliminado" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleSaveCalificacion = async (estudianteId: string, data: { actividadesCotidianas: (number | null)[]; actividadesIntegradoras: (number | null)[]; examenTrimestral: number | null; recuperacion: number | null; }) => {
    if (!configActual) return;
    setSaving(true);
    try {
      await fetch("/api/calificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estudianteId, materiaId: materiaSeleccionada, trimestre: parseInt(trimestreSeleccionado), actividadesCotidianas: JSON.stringify(data.actividadesCotidianas), actividadesIntegradoras: JSON.stringify(data.actividadesIntegradoras), examenTrimestral: data.examenTrimestral, recuperacion: data.recuperacion }),
      });
      loadCalificaciones();
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleSaveConfig = async () => {
    if (!editConfig) return;
    const total = editConfig.porcentajeAC + editConfig.porcentajeAI + (editConfig.tieneExamen ? editConfig.porcentajeExamen : 0);
    if (Math.abs(total - 100) > 0.1) { toast({ title: `Porcentajes deben sumar 100% (${total.toFixed(1)}%)`, variant: "destructive" }); return; }
    try {
      await fetch("/api/config-actividades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editConfig) });
      setConfigActual(editConfig); setConfigDialogOpen(false); loadCalificaciones(); toast({ title: "Configuración guardada" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportData(await file.text());
    toast({ title: "Archivo cargado" });
  };

  const handleImport = async () => {
    if (!importData || !materiaSeleccionada || !configActual) return;
    const lines = importData.split('\n').filter(l => l.trim());
    if (lines.length < 2) return;
    const headers = lines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase());
    const nombreIdx = headers.findIndex(h => h.includes('nombre'));
    let importados = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[,;\t]/).map(c => c.trim());
      const est = estudiantes.find(e => e.nombre.toLowerCase().includes((cols[nombreIdx] || "").toLowerCase()));
      if (!est) continue;
      const acNotas: (number | null)[] = Array(configActual.numActividadesCotidianas).fill(null);
      const aiNotas: (number | null)[] = Array(configActual.numActividadesIntegradoras).fill(null);
      await fetch("/api/calificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estudianteId: est.id, materiaId: materiaSeleccionada, trimestre: parseInt(trimestreSeleccionado), actividadesCotidianas: JSON.stringify(acNotas), actividadesIntegradoras: JSON.stringify(aiNotas) }),
      });
      importados++;
    }
    setImportDialogOpen(false); setImportData(""); loadCalificaciones(); toast({ title: `${importados} calificaciones importadas` });
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
    if (!nuevoUsuario.email || !nuevoUsuario.password || !nuevoUsuario.nombre) return;
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoUsuario),
      });
      if (res.ok) { 
        setNuevoUsuario({ email: "", password: "", nombre: "", rol: "docente", gradosAsignados: [], materiasAsignadas: [] }); 
        setUserDialogOpen(false); 
        loadUsuarios(); 
        toast({ title: "Usuario creado" }); 
      }
      else { const d = await res.json(); toast({ title: d.error, variant: "destructive" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleDeleteUsuario = async (id: string) => {
    if (!confirm("¿Eliminar este usuario?")) return;
    try {
      await fetch(`/api/usuarios?id=${id}`, { method: "DELETE" });
      loadUsuarios(); toast({ title: "Usuario eliminado" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleToggleUsuario = async (id: string, activo: boolean) => {
    try {
      await fetch("/api/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, activo: !activo }),
      });
      loadUsuarios(); toast({ title: `Usuario ${!activo ? 'activado' : 'desactivado'}` });
    } catch { toast({ title: "Error", variant: "destructive" }); }
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
        loadTodasMaterias();
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

  const getCalificacion = (estudianteId: string) => calificaciones.find(c => c.estudianteId === estudianteId && c.materiaId === materiaSeleccionada);

  // Agrupar materias por grado para el selector
  const materiasPorGrado = todasMaterias.reduce((acc, m) => {
    const key = m.grado?.numero || 0;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<number, MateriaConGrado[]>);

  // Materias de grados 6-9 para asignación
  const materiasGradosSuperiores = todasMaterias.filter(m => m.grado && m.grado.numero >= 6);
  // Grados 2-5 para asignación de tutor
  const gradosInferiores = grados.filter(g => g.numero >= 2 && g.numero <= 5);
  // Grados 6-9
  const gradosSuperiores = grados.filter(g => g.numero >= 6);

  // Effects
  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => { if (usuario) { loadGrados(); loadUsuarios(); loadTodasMaterias(); loadConfiguracion(); } }, [usuario, loadGrados, loadUsuarios, loadTodasMaterias, loadConfiguracion]);
  useEffect(() => { loadEstudiantes(); loadMaterias(); loadConfigsGrado(); }, [loadEstudiantes, loadMaterias, loadConfigsGrado]);
  useEffect(() => { loadConfig(); loadCalificaciones(); }, [loadConfig, loadCalificaciones, materiaSeleccionada]);
  // Solo cambiar la materia seleccionada si la actual no está en la nueva lista de materias
  useEffect(() => {
    if (materias.length) {
      const materiaActualEnLista = materias.some(m => m.id === materiaSeleccionada);
      if (!materiaActualEnLista) {
        setMateriaSeleccionada(materias[0].id);
      }
    }
  }, [gradoSeleccionado, materias, materiaSeleccionada]);

  // Filtrar grados según el usuario
  useEffect(() => {
    if (!usuario) {
      setGradosFiltrados([]);
      return;
    }
    
    if (usuario.rol === "admin") {
      // Admin ve todos los grados
      setGradosFiltrados(grados);
    } else {
      // Docente: filtrar según sus asignaciones
      const gradosIdsTutor = new Set(usuario.gradosAsignados?.map(g => g.id) || []);
      const gradosIdsMaterias = new Set(usuario.materiasAsignadas?.map(m => m.gradoId) || []);
      const todosIds = new Set([...gradosIdsTutor, ...gradosIdsMaterias]);
      
      const filtrados = grados.filter(g => todosIds.has(g.id));
      setGradosFiltrados(filtrados);
      
      // Si el grado seleccionado no está en los filtrados, seleccionar el primero
      if (filtrados.length > 0 && !filtrados.some(g => g.id === gradoSeleccionado)) {
        setGradoSeleccionado(filtrados[0].id);
      }
    }
  }, [usuario, grados, gradoSeleccionado]);

  // Filtrar materias según el usuario
  useEffect(() => {
    if (!usuario || !gradoSeleccionado) {
      setMateriasFiltradas(materias);
      return;
    }
    
    if (usuario.rol === "admin") {
      // Admin ve todas las materias
      setMateriasFiltradas(materias);
    } else {
      // Verificar si es tutor del grado
      const esTutor = usuario.gradosAsignados?.some(g => g.id === gradoSeleccionado);
      
      if (esTutor) {
        // Tutor ve todas las materias del grado
        setMateriasFiltradas(materias);
      } else {
        // Filtrar solo las materias asignadas en este grado
        const materiasDelGrado = new Set(
          usuario.materiasAsignadas
            ?.filter(m => m.gradoId === gradoSeleccionado)
            ?.map(m => m.id) || []
        );
        const filtradas = materias.filter(m => materiasDelGrado.has(m.id));
        setMateriasFiltradas(filtradas);
        
        // Si la materia seleccionada no está en las filtradas, seleccionar la primera
        if (filtradas.length > 0 && !filtradas.some(m => m.id === materiaSeleccionada)) {
          setMateriaSeleccionada(filtradas[0].id);
        }
      }
    }
  }, [usuario, gradoSeleccionado, materias, materiaSeleccionada]);

  // Loading
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-100"><RefreshCw className="h-8 w-8 animate-spin text-teal-600" /></div>;

  // Login
  if (!usuario) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-600 to-emerald-700 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 bg-white rounded-xl flex items-center justify-center mb-3 shadow-lg"><School className="h-7 w-7 text-teal-600" /></div>
          <CardTitle className="text-xl">Sistema de Calificaciones</CardTitle>
          <CardDescription>Centro Escolar Católico San José de la Montaña</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {!initialized ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">Inicializa el sistema para comenzar</p>
              <Button onClick={initSystem} className="w-full bg-teal-600 hover:bg-teal-700">Inicializar Sistema</Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-3">
              <div><Label>Email</Label><Input type="email" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} placeholder="correo@ejemplo.edu" required /></div>
              <div><Label>Contraseña</Label><Input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} required /></div>
              {loginError && <p className="text-sm text-red-500 text-center">{loginError}</p>}
              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={loginLoading}>{loginLoading ? "Ingresando..." : "Ingresar"}</Button>
              <p className="text-xs text-center text-muted-foreground">Ingrese sus credenciales para continuar</p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Main
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="bg-teal-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2"><School className="h-6 w-6" /><div><h1 className="text-sm font-bold">Sistema de Calificaciones</h1><p className="text-[10px] text-teal-100">Centro Escolar Católico San José de la Montaña</p></div></div>
          <div className="flex items-center gap-3">
            {configuracion && (
              <Badge className="bg-teal-700 text-white text-[10px] px-2 py-0.5">
                Año {configuracion.añoEscolar}
              </Badge>
            )}
            <div className="text-right text-xs"><p className="font-medium">{usuario.nombre}</p><p className="text-teal-200 capitalize">{usuario.rol}</p></div>
            <Button variant="ghost" size="sm" onClick={() => setPasswordDialogOpen(true)} className="text-white hover:bg-teal-700 h-7 px-2"><Key className="h-4 w-4 mr-1" />Clave</Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-teal-700 h-7 px-2"><LogOut className="h-4 w-4 mr-1" />Salir</Button>
          </div>
        </div>
      </header>

      {/* Diálogo de cambio de contraseña */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cambiar Contraseña</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Contraseña Actual</Label><Input type="password" value={passwordForm.actual} onChange={e => setPasswordForm({...passwordForm, actual: e.target.value})} /></div>
            <div><Label className="text-xs">Nueva Contraseña</Label><Input type="password" value={passwordForm.nueva} onChange={e => setPasswordForm({...passwordForm, nueva: e.target.value})} /></div>
            <div><Label className="text-xs">Confirmar Nueva Contraseña</Label><Input type="password" value={passwordForm.confirmar} onChange={e => setPasswordForm({...passwordForm, confirmar: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setPasswordDialogOpen(false); setPasswordForm({ actual: "", nueva: "", confirmar: "" }); }}>Cancelar</Button>
            <Button size="sm" onClick={handleChangePassword} disabled={passwordLoading} className="bg-teal-600">{passwordLoading ? "Guardando..." : "Cambiar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="flex-1 max-w-7xl mx-auto w-full px-3 py-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white shadow-sm h-9 overflow-x-auto rounded-none sm:rounded-md flex sm:inline-flex w-full sm:w-auto shrink-0 hide-scrollbar justify-start">
            <TabsTrigger id="tab-dashboard" value="dashboard" className="text-xs px-3 gap-1 shrink-0"><LayoutDashboard className="h-3.5 w-3.5" />Inicio</TabsTrigger>
            <TabsTrigger id="tab-calificaciones" value="calificaciones" className="text-xs px-3 gap-1 shrink-0"><ClipboardList className="h-3.5 w-3.5" />Calificaciones</TabsTrigger>
            <TabsTrigger id="tab-asistencia" value="asistencia" className="text-xs px-3 gap-1 shrink-0"><CalendarDays className="h-3.5 w-3.5" />Asistencia</TabsTrigger>
            <TabsTrigger value="estudiantes" className="text-xs px-3 gap-1 shrink-0"><Users className="h-3.5 w-3.5" />Estudiantes</TabsTrigger>
            <TabsTrigger value="boletas" className="text-xs px-3 gap-1 shrink-0"><FileText className="h-3.5 w-3.5" />Boletas</TabsTrigger>
            {usuario.rol === "admin" && <TabsTrigger value="admin" className="text-xs px-3 gap-1 shrink-0"><Settings className="h-3.5 w-3.5" />Admin</TabsTrigger>}
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="mt-3">
            <Dashboard 
              usuario={usuario}
              grados={grados}
              totalEstudiantes={grados.reduce((sum, g) => sum + (g._count?.estudiantes || 0), 0)}
              totalMaterias={todasMaterias.length}
              totalDocentes={usuarios.filter(u => u.rol === "docente" && u.activo).length}
            />
          </TabsContent>

          {/* Asistencia */}
          <TabsContent value="asistencia" className="mt-3">
            <AsistenciaBoard 
              grados={gradosFiltrados}
              materias={materiasFiltradas}
              estudiantes={estudiantes}
              gradoInicial={gradoSeleccionado}
              materiaInicial={materiaSeleccionada}
            />
          </TabsContent>

          {/* Calificaciones */}
          <TabsContent value="calificaciones" className="mt-3 space-y-3">
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[140px]"><Label className="text-xs mb-1 block">Grado</Label><Select value={gradoSeleccionado} onValueChange={setGradoSeleccionado}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{gradosFiltrados.map(g => <SelectItem key={g.id} value={g.id} className="text-sm">{g.numero}° "{g.seccion}" - {g.año}</SelectItem>)}</SelectContent></Select></div>
                  <div className="flex-1 min-w-[180px]"><Label className="text-xs mb-1 block">Materia</Label><Select value={materiaSeleccionada} onValueChange={setMateriaSeleccionada}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{materiasFiltradas.map(m => <SelectItem key={m.id} value={m.id} className="text-sm">{m.nombre}</SelectItem>)}</SelectContent></Select></div>
                  <div className="w-28"><Label className="text-xs mb-1 block">Trimestre</Label><Select value={trimestreSeleccionado} onValueChange={setTrimestreSeleccionado}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1" className="text-sm">I</SelectItem><SelectItem value="2" className="text-sm">II</SelectItem><SelectItem value="3" className="text-sm">III</SelectItem></SelectContent></Select></div>
                  {configActual && <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded"><span>{configActual.numActividadesCotidianas} AC ({configActual.porcentajeAC}%)</span><span>•</span><span>{configActual.numActividadesIntegradoras} AI ({configActual.porcentajeAI}%)</span>{configActual.tieneExamen && <><span>•</span><span>Ex ({configActual.porcentajeExamen}%)</span></>}</div>}
                  {usuario.rol === "admin" && <Button size="sm" variant="outline" className="h-8" onClick={() => { setEditConfig(configActual); setConfigDialogOpen(true); }}><Settings className="h-3.5 w-3.5 mr-1" />Config</Button>}
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setImportDialogOpen(true)}><Upload className="h-3.5 w-3.5 mr-1" />Importar</Button>
                </div>
              </CardContent>
            </Card>

            {gradoSeleccionado && materiaSeleccionada && configActual && (
              <Card className="shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead><tr className="bg-slate-700 text-white">
                        <th className="w-8 p-1.5 text-center font-medium sticky left-0 bg-slate-700 z-10">N°</th>
                        <th className="min-w-[160px] p-1.5 text-left font-medium sticky left-8 bg-slate-700 z-10">Estudiante</th>
                        <th colSpan={configActual.numActividadesCotidianas} className="p-1.5 text-center font-medium border-l border-slate-600">Act. Cotidianas ({configActual.porcentajeAC}%)</th>
                        <th className="w-12 p-1.5 text-center font-medium border-l border-slate-600">Prom</th>
                        <th colSpan={configActual.numActividadesIntegradoras} className="p-1.5 text-center font-medium border-l border-slate-600">Act. Integradoras ({configActual.porcentajeAI}%)</th>
                        <th className="w-12 p-1.5 text-center font-medium border-l border-slate-600">Prom</th>
                        {configActual.tieneExamen && <th className="w-14 p-1.5 text-center font-medium border-l border-slate-600">Ex. ({configActual.porcentajeExamen}%)</th>}
                        <th className="w-14 p-1.5 text-center font-medium border-l border-slate-600 bg-teal-600">Final</th>
                        <th className="w-12 p-1.5 text-center font-medium border-l border-slate-600">Rec.</th>
                        <th className="w-10 p-1.5 border-l border-slate-600"></th>
                      </tr></thead>
                      <tbody>
                        {estudiantes.map(est => <CalificacionRow key={`${est.id}-${materiaSeleccionada}`} estudiante={est} calificacion={getCalificacion(est.id)} config={configActual} onSave={handleSaveCalificacion} saving={saving} />)}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Estudiantes */}
          <TabsContent value="estudiantes" className="mt-3">
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
                <div><CardTitle className="text-base">Lista de Estudiantes</CardTitle><CardDescription className="text-xs">Gestiona los estudiantes por grado</CardDescription></div>
                <div className="flex gap-2">
                  <Dialog open={listaDialogOpen} onOpenChange={setListaDialogOpen}>
                    <DialogTrigger asChild><Button size="sm" variant="outline" className="h-7"><ListPlus className="h-3.5 w-3.5 mr-1" />Lista</Button></DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader><DialogTitle>Agregar Lista de Estudiantes</DialogTitle></DialogHeader>
                      <div className="space-y-2"><Label>Un nombre por línea</Label><textarea className="w-full h-48 p-2 text-sm border rounded-md" value={listaEstudiantes} onChange={e => setListaEstudiantes(e.target.value)} placeholder="Apellido, Nombre&#10;Apellido, Nombre&#10;..." /></div>
                      <DialogFooter><Button variant="outline" size="sm" onClick={() => { setListaDialogOpen(false); setListaEstudiantes(""); }}>Cancelar</Button><Button size="sm" onClick={handleAddMultipleEstudiantes} className="bg-teal-600">Agregar {listaEstudiantes.split('\n').filter(n => n.trim()).length}</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild><Button size="sm" className="bg-teal-600 h-7"><Plus className="h-3.5 w-3.5 mr-1" />Uno</Button></DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader><DialogTitle>Agregar Estudiante</DialogTitle></DialogHeader>
                      <div className="space-y-2"><Label>Nombre completo</Label><Input value={nuevoEstudiante.nombre} onChange={e => setNuevoEstudiante({ nombre: e.target.value })} placeholder="Apellidos, Nombres" /></div>
                      <DialogFooter><Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button size="sm" onClick={handleAddEstudiante} className="bg-teal-600">Guardar</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mb-3"><Select value={gradoSeleccionado} onValueChange={setGradoSeleccionado}><SelectTrigger className="w-full md:w-[250px] h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{gradosFiltrados.map(g => <SelectItem key={g.id} value={g.id} className="text-sm">{g.numero}° "{g.seccion}" ({g._count?.estudiantes || 0})</SelectItem>)}</SelectContent></Select></div>
                <div className="rounded border">
                  <Table className="text-xs">
                    <TableHeader><TableRow className="bg-slate-100"><TableHead className="w-10 text-center h-8">N°</TableHead><TableHead>Nombre Completo</TableHead><TableHead className="w-16 text-center">Estado</TableHead><TableHead className="w-12 text-center">Acciones</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {estudiantes.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-slate-400 py-8">No hay estudiantes</TableCell></TableRow> :
                        estudiantes.map(est => <TableRow key={est.id}>
                          <TableCell className="text-center font-medium">{est.numero}</TableCell>
                          <TableCell>{est.nombre}</TableCell>
                          <TableCell className="text-center"><Badge variant={est.activo ? "default" : "secondary"} className="text-[10px] h-5">{est.activo ? "Activo" : "Inactivo"}</Badge></TableCell>
                          <TableCell className="text-center"><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteEstudiante(est.id, est.nombre)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                        </TableRow>)}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Boletas */}
          <TabsContent value="boletas" className="mt-3">
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4"><CardTitle className="text-base">Generación de Boletas</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1"><Label className="text-xs">Grado</Label><Select value={gradoSeleccionado} onValueChange={setGradoSeleccionado}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{gradosFiltrados.map(g => <SelectItem key={g.id} value={g.id} className="text-sm">{g.numero}° "{g.seccion}"</SelectItem>)}</SelectContent></Select></div>
                  <div className="w-32"><Label className="text-xs">Trimestre</Label><Select value={trimestreSeleccionado} onValueChange={setTrimestreSeleccionado}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">I</SelectItem><SelectItem value="2">II</SelectItem><SelectItem value="3">III</SelectItem></SelectContent></Select></div>
                </div>
                {gradoSeleccionado && estudiantes.length > 0 && <BoletaList estudiantes={estudiantes} calificaciones={calificaciones} materias={materiasFiltradas} grado={gradosFiltrados.find(g => g.id === gradoSeleccionado)} trimestre={parseInt(trimestreSeleccionado)} expandedBoleta={expandedBoleta} setExpandedBoleta={setExpandedBoleta} />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin */}
          {usuario.rol === "admin" && (
            <TabsContent value="admin" className="mt-3 space-y-4">
              {/* Gestión de Usuarios */}
              <Card className="shadow-sm">
                <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
                  <div><CardTitle className="text-base">Gestión de Usuarios</CardTitle><CardDescription className="text-xs">Crea y administra usuarios del sistema</CardDescription></div>
                  <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                    <DialogTrigger asChild><Button size="sm" className="bg-teal-600 h-7"><UserPlus className="h-3.5 w-3.5 mr-1" />Nuevo Usuario</Button></DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                      <DialogHeader><DialogTitle>Crear Usuario</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div><Label className="text-xs">Nombre</Label><Input value={nuevoUsuario.nombre} onChange={e => setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})} placeholder="Nombre completo" /></div>
                        <div><Label className="text-xs">Email</Label><Input type="email" value={nuevoUsuario.email} onChange={e => setNuevoUsuario({...nuevoUsuario, email: e.target.value})} placeholder="correo@escuela.edu" /></div>
                        <div><Label className="text-xs">Contraseña</Label><Input type="password" value={nuevoUsuario.password} onChange={e => setNuevoUsuario({...nuevoUsuario, password: e.target.value})} placeholder="••••••••" /></div>
                        <div><Label className="text-xs">Rol</Label><Select value={nuevoUsuario.rol} onValueChange={v => setNuevoUsuario({...nuevoUsuario, rol: v})}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Administrador</SelectItem><SelectItem value="docente">Docente</SelectItem></SelectContent></Select></div>
                        
                        {nuevoUsuario.rol === "docente" && (
                          <>
                            {/* Grados 2-5: Tutor */}
                            <div>
                              <Label className="text-xs">Tutor de Grados (2° a 5°)</Label>
                              <p className="text-[10px] text-slate-500 mb-1">El docente será tutor del grado completo</p>
                              <div className="grid grid-cols-4 gap-2">
                                {gradosInferiores.map(g => (
                                  <label key={g.id} className="flex items-center gap-1 text-xs p-1.5 border rounded cursor-pointer hover:bg-slate-50">
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
                              <Label className="text-xs">Materias Asignadas (6° a 9°)</Label>
                              <p className="text-[10px] text-slate-500 mb-1">El docente califica estas materias específicas</p>
                              <div className="border rounded max-h-48 overflow-y-auto">
                                {gradosSuperiores.map(grado => (
                                  <div key={grado.id} className="border-b last:border-b-0">
                                    <div className="bg-slate-100 px-2 py-1 text-xs font-medium">{grado.numero}° "{grado.seccion}"</div>
                                    <div className="p-2 grid grid-cols-2 gap-1">
                                      {todasMaterias.filter(m => m.gradoId === grado.id).map(m => (
                                        <label key={m.id} className="flex items-center gap-1 text-xs p-1 hover:bg-slate-50 rounded cursor-pointer">
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
                          </>
                        )}
                      </div>
                      <DialogFooter><Button variant="outline" size="sm" onClick={() => setUserDialogOpen(false)}>Cancelar</Button><Button size="sm" onClick={handleAddUsuario} className="bg-teal-600">Crear</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="rounded border overflow-x-auto">
                    <Table className="text-xs">
                      <TableHeader><TableRow className="bg-slate-100"><TableHead className="h-8">Nombre</TableHead><TableHead>Email</TableHead><TableHead className="w-20">Rol</TableHead><TableHead className="w-20">Estado</TableHead><TableHead className="min-w-[200px]">Asignaciones</TableHead><TableHead className="w-20 text-center">Acciones</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {usuarios.map(u => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.nombre}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell><Badge variant={u.rol === "admin" ? "default" : "secondary"} className="text-[10px]">{u.rol === "admin" ? "Admin" : "Docente"}</Badge></TableCell>
                            <TableCell><Badge variant={u.activo ? "default" : "destructive"} className={`text-[10px] ${u.activo ? "bg-teal-600" : ""}`}>{u.activo ? "Activo" : "Inactivo"}</Badge></TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                {u.gradosComoTutor && u.gradosComoTutor.length > 0 && (
                                  <div><span className="text-[10px] text-slate-500">Tutor: </span>{u.gradosComoTutor.map(g => `${g.numero}°${g.seccion}`).join(", ")}</div>
                                )}
                                {u.materias && u.materias.length > 0 && (
                                  <div><span className="text-[10px] text-slate-500">Materias: </span>{u.materias.map(m => `${m.nombre} (${m.grado?.numero}º)`).join(", ")}</div>
                                )}
                                {(!u.gradosComoTutor || u.gradosComoTutor.length === 0) && (!u.materias || u.materias.length === 0) && "-"}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 mr-1" onClick={() => handleToggleUsuario(u.id, u.activo)}>{u.activo ? "🔒" : "🔓"}</Button>
                              {u.rol !== "admin" && <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => handleDeleteUsuario(u.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Info de Grados */}
              <Card className="shadow-sm">
                <CardHeader className="py-3 px-4"><CardTitle className="text-base">Grados Registrados</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {grados.map(g => <div key={g.id} className="p-3 bg-slate-50 rounded-lg border"><p className="font-medium">{g.numero}° "{g.seccion}"</p><p className="text-[10px] text-slate-500">{g._count?.estudiantes || 0} estudiantes • {g.docente?.nombre || "Sin docente"}</p></div>)}
                  </div>
                </CardContent>
              </Card>

              {/* Configuración del Sistema - Año Escolar */}
              <Card className="shadow-sm">
                <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
                  <div><CardTitle className="text-base">Año Escolar</CardTitle><CardDescription className="text-xs">Configure el año lectivo actual del sistema</CardDescription></div>
                  <Dialog open={añoDialogOpen} onOpenChange={setAñoDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="h-7">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        Cambiar Año
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader><DialogTitle>Cambiar Año Escolar</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Año Escolar</Label>
                          <Input 
                            type="number" 
                            value={nuevoAño} 
                            onChange={e => setNuevoAño(parseInt(e.target.value) || 2026)} 
                            min={2020} 
                            max={2100}
                            className="h-8"
                          />
                        </div>
                        <p className="text-xs text-slate-500">
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
                  <div className="flex items-center gap-4">
                    <div className="flex-1 p-4 bg-teal-50 rounded-lg border border-teal-200">
                      <p className="text-2xl font-bold text-teal-700">{configuracion?.añoEscolar || 2026}</p>
                      <p className="text-xs text-teal-600">Año lectivo actual</p>
                    </div>
                    <div className="flex-1 p-4 bg-slate-50 rounded-lg border">
                      <p className="text-lg font-medium">{grados.length}</p>
                      <p className="text-xs text-slate-500">Grados activos</p>
                    </div>
                    <div className="flex-1 p-4 bg-slate-50 rounded-lg border">
                      <p className="text-lg font-medium">{todasMaterias.length}</p>
                      <p className="text-xs text-slate-500">Materias</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Dialogs */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Configurar Actividades</DialogTitle></DialogHeader>
          {editConfig && <div className="space-y-3">
            <div><Label className="text-xs">Actividades Cotidianas</Label><div className="flex items-center gap-2 mt-1"><Input type="number" min="1" max="10" value={editConfig.numActividadesCotidianas} onChange={e => setEditConfig({...editConfig, numActividadesCotidianas: parseInt(e.target.value) || 1})} className="w-16 h-8" /><span className="text-xs">u.</span><Input type="number" min="0" max="100" value={editConfig.porcentajeAC} onChange={e => setEditConfig({...editConfig, porcentajeAC: parseFloat(e.target.value) || 0})} className="w-16 h-8 ml-auto" /><span className="text-xs">%</span></div></div>
            <div><Label className="text-xs">Actividades Integradoras</Label><div className="flex items-center gap-2 mt-1"><Input type="number" min="1" max="10" value={editConfig.numActividadesIntegradoras} onChange={e => setEditConfig({...editConfig, numActividadesIntegradoras: parseInt(e.target.value) || 1})} className="w-16 h-8" /><span className="text-xs">u.</span><Input type="number" min="0" max="100" value={editConfig.porcentajeAI} onChange={e => setEditConfig({...editConfig, porcentajeAI: parseFloat(e.target.value) || 0})} className="w-16 h-8 ml-auto" /><span className="text-xs">%</span></div></div>
            <div className="flex items-center justify-between"><Label className="text-xs">Examen</Label><div className="flex items-center gap-2"><input type="checkbox" checked={editConfig.tieneExamen} onChange={e => setEditConfig({...editConfig, tieneExamen: e.target.checked})} className="h-4 w-4" />{editConfig.tieneExamen && <><Input type="number" min="0" max="100" value={editConfig.porcentajeExamen} onChange={e => setEditConfig({...editConfig, porcentajeExamen: parseFloat(e.target.value) || 0})} className="w-16 h-8" /><span className="text-xs">%</span></>}</div></div>
            <div className="bg-slate-100 p-2 rounded text-xs flex justify-between"><span>Total:</span><span className={`font-bold ${Math.abs(editConfig.porcentajeAC + editConfig.porcentajeAI + (editConfig.tieneExamen ? editConfig.porcentajeExamen : 0) - 100) > 0.1 ? 'text-red-500' : 'text-teal-600'}`}>{(editConfig.porcentajeAC + editConfig.porcentajeAI + (editConfig.tieneExamen ? editConfig.porcentajeExamen : 0)).toFixed(1)}%</span></div>
          </div>}
          <DialogFooter><Button variant="outline" size="sm" onClick={() => setConfigDialogOpen(false)}>Cancelar</Button><Button size="sm" onClick={handleSaveConfig} className="bg-teal-600">Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Importar Calificaciones</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={generateTemplate} className="flex-1"><Download className="h-3.5 w-3.5 mr-1" />Plantilla</Button>
              <Button size="sm" variant="outline" onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()} className="flex-1"><Upload className="h-3.5 w-3.5 mr-1" />Cargar</Button>
              <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            </div>
            {importData && <pre className="bg-slate-50 p-2 rounded max-h-32 overflow-auto text-[10px]">{importData.slice(0, 500)}</pre>}
            <p className="text-[10px] text-slate-500">Primera fila: Estudiante, AC1, AC2... AI1... Examen. Filas siguientes: datos.</p>
          </div>
          <DialogFooter><Button variant="outline" size="sm" onClick={() => { setImportDialogOpen(false); setImportData(""); }}>Cancelar</Button><Button size="sm" onClick={handleImport} disabled={!importData} className="bg-teal-600">Importar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="bg-slate-800 text-slate-400 py-2 text-center text-[10px]">© 2026 Centro Escolar Católico San José de la Montaña</footer>
    </div>
  );
}

// Componentes
function CalificacionRow({ estudiante, calificacion, config, onSave, saving }: { estudiante: Estudiante; calificacion?: Calificacion; config: ConfigActividad; onSave: (id: string, data: { actividadesCotidianas: (number | null)[]; actividadesIntegradoras: (number | null)[]; examenTrimestral: number | null; recuperacion: number | null; }) => void; saving: boolean; }) {
  const [acNotas, setAcNotas] = useState<(number | null)[]>(() => parseNotas(calificacion?.actividadesCotidianas ?? null, config.numActividadesCotidianas));
  const [aiNotas, setAiNotas] = useState<(number | null)[]>(() => parseNotas(calificacion?.actividadesIntegradoras ?? null, config.numActividadesIntegradoras));
  const [examen, setExamen] = useState<number | null>(() => calificacion?.examenTrimestral ?? null);
  const [recup, setRecup] = useState<number | null>(() => calificacion?.recuperacion ?? null);
  const promAC = calcularPromedio(acNotas), promAI = calcularPromedio(aiNotas), promFinal = calcularPromedioFinal(promAC, promAI, examen, config);
  const parseVal = (v: string): number | null => { const n = parseFloat(v); return isNaN(n) ? null : Math.min(10, Math.max(0, n)); };
  const updateAC = (i: number, v: string) => { const n = [...acNotas]; n[i] = parseVal(v); setAcNotas(n); };
  const updateAI = (i: number, v: string) => { const n = [...aiNotas]; n[i] = parseVal(v); setAiNotas(n); };

  return (
    <tr className="border-b hover:bg-slate-50">
      <td className="p-1.5 text-center font-medium bg-white sticky left-0 z-10">{estudiante.numero}</td>
      <td className="p-1.5 font-medium bg-white sticky left-8 z-10 whitespace-nowrap">{estudiante.nombre}</td>
      {acNotas.map((n, i) => <td key={`ac-${i}`} className="p-0.5 border-l border-slate-200"><input type="number" min="0" max="10" step="0.1" className="w-10 h-6 text-center text-xs border-0 bg-transparent focus:bg-teal-50 rounded" value={n ?? ""} onChange={e => updateAC(i, e.target.value)} /></td>)}
      <td className="p-1.5 text-center font-medium border-l border-slate-200 bg-slate-50">{promAC !== null ? promAC.toFixed(1) : "-"}</td>
      {aiNotas.map((n, i) => <td key={`ai-${i}`} className="p-0.5 border-l border-slate-200"><input type="number" min="0" max="10" step="0.1" className="w-10 h-6 text-center text-xs border-0 bg-transparent focus:bg-teal-50 rounded" value={n ?? ""} onChange={e => updateAI(i, e.target.value)} /></td>)}
      <td className="p-1.5 text-center font-medium border-l border-slate-200 bg-slate-50">{promAI !== null ? promAI.toFixed(1) : "-"}</td>
      {config.tieneExamen && <td className="p-0.5 border-l border-slate-200"><input type="number" min="0" max="10" step="0.1" className="w-12 h-6 text-center text-xs border-0 bg-transparent focus:bg-teal-50 rounded" value={examen ?? ""} onChange={e => setExamen(parseVal(e.target.value))} /></td>}
      <td className="p-1.5 text-center border-l border-slate-200 bg-teal-50"><span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${promFinal !== null && promFinal >= 6 ? 'bg-teal-500 text-white' : promFinal !== null ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{promFinal !== null ? promFinal.toFixed(1) : "-"}</span></td>
      <td className="p-0.5 border-l border-slate-200"><input type="number" min="0" max="10" step="0.1" className="w-10 h-6 text-center text-xs border-0 bg-transparent focus:bg-teal-50 rounded" value={recup ?? ""} onChange={e => setRecup(parseVal(e.target.value))} /></td>
      <td className="p-1 border-l border-slate-200"><Button size="sm" onClick={() => onSave(estudiante.id, { actividadesCotidianas: acNotas, actividadesIntegradoras: aiNotas, examenTrimestral: examen, recuperacion: recup })} disabled={saving} className="h-6 w-6 p-0 bg-teal-600 hover:bg-teal-700"><Save className="h-3 w-3" /></Button></td>
    </tr>
  );
}

function BoletaList({ estudiantes, calificaciones, materias, grado, trimestre, expandedBoleta, setExpandedBoleta }: { estudiantes: Estudiante[]; calificaciones: Calificacion[]; materias: Materia[]; grado?: Grado; trimestre: number; expandedBoleta: string | null; setExpandedBoleta: (id: string | null) => void; }) {
  const getCalifs = (id: string) => calificaciones.filter(c => c.estudianteId === id && c.trimestre === trimestre);
  const calcProm = (c: Calificacion[]) => { const p = c.map(x => x.promedioFinal).filter((x): x is number => x !== null); return p.length ? p.reduce((a, b) => a + b, 0) / p.length : null; };
  
  const getTrimestreRomano = (t: number) => {
    const romanos = ['I', 'II', 'III'];
    return romanos[t - 1] || t.toString();
  };

  const getEstadoFinal = (promedio: number | null) => {
    if (promedio === null) return 'PENDIENTE';
    return promedio >= 6 ? 'APROBADO' : 'REPROBADO';
  };

  const imprimir = async (id: string) => {
    const est = estudiantes.find(e => e.id === id);
    if (!est) return;
    const califs = getCalifs(id);
    const prom = calcProm(califs);
    const estadoFinal = getEstadoFinal(prom);
    const año = grado?.año || new Date().getFullYear();
    const fechaImpresion = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });

    // Crear tabla de materias
    let tablaMaterias = materias.map(m => {
      const c = califs.find(x => x.materiaId === m.id);
      const notaFinal = c?.promedioFinal?.toFixed(1) ?? '-';
      const estado = c?.promedioFinal !== null && c?.promedioFinal !== undefined 
        ? (c.promedioFinal >= 6 ? 'A' : 'R') 
        : '-';
      return `<tr>
        <td style="text-align:left;padding:6px 8px">${m.nombre}</td>
        <td>${c?.calificacionAC?.toFixed(1) ?? '-'}</td>
        <td>${c?.calificacionAI?.toFixed(1) ?? '-'}</td>
        <td>${c?.examenTrimestral?.toFixed(1) ?? '-'}</td>
        <td style="font-weight:bold">${notaFinal}</td>
        <td style="font-weight:bold;color:${estado === 'A' ? '#059669' : estado === 'R' ? '#dc2626' : '#666'}">${estado}</td>
      </tr>`;
    }).join('');

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
          <th style="width: 35%">Asignatura</th>
          <th style="width: 12%">Prom. A.C.<br><small>(35%)</small></th>
          <th style="width: 12%">Prom. A.I.<br><small>(35%)</small></th>
          <th style="width: 12%">Examen<br><small>(30%)</small></th>
          <th style="width: 14%">Promedio<br>Final</th>
          <th style="width: 15%">Estado</th>
        </tr>
      </thead>
      <tbody>
        ${tablaMaterias}
      </tbody>
    </table>

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

      let tablaMaterias = materias.map(m => {
        const c = califs.find(x => x.materiaId === m.id);
        const notaFinal = c?.promedioFinal?.toFixed(1) ?? '-';
        const estado = c?.promedioFinal !== null && c?.promedioFinal !== undefined 
          ? (c.promedioFinal >= 6 ? 'A' : 'R') 
          : '-';
        return `<tr>
          <td style="text-align:left;padding:6px 8px">${m.nombre}</td>
          <td>${c?.calificacionAC?.toFixed(1) ?? '-'}</td>
          <td>${c?.calificacionAI?.toFixed(1) ?? '-'}</td>
          <td>${c?.examenTrimestral?.toFixed(1) ?? '-'}</td>
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
              <th style="width: 35%">Asignatura</th>
              <th style="width: 12%">Prom. A.C.<br><small>(35%)</small></th>
              <th style="width: 12%">Prom. A.I.<br><small>(35%)</small></th>
              <th style="width: 12%">Examen<br><small>(30%)</small></th>
              <th style="width: 14%">Promedio<br>Final</th>
              <th style="width: 15%">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${tablaMaterias}
          </tbody>
        </table>

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

  return (
    <div className="space-y-1.5">
      <div className="flex justify-end mb-2">
         <Button onClick={imprimirTodas} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors">
            <Printer className="h-4 w-4 mr-2" /> Imprimir Todas
         </Button>
      </div>
      {estudiantes.map(est => {
        const califs = getCalifs(est.id), prom = calcProm(califs), open = expandedBoleta === est.id;
        return (
          <Card key={est.id} className="shadow-sm">
            <div className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50" onClick={() => setExpandedBoleta(open ? null : est.id)}>
              <div className="flex items-center gap-2"><span className="text-xs text-slate-400 w-5">{est.numero}</span><span className="text-sm font-medium">{est.nombre}</span><Badge variant={prom !== null && prom >= 6 ? "default" : prom !== null ? "destructive" : "secondary"} className={`text-[10px] h-5 ${prom !== null && prom >= 6 ? 'bg-teal-600' : ''}`}>Prom: {prom !== null ? prom.toFixed(1) : "N/A"}</Badge></div>
              <div className="flex items-center gap-1"><Button size="sm" variant="ghost" className="h-6 px-2" onClick={e => { e.stopPropagation(); imprimir(est.id); }}><Printer className="h-3 w-3 mr-1" />Imprimir</Button>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div>
            </div>
            {open && <div className="border-t p-2 bg-slate-50"><Table className="text-xs"><TableHeader><TableRow className="bg-slate-100 h-7"><TableHead>Materia</TableHead><TableHead className="text-center">Prom. A.C.</TableHead><TableHead className="text-center">Prom. A.I.</TableHead><TableHead className="text-center">Examen</TableHead><TableHead className="text-center font-bold">Promedio</TableHead></TableRow></TableHeader><TableBody>{materias.map(m => { const c = califs.find(x => x.materiaId === m.id); return <TableRow key={m.id} className="h-7"><TableCell className="font-medium">{m.nombre}</TableCell><TableCell className="text-center">{c?.calificacionAC?.toFixed(1) ?? "-"}</TableCell><TableCell className="text-center">{c?.calificacionAI?.toFixed(1) ?? "-"}</TableCell><TableCell className="text-center">{c?.examenTrimestral?.toFixed(1) ?? "-"}</TableCell><TableCell className="text-center"><Badge variant={c?.promedioFinal !== null && c?.promedioFinal !== undefined && c.promedioFinal >= 6 ? "default" : "secondary"} className={`text-[10px] ${c?.promedioFinal !== null && c?.promedioFinal !== undefined && c.promedioFinal >= 6 ? 'bg-teal-600' : ''}`}>{c?.promedioFinal?.toFixed(1) ?? "-"}</Badge></TableCell></TableRow>; })}</TableBody></Table></div>}
          </Card>
        );
      })}
    </div>
  );
}
