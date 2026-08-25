/**
 * Egyszerű, single-tenant MVP-egyszerűsítés: az Identity/Org modul
 * (FR-AUTH-*, FR-ORG-*) külön kártya, jelenleg nincs bejelentkezés/tenant-
 * váltás. Amíg az nincs megírva, egyetlen szervezet ID-ja env-ből jön -- a
 * dashboard és a publikus API is erre az egy szervezetre dolgozik. Ez NEM
 * helyettesíti a 11.1 tenant-izolációt a séma szintjén (minden tábla
 * organization_id-t visel, RLS bekapcsolva) -- csak azt jelenti, hogy a
 * kérés-oldali "melyik szervezet" kérdésre most még nem munkamenet/API-kulcs
 * dönt, hanem egy fix konfiguráció.
 */
export function requireDefaultOrganizationId(): string {
  const id = process.env.OTCSILLAG_DEFAULT_ORGANIZATION_ID;
  if (!id) throw new Error("OTCSILLAG_DEFAULT_ORGANIZATION_ID hiányzik -- l. README Nyitott döntések.");
  return id;
}
