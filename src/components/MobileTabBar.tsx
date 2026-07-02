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

export function MobileTabBar({ items, activeTab, onTabChange, isAdmin }: MobileTabBarProps) {
  const visibleItems = isAdmin ? items : items.filter(i => i.value !== "admin" && i.value !== "avance");

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom bg-card/98 backdrop-blur-2xl border-t border-border" aria-label="Navegación principal">
      <div className="flex items-center justify-around px-1 pt-1.5 pb-1.5">
        {visibleItems.slice(0, 5).map((item) => {
          const Icon = tabIcons[item.value] || LayoutDashboard;
          const isActive = activeTab === item.value;
          return (
            <button
              key={item.value}
              onClick={() => onTabChange(item.value)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 min-w-[52px] min-h-[52px] rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground/60 hover:text-primary hover:bg-primary/10 active:text-muted-foreground/80 active:scale-95"
              }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-tab-indicator"
                  className="absolute inset-0.5 rounded-xl bg-primary/12"
                  transition={{ type: "spring", stiffness: 500, damping: 35, mass: 1 }}
                />
              )}
              <span className="relative z-10">
                <Icon className={`h-5 w-5 mb-0.5 transition-transform ${isActive ? "scale-110 drop-shadow-sm" : ""}`} />
              </span>
              <span className={`relative z-10 text-[10px] font-semibold leading-tight transition-opacity ${isActive ? "opacity-100" : "opacity-60"}`}>
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
}: {
  items: NavItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`relative flex flex-col items-center justify-center py-1.5 px-1 min-w-[52px] min-h-[52px] rounded-xl transition-all duration-200 ${
          items.some(i => i.value === activeTab)
            ? "text-primary"
            : "text-muted-foreground/60 hover:text-primary hover:bg-primary/10 active:text-muted-foreground/80 active:scale-95"
        }`}
        aria-label="Más opciones"
      >
        <svg className="h-5 w-5 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
        <span className={`text-[10px] font-semibold leading-tight transition-opacity ${items.some(i => i.value === activeTab) ? "opacity-100" : "opacity-60"}`}>
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
                    className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:pl-4"
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
