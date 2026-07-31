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
