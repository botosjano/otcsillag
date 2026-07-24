"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Könnyű scroll-reveal (flotta-szabvány: saját Reveal + Lenis, NEM framer-motion).
 * IntersectionObserver-alapú fade + slide-up; a staggert a `delay` prop adja
 * (gyerekenként növekvő). prefers-reduced-motion esetén azonnal látszik.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  once = true,
  className = "",
}: {
  children: ReactNode;
  delay?: number; // ms
  y?: number; // px
  once?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Mount-idejű reduced-motion check -> azonnali megjelenítes (SSR-safe).
      // eslint-disable-next-line react-hooks/set-state-in-effect -- egyszeri mount-olvasas
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            if (once) io.disconnect();
          } else if (!once) {
            setShown(false);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "reveal-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ["--reveal-y" as string]: `${y}px` }}
    >
      {children}
    </div>
  );
}
