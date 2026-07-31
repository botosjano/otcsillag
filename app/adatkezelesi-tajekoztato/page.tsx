import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";
import { CookieSettingsLink } from "@/components/CookieSettingsLink";

export const metadata: Metadata = {
  title: "Adatkezelési tájékoztató",
};

type Section = { id: string; title: string; body?: React.ReactNode };

const SECTIONS: Section[] = [
  { id: "milyen-adatot", title: "Milyen adatot kérünk" },
  { id: "milyen-celbol", title: "Milyen célból kezeljük az adatokat" },
  { id: "jogalap", title: "Az adatkezelés jogalapja" },
  { id: "meddig", title: "Meddig tároljuk az adatokat" },
  { id: "adatfeldolgozok", title: "Kinek adjuk át -- adatfeldolgozók" },
  { id: "erintetti-jogok", title: "Érintetti jogok" },
  { id: "panasz", title: "Panasz -- Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)" },
];

/** Az űrlapon (NewRequestForm) ténylegesen kért mezők -- ide csak a MEZŐ-STRUKTÚRA kerül,
 *  a tényleges jogi szöveget majd a cégtulajdonos adja meg (lásd SZÖVEG IDE KERÜL). */
const REQUESTED_DATA_FIELDS = [
  "Ügyfél neve",
  "Telefonszám (SMS-csatorna esetén)",
  "E-mail cím (e-mail csatorna esetén)",
  "Küldési csatorna és időzítés preferencia",
];

function Placeholder() {
  return (
    <p className="mt-2 rounded-[var(--radius-btn)] border border-dashed border-line bg-cyan-soft/40 px-4 py-3 text-[13px] font-semibold text-blue">
      SZÖVEG IDE KERÜL
    </p>
  );
}

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
          Ez az oldal a végleges adatkezelési tájékoztató VÁZA. A jogi szöveg (adatkezelési célok, jogalapok,
          megőrzési idők pontos leírása) még nem került fel -- ezt a cégtulajdonos/jogi képviselő adja meg. Addig
          minden szekció helykitöltővel jelenik meg.
        </p>

        {/* Adatkezelő adatai -- ez az egyetlen szekció, ami már valós (config-ból kötött) adatot mutat. */}
        <section id="adatkezelo" className="glass mt-8 p-5 sm:p-6">
          <h2 className="text-[1.15rem] font-extrabold text-ink">Az adatkezelő adatai</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-[14px] text-ink-2 sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-ink">Cégnév</dt>
              <dd>{LEGAL.cegNev}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Székhely</dt>
              <dd>{LEGAL.szekhely}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Cégjegyzékszám</dt>
              <dd>{LEGAL.cegjegyzekszam}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Adószám</dt>
              <dd>{LEGAL.adoszam}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">E-mail</dt>
              <dd>{LEGAL.email}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Telefon</dt>
              <dd>{LEGAL.telefon}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold text-ink">Adatvédelmi kapcsolattartó</dt>
              <dd>{LEGAL.adatvedelmiKapcsolattarto}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[12px] text-muted">
            Forrás: <code className="rounded bg-white px-1.5 py-0.5">lib/legal.ts</code> -- ha ez az adat változik, csak azt a fájlt kell frissíteni.
          </p>
        </section>

        {SECTIONS.map(({ id, title }) => (
          <section key={id} id={id} className="glass mt-5 p-5 sm:p-6">
            <h2 className="text-[1.15rem] font-extrabold text-ink">{title}</h2>
            {id === "milyen-adatot" && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] text-ink-2">
                {REQUESTED_DATA_FIELDS.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            )}
            <Placeholder />
          </section>
        ))}

        <section className="glass mt-5 p-5 sm:p-6">
          <h2 className="text-[1.15rem] font-extrabold text-ink">Sütik</h2>
          <p className="mt-2 text-[14px] text-ink-2">
            A sütikezelésről és a hozzájárulás visszavonásáról a{" "}
            <CookieSettingsLink className="font-semibold text-blue underline underline-offset-2" />
            {" "}oldalon rendelkezhetsz bármikor.
          </p>
        </section>

        <p className="mt-8 text-[12px] text-muted">Utolsó frissítés: TODO -- a jogi szöveg véglegesítésekor kerül ide dátum.</p>
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
