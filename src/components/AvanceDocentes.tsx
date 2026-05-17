"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown,
  ChevronRight,
  Users,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  MinusCircle,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

type TrimestreStats = {
  trimestre: number;
  completo: number;
  parcial: number;
  vacio: number;
  total: number;
  porcentaje: number;
};

type MateriaAvance = {
  materiaId: string;
  materiaNombre: string;
  gradoNumero: number;
  gradoSeccion: string;
  totalEstudiantes: number;
  trimestres: TrimestreStats[];
  totalCompleto: number;
  totalParcial: number;
  totalVacio: number;
  totalEsperado: number;
  porcentaje: number;
};

type DocenteAvance = {
  docenteId: string;
  docenteNombre: string;
  docenteEmail: string;
  docenteRol: string;
  materias: MateriaAvance[];
  globalCompleto: number;
  globalParcial: number;
  globalVacio: number;
  globalEsperado: number;
  porcentajeGlobal: number;
};

export default function AvanceDocentes() {
  const { resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === "dark";
  const [data, setData] = useState<DocenteAvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedMateria, setExpandedMateria] = useState<
    Record<string, boolean>
  >({});
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats/avance-docentes", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => console.error("Error fetching avance docentes:", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const toggleDocente = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleMateria = (id: string) => {
    setExpandedMateria((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtrados = data.filter((d) =>
    d.docenteNombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalGeneralCompleto = data.reduce((s, d) => s + d.globalCompleto, 0);
  const totalGeneralEsperado = data.reduce((s, d) => s + d.globalEsperado, 0);

  return (
    <div className="space-y-4">
      <Card className="shadow-sm bg-card border-border">
        <CardHeader className="py-3 px-4 border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-accent" />
              Avance de Carga de Calificaciones
            </CardTitle>
            {!loading && data.length > 0 && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  darkMode
                    ? "bg-emerald-900/30 text-emerald-400 border-emerald-700"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {totalGeneralCompleto}/{totalGeneralEsperado} completo
                {totalGeneralCompleto !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar docente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={`pl-9 h-9 text-sm ${
                darkMode ? "bg-card border-white/30 text-white" : ""
              }`}
            />
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  className={`h-16 w-full ${
                    darkMode ? "bg-slate-800" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {data.length === 0
                ? "No hay docentes registrados en el sistema."
                : "Ningún docente coincide con la búsqueda."}
            </div>
          ) : (
            <div className="space-y-2">
              {filtrados.map((docente) => (
                <div
                  key={docente.docenteId}
                  className={`rounded-lg border ${
                    darkMode ? "border-slate-700" : "border-slate-200"
                  } overflow-hidden`}
                >
                  <button
                    onClick={() => toggleDocente(docente.docenteId)}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/30 ${
                      darkMode ? "bg-slate-800/50" : "bg-slate-50/50"
                    }`}
                  >
                    <div className="shrink-0">
                      {expanded[docente.docenteId] ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground">
                          {docente.docenteNombre}
                        </span>
                        <Badge
                          variant={
                            docente.docenteRol === "docente-orientador"
                              ? "outline"
                              : "secondary"
                          }
                          className={`text-[10px] ${
                            darkMode ? "border-white/30" : ""
                          }`}
                        >
                          {docente.docenteRol === "docente-orientador"
                            ? "Docente Orientador"
                            : "Docente"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {docente.materias.length} materia
                          {docente.materias.length !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {docente.globalEsperado} calif.
                          {docente.globalEsperado !== 1 ? "es" : ""} esperadas
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          {docente.globalCompleto}
                        </span>
                        <span className="text-muted-foreground/30">|</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          <AlertCircle className="h-3 w-3" />
                          {docente.globalParcial}
                        </span>
                        <span className="text-muted-foreground/30">|</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                          <MinusCircle className="h-3 w-3" />
                          {docente.globalVacio}
                        </span>
                      </div>
                      <div className="flex flex-col items-end min-w-[80px]">
                        <span
                          className={`text-lg font-bold font-mono tabular-nums ${
                            docente.porcentajeGlobal >= 100
                              ? "text-emerald-600 dark:text-emerald-400"
                              : docente.porcentajeGlobal >= 50
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {docente.porcentajeGlobal}%
                        </span>
                        <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 mt-0.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              docente.porcentajeGlobal >= 100
                                ? "bg-emerald-500"
                                : docente.porcentajeGlobal >= 50
                                ? "bg-amber-400"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${docente.porcentajeGlobal}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </button>

                  {expanded[docente.docenteId] && (
                    <div
                      className={`border-t ${
                        darkMode
                          ? "border-slate-700 bg-slate-900/50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="p-2 space-y-1">
                        {docente.materias.map((materia) => (
                          <div
                            key={materia.materiaId}
                            className={`rounded-md border ${
                              darkMode
                                ? "border-slate-700"
                                : "border-slate-100"
                            } overflow-hidden`}
                          >
                            <button
                              onClick={() =>
                                toggleMateria(materia.materiaId)
                              }
                              className="w-full flex items-center gap-2 p-2.5 text-left transition-colors hover:bg-muted/20"
                            >
                              <div className="shrink-0">
                                {expandedMateria[materia.materiaId] ? (
                                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                              <span className="text-xs font-medium text-foreground flex-1">
                                {materia.materiaNombre}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {materia.gradoNumero}°{materia.gradoSeccion}
                              </span>
                              <span
                                className={`text-xs font-mono font-bold tabular-nums ${
                                  materia.porcentaje >= 100
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : materia.porcentaje >= 50
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {materia.porcentaje}%
                              </span>
                            </button>

                            {expandedMateria[materia.materiaId] && (
                              <div
                                className={`border-t px-2.5 py-2 ${
                                  darkMode
                                    ? "border-slate-700"
                                    : "border-slate-100"
                                }`}
                              >
                                <div className="grid grid-cols-3 gap-2">
                                  {materia.trimestres.map((t) => (
                                    <div
                                      key={t.trimestre}
                                      className={`text-center p-2 rounded-md border text-xs ${
                                        darkMode
                                          ? "border-slate-700 bg-slate-800/50"
                                          : "border-slate-100 bg-slate-50"
                                      }`}
                                    >
                                      <div
                                        className={`font-semibold mb-1 ${
                                          darkMode
                                            ? "text-slate-300"
                                            : "text-slate-600"
                                        }`}
                                      >
                                        Trimestre {t.trimestre}
                                      </div>
                                      <div className="flex items-center justify-center gap-1.5 mb-1">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                          {t.completo}
                                        </span>
                                        <span className="text-muted-foreground/40">
                                          /
                                        </span>
                                        <span className="text-muted-foreground">
                                          {t.total}
                                        </span>
                                      </div>
                                      <div className="w-full h-1 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                                        <div
                                          className={`h-full rounded-full ${
                                            t.porcentaje >= 100
                                              ? "bg-emerald-500"
                                              : t.porcentaje > 0
                                              ? "bg-amber-400"
                                              : "bg-slate-300 dark:bg-slate-600"
                                          }`}
                                          style={{
                                            width: `${t.porcentaje}%`,
                                          }}
                                        />
                                      </div>
                                      <div className="text-[9px] text-muted-foreground mt-1">
                                        {t.completo} C / {t.parcial} P /{" "}
                                        {t.vacio} V
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
