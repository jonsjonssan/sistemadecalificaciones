"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, GripVertical, Trash2 } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Estudiante {
  id: string;
  numero: number;
  nombre: string;
  gradoId: string;
  activo: boolean;
  orden?: number;
}

interface EstudiantesTableProps {
  estudiantes: Estudiante[];
  darkMode: boolean;
  isAdmin: boolean;
  onReorder: (nuevos: Estudiante[]) => void;
  onDelete: (id: string, nombre: string) => void;
}

export function EstudiantesTable({ estudiantes, darkMode, isAdmin, onReorder, onDelete }: EstudiantesTableProps) {
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

  if (!isAdmin) {
    return (
      <Table className="text-sm sm:text-base font-medium">
        <TableHeader>
          <TableRow className={darkMode ? 'bg-slate-800' : 'bg-slate-100'}>
            <TableHead className="w-10 text-center h-12">N°</TableHead>
            <TableHead>Nombre Completo</TableHead>
            <TableHead className="w-16 text-center">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!estudiantes || estudiantes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                No hay estudiantes
              </TableCell>
            </TableRow>
          ) : (
            estudiantes.map((est) => (
              <TableRow key={est.id} className={darkMode ? 'border-slate-700' : ''}>
                <TableCell className={`text-center font-medium ${darkMode ? 'text-white' : ''}`}>{est.numero}</TableCell>
                <TableCell className={darkMode ? 'text-white' : ''}>{est.nombre}</TableCell>
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
    );
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={estudiantes.map(e => e.id)} strategy={verticalListSortingStrategy}>
        <Table className="text-sm sm:text-base font-medium">
          <TableHeader>
            <TableRow className={darkMode ? 'bg-slate-800' : 'bg-slate-100'}>
              <TableHead className="w-10 text-center h-12">N°</TableHead>
              <TableHead>Nombre Completo</TableHead>
              <TableHead className="w-16 text-center">Estado</TableHead>
              <TableHead className="w-12 text-center">Orden</TableHead>
              <TableHead className="w-12 text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!estudiantes || estudiantes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
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
                />
              ))
            )}
          </TableBody>
        </Table>
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
}

function SortableEstudianteRow({ est, idx, total, darkMode, onMoveUp, onMoveDown, onDelete }: SortableEstudianteRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: est.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <TableRow ref={setNodeRef} style={style} className={`${darkMode ? 'border-slate-700' : ''} ${isDragging ? 'bg-teal-900/30' : ''}`}>
      <TableCell className={`text-center font-medium ${darkMode ? 'text-white' : ''}`}>{est.numero}</TableCell>
      <TableCell className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
        <button aria-label={`Arrastrar para reordenar a ${est.nombre}`} {...attributes} {...listeners} className={`cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-700 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <GripVertical className="h-4 w-4" />
        </button>
        {est.nombre}
      </TableCell>
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
        <Button size="sm" variant="ghost" aria-label={`Eliminar estudiante ${est.nombre}`} className={`h-6 w-6 p-0 ${darkMode ? 'text-red-400 hover:text-red-300 hover:bg-red-900/30' : 'text-red-500 hover:text-red-700 hover:bg-red-50'}`} onClick={onDelete}>
          <Trash2 className="h-5 w-5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}