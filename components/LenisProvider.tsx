"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Lenis smooth/momentum-scroll (flotta-szabvány). A prémium mobil-feel ~80%-a.
 * prefers-reduced-motion esetén nem indul (natív görgetés marad).
 */
export function LenisProvider() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
