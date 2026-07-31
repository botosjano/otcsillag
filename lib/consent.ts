/**
 * Süti-hozzájárulás kezelés (FR-CONSENT-001).
 *
 * Kliensoldali, localStorage-alapú tárolás. Minden nem-szükséges
 * script/pixel/mérőkód betöltése előtt EZT kell megkérdezni
 * (hasConsent), és csak igaz válasz esetén szabad elindítani.
 *
 * Kategóriák:
 *  - szukseges: mindig true, nem kapcsolható ki (session, alap működés).
 *  - analitika: pl. látogatottság-mérés (jelenleg nincs ilyen beépítve).
 *  - marketing: pl. hirdetési pixel (jelenleg nincs ilyen beépítve).
 */

export type ConsentCategory = "szukseges" | "analitika" | "marketing";

export type ConsentChoices = Record<Exclude<ConsentCategory, "szukseges">, boolean>;

export type ConsentRecord = {
  version: number;
  choices: ConsentChoices;
  updatedAt: string;
};

/** Ha a kategóriák jelentése/köre változik, emeld a verziót -- ez újra megjeleníti a bannert. */
export const CONSENT_VERSION = 1;

const STORAGE_KEY = "otcsillag_cookie_consent";

/** Egyedi DOM esemény neve, amivel a banner "Süti-beállítások" linkről újranyitható. */
export const OPEN_CONSENT_SETTINGS_EVENT = "otcsillag:open-cookie-settings";

/** Egyedi DOM esemény neve, amit a hozzájárulás mentésekor tüzelünk (pl. script-inicializáláshoz). */
export const CONSENT_CHANGED_EVENT = "otcsillag:consent-changed";

const DEFAULT_CHOICES: ConsentChoices = {
  analitika: false,
  marketing: false,
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Elmentett hozzájárulás beolvasása. `null`, ha még nem választott a látogató, vagy a verzió elavult. */
export function getConsent(): ConsentRecord | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Hozzájárulás mentése + esemény kiküldése (pl. hogy a gate-elt scriptek betöltődhessenek). */
export function saveConsent(choices: ConsentChoices): void {
  if (!isBrowser()) return;
  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    choices,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  window.dispatchEvent(new CustomEvent<ConsentRecord>(CONSENT_CHANGED_EVENT, { detail: record }));
}

/** Minden opcionális kategória elfogadása ("Elfogadom"). */
export function acceptAll(): void {
  saveConsent({ analitika: true, marketing: true });
}

/** Minden opcionális kategória elutasítása ("Elutasítom") -- csak a szükséges sütik maradnak. */
export function rejectAll(): void {
  saveConsent({ ...DEFAULT_CHOICES });
}

/**
 * Van-e engedélyezett hozzájárulás az adott kategóriára.
 * A "szukseges" mindig true. Bármilyen nem-szükséges script/pixel
 * betöltése ELŐTT ezt kell hívni -- amíg a látogató nem választott,
 * false-t ad vissza (biztonságos alapállapot, nincs auto-opt-in).
 */
export function hasConsent(category: ConsentCategory): boolean {
  if (category === "szukseges") return true;
  const record = getConsent();
  if (!record) return false;
  return Boolean(record.choices[category]);
}

/** A "Süti-beállítások" linkhez: kinyitja a beállító panelt, akkor is ha már döntött korábban. */
export function openConsentSettings(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(OPEN_CONSENT_SETTINGS_EVENT));
}
