"use client";

import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Search, ArrowUpDown } from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render: (item: T) => ReactNode;
  className?: string;
}

interface CrudTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onCreate?: () => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSort?: (key: string) => void;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  loading?: boolean;
  emptyMessage?: string;
  keyExtractor: (item: T) => string;
  createLabel?: string;
  disableCreate?: boolean;
}

export function CrudTable<T>({
  data, columns, onEdit, onDelete, onCreate,
  searchPlaceholder = "Buscar...", searchValue, onSearchChange,
  onSort, sortColumn, sortDirection,
  loading, emptyMessage = "No hay registros.",
  keyExtractor, createLabel = "Nuevo", disableCreate,
}: CrudTableProps<T>) {
  const renderActions = (item: T) => (
    <div className="flex items-center gap-1">
      {onEdit && (
        <Button variant="ghost" size="icon" className="touch-target" onClick={() => onEdit(item)} aria-label="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <Button variant="ghost" size="icon" className="touch-target text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => onDelete(item)} aria-label="Eliminar">
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        {onSearchChange && (
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 touch-target"
              aria-label={searchPlaceholder}
            />
          </div>
        )}
        {onCreate && (
          <Button onClick={onCreate} size="sm" disabled={disableCreate}>
            <Plus className="h-4 w-4 mr-1" />
            {createLabel}
          </Button>
        )}
      </div>

      {/* Desktop table */}
      <div className="rounded-lg border overflow-hidden max-sm:hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={col.className}
                  role={col.sortable ? "button" : undefined}
                  tabIndex={col.sortable ? 0 : undefined}
                  onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                  onKeyDown={col.sortable && onSort ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSort(col.key); } } : undefined}
                  aria-sort={col.sortable && sortColumn === col.key
                    ? (sortDirection === "asc" ? "ascending" : "descending")
                    : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortColumn === col.key && (
                      <ArrowUpDown className={`h-3 w-3 transition-transform ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                    )}
                  </div>
                </TableHead>
              ))}
              {(onEdit || onDelete) && (
                <TableHead className="w-20 text-right" role="columnheader">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-sm text-muted-foreground">Cargando...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="text-center py-8 text-sm text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={keyExtractor(item)}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render(item)}
                    </TableCell>
                  ))}
                  {(onEdit || onDelete) && (
                    <TableCell className="text-right">
                      {renderActions(item)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Cargando...</span>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          data.map((item) => (
            <div key={keyExtractor(item)} className="rounded-lg border bg-card p-4 space-y-2">
              {columns.map((col) => (
                <div key={col.key} className="flex justify-between items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{col.label}</span>
                  <span className="text-sm text-right">{col.render(item)}</span>
                </div>
              ))}
              {(onEdit || onDelete) && (
                <div className="flex justify-end gap-1 pt-2 border-t">
                  {renderActions(item)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}


