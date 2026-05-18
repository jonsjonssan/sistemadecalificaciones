"use client";

import { useEffect } from "react";

export function A11yAnnouncer() {
  useEffect(() => {
    let announcer = document.getElementById("a11y-announcer");
    if (!announcer) {
      announcer = document.createElement("div");
      announcer.id = "a11y-announcer";
      announcer.setAttribute("role", "status");
      announcer.setAttribute("aria-live", "polite");
      announcer.setAttribute("aria-atomic", "true");
      announcer.className = "sr-only";
      document.body.appendChild(announcer);
    }
  }, []);

  return null;
}

export function announce(message: string): void {
  const el = document.getElementById("a11y-announcer");
  if (el) {
    el.textContent = "";
    requestAnimationFrame(() => {
      el.textContent = message;
    });
  }
}

export function usePageTitle(title: string): void {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} - Sistema de Calificaciones`;
    return () => { document.title = prev; };
  }, [title]);
}

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>): void {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const fn = shortcuts[e.key.toLowerCase()];
      if (fn) { e.preventDefault(); fn(); }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}

export function SkipLink(): React.ReactElement {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none"
    >
      Saltar al contenido principal
    </a>
  );
}

export function LoadingAnnouncement({ message = "Cargando..." }: { message?: string }): React.ReactElement {
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
