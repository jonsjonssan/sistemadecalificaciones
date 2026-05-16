"use client";

import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronUp, ChevronDown, GripVertical, Trash2, Save, X, Edit2 } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Estudiante {
  id: string;
  numero: number;
  nombre: string;
  email?: string;
  gradoId: string;
  activo: boolean;
  orden?: number;
}

interface EstudiantesTableProps {
  estudiantes: Estudiante[];
  darkMode: boolean;
  isAdmin: boolean;
  loading?: boolean;
  onReorder: (nuevos: Estudiante[]) => void;
  onDelete: (id: string, nombre: string) => void;
  onUpdateEstudiante?: (id: string, data: { nombre?: string; email?: string }) => Promise<void>;
}

const SkeletonRows = ({ darkMode, isAdmin }: { darkMode: boolean; isAdmin: boolean }) => (
  <>
    {Array.from({ length: 5 }).map((_, idx) => (
      <TableRow key={`skeleton-${idx}`} className={idx % 2 === 0 ? (darkMode ? 'bg-[#1e293b]' : '') : (darkMode ? 'bg-slate-800/50' : 'bg-slate-50/50')}>
        <TableCell className="text-center"><Skeleton className={`h-4 w-6 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></TableCell>
        <TableCell><Skeleton className={`h-4 w-48 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></TableCell>
        <TableCell><Skeleton className={`h-4 w-40 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></TableCell>
        <TableCell className="text-center"><Skeleton className={`h-5 w-14 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></TableCell>
        {isAdmin && (
          <>
            <TableCell className="text-center"><Skeleton className={`h-6 w-12 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></TableCell>
            <TableCell className="text-center"><Skeleton className={`h-6 w-6 mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></TableCell>
          </>
        )}
      </TableRow>
    ))}
  </>
);

export function EstudiantesTable({ estudiantes, darkMode, isAdmin, loading = false, onReorder, onDelete, onUpdateEstudiante }: EstudiantesTableProps) {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = estudiantes.findIndex(e => e.id === active.id);
    const newIndex = estudiantes.findIndex(e => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const nuevos = [...estudiantes];
    const [moved] = nuevos.splice(oldIndex, 1);
    nuevos.splice(newIndex, 0, moved);
    onReorder(nuevos);
  };

  const moverArriba = (idx: number) => {
    if (idx > 0) {
      const nuevos = [...estudiantes];
      const temp = nuevos[idx];
      nuevos[idx] = nuevos[idx - 1];
      nuevos[idx - 1] = temp;
      onReorder(nuevos);
    }
  };

  const moverAbajo = (idx: number) => {
    if (idx < estudiantes.length - 1) {
      const nuevos = [...estudiantes];
      const temp = nuevos[idx];
      nuevos[idx] = nuevos[idx + 1];
      nuevos[idx + 1] = temp;
      onReorder(nuevos);
    }
  };

  const colSpanBase = isAdmin ? 5 : 3;

  if (!isAdmin) {
    return (
      <div className="overflow-x-auto">
        <Table className="text-xs sm:text-sm md:text-base font-medium min-w-[400px]">
          <TableHeader>
            <TableRow className={darkMode ? 'bg-slate-800' : 'bg-slate-100'}>
              <TableHead className="w-10 text-center h-12">N°</TableHead>
              <TableHead className="min-w-[120px]">Nombre Completo</TableHead>
              <TableHead className="hidden sm:table-cell">Correo</TableHead>
              <TableHead className="w-16 text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows darkMode={darkMode} isAdmin={isAdmin} />
            ) : !estudiantes || estudiantes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  No hay estudiantes
                </TableCell>
              </TableRow>
            ) : (
              estudiantes.map((est) => (
                <TableRow key={est.id} className={darkMode ? 'border-slate-700' : ''}>
                  <TableCell className={`text-center font-medium ${darkMode ? 'text-white' : ''}`}>{est.numero}</TableCell>
                  <TableCell className={`font-medium ${darkMode ? 'text-white' : ''} break-words`}>{est.nombre}</TableCell>
                  <TableCell className={`hidden sm:table-cell ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{est.email || "—"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={est.activo ? "default" : "secondary"} className={`text-xs sm:text-sm font-medium h-5 ${est.activo ? (darkMode ? 'bg-teal-600' : '') : ''}`}>
                      {est.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={estudiantes.map(e => e.id)} strategy={verticalListSortingStrategy}>
        <div className="overflow-x-auto">
          <Table className="text-xs sm:text-sm md:text-base font-medium min-w-[500px]">
            <TableHeader>
              <TableRow className={darkMode ? 'bg-slate-800' : 'bg-slate-100'}>
                <TableHead className="w-10 text-center h-12">N°</TableHead>
                <TableHead className="min-w-[120px]">Nombre Completo</TableHead>
                <TableHead className="hidden sm:table-cell">Correo</TableHead>
                <TableHead className="w-16 text-center">Estado</TableHead>
                <TableHead className="w-12 text-center">Orden</TableHead>
                <TableHead className="w-16 text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {loading ? (
              <SkeletonRows darkMode={darkMode} isAdmin={isAdmin} />
            ) : !estudiantes || estudiantes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    No hay estudiantes
                  </TableCell>
                </TableRow>
              ) : (
                estudiantes.map((est, idx) => (
                  <SortableEstudianteRow
                    key={est.id}
                    est={est}
                    idx={idx}
                    total={estudiantes.length}
                    darkMode={darkMode}
                    onMoveUp={() => moverArriba(idx)}
                    onMoveDown={() => moverAbajo(idx)}
                    onDelete={() => onDelete(est.id, est.nombre)}
                    onUpdate={onUpdateEstudiante}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface SortableEstudianteRowProps {
  est: Estudiante;
  idx: number;
  total: number;
  darkMode: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onUpdate?: (id: string, data: { nombre?: string; email?: string }) => Promise<void>;
}

function SortableEstudianteRow({ est, idx, total, darkMode, onMoveUp, onMoveDown, onDelete, onUpdate }: SortableEstudianteRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: est.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const [editing, setEditing] = useState(false);
  const [editNombre, setEditNombre] = useState(est.nombre);
  const [editEmail, setEditEmail] = useState(est.email || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editNombre.trim() || !onUpdate) return;
    setSaving(true);
    try {
      await onUpdate(est.id, { nombre: editNombre.trim(), email: editEmail.trim() });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditNombre(est.nombre);
    setEditEmail(est.email || "");
    setEditing(false);
  };

  if (editing) {
    return (
      <TableRow ref={setNodeRef} style={style} className={`${darkMode ? 'border-slate-700' : ''} bg-teal-900/20`}>
        <TableCell className={`text-center font-medium ${darkMode ? 'text-white' : ''}`}>{est.numero}</TableCell>
        <TableCell>
          <Input
            value={editNombre}
            onChange={e => setEditNombre(e.target.value)}
            placeholder="Nombre completo"
            className={`h-8 text-sm ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}`}
          />
        </TableCell>
        <TableCell>
          <Input
            value={editEmail}
            onChange={e => setEditEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            type="email"
            className={`h-8 text-sm ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : ''}`}
          />
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="default" className={`text-xs sm:text-sm font-medium h-5 ${darkMode ? 'bg-teal-600' : ''}`}>
            Activo
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Button size="sm" variant="ghost" className={`h-6 w-6 p-0 ${idx === 0 ? 'opacity-30 cursor-not-allowed' : ''} ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} onClick={onMoveUp} disabled={idx === 0}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className={`h-6 w-6 p-0 ${idx === total - 1 ? 'opacity-30 cursor-not-allowed' : ''} ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} onClick={onMoveDown} disabled={idx === total - 1}>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-teal-500 hover:text-teal-400" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-400" onClick={handleCancel} disabled={saving}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow ref={setNodeRef} style={style} className={`${darkMode ? 'border-slate-700' : ''} ${isDragging ? 'bg-teal-900/30' : ''}`}>
      <TableCell className={`text-center font-medium ${darkMode ? 'text-white' : ''}`}>{est.numero}</TableCell>
      <TableCell className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
        <button aria-label={`Arrastrar para reordenar a ${est.nombre}`} {...attributes} {...listeners} className={`cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-700 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <GripVertical className="h-4 w-4" />
        </button>
        {est.nombre}
      </TableCell>
      <TableCell className={darkMode ? 'text-slate-400' : 'text-slate-500'}>{est.email || "—"}</TableCell>
      <TableCell className="text-center">
        <Badge variant={est.activo ? "default" : "secondary"} className={`text-xs sm:text-sm font-medium h-5 ${est.activo ? (darkMode ? 'bg-teal-600' : '') : ''}`}>
          {est.activo ? "Activo" : "Inactivo"}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Button size="sm" variant="ghost" aria-label="Mover arriba" className={`h-6 w-6 p-0 ${idx === 0 ? 'opacity-30 cursor-not-allowed' : ''} ${darkMode ? 'text-slate-400 hover:text-teal-400' : 'text-slate-500 hover:text-teal-600'}`} onClick={onMoveUp} disabled={idx === 0}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" aria-label="Mover abajo" className={`h-6 w-6 p-0 ${idx === total - 1 ? 'opacity-30 cursor-not-allowed' : ''} ${darkMode ? 'text-slate-400 hover:text-teal-400' : 'text-slate-500 hover:text-teal-600'}`} onClick={onMoveDown} disabled={idx === total - 1}>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Button size="sm" variant="ghost" aria-label={`Editar estudiante ${est.nombre}`} className={`h-6 w-6 p-0 ${darkMode ? 'text-blue-400 hover:text-blue-400 hover:bg-blue-900/30' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'}`} onClick={() => { setEditNombre(est.nombre); setEditEmail(est.email || ""); setEditing(true); }}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" aria-label={`Eliminar estudiante ${est.nombre}`} className={`h-6 w-6 p-0 ${darkMode ? 'text-red-400 hover:text-red-400 hover:bg-red-900/30' : 'text-red-500 hover:text-red-700 hover:bg-red-50'}`} onClick={onDelete}>
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
