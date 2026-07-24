import Image from "next/image";
import { Star, ArrowRight, Play, MessageSquare, Clock, BarChart3 } from "lucide-react";

const TRUST = [
  { icon: MessageSquare, title: "SMS és e-mail egy helyen", desc: "Személyes kérés a te nevedben, pár érintéssel." },
  { icon: Clock, title: "Időben érkező kérés", desc: "Munka után, csendes időszakot figyelve küldjük." },
  { icon: BarChart3, title: "Áttekinthető eredmények", desc: "Kézbesítés és kattintás, valós státuszokkal." },
];

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Aurora háttér (visszafogott) */}
      <Image src="/brand/aurora-desktop.svg" alt="" aria-hidden fill priority className="pointer-events-none -z-10 object-cover" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Image src="/brand/logo-lockup.png" alt="otcsillag.hu" width={168} height={62} className="logo-blend h-11 w-auto" priority />
        <a href="/app" className="cta flex items-center gap-2 px-5 py-2.5 text-sm">
          Indítsd el ingyen
        </a>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:py-16">
        {/* Bal: üzenet */}
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue">
            Google-értékeléskérés, automatikusan
          </p>
          <h1 className="mt-4 text-[2.4rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[3.25rem]">
            A jó munkád <span className="grad-text">ötcsillagos</span> nyomot hagy.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-2 sm:text-lg">
            Küldj személyes SMS- vagy e-mail-kérést egy perc alatt. Az Ötcsillag megmutatja, ki
            kézbesítette és ki kattintott rá az ügyfeleid közül.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="/app" className="cta flex items-center gap-2 px-6 py-3.5 text-[15px]">
              Indítsd el ingyen <ArrowRight className="h-5 w-5" />
            </a>
            <a href="#demo" className="flex items-center gap-2 rounded-[var(--radius-btn)] border border-line bg-surface px-6 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:border-blue/40">
              <Play className="h-4 w-4 text-blue" /> Nézd meg 90 mp alatt
            </a>
          </div>
          <p className="mt-4 text-[13px] text-muted">Bankkártya nélkül · 7 napos próba · Bármikor lemondható.</p>
        </div>

        {/* Jobb: review-kártya mockup */}
        <div className="relative">
          <div className="glass mx-auto max-w-sm p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-soft text-blue font-extrabold">F</span>
              <div>
                <p className="font-bold text-ink">FékPont Autószerviz</p>
                <p className="text-[13px] text-muted">Új értékeléskérés kézbesítve</p>
              </div>
            </div>
            <div className="mt-4 flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-7 w-7 fill-gold text-gold" strokeWidth={1} />
              ))}
            </div>
            <p className="mt-4 rounded-[var(--radius-btn)] bg-page/70 p-3 text-[14px] leading-relaxed text-ink-2">
              {"„Köszönjük a bizalmat! Ha elégedett voltál, egy kattintással értékelhetsz minket a Google-on.”"}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
              <span className="text-[13px] font-semibold text-blue">Link megnyitva</span>
              <span className="rounded-full bg-gold-soft px-3 py-1 text-[13px] font-bold text-gold-deep">+12 új értékelés</span>
            </div>
          </div>
        </div>
      </main>

      {/* Trust-sor */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-14 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {TRUST.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass flex items-start gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-btn)] bg-cyan-soft text-blue">
                <Icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <div>
                <p className="font-bold text-ink">{title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
