"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
}

export function PaginationControls({ page, totalPages, total, onPageChange, pageSize = 20 }: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-3">
      <p className="text-sm text-muted-foreground">
        Mostrando <span className="font-medium">{startItem}</span> a{" "}
        <span className="font-medium">{endItem}</span> de{" "}
        <span className="font-medium">{total}</span> registros
      </p>
      <div className="flex items-center gap-1" role="navigation" aria-label="Paginación">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {generatePageNumbers(page, totalPages).map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 text-sm"
              onClick={() => onPageChange(p as number)}
              aria-current={p === page ? "page" : undefined}
              aria-label={`Ir a página ${p}`}
            >
              {p}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | string)[] = [];
  if (current > 3) pages.push(1, "...");
  for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...", total);
  return pages;
}

export function usePagination<T>(items: T[], page: number, pageSize: number): { paginatedItems: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  return {
    paginatedItems: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    totalPages,
  };
}
