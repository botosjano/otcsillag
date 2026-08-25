import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { hasMissingLegalData, isPlaceholder, LEGAL } from "@/lib/legal";
import { CookieSettingsLink } from "@/components/CookieSettingsLink";

export const metadata: Metadata = {
  title: "Adatkezelési tájékoztató",
};

type Section = { id: string; title: string; body: React.ReactNode };

/** Rovid szovegblokk a szekciokon belul. */
/** Cegadat-mezo. Ha meg nincs valos ertek, nem a nyers "TODO:" stringet irjuk ki. */
function LegalField({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  const missing = isPlaceholder(value);
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="font-semibold text-ink">{label}</dt>
      <dd className={missing ? "text-muted italic" : undefined}>{missing ? "Egyeztetés alatt" : value}</dd>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{children}</p>;
}

/** Felsorolas a szekciokon belul. */
function L({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] leading-relaxed text-ink-2">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

/**
 * Az urlapon (NewRequestForm) szereplo mezok.
 *
 * FONTOS, es a szoveg is ezt mondja: az urlap JELENLEG nem kuld sehova adatot
 * (`onSubmit` csak `preventDefault()`, l. components/app/NewRequestForm.tsx), es
 * nincs backend a projektben. Amikor az emlekezteto-motor eleseldik, ezt a
 * szekciot ES az adatfeldolgozok listajat frissiteni KELL.
 */
const REQUESTED_DATA_FIELDS = [
  "Ügyfél neve",
  "Telefonszám (SMS-csatorna esetén)",
  "E-mail cím (e-mail csatorna esetén)",
  "Küldési csatorna és időzítés preferencia",
];

const SECTIONS: Section[] = [
  {
    id: "milyen-adatot",
    title: "Milyen adatot kérünk",
    body: (
      <>
        <P>
          Az emlékeztető-küldéshez tervezett űrlap az alábbi mezőket tartalmazza. Ezek közül csak azt kell
          megadni, amelyik a választott küldési csatornához szükséges: SMS-hez telefonszám, e-mailhez e-mail cím.
        </P>
        <L items={REQUESTED_DATA_FIELDS} />
        <P>
          <strong className="font-semibold text-ink">Az oldal jelenlegi állapotában az űrlap nem továbbít
          adatot.</strong>{" "}
          A beírt mezők nem hagyják el a böngésződet, mert a szolgáltatás háttérrendszere még nem éles. Amint az
          emlékeztető-küldés elindul, ez a szakasz és az adatfeldolgozók listája frissül, és a változásról a
          süti-banner újbóli megjelenésével is értesítünk.
        </P>
        <P>
          A weboldal működéséhez ezen felül a böngésződ helyi tárolójában eltároljuk a süti-döntésedet
          (kategóriánként, a döntés időpontjával). Ez nem kerül szerverre.
        </P>
      </>
    ),
  },
  {
    id: "milyen-celbol",
    title: "Milyen célból kezeljük az adatokat",
    body: (
      <>
        <L
          items={[
            <>
              <strong className="font-semibold text-ink">Emlékeztető kiküldése:</strong> a megadott névre,
              telefonszámra vagy e-mail címre az általad kért időpontban emlékeztető üzenetet küldjünk. Ez a
              szolgáltatás lényege.
            </>,
            <>
              <strong className="font-semibold text-ink">Kapcsolattartás:</strong> ha az emlékeztetővel
              kapcsolatban kérdésed van, vagy a kiküldés meghiúsul.
            </>,
            <>
              <strong className="font-semibold text-ink">Süti-döntésed megőrzése:</strong> hogy ne kérdezzük meg
              minden oldalbetöltéskor.
            </>,
          ]}
        />
        <P>
          Amit <strong className="font-semibold text-ink">nem</strong> csinálunk: nem adjuk el és nem adjuk át
          harmadik félnek marketingcélra, nem használjuk profilalkotásra, és nem küldünk a kért emlékeztetőn túl
          reklámüzenetet.
        </P>
      </>
    ),
  },
  {
    id: "jogalap",
    title: "Az adatkezelés jogalapja",
    body: (
      <>
        <L
          items={[
            <>
              <strong className="font-semibold text-ink">Szerződés teljesítése</strong> (GDPR 6. cikk (1) b)):
              az emlékeztető kiküldéséhez megadott név és elérhetőség kezelése. E nélkül a szolgáltatás nem
              nyújtható.
            </>,
            <>
              <strong className="font-semibold text-ink">Hozzájárulás</strong> (GDPR 6. cikk (1) a)): a nem
              feltétlenül szükséges sütik. Ezt bármikor visszavonhatod, a visszavonás a jövőre nézve hatályos.
            </>,
            <>
              <strong className="font-semibold text-ink">Jogos érdek</strong> (GDPR 6. cikk (1) f)): a
              szolgáltatás biztonságos üzemeltetése, visszaélések megelőzése.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "meddig",
    title: "Meddig tároljuk az adatokat",
    body: (
      <>
        <L
          items={[
            <>
              <strong className="font-semibold text-ink">Emlékeztetőhöz megadott adatok:</strong> az emlékeztető
              kiküldéséig, majd azt követően legfeljebb 30 napig (hogy egy meghiúsult kiküldés újraküldhető
              legyen), utána törlésre kerül. Kérésedre ennél előbb is töröljük.
            </>,
            <>
              <strong className="font-semibold text-ink">Süti-döntés:</strong> a böngésződ helyi tárolójában, a
              döntés visszavonásáig vagy a böngésző tárolójának törléséig. A kategóriák megváltozásakor
              automatikusan újra megkérdezzük.
            </>,
          ]}
        />
        <P>
          Ha jogszabály hosszabb megőrzést ír elő (például számviteli bizonylat esetén), az adott adatra a
          jogszabályi határidő az irányadó.
        </P>
      </>
    ),
  },
  {
    id: "adatfeldolgozok",
    title: "Kinek adjuk át: adatfeldolgozók",
    body: (
      <>
        <P>
          <strong className="font-semibold text-ink">Jelenleg nincs adatfeldolgozónk</strong>, mert az oldal még
          nem továbbít személyes adatot: az űrlap nem küld adatot, és sem analitikai, sem marketing mérőkód nem
          fut az oldalon.
        </P>
        <P>
          Amikor az emlékeztető-küldés elindul, ide kerül minden igénybe vett szolgáltató neve, székhelye és a
          feldolgozás célja (tárhely, adatbázis, SMS- és e-mail-kézbesítés), valamint az, hogy történik-e
          adattovábbítás az Európai Gazdasági Térségen kívülre. Ez a szakasz a szolgáltatás élesítése előtt
          frissül.
        </P>
      </>
    ),
  },
  {
    id: "erintetti-jogok",
    title: "Érintetti jogok",
    body: (
      <>
        <P>Az adataiddal kapcsolatban a következő jogok illetnek meg:</P>
        <L
          items={[
            <>
              <strong className="font-semibold text-ink">Hozzáférés:</strong> tájékoztatást kérhetsz arról, hogy
              kezelünk-e rólad adatot, és ha igen, milyet.
            </>,
            <>
              <strong className="font-semibold text-ink">Helyesbítés:</strong> kérheted a pontatlan adat
              javítását.
            </>,
            <>
              <strong className="font-semibold text-ink">Törlés:</strong> kérheted az adataid törlését, ha az
              adatkezelés célja megszűnt vagy visszavonod a hozzájárulásodat.
            </>,
            <>
              <strong className="font-semibold text-ink">Korlátozás:</strong> kérheted az adatkezelés
              korlátozását, például amíg egy vitatott adat pontosságát ellenőrizzük.
            </>,
            <>
              <strong className="font-semibold text-ink">Adathordozhatóság:</strong> kérheted, hogy a megadott
              adataidat géppel olvasható formában megkapd.
            </>,
            <>
              <strong className="font-semibold text-ink">Tiltakozás:</strong> tiltakozhatsz a jogos érdeken
              alapuló adatkezelés ellen.
            </>,
            <>
              <strong className="font-semibold text-ink">Hozzájárulás visszavonása:</strong> a süti-hozzájárulást
              a lábléc „Süti-beállítások” linkjén bármikor módosíthatod.
            </>,
          ]}
        />
        <P>
          A kéréseket a fenti adatvédelmi kapcsolattartói elérhetőségen fogadjuk, és legkésőbb a kérés
          beérkezésétől számított 30 napon belül válaszolunk.
        </P>
      </>
    ),
  },
  {
    id: "panasz",
    title: "Panasz: Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)",
    body: (
      <>
        <P>
          Ha úgy érzed, hogy az adatkezelésünk sérti a jogaidat, először fordulj hozzánk közvetlenül, a legtöbb
          kérdés így rendeződik a leggyorsabban. Ettől függetlenül bármikor panaszt tehetsz a felügyeleti
          hatóságnál:
        </P>
        <L
          items={[
            <>Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)</>,
            <>Cím: 1055 Budapest, Falk Miksa utca 9-11.</>,
            <>Postacím: 1363 Budapest, Pf. 9.</>,
            <>Telefon: +36 1 391 1400</>,
            <>
              E-mail:{" "}
              <a href="mailto:ugyfelszolgalat@naih.hu" className="font-semibold text-blue underline underline-offset-2">
                ugyfelszolgalat@naih.hu
              </a>
            </>,
            <>
              Honlap:{" "}
              <a
                href="https://naih.hu"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-blue underline underline-offset-2"
              >
                naih.hu
              </a>
            </>,
          ]}
        />
        <P>Bírósághoz is fordulhatsz, a lakóhelyed vagy tartózkodási helyed szerinti törvényszéken.</P>
      </>
    ),
  },
];

export default function AdatkezelesiTajekoztatoPage() {
  return (
    <div className="relative flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/">
          <Image src="/brand/logo-lockup-transparent.png" alt="otcsillag.hu" width={150} height={55} className="h-9 w-auto" priority />
        </Link>
        <Link href="/" className="text-[14px] font-semibold text-blue">
          Vissza a főoldalra
        </Link>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 pb-20 sm:px-8">
        <h1 className="mt-4 text-[2rem] font-extrabold tracking-tight text-ink sm:text-[2.5rem]">Adatkezelési tájékoztató</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Ez a tájékoztató azt írja le, milyen adatot kezelünk, milyen célból, meddig, és milyen jogaid vannak
          ezzel kapcsolatban. Igyekeztünk közérthetően fogalmazni. Ha bármi nem világos, keress minket az alábbi
          elérhetőségen.
        </p>

        {/* Adatkezelo adatai: a lib/legal.ts-bol jon, hianyzo mezonel semleges jelzes megy ki. */}
        <section id="adatkezelo" className="glass mt-8 p-5 sm:p-6">
          <h2 className="text-[1.15rem] font-extrabold text-ink">Az adatkezelő adatai</h2>
          {hasMissingLegalData() && (
            <p className="mt-3 rounded-[var(--radius-btn)] border border-line bg-cyan-soft/40 px-4 py-3 text-[13px] leading-relaxed text-ink-2">
              A cégjegyzék szerinti adatok véglegesítése folyamatban van. Amíg ez tart, adatvédelmi kérdéssel
              az oldalon megadott ügyfélszolgálati elérhetőségen keresel minket, és a kérésedet ugyanúgy
              teljesítjük.
            </p>
          )}
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-[14px] text-ink-2 sm:grid-cols-2">
            <LegalField label="Cégnév" value={LEGAL.cegNev} />
            <LegalField label="Székhely" value={LEGAL.szekhely} />
            <LegalField label="Cégjegyzékszám" value={LEGAL.cegjegyzekszam} />
            <LegalField label="Adószám" value={LEGAL.adoszam} />
            <LegalField label="E-mail" value={LEGAL.email} />
            <LegalField label="Telefon" value={LEGAL.telefon} />
            <LegalField label="Adatvédelmi kapcsolattartó" value={LEGAL.adatvedelmiKapcsolattarto} wide />
          </dl>
        </section>

        {SECTIONS.map(({ id, title, body }) => (
          <section key={id} id={id} className="glass mt-5 p-5 sm:p-6">
            <h2 className="text-[1.15rem] font-extrabold text-ink">{title}</h2>
            {body}
          </section>
        ))}

        <section className="glass mt-5 p-5 sm:p-6">
          <h2 className="text-[1.15rem] font-extrabold text-ink">Sütik</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
            Az oldal működéséhez szükséges sütiket mindig használjuk: ezek tárolják a süti-döntésedet. Analitikai
            és marketing sütit csak a hozzájárulásoddal helyeznénk el, ilyet jelenleg egyáltalán nem futtatunk. A
            döntésedről és annak visszavonásáról a{" "}
            <CookieSettingsLink className="font-semibold text-blue underline underline-offset-2" />
            {" "}oldalon rendelkezhetsz bármikor.
          </p>
        </section>

        <p className="mt-8 text-[12px] text-muted">Utolsó frissítés: 2026. augusztus 1.</p>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-3 px-5 py-8 text-[13px] text-muted sm:flex-row sm:px-8">
          <p>© 2026 Ötcsillag</p>
          <div className="flex items-center gap-4">
            <Link href="/adatkezelesi-tajekoztato" className="hover:text-blue">Adatkezelési tájékoztató</Link>
            <CookieSettingsLink className="hover:text-blue" />
          </div>
        </div>
      </footer>
    </div>
  );
}
