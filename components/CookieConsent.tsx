"use client";

import { useCallback, useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";
import Link from "next/link";
import {
  acceptAll,
  getConsent,
  OPEN_CONSENT_SETTINGS_EVENT,
  rejectAll,
  saveConsent,
  type ConsentChoices,
} from "@/lib/consent";

const CATEGORIES: { key: keyof ConsentChoices; label: string; desc: string }[] = [
  { key: "analitika", label: "Analitika", desc: "Anonimizált használati statisztika, hogy tudjuk mit érdemes fejleszteni." },
  { key: "marketing", label: "Marketing", desc: "Hirdetési mérőkódok, célzott ajánlatok." },
];

const DEFAULT_CHOICES: ConsentChoices = { analitika: false, marketing: false };

/** Kis kapcsoló (toggle) -- a "szükséges" kategória mindig bekapcsolt és nem módosítható. */
function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-blue" : "bg-line"} ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

/**
 * Süti-hozzájárulás banner + beállító panel (FR-CONSENT-001).
 *
 * A gyökér layoutban egyszer szerepel, minden oldalon (marketing + app)
 * megjelenik amíg a látogató nem választott. A "Süti-beállítások" linkről
 * (lásd lib/consent.ts openConsentSettings) bármikor újranyitható.
 */
export function CookieConsent() {
  const [bannerVisible, setBannerVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [choices, setChoices] = useState<ConsentChoices>(DEFAULT_CHOICES);

  useEffect(() => {
    // Csak kliensen dől el van-e már mentett választás (localStorage) -- ezért
    // nem lehet lazy useState-inicializálással kiváltani (SSR/hidratáció-biztos).
    const existing = getConsent();
    if (!existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time láthatóság-eldöntés, nem cascading update
      setBannerVisible(true);
    } else {
      setChoices(existing.choices);
    }

    const openSettings = () => {
      const current = getConsent();
      setChoices(current?.choices ?? DEFAULT_CHOICES);
      setSettingsOpen(true);
    };
    window.addEventListener(OPEN_CONSENT_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_CONSENT_SETTINGS_EVENT, openSettings);
  }, []);

  const handleAccept = useCallback(() => {
    acceptAll();
    setChoices({ analitika: true, marketing: true });
    setBannerVisible(false);
    setSettingsOpen(false);
  }, []);

  const handleReject = useCallback(() => {
    rejectAll();
    setChoices({ ...DEFAULT_CHOICES });
    setBannerVisible(false);
    setSettingsOpen(false);
  }, []);

  const handleSaveSettings = useCallback(() => {
    saveConsent(choices);
    setBannerVisible(false);
    setSettingsOpen(false);
  }, [choices]);

  if (!bannerVisible && !settingsOpen) return null;

  return (
    <>
      {bannerVisible && !settingsOpen && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Süti-beállítások"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl sm:inset-x-auto sm:right-6 sm:bottom-6"
        >
          <div className="glass p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-btn)] bg-cyan-soft text-blue">
                <Cookie className="h-5 w-5" strokeWidth={2} />
              </span>
              <div>
                <p className="text-[15px] font-bold text-ink">Sütiket használunk</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                  SZÖVEG IDE KERÜL -- rövid, közérthető magyarázat a sütihasználatról. Részletek:{" "}
                  <Link href="/adatkezelesi-tajekoztato" className="font-semibold text-blue underline underline-offset-2">
                    Adatkezelési tájékoztató
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button type="button" onClick={handleAccept} className="cta flex-1 px-5 py-2.5 text-[14px] sm:flex-none">
                Elfogadom
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="flex-1 rounded-[var(--radius-btn)] border border-line bg-white px-5 py-2.5 text-[14px] font-bold text-ink transition-colors hover:border-blue/40 sm:flex-none"
              >
                Elutasítom
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="w-full text-center text-[13px] font-semibold text-blue underline underline-offset-2 sm:w-auto"
              >
                Beállítások
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Süti-beállítások">
          <div className="glass w-full max-w-md p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-[17px] font-extrabold text-ink">Süti-beállítások</p>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Bezárás"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-cyan-soft hover:text-blue"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[13px] text-ink-2">
              SZÖVEG IDE KERÜL -- kategóriánkénti részletes magyarázat. Lásd az{" "}
              <Link href="/adatkezelesi-tajekoztato" className="font-semibold text-blue underline underline-offset-2">
                adatkezelési tájékoztatót
              </Link>
              .
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3 rounded-[var(--radius-btn)] border border-line bg-white/60 p-3.5">
                <div>
                  <p className="text-[14px] font-bold text-ink">Szükséges</p>
                  <p className="mt-0.5 text-[12px] text-muted">Az oldal alapműködéséhez kell, ez nem kapcsolható ki.</p>
                </div>
                <Toggle checked disabled />
              </div>

              {CATEGORIES.map(({ key, label, desc }) => (
                <div key={key} className="flex items-start justify-between gap-3 rounded-[var(--radius-btn)] border border-line bg-white/60 p-3.5">
                  <div>
                    <p className="text-[14px] font-bold text-ink">{label}</p>
                    <p className="mt-0.5 text-[12px] text-muted">{desc}</p>
                  </div>
                  <Toggle checked={choices[key]} onChange={(v) => setChoices((c) => ({ ...c, [key]: v }))} />
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <button type="button" onClick={handleSaveSettings} className="cta flex-1 px-5 py-2.5 text-[14px]">
                Mentés
              </button>
              <button
                type="button"
                onClick={handleAccept}
                className="flex-1 rounded-[var(--radius-btn)] border border-line bg-white px-5 py-2.5 text-[14px] font-bold text-ink transition-colors hover:border-blue/40"
              >
                Összes elfogadása
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
