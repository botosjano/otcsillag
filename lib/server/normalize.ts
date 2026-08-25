/**
 * FR-CON-002: telefonszám E.164-re normalizálása, email kanonicalizálása.
 * Csak magyar (+36) és már E.164 formátumú bemenetet kezel -- nemzetközi
 * szám-könyvtár (pl. libphonenumber) hozzáadása külön döntés, ha kell.
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim().replace(/[\s()-]/g, "");
  if (/^\+\d{8,15}$/.test(trimmed)) return trimmed;
  if (/^06\d{8,9}$/.test(trimmed)) return `+36${trimmed.slice(2)}`;
  if (/^36\d{8,9}$/.test(trimmed)) return `+${trimmed}`;
  return null;
}

export function normalizeEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}
