"use client";

import { useEffect, useRef, useState } from "react";

const INTERACTIVE_SELECTOR =
  'a, button, [role="button"], input, select, textarea, [data-slot="button"], .cursor-action, summary, label';

type CursorMode = "default" | "hover" | "down";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<CursorMode>("default");
  const [visible, setVisible] = useState(false);

  const target = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const dotPos = useRef({ x: -100, y: -100 });
  const rafId = useRef<number | null>(null);
  const modeRef = useRef<CursorMode>("default");
  const visibleRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover || reducedMotion) return;

    setEnabled(true);

    const applyMode = (next: CursorMode) => {
      if (modeRef.current !== next) {
        modeRef.current = next;
        setMode(next);
      }
    };

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      if (!visibleRef.current) {
        visibleRef.current = true;
        setVisible(true);
      }

      const el = e.target as Element | null;
      const interactive = !!el?.closest?.(INTERACTIVE_SELECTOR);
      applyMode(interactive ? (modeRef.current === "down" ? "down" : "hover") : "default");
    };

    const onDown = () => applyMode("down");
    const onUp = (e: MouseEvent) => {
      const el = e.target as Element | null;
      const interactive = !!el?.closest?.(INTERACTIVE_SELECTOR);
      applyMode(interactive ? "hover" : "default");
    };
    const onLeave = () => {
      visibleRef.current = false;
      setVisible(false);
    };
    const onEnter = () => {
      if (!visibleRef.current) {
        visibleRef.current = true;
        setVisible(true);
      }
    };

    const loop = () => {
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      dotPos.current.x = lerp(dotPos.current.x, target.current.x, 0.55);
      dotPos.current.y = lerp(dotPos.current.y, target.current.y, 0.55);

      const ringT = modeRef.current === "down" ? 0.35 : 0.18;
      ringPos.current.x = lerp(ringPos.current.x, target.current.x, ringT);
      ringPos.current.y = lerp(ringPos.current.y, target.current.y, ringT);

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${dotPos.current.x}px, ${dotPos.current.y}px, 0) translate(-50%, -50%)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) translate(-50%, -50%)`;
      }
      rafId.current = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    rafId.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="custom-cursor-layer"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        ref={ringRef}
        className={`custom-cursor-ring ${mode === "hover" ? "is-hover" : ""} ${mode === "down" ? "is-down" : ""}`}
      />
      <div
        ref={dotRef}
        className={`custom-cursor-dot ${mode === "hover" ? "is-hover" : ""} ${mode === "down" ? "is-down" : ""}`}
      />
    </div>
  );
}
