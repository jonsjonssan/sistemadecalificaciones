"use client";

import { ExternalLink, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { enlaces } from "@/lib/enlaces";

export default function EnlacesInstitucionales({ darkMode }: { darkMode: boolean }) {
  return (
    <Card className={`shadow-sm ${darkMode ? "bg-slate-950/40 backdrop-blur-md border-white/5 shadow-2xl" : ""}`}>
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Globe className="h-5 w-5 text-emerald-600" />
          Enlaces Institucionales
        </CardTitle>
        <CardDescription className={`text-xs sm:text-sm ${darkMode ? "text-slate-400" : ""}`}>
          Acceso rápido a portales y servicios del MINEDUCYT y plataformas educativas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {enlaces.map((enlace) => (
            <a
              key={enlace.url}
              href={enlace.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex items-start gap-3 rounded-lg border p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                darkMode
                  ? "border-white/10 hover:border-white/30 hover:bg-slate-950/40 backdrop-blur-md"
                  : "border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/50"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  darkMode
                    ? "bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600/30"
                    : "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200"
                }`}
              >
                {enlace.icono}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{enlace.nombre}</span>
                  <ExternalLink
                    className={`h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                      darkMode ? "text-slate-500" : "text-slate-400"
                    }`}
                  />
                </div>
                <p
                  className={`text-xs mt-0.5 line-clamp-2 ${
                    darkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {enlace.descripcion}
                </p>
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
