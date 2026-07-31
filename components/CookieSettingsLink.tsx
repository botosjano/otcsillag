"use client";

import { openConsentSettings } from "@/lib/consent";

/** Újranyitja a süti-beállító panelt -- footerbe/navba szánt, szöveges link. */
export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openConsentSettings} className={className}>
      Süti-beállítások
    </button>
  );
}
