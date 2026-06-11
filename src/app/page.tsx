"use client";

import React, { useState, useEffect, useRef, useMemo, startTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { SuspenseTab } from "@/components/SuspenseWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  LogOut, Users, User, ClipboardList, FileText, Plus, RefreshCw,
  School, Save, Printer, ChevronDown, ChevronUp, Settings, Upload,
  Download, Trash2, ListPlus, UserPlus, Key, Calendar, LayoutDashboard, CalendarDays, Lightbulb, Hash,
  Search, ArrowUpDown, Globe, BarChart3, AlertTriangle, GraduationCap
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Dashboard from "@/components/Dashboard";
import AsistenciaBoard from "@/components/AsistenciaBoard";
import CalificacionesTab from "@/components/CalificacionesTab";
import { EstudiantesTable } from "@/components/EstudiantesTable";
import GettingStartedWizard from "@/components/GettingStartedWizard";
import PredictiveAlerts from "@/components/PredictiveAlerts";
import { ContextualHelp } from "@/components/ContextualHelp";
import { CalificacionRow } from "@/components/grading/CalificacionRow";
import { HistorialCalificacionPopup } from "@/components/grading/HistorialCalificacionPopup";
import LoginView from "@/components/LoginView";
import { Usuario, AsignaturaConGrado, ConfigActividadPartial, Calificacion, ConfiguracionSistema } from "@/types";
import { isAdmin, getDocentesDelGrado } from "@/utils/roleHelpers";
import { calcularPromedio, calcularPromedioFinal, parseNotas, contarEstados } from "@/utils/gradeCalculations";
import { escapeHtml } from "@/lib/utils/index";
import PresenceIndicator from "@/components/PresenceIndicator";
import BoletaList from "@/components/BoletaList";
import ReporteCalificaciones from "@/components/ReporteCalificaciones";
import CuadroTrimestres from "@/components/CuadroTrimestres";
import ResumenAsignaturas from "@/components/ResumenAsignaturas";
import EnlacesInstitucionales from "@/components/EnlacesInstitucionales";
import { SystemThresholdsCard } from "@/components/SystemThresholdsCard";
import { TrimestreDatesConfig } from "@/components/TrimestreDatesConfig";
import ReporteAsistenciaMultiGrado from "@/components/ReporteAsistenciaMultiGrado";
import { DescargaCompletaButton } from "@/components/DescargaCompletaButton";
import { DescargaBoletasPorCiclo } from "@/components/DescargaBoletasPorCiclo";
import InformeTecnicoDialog from "@/components/InformeTecnicoDialog";
import AvanceDocentes from "@/components/AvanceDocentes";
import { MobileTabBar } from "@/components/MobileTabBar";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function Home() {
  const d = useDashboardData();

  const {
    loading, dataLoading, usuario, initialized, loginError, loginLoading, dataReady,
    darkMode, handleLogout, perfilDialogOpen, setPerfilDialogOpen,
    passwordDialogOpen, setPasswordDialogOpen, passwordForm, setPasswordForm, passwordLoading, handleChangePassword,
  } = d;

  const [informeDialogOpen, setInformeDialogOpen] = useState(false);
  const [materiasDialogOpen, setMateriasDialogOpen] = useState(false);
  const [nuevaMateriaNombre, setNuevaMateriaNombre] = useState("");
  const [nuevaMateriaGradoId, setNuevaMateriaGradoId] = useState("");
  const [materiasLoading, setMateriasLoading] = useState(false);
  const [editMateriaId, setEditMateriaId] = useState<string | null>(null);
  const [editMateriaNombre, setEditMateriaNombre] = useState("");

  const handleAddMateria = async () => {
    if (!nuevaMateriaNombre.trim() || !nuevaMateriaGradoId) return;
    setMateriasLoading(true);
    try {
      const res = await fetch("/api/materias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevaMateriaNombre.trim(), gradoId: nuevaMateriaGradoId }),
      });
      if (res.ok) {
        setNuevaMateriaNombre("");
        setNuevaMateriaGradoId("");
        d.loadTodasAsignaturas();
      }
    } catch (e) {
      console.error(e);
    }
    setMateriasLoading(false);
  };

  const handleDeleteMateria = async (id: string) => {
    if (!confirm("¿Eliminar esta asignatura?")) return;
    setMateriasLoading(true);
    try {
      const res = await fetch(`/api/materias?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        d.loadTodasAsignaturas();
      }
    } catch (e) {
      console.error(e);
    }
    setMateriasLoading(false);
  };

  const handleUpdateMateria = async () => {
    if (!editMateriaNombre.trim() || !editMateriaId) return;
    setMateriasLoading(true);
    try {
      const res = await fetch("/api/materias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editMateriaId, nombre: editMateriaNombre.trim() }),
      });
      if (res.ok) {
        setEditMateriaId(null);
        setEditMateriaNombre("");
        d.loadTodasAsignaturas();
      }
    } catch (e) {
      console.error(e);
    }
    setMateriasLoading(false);
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-live="polite" aria-label="Cargando sistema">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary/60" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Sistema de Calificaciones</p>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return <LoginView
      initialized={initialized}
      initSystem={d.initSystem}
      loginForm={d.loginForm}
      setLoginForm={d.setLoginForm}
      handleLogin={d.handleLogin}
      loginError={loginError}
      loginLoading={loginLoading}
      googleLoading={d.googleLoading}
      googleButtonRef={d.googleButtonRef}
    />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground safe-area-bottom">
      <PresenceIndicator
        userId={usuario.id}
        nombre={usuario.nombre}
        email={usuario.email}
        rol={usuario.rol}
        onActionEmit={d.handlePresenceEmit}
        onRemoteAction={(accion) => {
          if (accion.includes("Borrando") || accion.includes("Borró") || accion.includes("Editando") || accion.includes("Guardando")) {
            d.loadCalificaciones();
          }
        }}
      />

      {/* Header */}
      <header className="header-gradient text-card-foreground mobile-header">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full flex items-center justify-center bg-muted/50 ring-1 ring-border">
              <img src="/0.png" alt="Logo" className="h-7 w-7 sm:h-8 sm:w-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-xs sm:text-sm tracking-tight truncate">Sistema de Calificaciones</h1>
              <p className="text-[10px] sm:text-xs font-medium truncate text-muted-foreground/60">CEC San José de la Montaña</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            {d.configuracion && (
              <span className="text-[10px] sm:text-xs font-mono font-medium px-2 py-0.5 border border-border text-muted-foreground bg-muted/30">
                {d.configuracion.añoEscolar}
              </span>
            )}
            <button onClick={() => d.setTheme(d.theme === "dark" ? "light" : "dark")} className={`p-1.5 sm:p-2 transition-all text-muted-foreground hover:text-foreground hover:bg-muted/50`} title={darkMode ? "Modo claro" : "Modo oscuro"}>
              {darkMode ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <Button variant="ghost" size="sm" onClick={() => d.setShowWizard(true)} className="touch-target px-1.5 sm:px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 sm:h-10" title="Guía de inicio"><Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" /><span className="hidden sm:inline">Ayuda</span></Button>
            <div className="text-right text-xs font-medium hidden sm:block"><p className="font-medium cursor-pointer hover:underline text-foreground" onClick={() => setPerfilDialogOpen(true)}>{usuario.nombre}</p><p className="capitalize text-muted-foreground/60">{usuario.rol}</p></div>
            <Button variant="ghost" size="sm" onClick={() => setPerfilDialogOpen(true)} className="touch-target px-1.5 sm:px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 sm:h-10"><User className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" /><span className="hidden sm:inline">Perfil</span></Button>
            <Button variant="ghost" size="sm" onClick={() => setPasswordDialogOpen(true)} className="touch-target px-1.5 sm:px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 sm:h-10"><Key className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" /><span className="hidden sm:inline">Clave</span></Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Cerrar sesión" className="touch-target px-1.5 sm:px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 sm:h-10"><LogOut className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" /><span className="hidden sm:inline">Salir</span></Button>
          </div>
        </div>
      </header>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cambiar Contraseña</DialogTitle><DialogDescription>Actualiza tu contraseña de acceso al sistema.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-base font-medium" htmlFor="pw-actual">Contraseña Actual</Label><Input id="pw-actual" type="password" autoComplete="current-password" value={passwordForm.actual} onChange={e => setPasswordForm({ ...passwordForm, actual: e.target.value })} /></div>
            <div><Label className="text-base font-medium" htmlFor="pw-nueva">Nueva Contraseña</Label><Input id="pw-nueva" type="password" autoComplete="new-password" value={passwordForm.nueva} onChange={e => setPasswordForm({ ...passwordForm, nueva: e.target.value })} /></div>
            <div><Label className="text-base font-medium" htmlFor="pw-confirmar">Confirmar Nueva Contraseña</Label><Input id="pw-confirmar" type="password" autoComplete="new-password" value={passwordForm.confirmar} onChange={e => setPasswordForm({ ...passwordForm, confirmar: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setPasswordDialogOpen(false); setPasswordForm({ actual: "", nueva: "", confirmar: "" }); }}>Cancelar</Button>
            <Button size="sm" onClick={handleChangePassword} disabled={passwordLoading} className="bg-primary">{passwordLoading ? "Guardando…" : "Cambiar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main id="main-content" className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-3 py-2 sm:py-3 pb-24 md:pb-3 mobile-tab-content">
        <Tabs value={d.activeTab} onValueChange={(val) => {
          if (d.activeTab === "calificaciones" && val !== "calificaciones" && d.dirtyStudentsRef.current.size > 0) {
            if (!window.confirm("Tienes " + d.dirtyStudentsRef.current.size + " estudiante(s) con cambios sin guardar. ¿Cambiar de pestaña los perderá. ¿Continuar?")) return;
          }
          d.setActiveTab(val);
        }}>
          <TabsList className="shadow-lg h-11 overflow-x-auto rounded-xl hidden md:inline-flex w-auto shrink-0 hide-scrollbar justify-start space-x-1.5 bg-card/80 backdrop-blur-sm border border-border p-1" role="tablist" aria-label="Secciones del sistema">
            <motion.div className="flex space-x-1.5">
              <TabsTrigger value="dashboard" className="text-sm font-medium px-4 py-2 gap-1.5 shrink-0 rounded-lg transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground/70 hover:data-[state=inactive]:text-foreground hover:bg-muted/50"><LayoutDashboard className="h-4 w-4" />Inicio</TabsTrigger>
              <TabsTrigger value="calificaciones" className="text-sm font-medium px-4 py-2 gap-1.5 shrink-0 rounded-lg transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground/70 hover:data-[state=inactive]:text-foreground hover:bg-muted/50"><ClipboardList className="h-4 w-4" />Calificaciones</TabsTrigger>
              <TabsTrigger value="asistencia" className="text-sm font-medium px-4 py-2 gap-1.5 shrink-0 rounded-lg transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground/70 hover:data-[state=inactive]:text-foreground hover:bg-muted/50"><CalendarDays className="h-4 w-4" />Asistencia</TabsTrigger>
              <TabsTrigger value="estudiantes" className="text-sm font-medium px-4 py-2 gap-1.5 shrink-0 rounded-lg transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground/70 hover:data-[state=inactive]:text-foreground hover:bg-muted/50"><Users className="h-4 w-4" />Estudiantes</TabsTrigger>
              <TabsTrigger value="boletas" className="text-sm font-medium px-4 py-2 gap-1.5 shrink-0 rounded-lg transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground/70 hover:data-[state=inactive]:text-foreground hover:bg-muted/50"><FileText className="h-4 w-4" />Boletas</TabsTrigger>
              <TabsTrigger value="enlaces" className="text-sm font-medium px-4 py-2 gap-1.5 shrink-0 rounded-lg transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground/70 hover:data-[state=inactive]:text-foreground hover:bg-muted/50"><Globe className="h-4 w-4" />Enlaces</TabsTrigger>
              <TabsTrigger value="reportes" className="text-sm font-medium px-4 py-2 gap-1.5 shrink-0 rounded-lg transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground/70 hover:data-[state=inactive]:text-foreground hover:bg-muted/50"><BarChart3 className="h-4 w-4" />Reportes</TabsTrigger>
              {isAdmin(usuario.rol) && <TabsTrigger value="avance" className="text-sm font-medium px-4 py-2 gap-1.5 shrink-0 rounded-lg transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground/70 hover:data-[state=inactive]:text-foreground hover:bg-muted/50"><GraduationCap className="h-4 w-4" />Avance</TabsTrigger>}
              {isAdmin(usuario.rol) && <TabsTrigger value="admin" className="text-sm font-medium px-4 py-2 gap-1.5 shrink-0 rounded-lg transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground/70 hover:data-[state=inactive]:text-foreground hover:bg-muted/50"><Settings className="h-4 w-4" />Admin</TabsTrigger>}
            </motion.div>
          </TabsList>
          <div className="flex items-center gap-2 ml-auto">
            <ContextualHelp section={d.activeTab} darkMode={darkMode} />
            {d.autoSaveStatus === "saving" && (
              <span className="text-xs flex items-center gap-1 text-amber-600 dark:text-amber-400" role="status" aria-live="polite" aria-atomic="true">
                <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                <span className="hidden sm:inline">Guardando…</span>
              </span>
            )}
            {d.autoSaveStatus === "saved" && (
              <span className="text-xs flex items-center gap-1 text-green-600 dark:text-green-400" role="status" aria-live="polite" aria-atomic="true">
                <span className="hidden sm:inline">Guardado</span>
                <span className="sm:hidden">✓</span>
              </span>
            )}
            {d.autoSaveStatus === "saved" && (
              <span className="text-xs flex items-center gap-1 text-green-600 dark:text-green-400">
                <span className="hidden sm:inline">Guardado</span>
                <span className="sm:hidden">✓</span>
              </span>
            )}
          </div>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="mt-3">
            <Dashboard
              usuario={usuario}
              grados={d.grados}
              totalEstudiantes={d.grados.reduce((sum: number, g: any) => sum + (g._count?.estudiantes || 0), 0)}
              totalAsignaturas={d.todasAsignaturas.length}
              totalDocentes={d.usuarios.filter((u: any) => (u.rol === "docente" || u.rol === "docente-orientador") && u.activo).length}
              configuracion={d.configuracion ? { añoEscolar: d.configuracion.añoEscolar, escuela: d.configuracion.escuela, umbralAprobado: d.configuracion?.umbralAprobado ?? 6.5 } : undefined}
              onNavigate={(tab: string) => d.setActiveTab(tab)}
              asignaturasAsignadas={(
                isAdmin(usuario.rol)
                  ? d.todasAsignaturas.map((m: any) => ({ id: m.id, nombre: m.nombre, gradoId: m.gradoId, grado: m.grado }))
                  : (usuario.asignaturasAsignadas || []).map((m: any) => ({ id: m.id, nombre: m.nombre, gradoId: m.gradoId, grado: { id: m.gradoId, numero: m.gradoNumero || 0, seccion: m.gradoSeccion || "" } }))
              )}
            />
            <div className="mt-4">
              <PredictiveAlerts
                gradoId={d.gradoSeleccionado}
                trimestre={d.trimestreSeleccionado}
                darkMode={darkMode}
                umbralAprobado={d.configuracion?.umbralAprobado ?? 6.5}
              />
            </div>
          </TabsContent>

          {/* Asistencia */}
          <TabsContent value="asistencia" className="mt-3">
            <AsistenciaBoard
              key={`asistencia-${d.gradoSeleccionado}`}
              grados={d.gradosFiltrados}
              asignaturas={d.asignaturasFiltradas}
              estudiantes={d.estudiantes}
              gradoInicial={d.gradoSeleccionado}
              onGradoChange={(nuevoGradoId: string) => d.setGradoSeleccionado(nuevoGradoId)}
              onPresenceEmit={(accion: string, descripcion: string, extra?: any) => d.emitActionRef.current(accion, descripcion, extra)}
              usuario={usuario ? { nombre: usuario.nombre, rol: usuario.rol } : undefined}
            />
          </TabsContent>

          {/* Grade entry */}
          <TabsContent value="calificaciones" className="mt-3">
            <CalificacionesTab d={d} darkMode={darkMode} usuario={usuario} />
          </TabsContent>

          {/* Estudiantes */}
          <TabsContent value="estudiantes" className="mt-3">
            <Card className="shadow-sm bg-card border-border module-card">
              <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0 border-border">
                <div><CardTitle className="text-base">Lista de Estudiantes</CardTitle><CardDescription className="text-sm sm:text-base font-medium text-muted-foreground">Gestiona los estudiantes por grado</CardDescription></div>
                {(isAdmin(usuario.rol) || usuario.rol === "docente" || usuario.rol === "docente-orientador") && (
                  <div className="flex gap-2">
                    <Dialog open={d.listaDialogOpen} onOpenChange={d.setListaDialogOpen}>
                      <DialogTrigger asChild><Button size="sm" variant="outline" className={`h-10 text-xs sm:text-sm ${darkMode ? 'border-white/30 text-white hover-gradient-strong' : ''}`}><ListPlus className="h-5 w-5 mr-1" />Lista</Button></DialogTrigger>
<DialogContent className="max-w-md w-[95vw] bg-card border-border">
                        <DialogHeader><DialogTitle>Agregar Lista de Estudiantes</DialogTitle><DialogDescription>Ingresa los nombres de los estudiantes, uno por línea.</DialogDescription></DialogHeader>
                        <div className="space-y-2"><Label>Un nombre por línea</Label><textarea className={`w-full h-48 p-2 text-sm border rounded-md ${darkMode ? 'bg-card border-white/30 text-white' : ''}`} value={d.listaEstudiantes} onChange={e => d.setListaEstudiantes(e.target.value)} placeholder="Apellido, Nombre&#10;Apellido, Nombre, correo@email.com&#10;…" aria-label="Lista de estudiantes, uno por línea" /></div>
                        <DialogFooter><Button variant="outline" size="sm" onClick={() => { d.setListaDialogOpen(false); d.setListaEstudiantes(""); }}>Cancelar</Button><Button size="sm" onClick={d.handleAddMultipleEstudiantes} className="bg-primary">Agregar {d.listaEstudiantes.split('\n').filter((n: string) => n.trim()).length}</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={d.dialogOpen} onOpenChange={d.setDialogOpen}>
                      <DialogTrigger asChild><Button size="sm" className={`h-10 text-xs sm:text-sm ${darkMode ? 'bg-primary hover:bg-primary' : 'bg-primary'}`}><Plus className="h-5 w-5 mr-1" />Uno</Button></DialogTrigger>
                      <DialogContent className="max-w-sm bg-card border-border">
                        <DialogHeader><DialogTitle>Agregar Estudiante</DialogTitle><DialogDescription>Ingresa el nombre completo y correo del estudiante.</DialogDescription></DialogHeader>
                        <div className="space-y-2"><Label>Nombre completo</Label><Input value={d.nuevoEstudiante.nombre} onChange={e => d.setNuevoEstudiante((prev: any) => ({ ...prev, nombre: e.target.value }))} placeholder="Apellidos, Nombres" /><Label>Correo electrónico (opcional)</Label><Input value={d.nuevoEstudiante.email} onChange={e => d.setNuevoEstudiante((prev: any) => ({ ...prev, email: e.target.value }))} type="email" /></div>
                        <DialogFooter><Button variant="outline" size="sm" onClick={() => d.setDialogOpen(false)}>Cancelar</Button><Button size="sm" onClick={d.handleAddEstudiante} className="bg-primary">Guardar</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mb-3 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                  <Select value={d.gradoSeleccionado} onValueChange={(val) => { d.setGradoSeleccionado(val); d.setAsignaturaSeleccionada(""); }}>
                    <SelectTrigger className={`w-full md:w-[250px] h-10 sm:h-12 text-xs sm:text-sm ${darkMode ? 'bg-card border-white/30 text-white' : ''}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{d.gradosFiltrados.map((g: any) => <SelectItem key={g.id} value={g.id} className="text-sm">{g.numero}° "{g.seccion}" ({g._count?.estudiantes || 0})</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={d.imprimirListadoEstudiantesPDF} className={`h-10 text-xs sm:text-sm ${darkMode ? 'border-white/30 text-white hover-gradient-strong' : ''}`}>
                    <Printer className="h-4 w-4 mr-1" />Imprimir PDF
                  </Button>
                </div>
                <div className={`rounded border ${darkMode ? 'border-slate-700' : ''}`}>
                  <EstudiantesTable
                    estudiantes={d.estudiantes}
                    darkMode={darkMode}
                    isAdmin={isAdmin(usuario.rol)}
                    loading={d.sectionLoading}
                    onReorder={d.handleReordenarEstudiantes}
                    onDelete={d.handleDeleteEstudiante}
                    onUpdateEstudiante={isAdmin(usuario.rol) ? d.handleUpdateEstudiante : undefined}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Boletas */}
          <TabsContent value="boletas" className="mt-3">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}>
              <Card className={`shadow-md border-0 overflow-hidden module-card ${darkMode ? 'bg-card' : 'bg-gradient-to-br from-white to-slate-50/60'}`}>
                <div className={`h-1 w-full ${darkMode ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-500'}`} />
                <CardHeader className="pb-3 px-5">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg icon-container ${darkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}><FileText className="h-4 w-4" /></div>
                    <div>
                      <CardTitle className={`text-base font-semibold tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>Generación de Boletas</CardTitle>
                      <CardDescription className="text-xs mt-0.5 text-muted-foreground">Selecciona grado y trimestre para visualizar las boletas</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 px-5 pb-5 space-y-4">
                  <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-950/40 backdrop-blur-md border-white/5 shadow-2xl' : 'bg-white border-slate-200/70 shadow-sm'}`}>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <div className="flex-1">
                        <Label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${darkMode ? 'text-slate-200' : 'text-slate-500'}`}>Grado</Label>
                        <Select value={d.gradoSeleccionado} onValueChange={(val) => { d.setGradoSeleccionado(val); d.setAsignaturaSeleccionada(""); }}>
                          <SelectTrigger className={`h-11 text-sm ${darkMode ? 'bg-card border-white/30 text-white' : 'bg-white border-slate-300'}`}><SelectValue placeholder="Seleccionar grado" /></SelectTrigger>
                          <SelectContent>{d.gradosFiltrados.map((g: any) => <SelectItem key={g.id} value={g.id} className="text-sm">{g.numero}° "{g.seccion}"</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="w-full sm:w-36">
                        <Label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${darkMode ? 'text-slate-200' : 'text-slate-500'}`}>Trimestre</Label>
                        <Select value={d.trimestreSeleccionado || ""} onValueChange={d.handleTrimestreChange}>
                          <SelectTrigger className={`h-11 text-sm ${darkMode ? 'bg-card border-white/30 text-white' : 'bg-white border-slate-300'}`}><SelectValue placeholder="Trimestre" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">I</SelectItem>
                            <SelectItem value="2">II</SelectItem>
                            <SelectItem value="3">III</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {d.gradoSeleccionado && d.estudiantes.length > 0 && (
                    <>
                      {(isAdmin(usuario.rol) || usuario.rol === "docente-orientador") && (
                          <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/60 text-white border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <Label className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Asignaturas en boleta</Label>
                            <Select value={d.materiasEnBoleta.length === 0 ? "todas" : "personalizado"} onValueChange={(v) => { if (v === "todas") { d.setMateriasEnBoleta([]); } }}>
                              <SelectTrigger className={`w-36 h-8 text-xs ${darkMode ? 'bg-slate-800 text-slate-200 border-white/20 hover:bg-slate-700' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'}`}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="todas" className="text-xs">Todas ({d.todasAsignaturas.filter((m: any) => m.gradoId === d.gradoSeleccionado).length})</SelectItem>
                                <SelectItem value="personalizado" className="text-xs">Seleccionar…</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {d.todasAsignaturas.filter((m: any) => m.gradoId === d.gradoSeleccionado).map((m: any) => {
                              const isSelected = d.materiasEnBoleta.length === 0 || d.materiasEnBoleta.includes(m.id);
                              return (
                                <button
                                  key={m.id}
                                  onClick={() => {
                                    if (d.materiasEnBoleta.length === 0) {
                                      const todas = d.todasAsignaturas.filter((m2: any) => m2.gradoId === d.gradoSeleccionado).map((m2: any) => m2.id);
                                      d.setMateriasEnBoleta(todas.filter((id: string) => id !== m.id));
                                    } else {
                                      d.setMateriasEnBoleta(d.materiasEnBoleta.includes(m.id) ? d.materiasEnBoleta.filter((id: string) => id !== m.id) : [...d.materiasEnBoleta, m.id]);
                                    }
                                  }}
                                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${isSelected ? (darkMode ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50' : 'bg-emerald-50 text-emerald-700 border-emerald-300') : (darkMode ? 'bg-slate-800 text-slate-400 border-white/10 opacity-60' : 'bg-slate-100 text-slate-500 border-slate-200 opacity-60')}`}
                                >
                                  {m.nombre}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-950/40 backdrop-blur-md border-white/5 shadow-2xl' : 'bg-white border-slate-200/70 shadow-sm'}`}>
                        <Label className={`text-xs font-semibold uppercase tracking-wider mb-3 block ${darkMode ? 'text-white' : 'text-slate-500'}`}>Opciones de impresión</Label>
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-medium whitespace-nowrap ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Tamaño:</span>
                              <RadioGroup value={d.paperSize} onValueChange={(val) => d.setPaperSize(val as "letter" | "a4")} className="flex items-center gap-1">
                                <div className="flex items-center gap-1.5">
                                  <RadioGroupItem value="letter" id="pp-letter" className="h-4 w-4" />
                                  <Label htmlFor="pp-letter" className={`text-sm cursor-pointer ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Carta</Label>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <RadioGroupItem value="a4" id="pp-a4" className="h-4 w-4" />
                                  <Label htmlFor="pp-a4" className={`text-sm cursor-pointer ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>A4</Label>
                                </div>
                              </RadioGroup>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <span className={`text-xs font-medium whitespace-nowrap ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Asistencia:</span>
                              <Select value={d.tipoAsistencia} onValueChange={(val) => {
                                const v = val as "auto" | "manual_espacio" | "manual_digital";
                                d.setTipoAsistencia(v);
                                d.setIncluirAsistenciaBoleta(v === "auto");
                                d.setIncluirAsistenciaManual(v === "manual_espacio");
                                d.setAsistenciaManualHabilitado(v === "manual_digital");
                              }}>
                                <SelectTrigger className={`w-full sm:w-44 h-11 text-sm ${darkMode ? 'bg-card border-white/30 text-white' : 'bg-white border-slate-300'}`}><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="auto">Automática</SelectItem>
                                  <SelectItem value="manual_espacio">Espacio Manual</SelectItem>
                                  <SelectItem value="manual_digital">Manual por Alumno</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2 ml-0 sm:ml-2">
                              <Switch
                                checked={d.mostrarAsistencia}
                                onCheckedChange={d.setMostrarAsistencia}
                                id="mostrar-asistencia"
                                className="h-5 w-9"
                              />
                              <Label htmlFor="mostrar-asistencia" className={`text-sm cursor-pointer select-none ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                {d.mostrarAsistencia ? 'Mostrar' : 'Ocultar'}
                              </Label>
                            </div>
                          </div>
                        </div>
                      </div>

                      <BoletaList
                        estudiantes={d.estudiantes}
                        calificaciones={d.calificaciones}
                        materias={(() => {
                          const materiasGrado = d.todasAsignaturas.filter((m: any) => m.gradoId === d.gradoSeleccionado);
                          const materiasValidas = d.materiasEnBoleta.filter((id: string) => materiasGrado.some((m: any) => m.id === id));
                          return materiasValidas.length > 0 ? materiasGrado.filter((m: any) => materiasValidas.includes(m.id)) : materiasGrado;
                        })()}
                        grado={d.gradosFiltrados.find((g: any) => g.id === d.gradoSeleccionado)}
                        trimestre={d.trimestreSeleccionado ? parseInt(d.trimestreSeleccionado) : 1}
                        expandedBoleta={d.expandedBoleta}
                        setExpandedBoleta={d.setExpandedBoleta}
                        darkMode={darkMode}
                        configuracion={d.configuracion ? { nombreDirectora: d.configuracion.nombreDirectora, umbralCondicionado: d.configuracion?.umbralCondicionado ?? 4.5, umbralAprobado: d.configuracion?.umbralAprobado ?? 6.5 } : undefined}
                        paperSize={d.paperSize}
                        incluirAsistencia={d.incluirAsistenciaBoleta}
                        mostrarRecuperacion={d.mostrarRecuperacion}
                        porcentajes={d.configActual ? { ac: d.configActual.porcentajeAC, ai: d.configActual.porcentajeAI, ex: d.configActual.porcentajeExamen } : undefined}
                        incluirAsistenciaManual={d.incluirAsistenciaManual}
                        asistenciaManualHabilitado={d.asistenciaManualHabilitado}
                        mostrarAsistencia={d.mostrarAsistencia}
                        asistenciaManualData={d.asistenciaManualData}
                        onAsistenciaManualChange={d.handleAsistenciaManualChange}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Enlaces */}
          <TabsContent value="enlaces" className="mt-3">
            <EnlacesInstitucionales darkMode={darkMode} />
          </TabsContent>

          {/* Reportes */}
          <TabsContent value="reportes" className="mt-3">
            <div className="space-y-4">
              {/* Sección: Reporte de Calificaciones */}
              <Card className={`shadow-md border overflow-hidden module-card ${darkMode ? "bg-slate-950/40 backdrop-blur-md border-white/5" : "bg-white border-slate-200"}`}>
                <div className={`h-1 w-full ${darkMode ? "bg-gradient-to-r from-blue-500 to-blue-400" : "bg-gradient-to-r from-blue-600 to-blue-500"}`} />
                <CardHeader className="pb-2 px-4 pt-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg icon-container ${darkMode ? "bg-blue-900/40 text-blue-400" : "bg-blue-50 text-blue-700"}`}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className={`text-sm font-semibold ${darkMode ? "text-white" : "text-slate-800"}`}>Reporte de Calificaciones</CardTitle>
                      <CardDescription className="text-[10px] mt-0.5">Estado de estudiantes por grado y trimestre</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-2">
                  <ReporteCalificaciones
                    grados={d.gradosFiltrados}
                    darkMode={darkMode}
                    todasAsignaturas={d.todasAsignaturas}
                    umbralCondicionado={d.configuracion?.umbralCondicionado ?? 4.5}
                    umbralAprobado={d.configuracion?.umbralAprobado ?? 6.5}
                  />
                </CardContent>
              </Card>

              {/* Sección: Consolidado de Calificaciones */}
              <Card className={`shadow-md border overflow-hidden module-card ${darkMode ? "bg-slate-950/40 backdrop-blur-md border-white/5" : "bg-white border-slate-200"}`}>
                <div className={`h-1 w-full ${darkMode ? "bg-gradient-to-r from-purple-500 to-purple-400" : "bg-gradient-to-r from-purple-600 to-purple-500"}`} />
                <CardHeader className="pb-2 px-4 pt-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg icon-container ${darkMode ? "bg-purple-900/40 text-purple-400" : "bg-purple-50 text-purple-700"}`}>
                      <Download className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className={`text-sm font-semibold ${darkMode ? "text-white" : "text-slate-800"}`}>Consolidado de Calificaciones</CardTitle>
                      <CardDescription className="text-[10px] mt-0.5">Descarga las calificaciones de todos los grados y asignaturas por trimestre</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Selecciona el trimestre y descarga el reporte completo en PDF, Word o Excel.
                    </p>
                    <DescargaCompletaButton darkMode={darkMode} />
                  </div>
                </CardContent>
              </Card>

              {/* Sección: Descarga de Boletas por Lote */}
              <Card className={`shadow-md border overflow-hidden module-card ${darkMode ? "bg-slate-950/40 backdrop-blur-md border-white/5" : "bg-white border-slate-200"}`}>
                <div className={`h-1 w-full ${darkMode ? "bg-gradient-to-r from-indigo-500 to-indigo-400" : "bg-gradient-to-r from-indigo-600 to-indigo-500"}`} />
                <CardHeader className="pb-2 px-4 pt-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg icon-container ${darkMode ? "bg-indigo-900/40 text-indigo-400" : "bg-indigo-50 text-indigo-700"}`}>
                      <Download className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className={`text-sm font-semibold ${darkMode ? "text-white" : "text-slate-800"}`}>Descarga de Boletas por Lote</CardTitle>
                      <CardDescription className="text-[10px] mt-0.5">Descarga todas las boletas de 2° a 9° grado o por ciclo (Primer Ciclo: 2°-3°, Segundo Ciclo: 4°-6°, Tercer Ciclo: 7°-9°)</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Selecciona el trimestre y descarga las boletas de todos los grados o por ciclo en un solo documento.
                    </p>
                    <DescargaBoletasPorCiclo
                      grados={d.gradosFiltrados}
                      darkMode={darkMode}
                      configuracion={d.configuracion ? { nombreDirectora: d.configuracion.nombreDirectora, umbralCondicionado: d.configuracion?.umbralCondicionado ?? 4.5, umbralAprobado: d.configuracion?.umbralAprobado ?? 6.5 } : undefined}
                      paperSize={d.paperSize}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Sección: Reporte de Asistencia Consolidado */}
              <Card className={`shadow-md border overflow-hidden module-card ${darkMode ? "bg-slate-950/40 backdrop-blur-md border-white/5" : "bg-white border-slate-200"}`}>
                <div className={`h-1 w-full ${darkMode ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-emerald-600 to-emerald-500"}`} />
                <CardHeader className="pb-2 px-4 pt-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg icon-container ${darkMode ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-50 text-emerald-700"}`}>
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className={`text-sm font-semibold ${darkMode ? "text-white" : "text-slate-800"}`}>Reporte de Asistencia Consolidado</CardTitle>
                      <CardDescription className="text-[10px] mt-0.5">Visualiza y exporta la asistencia de múltiples grados (2° a 9°)</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-2">
                  <ReporteAsistenciaMultiGrado grados={d.gradosFiltrados} darkMode={darkMode} />
                </CardContent>
              </Card>

              {/* Sección: Informe Técnico */}
              <Card className={`shadow-md border overflow-hidden module-card ${darkMode ? "bg-slate-950/40 backdrop-blur-md border-white/5" : "bg-white border-slate-200"}`}>
                <div className={`h-1 w-full ${darkMode ? "bg-gradient-to-r from-amber-500 to-amber-400" : "bg-gradient-to-r from-amber-600 to-amber-500"}`} />
                <CardHeader className="pb-2 px-4 pt-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg icon-container ${darkMode ? "bg-amber-900/40 text-amber-400" : "bg-amber-50 text-amber-700"}`}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className={`text-sm font-semibold ${darkMode ? "text-white" : "text-slate-800"}`}>Informe Técnico Pedagógico</CardTitle>
                      <CardDescription className="text-[10px] mt-0.5">Genera un informe profesional con estadísticas generales del sistema</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Genera un informe técnico pedagógico-didáctico con estadísticas de rendimiento por ciclo, cuadro de honor y plan de acción.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setInformeDialogOpen(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white h-9 text-xs font-bold px-4"
                    >
                      <FileText className="h-4 w-4 mr-1" /> Generar Informe
                    </Button>
                  </div>
                  <InformeTecnicoDialog
                    open={informeDialogOpen}
                    onOpenChange={setInformeDialogOpen}
                    darkMode={darkMode}
                    usuario={usuario ? { nombre: usuario.nombre, rol: usuario.rol } : { nombre: "", rol: "" }}
                    configuracion={{ añoEscolar: d.configuracion?.añoEscolar ?? 2026, escuela: d.configuracion?.escuela ?? "Centro Escolar Católico", umbralAprobado: d.configuracion?.umbralAprobado ?? 6.5 }}
                    grados={d.gradosFiltrados.map((g: any) => ({ id: g.id, numero: g.numero, seccion: g.seccion, _count: g._count || { estudiantes: 0 } }))}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Avance */}
          {isAdmin(usuario.rol) && (
            <TabsContent value="avance" className="mt-3">
              <AvanceDocentes />
            </TabsContent>
          )}

          {/* Admin */}
          {isAdmin(usuario.rol) && (
            <TabsContent value="admin" className="mt-3 space-y-3 sm:space-y-4">
              <Card className="shadow-md bg-card border-border module-card">
                <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0 border-border">
                  <div><CardTitle className="text-sm sm:text-base">Gestión de Usuarios</CardTitle><CardDescription className="text-xs text-muted-foreground">Crea y administra usuarios del sistema</CardDescription></div>
                  <Dialog open={d.userDialogOpen} onOpenChange={d.setUserDialogOpen}>
                    <DialogTrigger asChild><Button size="sm" className={`h-7 text-xs ${darkMode ? 'bg-primary hover:bg-primary' : 'bg-primary'}`} onClick={() => { d.setEditUsuarioId(null); d.setNuevoUsuario({ email: "", password: "", nombre: "", rol: "docente", materiasAsignadas: [] }); }}><UserPlus className="h-3.5 w-3.5 mr-1" />Nuevo Usuario</Button></DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
                      <DialogHeader><DialogTitle>{d.editUsuarioId ? "Editar Usuario" : "Crear Usuario"}</DialogTitle><DialogDescription>Completa la información del usuario del sistema.</DialogDescription></DialogHeader>
                      <div className="space-y-3">
                        <div><Label className="text-xs" htmlFor="new-user-nombre">Nombre</Label><Input id="new-user-nombre" value={d.nuevoUsuario.nombre} onChange={e => d.setNuevoUsuario({ ...d.nuevoUsuario, nombre: e.target.value })} autoComplete="name" /></div>
                        <div><Label className="text-xs" htmlFor="new-user-email">Email</Label><Input id="new-user-email" type="email" value={d.nuevoUsuario.email} onChange={e => d.setNuevoUsuario({ ...d.nuevoUsuario, email: e.target.value })} autoComplete="email" /></div>
                        <div><Label className="text-xs" htmlFor="new-user-password">Contraseña</Label><Input id="new-user-password" type="password" value={d.nuevoUsuario.password} onChange={e => d.setNuevoUsuario({ ...d.nuevoUsuario, password: e.target.value })} autoComplete="new-password" /></div>
                        <div><Label className="text-xs">Rol</Label>
                          <Select value={d.nuevoUsuario.rol} onValueChange={v => d.setNuevoUsuario({ ...d.nuevoUsuario, rol: v })}>
                            <SelectTrigger className={`h-8 ${darkMode ? 'bg-card border-white/30 text-white' : ''}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="admin-directora">Directora</SelectItem>
                              <SelectItem value="admin-codirectora">Codirectora</SelectItem>
                              <SelectItem value="docente">Docente</SelectItem>
                              <SelectItem value="docente-orientador">Docente-Orientador</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Asignaturas Asignadas</Label>
                          <div className={`border rounded max-h-64 overflow-y-auto ${darkMode ? 'border-slate-700' : ''}`}>
                            {d.grados.map((grado: any) => (
                              <div key={grado.id} className={`border-b last:border-b-0 ${darkMode ? 'border-slate-700' : ''}`}>
                                <div className={`px-2 py-1 text-xs font-medium ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>{grado.numero}° "{grado.seccion}"</div>
                                <div className="p-2 grid grid-cols-2 gap-1">
                                  {d.todasAsignaturas.filter((m: any) => m.gradoId === grado.id).map((m: any) => (
                                    <label key={m.id} className={`flex items-center gap-1 text-xs p-1 rounded cursor-pointer hover-gradient`}>
                                      <input type="checkbox" checked={d.nuevoUsuario.materiasAsignadas.includes(m.id)} onChange={e => d.setNuevoUsuario({ ...d.nuevoUsuario, materiasAsignadas: e.target.checked ? [...d.nuevoUsuario.materiasAsignadas, m.id] : d.nuevoUsuario.materiasAsignadas.filter((id: string) => id !== m.id) })} className="h-3 w-3" />
                                      {m.nombre}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter><Button variant="outline" size="sm" onClick={() => d.setUserDialogOpen(false)}>Cancelar</Button><Button size="sm" onClick={d.handleAddUsuario} className="bg-primary">{d.editUsuarioId ? "Guardar" : "Crear"}</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className={`rounded border overflow-x-auto ${darkMode ? 'border-slate-700' : ''}`}>
                    <Table className="text-xs">
                      <TableHeader><TableRow className={darkMode ? 'bg-slate-700/25' : 'bg-slate-100'}><TableHead className="h-8">Nombre</TableHead><TableHead>Email</TableHead><TableHead className="w-20">Rol</TableHead><TableHead className="w-20">Estado</TableHead><TableHead className="min-w-[200px]">Asignaciones</TableHead><TableHead className="w-20 text-center">Acciones</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {d.usuarios.map((u: any) => (
                          <TableRow key={u.id} className={darkMode ? 'border-slate-700' : ''}>
                            <TableCell className={`font-medium ${darkMode ? 'text-white' : ''}`}>{u.nombre}</TableCell>
                            <TableCell className={darkMode ? 'text-slate-400' : ''}>{u.email}</TableCell>
                            <TableCell><Badge variant={isAdmin(u.rol) ? "default" : u.rol === "docente-orientador" ? "outline" : "secondary"} className="text-[10px]">{u.rol}</Badge></TableCell>
                            <TableCell><Badge variant={u.activo ? "default" : "destructive"} className="text-[10px]">{u.activo ? "Activo" : "Inactivo"}</Badge></TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                {u.materias && u.materias.length > 0
                                  ? <span className="text-[10px]">{u.materias.map((m: any) => `${m.nombre} (${m.gradoNumero}°)`).slice(0, 3).join(", ")}{u.materias.length > 3 ? ` +${u.materias.length - 3}` : ""}</span>
                                  : (isAdmin(u.rol) ? "Acceso total" : "-")}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button size="sm" variant="ghost" className={`touch-target ${darkMode ? 'text-amber-400' : 'text-amber-500'}`} onClick={() => d.abrirEditarUsuario(u)}><Settings className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" className="touch-target" onClick={() => d.handleToggleUsuario(u.id, u.activo)} aria-label={u.activo ? "Bloquear" : "Desbloquear"}>{u.activo ? "🔒" : "🔓"}</Button>
                                <Button size="sm" variant="ghost" className={`touch-target ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} onClick={() => d.openResetPassword({ id: u.id, nombre: u.nombre })} aria-label="Restablecer contraseña">🔑</Button>
                                {d.canDelete(usuario) && <Button size="sm" variant="ghost" className={`touch-target ${darkMode ? 'text-red-400' : 'text-red-500'}`} onClick={() => d.handleDeleteUsuario(u.id)}><Trash2 className="h-4 w-4" /></Button>}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md bg-card border-border module-card">
                <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0 border-border">
                  <div><CardTitle className="text-sm sm:text-base">Gestión de Asignaturas</CardTitle><CardDescription className="text-xs text-muted-foreground">Añade o elimina asignaturas del sistema</CardDescription></div>
                  <Dialog open={materiasDialogOpen} onOpenChange={setMateriasDialogOpen}>
                    <DialogTrigger asChild><Button size="sm" className={`h-7 text-xs ${darkMode ? 'bg-primary hover:bg-primary' : 'bg-primary'}`}><ListPlus className="h-3.5 w-3.5 mr-1" />Gestionar</Button></DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
                      <DialogHeader><DialogTitle>Gestión de Asignaturas</DialogTitle><DialogDescription>Añade nuevas asignaturas o elimina existentes del sistema.</DialogDescription></DialogHeader>
                      <div className="space-y-4">
                        <div className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                          <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Añadir Nueva Asignatura</p>
                          <div className="space-y-2">
                            <div><Label className="text-xs">Nombre de la Asignatura</Label><Input value={nuevaMateriaNombre} onChange={e => setNuevaMateriaNombre(e.target.value)} placeholder="Ej: Matemáticas Avanzadas" className={`h-8 ${darkMode ? 'bg-card border-white/30 text-white' : ''}`} /></div>
                            <div><Label className="text-xs">Grado</Label>
                              <Select value={nuevaMateriaGradoId} onValueChange={setNuevaMateriaGradoId}>
                                <SelectTrigger className={`h-8 ${darkMode ? 'bg-card border-white/30 text-white' : ''}`}><SelectValue placeholder="Seleccionar grado" /></SelectTrigger>
                                <SelectContent>
                                  {d.grados.map((g: any) => (<SelectItem key={g.id} value={g.id}>{g.numero}° "{g.seccion}"</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button size="sm" onClick={handleAddMateria} disabled={materiasLoading || !nuevaMateriaNombre.trim() || !nuevaMateriaGradoId} className="bg-primary w-full">{materiasLoading ? "Guardando…" : "Añadir Asignatura"}</Button>
                          </div>
                        </div>
                        <div>
                          <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Asignaturas Existentes</p>
                          <div className={`border rounded max-h-64 overflow-y-auto ${darkMode ? 'border-slate-700' : ''}`}>
                            {d.grados.map((grado: any) => {
                              const materiasDelGrado = d.todasAsignaturas.filter((m: any) => m.gradoId === grado.id);
                              if (materiasDelGrado.length === 0) return null;
                              return (
                                <div key={grado.id} className={`border-b last:border-b-0 ${darkMode ? 'border-slate-700' : ''}`}>
                                  <div className={`px-2 py-1 text-xs font-medium ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>{grado.numero}° "{grado.seccion}"</div>
                                  <div className="p-2 space-y-1">
                                    {materiasDelGrado.map((m: any) => (
                                      <div key={m.id} className={`flex items-center justify-between gap-2 p-1.5 rounded text-xs ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                        {editMateriaId === m.id ? (
                                          <div className="flex items-center gap-1 flex-1">
                                            <Input value={editMateriaNombre} onChange={e => setEditMateriaNombre(e.target.value)} className={`h-7 text-xs flex-1 ${darkMode ? 'bg-card border-white/30 text-white' : ''}`} autoFocus />
                                            <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-500" onClick={handleUpdateMateria} disabled={materiasLoading}><Save className="h-3.5 w-3.5" /></Button>
                                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditMateriaId(null); setEditMateriaNombre(""); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                          </div>
                                        ) : (
                                          <>
                                            <span className={`flex-1 ${darkMode ? 'text-slate-200' : ''}`}>{m.nombre}</span>
                                            <div className="flex items-center gap-0.5">
                                              <Button size="sm" variant="ghost" className={`h-6 w-6 p-0 ${darkMode ? 'text-amber-400' : 'text-amber-500'}`} onClick={() => { setEditMateriaId(m.id); setEditMateriaNombre(m.nombre); }}><Settings className="h-3.5 w-3.5" /></Button>
                                              <Button size="sm" variant="ghost" className={`h-6 w-6 p-0 ${darkMode ? 'text-red-400' : 'text-red-500'}`} onClick={() => handleDeleteMateria(m.id)} disabled={materiasLoading}><Trash2 className="h-3.5 w-3.5" /></Button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <DialogFooter><Button variant="outline" size="sm" onClick={() => setMateriasDialogOpen(false)}>Cerrar</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {d.grados.map((g: any) => {
                      const count = d.todasAsignaturas.filter((m: any) => m.gradoId === g.id).length;
                      return (
                        <div key={g.id} className={`p-3 rounded-lg border ${darkMode ? 'bg-card border-white/30' : 'bg-slate-50'}`}>
                          <p className={`font-medium text-xs sm:text-sm ${darkMode ? 'text-white' : ''}`}>{g.numero}° "{g.seccion}"</p>
                          <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{count} asignatura{count !== 1 ? 's' : ''}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md bg-card border-border module-card">
                <CardHeader className="py-3 px-4 border-border"><CardTitle className="text-sm sm:text-base">Grados Registrados</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {d.grados.map((g: any) => (
                      <div key={g.id} className={`p-3 rounded-lg border ${darkMode ? 'bg-card border-white/30' : 'bg-slate-50'}`}>
                        <p className={`font-medium text-xs sm:text-sm ${darkMode ? 'text-white' : ''}`}>{g.numero}° "{g.seccion}"</p>
                        <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{g._count?.estudiantes || 0} estudiantes</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md bg-card border-border module-card">
                <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0 border-border">
                  <div><CardTitle className="text-sm sm:text-base">Año Escolar</CardTitle><CardDescription className="text-xs text-muted-foreground">Configure el año lectivo actual del sistema</CardDescription></div>
                  <Dialog open={d.añoDialogOpen} onOpenChange={d.setAñoDialogOpen}>
                    <DialogTrigger asChild><Button size="sm" variant="outline" className={`h-7 text-xs ${darkMode ? 'border-white/30 text-white hover-gradient-strong' : ''}`}><Calendar className="h-3.5 w-3.5 mr-1" />Cambiar Año</Button></DialogTrigger>
                    <DialogContent className="max-w-sm bg-card border-border">
                      <DialogHeader><DialogTitle>Cambiar Año Escolar</DialogTitle><DialogDescription>El nuevo año solo mostrará datos correspondientes a ese período.</DialogDescription></DialogHeader>
                      <div className="space-y-3">
                        <Label className="text-xs">Año Escolar</Label>
                        <Input type="number" value={d.nuevoAño} onChange={e => d.setNuevoAño(parseInt(e.target.value) || 2026)} min={2020} max={2100} className={`h-8 ${darkMode ? 'bg-card border-white/30 text-white' : ''}`} />
                      </div>
                      <DialogFooter><Button variant="outline" size="sm" onClick={() => d.setAñoDialogOpen(false)}>Cancelar</Button><Button size="sm" onClick={d.handleCambiarAño} disabled={d.añoLoading} className="bg-primary">{d.añoLoading ? "Guardando…" : "Cambiar"}</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="p-4 rounded-lg border ${darkMode ? 'bg-emerald-900/30 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}">
                    <p className={`text-2xl font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>{d.configuracion?.añoEscolar || 2026}</p>
                    <p className={`text-xs ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Año lectivo actual</p>
                  </div>
                </CardContent>
                <CardFooter className={`border-t justify-between py-3 px-4 ${darkMode ? 'bg-card border-white/30' : 'bg-slate-50'}`}>
                  <Button variant="destructive" size="sm" onClick={d.handleResetSistema} className="h-8 text-xs">
                    <Trash2 className="h-4 w-4 mr-1" /> Finalizar Año
                  </Button>
                </CardFooter>
              </Card>

              <TrimestreDatesConfig
                darkMode={darkMode}
                fechas={d.fechasTrimestres}
                onFechasChange={d.setFechasTrimestres}
                onSave={d.handleGuardarFechasTrimestres}
                onReset={d.handleResetFechasTrimestres}
                loading={d.fechasTrimestresLoading}
              />

              <SystemThresholdsCard
                darkMode={darkMode}
                umbrales={d.umbrales}
                setUmbrales={d.setUmbrales}
                onSave={d.handleGuardarUmbrales}
                onReset={() => d.setUmbrales({ umbralRecuperacion: 5.0, umbralCondicionado: 4.5, umbralAprobado: 6.5, notaMinima: 0.0, notaMaxima: 10.0, maxHistorialCelda: 10, usarIntervaloReprobado: true, usarIntervaloCondicionado: true, usarIntervaloAprobado: true })}
                loading={d.umbralesLoading}
              />

              <Card className="shadow-md bg-card border-border module-card">
                <CardHeader className="py-3 px-4 border-border">
                  <CardTitle className="text-sm sm:text-base">Historial de Auditoría</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">Registro de quién digitó o borró calificaciones</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Button size="sm" variant="outline" className={`h-8 text-xs ${darkMode ? 'border-white/30 text-white' : ''}`} onClick={d.loadAuditLogs} disabled={d.auditLoading}>
                      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${d.auditLoading ? 'animate-spin' : ''}`} /> Actualizar
                    </Button>
                    <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={d.handleDeleteAuditLogs} disabled={d.auditLoading || d.auditTotal === 0}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Borrar todo
                    </Button>
                  </div>
                  <div className={`rounded border overflow-x-auto ${darkMode ? 'border-slate-700' : ''}`}>
                    <table className="w-full text-xs">
                      <thead><tr className={darkMode ? 'bg-slate-800' : 'bg-slate-100'}>
                        <th className="p-2 text-left">Fecha</th><th className="p-2 text-left">Usuario</th><th className="p-2 text-left">Acción</th><th className="p-2 text-left">Grado</th>
                      </tr></thead>
                      <tbody>
                        {d.auditLoading ? <tr><td colSpan={4} className="p-4 text-center text-slate-500">Cargando…</td></tr> :
                          d.auditLogs.length === 0 ? <tr><td colSpan={4} className="p-4 text-center text-slate-500">No hay registros</td></tr> :
                            d.auditLogs.map((log: any) => (
                              <tr key={log.id} className={`border-t ${darkMode ? 'border-slate-700' : ''}`}>
                                <td className="p-2 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('es-DO')}</td>
                                <td className="p-2 font-medium">{log.usuario?.nombre || 'Desconocido'}</td>
                                <td className="p-2"><Badge variant={log.accion === 'DELETE' ? 'destructive' : 'default'} className="text-[10px]">{log.accion === 'DELETE' ? 'Borró' : 'Digitó'}</Badge></td>
                                <td className={`p-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{log.grado || '—'}</td>
                              </tr>
                            ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>

      <GettingStartedWizard
        open={d.showWizard}
        onClose={() => d.setShowWizard(false)}
        darkMode={darkMode}
        userRole={usuario.rol}
        onNavigateTo={(tab: string) => { d.setActiveTab(tab); }}
      />

      {/* Config Dialog */}
      <Dialog open={d.configDialogOpen} onOpenChange={d.setConfigDialogOpen}>
        <DialogContent className="max-w-sm mx-4 bg-card border-border">
          <DialogHeader><DialogTitle className="text-base">Configurar Actividades</DialogTitle><DialogDescription className="text-sm">Define cuántas actividades y sus porcentajes por trimestre.</DialogDescription></DialogHeader>
          {d.editConfig && <div className="space-y-3">
            <div><Label className="text-sm">Actividades Cotidianas</Label><div className="flex items-center gap-2 mt-1"><Input type="number" min="1" max="10" value={d.editConfig.numActividadesCotidianas} onChange={e => d.setEditConfig({ ...d.editConfig, numActividadesCotidianas: parseInt(e.target.value) || 1 } as ConfigActividadPartial)} className={`w-16 h-11 text-base ${darkMode ? 'bg-card border-white/30 text-white' : ''}`} /><span className="text-sm">u.</span><Input type="number" min="0" max="100" value={d.editConfig.porcentajeAC} onChange={e => d.setEditConfig({ ...d.editConfig, porcentajeAC: parseFloat(e.target.value) || 0 } as ConfigActividadPartial)} className={`w-16 h-11 text-base ml-auto ${darkMode ? 'bg-card border-white/30 text-white' : ''}`} /><span className="text-sm">%</span></div></div>
            <div><Label className="text-sm">Actividades Integradoras</Label><div className="flex items-center gap-2 mt-1"><Input type="number" min="1" max="10" value={d.editConfig.numActividadesIntegradoras} onChange={e => d.setEditConfig({ ...d.editConfig, numActividadesIntegradoras: parseInt(e.target.value) || 1 } as ConfigActividadPartial)} className={`w-16 h-11 text-base ${darkMode ? 'bg-card border-white/30 text-white' : ''}`} /><span className="text-sm">u.</span><Input type="number" min="0" max="100" value={d.editConfig.porcentajeAI} onChange={e => d.setEditConfig({ ...d.editConfig, porcentajeAI: parseFloat(e.target.value) || 0 } as ConfigActividadPartial)} className={`w-16 h-11 text-base ml-auto ${darkMode ? 'bg-card border-white/30 text-white' : ''}`} /><span className="text-sm">%</span></div></div>
            <div className="flex items-center justify-between"><Label className="text-sm">Examen</Label><div className="flex items-center gap-2"><input type="checkbox" checked={d.editConfig.tieneExamen} onChange={e => d.setEditConfig({ ...d.editConfig, tieneExamen: e.target.checked } as ConfigActividadPartial)} className="h-5 w-5" />{d.editConfig.tieneExamen && <><Input type="number" min="1" max="5" value={d.editConfig.numExamenes ?? 1} onChange={e => d.setEditConfig({ ...d.editConfig, numExamenes: parseInt(e.target.value) || 1 } as ConfigActividadPartial)} className={`w-12 h-11 text-base ${darkMode ? 'bg-card border-white/30 text-white' : ''}`} /><span className="text-sm text-muted-foreground">partes</span><Input type="number" min="0" max="100" value={d.editConfig.porcentajeExamen} onChange={e => d.setEditConfig({ ...d.editConfig, porcentajeExamen: parseFloat(e.target.value) || 0 } as ConfigActividadPartial)} className={`w-16 h-11 text-base ${darkMode ? 'bg-card border-white/30 text-white' : ''}`} /><span className="text-sm">%</span></>}</div></div>
            <div className={`p-3 rounded-lg text-sm flex justify-between ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><span>Total:</span><span className={`font-bold ${Math.abs(d.editConfig.porcentajeAC + d.editConfig.porcentajeAI + (d.editConfig.tieneExamen ? d.editConfig.porcentajeExamen : 0) - 100) > 0.1 ? 'text-red-500' : (darkMode ? 'text-emerald-400' : 'text-emerald-600')}`}>{(d.editConfig.porcentajeAC + d.editConfig.porcentajeAI + (d.editConfig.tieneExamen ? d.editConfig.porcentajeExamen : 0)).toFixed(1)}%</span></div>
            <div className={`flex items-center gap-2 mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <input type="checkbox" id="aplicarATodas" checked={d.configAplicarATodas} onChange={e => d.setConfigAplicarATodas(e.target.checked)} className="h-5 w-5 text-emerald-600" />
              <Label htmlFor="aplicarATodas" className="text-sm font-medium">Aplicar a todas las materias de este grado</Label>
            </div>
          </div>}
          <DialogFooter className="flex-row gap-2 sm:gap-0"><Button variant="outline" size="sm" className="flex-1 sm:flex-initial" onClick={() => d.setConfigDialogOpen(false)} disabled={d.configLoading}>Cancelar</Button><Button size="sm" className="flex-1 sm:flex-initial bg-primary" onClick={async () => { d.setConfigLoading(true); try { await d.handleSaveConfig(); } finally { d.setConfigLoading(false); }}} disabled={d.configLoading}>{d.configLoading ? "Guardando…" : "Guardar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={d.importDialogOpen} onOpenChange={d.setImportDialogOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader><DialogTitle>Importar Calificaciones</DialogTitle><DialogDescription>Carga un archivo CSV con las notas de los estudiantes.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={d.generateTemplate} className={`flex-1 text-xs ${darkMode ? 'border-white/30 text-white hover-gradient-strong' : ''}`}><Download className="h-3.5 w-3.5 mr-1" />Plantilla</Button>
              <Button size="sm" variant="outline" onClick={() => (document.querySelector<HTMLInputElement>('input[type="file"]')?.click())} className={`flex-1 text-xs ${darkMode ? 'border-white/30 text-white hover-gradient-strong' : ''}`}><Upload className="h-3.5 w-3.5 mr-1" />Cargar</Button>
              <input type="file" accept=".csv,.txt" className="hidden" onChange={d.handleFileUpload} />
            </div>
            {d.importData && <div className={`p-2 rounded text-xs max-h-24 overflow-auto ${darkMode ? 'bg-slate-950/40 backdrop-blur-md text-slate-300' : 'bg-slate-50'}`}>{d.importData.slice(0, 200)}…</div>}
                            <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Primera fila: Estudiante, AC1, AC2… AI1… Examen. Filas siguientes: datos.</p>
          </div>
          <DialogFooter><Button variant="outline" size="sm" onClick={() => { d.setImportDialogOpen(false); d.setImportData(""); }} disabled={d.importLoading}>Cancelar</Button><Button size="sm" onClick={async () => { d.setImportLoading(true); try { await d.handleImport(); } finally { d.setImportLoading(false); }}} disabled={!d.importData || d.importLoading} className="bg-primary">{d.importLoading ? "Importando…" : "Importar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Borrar Calificaciones Dialog */}
      <Dialog open={d.borrarCalifDialogOpen} onOpenChange={d.setBorrarCalifDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2"><Trash2 className="h-5 w-5" />Borrar Calificaciones</DialogTitle>
            <DialogDescription>
              {d.borrarCalifTipo === "grado"
                ? `Esto borrará TODAS las calificaciones del grado en la materia y trimestre seleccionados. Esta acción no se puede deshacer.`
                : "Esto borrará las calificaciones del estudiante seleccionado. Esta acción no se puede deshacer."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => d.setBorrarCalifDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={d.borrarCalifTipo === "grado" ? d.handleBorrarCalifGrado : d.handleBorrarCalifAlumno} disabled={d.borrarCalifLoading}>
              {d.borrarCalifLoading ? "Borrando…" : "Borrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={d.resetPasswordDialogOpen} onOpenChange={d.setResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Restablecer Contraseña</DialogTitle>
            <DialogDescription>Nueva contraseña para: <strong>{d.resetPasswordUser?.nombre}</strong></DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reset-password">Nueva Contraseña</Label>
            <Input id="reset-password" type="password" autoComplete="new-password" value={d.resetPasswordForm.password} onChange={(e) => d.setResetPasswordForm({ password: e.target.value })} className={`mt-1 ${darkMode ? 'bg-card border-white/30 text-white' : ''}`} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => d.setResetPasswordDialogOpen(false)}>Cancelar</Button>
            <Button onClick={d.handleResetPassword} disabled={d.resetPasswordLoading || !d.resetPasswordForm.password} className="bg-primary">{d.resetPasswordLoading ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Perfil Dialog */}
      <Dialog open={perfilDialogOpen} onOpenChange={setPerfilDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Mi Perfil</DialogTitle>
            <DialogDescription>Información de tu cuenta y asignaciones.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className={`p-4 rounded-lg space-y-3 ${darkMode ? 'bg-slate-950/40 backdrop-blur-md' : 'bg-slate-50'}`}>
              <div><p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Nombre</p><p className={`font-medium text-lg break-all ${darkMode ? 'text-white' : ''}`}>{usuario.nombre}</p></div>
              <div><p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Email</p><p className={`font-medium break-all ${darkMode ? 'text-white' : ''}`}>{usuario.email}</p></div>
              <div><p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Rol</p><p className={`font-medium capitalize ${darkMode ? 'text-white' : ''}`}>{usuario.rol}</p></div>
            </div>
            {usuario.gradosAsignados && usuario.gradosAsignados.length > 0 && (
              <div><p className={`text-xs mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Grados como Tutor</p>
                <div className="flex flex-wrap gap-1">{usuario.gradosAsignados.map((g: any) => (<Badge key={g.id} variant="outline" className={darkMode ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700' : 'bg-emerald-50'}>{g.numero}° "{g.seccion}"</Badge>))}</div>
              </div>
            )}
            {usuario.asignaturasAsignadas && usuario.asignaturasAsignadas.length > 0 && (
              <div><p className={`text-xs mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Materias Asignadas</p>
                <div className="flex flex-wrap gap-1">{usuario.asignaturasAsignadas.map((m: any) => (<Badge key={m.id} variant="outline" className={darkMode ? 'bg-slate-800 text-slate-200 border-slate-700' : ''}>{m.nombre} ({m.gradoNumero}°)</Badge>))}</div>
              </div>
            )}
          </div>
          <DialogFooter><Button onClick={() => setPerfilDialogOpen(false)} className="bg-primary">Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Historial Popup */}
      {d.historialPopup && (
        <>
          <div className="fixed inset-0 z-40" onClick={d.handleCloseHistory} />
          <HistorialCalificacionPopup
            calificacionId={d.historialPopup.calificacionId}
            tipoCampo={d.historialPopup.tipoCampo}
            campoLabel={d.historialPopup.campoLabel}
            darkMode={darkMode}
            onClose={d.handleCloseHistory}
            anchorRef={d.historialPopup.anchorRef}
          />
        </>
      )}

      <footer className="py-2 text-center text-xs hidden md:block bg-card text-muted-foreground">© 2026 Centro Escolar Católico San José de la Montaña</footer>

      {/* Mobile bottom nav */}
      <MobileTabBar
        items={d.navItems}
        activeTab={d.activeTab}
        onTabChange={d.setActiveTab}
        darkMode={darkMode}
        isAdmin={isAdmin(usuario.rol)}
      />
    </div>
  );
}
