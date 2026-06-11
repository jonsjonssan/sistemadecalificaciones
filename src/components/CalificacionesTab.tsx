"use client";

import React, { useState, useEffect, useRef, useMemo, startTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalificacionRow } from "@/components/grading/CalificacionRow";
import CuadroTrimestres from "@/components/CuadroTrimestres";
import ResumenAsignaturas from "@/components/ResumenAsignaturas";
import {
  School, Save, RefreshCw, Settings, Hash, Search, FileText, Download,
  ChevronDown, ChevronUp, ClipboardList, AlertTriangle, GraduationCap,
  BookOpen, Filter, BarChart3, CheckCircle, Clock, XCircle, Trash2
} from "lucide-react";
import { Calificacion } from "@/types";
import { isAdmin } from "@/utils/roleHelpers";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  d: any;
  darkMode: boolean;
  usuario: any;
}

export default function CalificacionesTab({ d, darkMode, usuario }: Props) {
  const [showFilters, setShowFilters] = useState(true);

  if (!d.gradosFiltrados || d.gradosFiltrados.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="border-dashed border-2 shadow-none">
          <CardContent className="p-10 text-center">
            <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <School className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold text-foreground/60 mb-1">No hay grados disponibles</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {isAdmin(usuario.rol)
                ? "No existen grados registrados. Crea uno desde la pestaña Admin para comenzar."
                : "No tienes grados o materias asignados. Contacta al administrador."}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-3">
      {/* ── Toolbar ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className={`rounded-xl border shadow-sm ${darkMode ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'}`}
      >
        {/* Selector row */}
        <div className="p-3 sm:p-4 pb-0">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="relative">
                <Select value={d.gradoSeleccionado || ""} onValueChange={(val) => { d.setGradoSeleccionado(val); d.setAsignaturaSeleccionada(""); }}>
                  <SelectTrigger className={`h-10 text-xs sm:text-sm pl-8 ${darkMode ? 'bg-slate-800 border-white/20 text-white' : ''}`}>
                    <SelectValue placeholder="Grado" />
                  </SelectTrigger>
                  <SelectContent>
                    {d.gradosFiltrados?.map((g: any) => (
                      <SelectItem key={g.id} value={g.id} className="text-sm">{g.numero}° "{g.seccion}"</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <BookOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
              </div>
              <Select value={d.asignaturaSeleccionada || ""} onValueChange={(val) => d.setAsignaturaSeleccionada(val)}>
                <SelectTrigger className={`h-10 text-xs sm:text-sm ${darkMode ? 'bg-slate-800 border-white/20 text-white' : ''}`}>
                  <SelectValue placeholder="Asignatura" />
                </SelectTrigger>
                <SelectContent>
                  {d.asignaturasFiltradas?.map((m: any) => (
                    <SelectItem key={m.id} value={m.id} className="text-sm">{m.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={d.trimestreSeleccionado || ""} onValueChange={d.handleTrimestreChange}>
                <SelectTrigger className={`h-10 text-xs sm:text-sm ${darkMode ? 'bg-slate-800 border-white/20 text-white' : ''}`}>
                  <SelectValue placeholder="Trimestre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1" className="text-sm">I Trimestre</SelectItem>
                  <SelectItem value="2" className="text-sm">II Trimestre</SelectItem>
                  <SelectItem value="3" className="text-sm">III Trimestre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action buttons */}
            <div className="flex gap-1.5">
              <Button size="sm" className="h-10 px-3 text-xs font-semibold gap-1.5 flex-1" onClick={d.handleGuardarTodo} disabled={d.saving}>
                <Save className="h-3.5 w-3.5" />
                <span>{d.saving ? '…' : 'Guardar'}</span>
              </Button>
              <Button size="sm" variant="outline" className={`h-10 w-10 p-0 ${darkMode ? 'bg-slate-800 border-white/20 text-slate-300' : ''}`} onClick={d.handleRefrescar} disabled={d.refreshing}>
                <RefreshCw className={`h-3.5 w-3.5 ${d.refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button size="sm" variant="outline" className={`h-10 w-10 p-0 ${darkMode ? 'bg-slate-800 border-white/20 text-slate-300' : ''}`} onClick={() => { d.setEditConfig(d.configActual); d.setConfigDialogOpen(true); }}>
                <Settings className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant={d.promedioDecimal ? "default" : "outline"} className={`h-10 w-10 p-0 ${!d.promedioDecimal && darkMode ? 'bg-slate-800 border-white/20 text-slate-300' : ''}`} onClick={() => d.setPromedioDecimal(!d.promedioDecimal)}>
                <Hash className="h-3.5 w-3.5" />
              </Button>
              {isAdmin(usuario.rol) && (
                <Button size="sm" variant="outline" className={`h-10 w-10 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 ${darkMode ? 'bg-slate-800 border-red-900/50 text-red-400 hover:bg-red-950/50 hover:border-red-800' : ''}`} onClick={() => { d.setBorrarCalifTipo("grado"); d.setBorrarCalifDialogOpen(true); }} title="Borrar todas las calificaciones de este grado, materia y trimestre">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="p-3 sm:p-4 pt-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
            {d.configActual && (
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                <ClipboardList className="h-3 w-3 text-primary/60" />
                <span>{d.configActual.numActividadesCotidianas}AC</span>
                <span className="text-muted-foreground/40">·</span>
                <span>{d.configActual.numActividadesIntegradoras}AI</span>
                {d.configActual.tieneExamen && <><span className="text-muted-foreground/40">·</span><span>Ex{d.configActual.numExamenes > 1 ? `×${d.configActual.numExamenes}` : ''}</span></>}
                <span className="text-muted-foreground/50 ml-0.5">({d.configActual.porcentajeAC}/{d.configActual.porcentajeAI}/{d.configActual.porcentajeExamen ?? 30})</span>
              </div>
            )}

            {/* Progress */}
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <BarChart3 className="h-3 w-3 text-muted-foreground/50" />
              <span className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-primary" /><span className="font-semibold text-primary dark:text-primary">{d.estadosCompletitud.completo}</span></span>
              <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5 text-amber-400" /><span className="font-semibold text-amber-600 dark:text-amber-400">{d.estadosCompletitud.parcial}</span></span>
              <span className="flex items-center gap-1"><XCircle className="h-2.5 w-2.5 text-slate-300 dark:text-slate-600" /><span className="font-semibold text-slate-500 dark:text-slate-400">{d.estadosCompletitud.vacio}</span></span>
              <div className="ml-1 flex items-center gap-1.5 min-w-[80px]">
                <div className={`flex-1 h-1.5 rounded-full overflow-hidden flex ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  {d.estadosCompletitud.total > 0 && <>
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(d.estadosCompletitud.completo / d.estadosCompletitud.total) * 100}%` }} />
                    <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${(d.estadosCompletitud.parcial / d.estadosCompletitud.total) * 100}%` }} />
                    <div className="h-full bg-slate-300 dark:bg-slate-600 transition-all duration-500" style={{ width: `${(d.estadosCompletitud.vacio / d.estadosCompletitud.total) * 100}%` }} />
                  </>}
                </div>
                <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{d.estadosCompletitud.total > 0 ? Math.round((d.estadosCompletitud.completo / d.estadosCompletitud.total) * 100) : 0}%</span>
              </div>
            </div>

            {/* Marco Normativo */}
            <div className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold">
              <AlertTriangle className="h-2.5 w-2.5 text-muted-foreground/50" />
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${darkMode ? 'bg-red-900/60 text-red-300 ring-1 ring-red-700' : 'bg-red-100 text-red-800 ring-1 ring-red-300'}`}>
                0–{(d.configuracion?.umbralCondicionado ?? 4.5) < 10 ? ((d.configuracion?.umbralCondicionado ?? 4.5) - 0.01).toFixed(2) : ''} Reprobado
              </span>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${darkMode ? 'bg-amber-900/60 text-amber-300 ring-1 ring-amber-700' : 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'}`}>
                {(d.configuracion?.umbralCondicionado ?? 4.5).toFixed(2)}–{((d.configuracion?.umbralAprobado ?? 6.5) - 0.01).toFixed(2)} Condicionado
              </span>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${darkMode ? 'bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-700' : 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'}`}>
                ≥{(d.configuracion?.umbralAprobado ?? 6.5).toFixed(2)} Aprobado
              </span>
            </div>

            {/* Auto-save status */}
            <div className="ml-auto flex items-center gap-1">
              {d.autoSaveStatus === "saving" && (
                <span className="text-xs flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Guardando…
                </span>
              )}
              {d.autoSaveStatus === "saved" && (
                <span className="text-xs flex items-center gap-1 text-primary dark:text-primary">
                  <CheckCircle className="h-3 w-3" />
                  Guardado
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Search & Filter bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className={`flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border shadow-sm ${darkMode ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'}`}
      >
        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
          <Input
            placeholder="Buscar estudiante…"
            value={d.busquedaEstudiante}
            onChange={(e) => startTransition(() => d.setBusquedaEstudiante(e.target.value))}
            className={`pl-8 h-9 text-xs ${darkMode ? 'bg-slate-800 border-white/20 text-white' : ''}`}
          />
        </div>
        <Select value={d.filtroEstado} onValueChange={d.setFiltroEstado}>
          <SelectTrigger className={`h-9 w-[120px] text-xs ${darkMode ? 'bg-slate-800 border-white/20 text-white' : ''}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="aprobados">Aprobados</SelectItem>
            <SelectItem value="riesgo">En riesgo</SelectItem>
            <SelectItem value="honor">Cuadro honor</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1.5 ml-auto">
          <Button size="sm" variant="outline" onClick={d.handleExportarPDF} className={`h-9 text-xs px-2.5 gap-1.5 ${darkMode ? 'bg-slate-800 border-white/20' : ''}`}>
            <FileText className="h-3.5 w-3.5" /><span className="hidden sm:inline">PDF</span>
          </Button>
          <Button size="sm" variant="outline" onClick={d.handleExportarExcel} className={`h-9 text-xs px-2.5 gap-1.5 ${darkMode ? 'bg-slate-800 border-white/20' : ''}`}>
            <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">CSV</span>
          </Button>
        </div>
      </motion.div>

      {/* ── Grade Table ── */}
      {d.gradoSeleccionado && d.asignaturaSeleccionada && d.trimestreSeleccionado && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          <Card className="shadow-md border overflow-hidden bg-card border-border">
            <CardContent className="p-0">
              <div className="table-scroll-container">
                <table className="grade-table mobile-table-card w-full text-sm sm:text-base font-medium border-collapse">
                  <thead>
                    <tr className={darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-800 text-white'}>
                      <th className={`w-10 p-2 text-center font-semibold sticky-col shadow-right left-0 z-20 border-r border-b ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-800 border-slate-700'}`}>N°</th>
                      <th className={`min-w-[140px] sm:min-w-[180px] p-2 text-left font-semibold sticky-col shadow-right left-10 z-20 border-r border-b cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`} onClick={() => d.handleSort('nombre')}>
                        <div className="flex items-center gap-1.5">
                          Estudiante
                          {d.sortColumn === 'nombre' && <ChevronDown className="h-3 w-3" />}
                        </div>
                      </th>
                      {d.configActual ? (
                        <>
                          <th colSpan={d.configActual.numActividadesCotidianas} className={`p-2 text-center text-[11px] font-semibold uppercase tracking-wider border-l border-b ${darkMode ? 'border-slate-700 bg-slate-800' : 'bg-slate-800 border-slate-700'}`}>
                            <span className="opacity-70">Act. Cotidianas</span>
                            <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">{d.configActual.numActividadesCotidianas}</span>
                          </th>
                          <th className={`w-16 p-2 text-center text-[11px] font-semibold border-l border-b cursor-pointer ${darkMode ? 'border-slate-700 bg-slate-800' : 'bg-slate-800 border-slate-700'}`} onClick={() => d.handleSort('promAC')}>
                            <div className="flex items-center justify-center gap-1">
                              <span className="opacity-70">Prom AC</span>
                              {d.sortColumn === 'promAC' && <ChevronDown className="h-3 w-3" />}
                            </div>
                          </th>
                          <th colSpan={d.configActual.numActividadesIntegradoras} className={`p-2 text-center text-[11px] font-semibold uppercase tracking-wider border-l border-b ${darkMode ? 'border-slate-700 bg-slate-800' : 'bg-slate-800 border-slate-700'}`}>
                            <span className="opacity-70">Act. Integradoras</span>
                            <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">{d.configActual.numActividadesIntegradoras}</span>
                          </th>
                          <th className={`w-16 p-2 text-center text-[11px] font-semibold border-l border-b cursor-pointer ${darkMode ? 'border-slate-700 bg-slate-800' : 'bg-slate-800 border-slate-700'}`} onClick={() => d.handleSort('promAI')}>
                            <div className="flex items-center justify-center gap-1">
                              <span className="opacity-70">Prom AI</span>
                              {d.sortColumn === 'promAI' && <ChevronDown className="h-3 w-3" />}
                            </div>
                          </th>
                          <th colSpan={d.configActual.numExamenes || 1} className={`p-2 text-center text-[11px] font-semibold uppercase tracking-wider border-l border-b ${darkMode ? 'border-slate-700 bg-slate-800' : 'bg-slate-800 border-slate-700'}`}>
                            <span className="opacity-70">Examen</span>
                            <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">{d.configActual.numExamenes || 1}</span>
                          </th>
                          <th className={`w-14 p-2 text-center text-[11px] font-semibold border-l border-b ${darkMode ? 'border-slate-700 bg-slate-800' : 'bg-slate-800 border-slate-700'}`}>
                            <span className="opacity-70">Prom Ex</span>
                          </th>
                          <th className={`w-14 p-2 text-center text-[11px] font-semibold border-l border-b cursor-pointer select-none ${darkMode ? 'border-slate-700 bg-slate-800' : 'bg-slate-800 border-slate-700'} ${d.mostrarRecuperacion ? 'bg-emerald-800/30' : ''}`} onClick={() => { const next = !d.mostrarRecuperacion; d.setMostrarRecuperacion(next); if (typeof window !== "undefined") localStorage.setItem("ss_mostrarRecuperacion", JSON.stringify(next)); }}>
                            <span className="opacity-70">Rec.</span>
                            <span className={`ml-0.5 text-[8px] transition-all ${d.mostrarRecuperacion ? 'opacity-100 text-primary' : 'opacity-30'}`}>●</span>
                          </th>
                          <th className={`w-18 p-2 text-center text-[11px] font-semibold border-l border-b cursor-pointer ${darkMode ? 'border-slate-700 bg-emerald-900/40 text-emerald-300' : 'bg-emerald-700 border-emerald-600 text-white'}`} onClick={() => d.handleSort('promFinal')}>
                            <div className="flex items-center justify-center gap-1">
                              Prom. Final
                              {d.sortColumn === 'promFinal' && <ChevronDown className="h-3 w-3" />}
                            </div>
                          </th>
                          <th className={`w-12 p-2 text-center text-[11px] font-semibold border-l border-b ${darkMode ? 'border-slate-700 bg-slate-800' : 'bg-slate-800 border-slate-700'}`}>
                            <span className="opacity-70">Estado</span>
                          </th>
                        </>
                      ) : (
                        <th colSpan={7} className={`p-2 text-center font-semibold border-l border-b ${darkMode ? 'border-slate-700' : 'border-slate-700'}`}>Selecciona un grado, asignatura y trimestre</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {d.sectionLoading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <tr key={`skel-${idx}`} className={idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}>
                          <td className="p-2 text-center"><Skeleton className={`h-4 w-6 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></td>
                          <td className="p-2"><Skeleton className={`h-4 w-40 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></td>
                          {Array.from({ length: d.configActual ? (d.configActual.numActividadesCotidianas + d.configActual.numActividadesIntegradoras + (d.configActual.tieneExamen ? (d.configActual.numExamenes || 1) : 0) + 5) : 5 }).map((_, i) => (
                            <td key={i} className="p-2"><Skeleton className={`h-8 w-12 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></td>
                          ))}
                          <td className="p-2"><Skeleton className={`h-4 w-4 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></td>
                        </tr>
                      ))
                    ) : (
                      d.filteredAndSortedStudents.map((est: any, idx: number, arr: any[]) => {
                        const calif = d.calificaciones.find((c: Calificacion) => c.estudianteId === est.id && c.materiaId === d.asignaturaSeleccionada && c.trimestre === parseInt(d.trimestreSeleccionado));
                        return <CalificacionRow
                          key={`${est.id}-${d.asignaturaSeleccionada}-${d.trimestreSeleccionado}`}
                          estudiante={est}
                          materiaId={d.asignaturaSeleccionada}
                          trimestre={d.trimestreSeleccionado}
                          calificacion={calif}
                          config={d.configActual}
                          onSave={d.handleSaveCalificacion}
                          onRegisterForceSave={d.handleRegisterForceSave}
                          onDirtyChange={d.handleDirtyChange}
                          saving={d.saving}
                          darkMode={darkMode}
                          evenRow={idx % 2 === 0}
                          isAdmin={isAdmin(usuario.rol)}
                          onBorrar={(estId: string) => { d.setBorrarCalifEstudianteId(estId); d.setBorrarCalifTipo("alumno"); d.setBorrarCalifDialogOpen(true); }}
                          promedioDecimal={d.promedioDecimal}
                          rowIndex={idx}
                          totalRows={arr.length}
                          onNavigate={(_row: number, _col: number, dir: string) => { if (dir === 'up' || dir === 'down') d.handleNavigate(dir, _row); }}
                          inputRefs={d.inputRefs}
                          onShowHistory={d.handleShowHistory}
                          activeHistoryCell={d.activeHistoryCell}
                          umbralCondicionado={d.configuracion?.umbralCondicionado ?? 4.5}
                          umbralAprobado={d.configuracion?.umbralAprobado ?? 6.5}
                          mostrarRecuperacion={d.mostrarRecuperacion}
                        />
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer averages bar */}
              <div className={`flex flex-wrap items-center gap-3 p-3 border-t ${darkMode ? 'border-white/10 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-800/40' : 'bg-blue-50 border border-blue-200'}`}>
                  <BookOpen className={`h-3.5 w-3.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <span className={`text-[11px] font-medium ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>Prom. Asignatura</span>
                  <span className={`text-base font-bold tabular-nums ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>{d.promedioAsignatura !== null ? d.promedioAsignatura.toFixed(2) : "—"}</span>
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${darkMode ? 'bg-emerald-900/20 border border-emerald-800/40' : 'bg-emerald-50 border border-emerald-200'}`}>
                  <GraduationCap className={`h-3.5 w-3.5 ${darkMode ? 'text-primary' : 'text-primary'}`} />
                  <span className={`text-[11px] font-medium ${darkMode ? 'text-primary' : 'text-emerald-700'}`}>Prom. Grado</span>
                  <span className={`text-base font-bold tabular-nums ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>{d.promedioGrado !== null ? d.promedioGrado.toFixed(2) : "—"}</span>
                </div>
                <div className="ml-auto text-[10px] text-muted-foreground/50">
                  {d.filteredAndSortedStudents.length} estudiante{d.filteredAndSortedStudents.length !== 1 ? 's' : ''}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary sections */}
          {!isAdmin(usuario.rol) && d.gradoSeleccionado && d.trimestreSeleccionado && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <ResumenAsignaturas
                gradoId={d.gradoSeleccionado}
                trimestre={d.trimestreSeleccionado}
                estudiantes={d.estudiantes}
                misMateriasIds={d.asignaturasFiltradas.map((m: any) => m.id)}
                todasAsignaturas={d.todasAsignaturas}
                darkMode={darkMode}
                umbralCondicionado={d.configuracion?.umbralCondicionado ?? 4.5}
                umbralAprobado={d.configuracion?.umbralAprobado ?? 6.5}
              />
            </motion.div>
          )}

          {d.gradoSeleccionado && (() => {
            const grado = d.gradosFiltrados.find((g: any) => g.id === d.gradoSeleccionado);
            return grado ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                <CuadroTrimestres
                  gradoId={d.gradoSeleccionado}
                  gradoNumero={grado.numero}
                  gradoSeccion={grado.seccion}
                  gradoAño={grado.año}
                  asignaturas={d.asignaturasFiltradas}
                  estudiantes={d.estudiantes}
                  darkMode={darkMode}
                  umbralCondicionado={d.configuracion?.umbralCondicionado ?? 4.5}
                  umbralAprobado={d.configuracion?.umbralAprobado ?? 6.5}
                />
              </motion.div>
            ) : null;
          })()}
        </motion.div>
      )}
    </motion.div>
  );
}
