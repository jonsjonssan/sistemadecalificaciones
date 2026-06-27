"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Building2, Plus, Edit2, Trash2, Users, GraduationCap, School, AlertCircle, CheckCircle2, Loader2, LogIn, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Escuela {
  id: string;
  nombre: string;
  codigo: string;
  tipo: string;
  logo: string | null;
  colorPrimario: string;
  activo: boolean;
  usuarios_count: number;
  grados_count: number;
  estudiantes_count: number;
}

interface SuperadminPanelProps {
  darkMode: boolean;
  onEntrarEscuela?: (escuelaId: string) => void;
}

function EscuelaLogo({ nombre, logo, colorPrimario }: { nombre: string; logo: string | null; colorPrimario: string }) {
  const [error, setError] = useState(false);
  if (logo && !error) {
    return (
      <img
        src={logo}
        alt={`Logo ${nombre}`}
        className="w-10 h-10 rounded-lg object-cover border border-border/50"
        onError={() => setError(true)}
      />
    );
  }
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
      style={{ backgroundColor: colorPrimario || "#1E3A8A" }}
    >
      {nombre.charAt(0).toUpperCase()}
    </div>
  );
}

export default function SuperadminPanel({ darkMode, onEntrarEscuela }: SuperadminPanelProps) {
  const { toast } = useToast();
  const [escuelas, setEscuelas] = useState<Escuela[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [entrandoEscuelaId, setEntrandoEscuelaId] = useState<string | null>(null);

  const [form, setForm] = useState({
    id: "",
    nombre: "",
    codigo: "",
    direccion: "",
    distrito: "",
    tipo: "publico",
    planEstudio: "general",
    escalaNotas: "0-10",
    periodos: "trimestres",
    logo: "",
    colorPrimario: "#1E3A8A",
    activo: true,
    adminEmail: "",
    adminPassword: "",
    adminNombre: "",
  });

  const loadEscuelas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/escuelas", { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const escuelasNormalizadas = (data.escuelas || []).map((e: any) => ({
          ...e,
          usuarios_count: Number(e.usuarios_count) || 0,
          grados_count: Number(e.grados_count) || 0,
          estudiantes_count: Number(e.estudiantes_count) || 0,
        }));
        setEscuelas(escuelasNormalizadas);
      }
    } catch {
      toast({ title: "Error al cargar escuelas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadEscuelas(); }, [loadEscuelas]);

  const resetForm = () => {
    setForm({
      id: "", nombre: "", codigo: "", direccion: "", distrito: "",
      tipo: "publico", planEstudio: "general", escalaNotas: "0-10",
      periodos: "trimestres", logo: "", colorPrimario: "#1E3A8A", activo: true,
      adminEmail: "", adminPassword: "", adminNombre: "",
    });
    setEditMode(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (escuela: Escuela) => {
    setForm({
      id: escuela.id,
      nombre: escuela.nombre,
      codigo: escuela.codigo,
      direccion: "", distrito: "",
      tipo: escuela.tipo || "publico",
      planEstudio: "general", escalaNotas: "0-10", periodos: "trimestres",
      logo: escuela.logo || "",
      colorPrimario: escuela.colorPrimario || "#1E3A8A",
      activo: escuela.activo,
      adminEmail: "", adminPassword: "", adminNombre: "",
    });
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.codigo) {
      toast({ title: "Nombre y codigo son requeridos", variant: "destructive" });
      return;
    }
    if (!editMode && (!form.adminEmail || !form.adminPassword || !form.adminNombre)) {
      toast({ title: "Datos del admin inicial son requeridos", variant: "destructive" });
      return;
    }
    if (!editMode && form.adminPassword.length < 8) {
      toast({ title: "La contraseña del admin debe tener al menos 8 caracteres", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const url = "/api/escuelas";
      const method = editMode ? "PUT" : "POST";
      const body: any = { ...form };
      if (editMode) {
        delete body.adminEmail;
        delete body.adminPassword;
        delete body.adminNombre;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: editMode ? "Escuela actualizada" : "Escuela creada",
          description: editMode
            ? `${form.nombre} fue actualizada correctamente`
            : `${form.nombre} fue creada con admin inicial ${form.adminEmail}`,
        });
        setDialogOpen(false);
        resetForm();
        await loadEscuelas();
      } else {
        toast({ title: data.error || "Error al guardar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de conexion", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEntrar = async (escuelaId: string) => {
    if (!onEntrarEscuela) return;
    setEntrandoEscuelaId(escuelaId);
    try {
      await onEntrarEscuela(escuelaId);
    } finally {
      setEntrandoEscuelaId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/escuelas?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Escuela desactivada", description: data.escuela?.nombre });
        await loadEscuelas();
      } else {
        toast({ title: data.error || "Error al eliminar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de conexion", variant: "destructive" });
    }
    setConfirmDelete(null);
  };

  const totalUsuarios = escuelas.reduce((s, e) => s + (e.usuarios_count || 0), 0);
  const totalEstudiantes = escuelas.reduce((s, e) => s + (e.estudiantes_count || 0), 0);
  const totalGrados = escuelas.reduce((s, e) => s + (e.grados_count || 0), 0);

  return (
    <div className="space-y-4 animate-page-transition">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <School className="h-5 w-5 text-institutional" />
            Gestion Multi-Escuela
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administra todas las instituciones del sistema
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="btn-press gap-2">
          <Plus className="h-4 w-4" />
          Crear Escuela
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="card-hover bg-card border-border">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-institutional" />
              <span className="text-xs text-muted-foreground">Escuelas</span>
            </div>
            <p className="text-2xl font-bold">{escuelas.length}</p>
          </CardContent>
        </Card>
        <Card className="card-hover bg-card border-border">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Usuarios</span>
            </div>
            <p className="text-2xl font-bold">{totalUsuarios}</p>
          </CardContent>
        </Card>
        <Card className="card-hover bg-card border-border">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Estudiantes</span>
            </div>
            <p className="text-2xl font-bold">{totalEstudiantes}</p>
          </CardContent>
        </Card>
        <Card className="card-hover bg-card border-border">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-1">
              <School className="h-4 w-4 text-institutional" />
              <span className="text-xs text-muted-foreground">Grados</span>
            </div>
            <p className="text-2xl font-bold">{totalGrados}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-shimmer h-24 rounded-xl" />
          ))}
        </div>
      ) : escuelas.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <School className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No hay escuelas registradas</p>
            <Button onClick={handleOpenCreate} className="mt-4 gap-2 btn-press">
              <Plus className="h-4 w-4" />
              Crear primera escuela
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {escuelas.map((escuela, idx) => (
              <motion.div
                key={escuela.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
              >
                <Card className={`card-hover bg-card border-border ${!escuela.activo ? "opacity-60" : ""}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <EscuelaLogo
                          nombre={escuela.nombre}
                          logo={escuela.logo}
                          colorPrimario={escuela.colorPrimario}
                        />
                        <div>
                          <CardTitle className="text-base">{escuela.nombre}</CardTitle>
                          <CardDescription className="text-xs">
                            Codigo: {escuela.codigo}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={escuela.activo ? "default" : "secondary"} className="text-xs">
                        {escuela.activo ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div className="rounded-lg bg-muted/50 py-2">
                        <p className="text-lg font-bold">{escuela.usuarios_count || 0}</p>
                        <p className="text-[10px] text-muted-foreground">Usuarios</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 py-2">
                        <p className="text-lg font-bold">{escuela.grados_count || 0}</p>
                        <p className="text-[10px] text-muted-foreground">Grados</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 py-2">
                        <p className="text-lg font-bold">{escuela.estudiantes_count || 0}</p>
                        <p className="text-[10px] text-muted-foreground">Alumnos</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {onEntrarEscuela && (
                        <Button
                          size="sm"
                          className="flex-1 btn-press gap-1.5"
                          onClick={() => handleEntrar(escuela.id)}
                          disabled={entrandoEscuelaId === escuela.id}
                        >
                          {entrandoEscuelaId === escuela.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <LogIn className="h-3.5 w-3.5" />
                          )}
                          Entrar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 btn-press gap-1.5"
                        onClick={() => handleOpenEdit(escuela)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      {escuela.activo && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="btn-press gap-1.5 text-destructive hover:text-destructive"
                          onClick={() => setConfirmDelete(escuela.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Desactivar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editMode ? "Editar Escuela" : "Crear Nueva Escuela"}</DialogTitle>
            <DialogDescription>
              {editMode
                ? "Modifica los datos de la institucion"
                : "Crea una nueva escuela con su administrador inicial"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nombre *</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Centro Escolar..."
                  className="input-focus-glow"
                />
              </div>
              <div>
                <Label className="text-xs">Codigo *</Label>
                <Input
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  placeholder="CEC-001"
                  className="input-focus-glow"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger className="input-focus-glow"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publico">Publico</SelectItem>
                    <SelectItem value="privado">Privado</SelectItem>
                    <SelectItem value="mixto">Mixto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Color Primario</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={form.colorPrimario}
                    onChange={(e) => setForm({ ...form, colorPrimario: e.target.value })}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    value={form.colorPrimario}
                    onChange={(e) => setForm({ ...form, colorPrimario: e.target.value })}
                    className="flex-1 input-focus-glow"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Direccion</Label>
                <Input
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  placeholder="Direccion..."
                  className="input-focus-glow"
                />
              </div>
              <div>
                <Label className="text-xs">Distrito</Label>
                <Input
                  value={form.distrito}
                  onChange={(e) => setForm({ ...form, distrito: e.target.value })}
                  placeholder="Distrito..."
                  className="input-focus-glow"
                />
              </div>
            </div>

            {editMode && (
              <div className="flex items-center gap-3 pt-1">
                <Switch
                  checked={form.activo}
                  onCheckedChange={(v) => setForm({ ...form, activo: v })}
                />
                <Label className="text-sm">Escuela activa</Label>
              </div>
            )}

            {!editMode && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="h-4 w-4 text-primary" />
                  Administrador Inicial
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nombre completo *</Label>
                    <Input
                      value={form.adminNombre}
                      onChange={(e) => setForm({ ...form, adminNombre: e.target.value })}
                      placeholder="Nombre del director/a"
                      className="input-focus-glow"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Email *</Label>
                    <Input
                      type="email"
                      value={form.adminEmail}
                      onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                      placeholder="admin@escuela.edu"
                      className="input-focus-glow"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Contrasena * (min 8 caracteres)</Label>
                  <Input
                    type="password"
                    value={form.adminPassword}
                    onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                    placeholder="********"
                    className="input-focus-glow"
                  />
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-status-info-muted rounded-lg p-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-status-info" />
                  <span>Se creara la escuela, el usuario admin y la configuracion del sistema automaticamente.</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="btn-press">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="btn-press gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : editMode ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Actualizar
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Crear Escuela
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete !== null} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirmar desactivacion
            </DialogTitle>
            <DialogDescription>
              La escuela sera desactivada. Los usuarios no podran iniciar sesion, pero los datos se conservan.
              Esta accion se puede revertir editando la escuela.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="btn-press">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="btn-press gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Desactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
