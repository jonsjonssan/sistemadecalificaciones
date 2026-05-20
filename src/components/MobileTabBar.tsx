"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ClipboardList, CalendarDays, Users, FileText,
  Globe, BarChart3, Settings, GraduationCap,
} from "lucide-react";

interface NavItem {
  value: string;
  label: string;
}

interface MobileTabBarProps {
  items: NavItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
  darkMode: boolean;
  isAdmin?: boolean;
}

const tabIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  calificaciones: ClipboardList,
  asistencia: CalendarDays,
  estudiantes: Users,
  boletas: FileText,
  enlaces: Globe,
  reportes: BarChart3,
  avance: GraduationCap,
  admin: Settings,
};

export function MobileTabBar({ items, activeTab, onTabChange, darkMode, isAdmin }: MobileTabBarProps) {
  const visibleItems = isAdmin ? items : items.filter(i => i.value !== "admin" && i.value !== "avance");

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom bg-card/95 backdrop-blur-xl border-t border-border" aria-label="Navegación principal">
      <div className="flex items-center justify-around px-1 pt-1 pb-1">
        {visibleItems.slice(0, 5).map((item) => {
          const Icon = tabIcons[item.value] || LayoutDashboard;
          const isActive = activeTab === item.value;
          return (
            <button
              key={item.value}
              onClick={() => onTabChange(item.value)}
              className={`relative flex flex-col items-center justify-center py-1 px-2 min-w-[56px] min-h-[48px] rounded-xl transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground/60 hover:text-muted-foreground active:text-muted-foreground/80"
              }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-tab-indicator"
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={{ type: "spring", stiffness: 500, damping: 35, mass: 1 }}
                />
              )}
              <span className="relative z-10">
                <Icon className={`h-5 w-5 mb-0.5 ${isActive ? "drop-shadow-sm" : ""}`} />
              </span>
              <span className={`relative z-10 text-[10px] font-semibold leading-tight ${isActive ? "opacity-100" : "opacity-70"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        {visibleItems.length > 5 && (
          <MobileMoreMenu
            items={visibleItems.slice(5)}
            activeTab={activeTab}
            onTabChange={onTabChange}
            darkMode={darkMode}
          />
        )}
      </div>
    </nav>
  );
}

function MobileMoreMenu({
  items,
  activeTab,
  onTabChange,
  darkMode,
}: {
  items: NavItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
  darkMode: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`relative flex flex-col items-center justify-center py-1 px-2 min-w-[56px] min-h-[48px] rounded-xl transition-colors ${
          items.some(i => i.value === activeTab)
            ? "text-primary"
            : "text-muted-foreground/60 hover:text-muted-foreground"
        }`}
        aria-label="Más opciones"
      >
        <svg className="h-5 w-5 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
        <span className={`text-[10px] font-semibold leading-tight ${items.some(i => i.value === activeTab) ? "opacity-100" : "opacity-70"}`}>
          Más
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute bottom-full right-0 mb-2 w-40 p-1.5 rounded-xl bg-card border border-border shadow-xl z-50"
            >
              {items.map((item) => {
                const Icon = tabIcons[item.value] || LayoutDashboard;
                const isActive = activeTab === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => { onTabChange(item.value); setOpen(false); }}
                    className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
