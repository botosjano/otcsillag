/**
 * Központi cégadat-konfiguráció (FR-LEGAL-001).
 *
 * EZ AZ EGYETLEN HELY, ahol a cég jogi/kapcsolati adatai szerepelnek.
 * Az adatkezelési tájékoztató, az impresszum (ha lesz) és a süti-banner
 * innen olvassa ki az adatokat -- ne másold be máshova külön stringként.
 *
 * TODO: a tényleges cégadatokat a cégtulajdonostól kell bekérni és
 * ide beírni, mielőtt az oldal élesedik. Amíg ez nem történik meg,
 * kizárólag helykitöltő (placeholder) értékek szerepelnek itt.
 */
export type LegalInfo = {
  /** Cég teljes, cégjegyzék szerinti neve. */
  cegNev: string;
  /** Székhely (teljes cím). */
  szekhely: string;
  /** Cégjegyzékszám. */
  cegjegyzekszam: string;
  /** Adószám. */
  adoszam: string;
  /** Általános / ügyfélszolgálati e-mail cím. */
  email: string;
  /** Telefonos elérhetőség. */
  telefon: string;
  /** Adatvédelmi kapcsolattartó neve és/vagy e-mail címe. */
  adatvedelmiKapcsolattarto: string;
};

// TODO: valós cégadatok szükségesek -- ezeket a cégtulajdonos adja meg.
export const LEGAL: LegalInfo = {
  cegNev: "TODO: Cégnév Kft.",
  szekhely: "TODO: 1000 Budapest, Példa utca 1.",
  cegjegyzekszam: "TODO: 01-09-000000",
  adoszam: "TODO: 00000000-0-00",
  email: "TODO: info@otcsillag.hu",
  telefon: "TODO: +36 1 000 0000",
  adatvedelmiKapcsolattarto: "TODO: adatvedelem@otcsillag.hu",
};

/**
 * Igaz, ha egy mezobe meg nem kerult valos adat.
 *
 * A tajekoztato-oldal EZT hasznalja, hogy ne a nyers "TODO: ..." string jelenjen
 * meg a latogatonak: helyette semleges jelzest ir ki, es egy figyelmeztetest tesz
 * a szekcio tetejere. A nyers TODO kiirasa rosszabb mint a hianyt bevallani.
 */
export function isPlaceholder(value: string): boolean {
  return value.trimStart().startsWith("TODO");
}

/** Igaz, ha barmelyik cegadat meg hianyzik. */
export function hasMissingLegalData(): boolean {
  return Object.values(LEGAL).some(isPlaceholder);
}
