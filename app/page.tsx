import Image from "next/image";
import { Star, ArrowRight, Play, MessageSquare, Clock, BarChart3, UserPlus, Send, MousePointerClick, Link2, ShieldCheck, Check } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const TRUST = [
  { icon: MessageSquare, title: "SMS és e-mail egy helyen", desc: "Személyes kérés a te nevedben, pár érintéssel." },
  { icon: Clock, title: "Időben érkező kérés", desc: "Munka után, csendes időszakot figyelve küldjük." },
  { icon: BarChart3, title: "Áttekinthető eredmények", desc: "Kézbesítés és kattintás, valós státuszokkal." },
];

const STEPS = [
  { icon: UserPlus, title: "Add meg az ügyfelet", desc: "Név és telefonszám vagy e-mail. Sablonból vagy pár szóból." },
  { icon: Send, title: "Küldjük a kérést", desc: "SMS-ben vagy e-mailben, a te nevedben, jó időben." },
  { icon: MousePointerClick, title: "Látod a kattintást", desc: "Kézbesítés és link-megnyitás valós státuszokkal." },
];

const FEATURES = [
  { icon: Link2, title: "Saját rövid link, kattintásmérés", desc: "Minden kéréshez egyedi, biztonságos rövid link. Pontosan látod, ki nyitotta meg az értékelési oldalt." },
  { icon: ShieldCheck, title: "Tisztességes és biztonságos", desc: "Nincs review-gating, nincs „csak pozitív” szűrés. Kattintás után az emlékeztető leáll, a leiratkozás mindig elérhető." },
];

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <Image src="/brand/aurora-mobile.svg" alt="" aria-hidden fill priority className="pointer-events-none -z-10 object-cover sm:hidden" />
      <Image src="/brand/aurora-desktop.svg" alt="" aria-hidden fill priority className="pointer-events-none -z-10 hidden object-cover sm:block" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Image src="/brand/logo-lockup-transparent.png" alt="otcsillag.hu" width={168} height={62} className="h-11 w-auto" priority />
        <a href="/app" className="cta flex items-center gap-2 px-5 py-2.5 text-sm">Indítsd el ingyen</a>
      </header>

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:py-16">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue">Google-értékeléskérés, automatikusan</p>
          <h1 className="mt-4 text-[2.4rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[3.25rem]">
            A jó munkád <span className="grad-text">ötcsillagos</span> nyomot hagy.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-2 sm:text-lg">
            Küldj személyes SMS- vagy e-mail-kérést egy perc alatt. Az Ötcsillag megmutatja, ki
            kézbesítette és ki kattintott rá az ügyfeleid közül.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="/app" className="cta flex items-center gap-2 px-6 py-3.5 text-[15px]">Indítsd el ingyen <ArrowRight className="h-5 w-5" /></a>
            <a href="#hogyan" className="flex items-center gap-2 rounded-[var(--radius-btn)] border border-line bg-surface px-6 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:border-blue/40">
              <Play className="h-4 w-4 text-blue" /> Nézd meg 90 mp alatt
            </a>
          </div>
          <p className="mt-4 text-[13px] text-muted">Bankkártya nélkül · 7 napos próba · Bármikor lemondható.</p>
        </div>

        <div className="relative">
          <div className="glass mx-auto max-w-sm p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-soft font-extrabold text-blue">F</span>
              <div>
                <p className="font-bold text-ink">FékPont Autószerviz</p>
                <p className="text-[13px] text-muted">Új értékeléskérés kézbesítve</p>
              </div>
            </div>
            <div className="mt-4 flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-7 w-7 fill-gold text-gold" strokeWidth={1} />)}
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
      </section>

      {/* Trust */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-8 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {TRUST.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 90} className="glass flex items-start gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-btn)] bg-cyan-soft text-blue"><Icon className="h-5 w-5" strokeWidth={2} /></span>
              <div>
                <p className="font-bold text-ink">{title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Hogyan működik */}
      <section id="hogyan" className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <h2 className="text-center text-[1.8rem] font-extrabold tracking-tight text-ink sm:text-[2.25rem]">Három lépés, harminc másodperc</h2>
        <p className="mx-auto mt-3 max-w-md text-center text-[15px] text-ink-2">A kérés indítása nem igényel technikai tudást.</p>
        <div className="mt-9 grid gap-5 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 90} className="glass p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-btn)] bg-cyan-soft text-blue"><Icon className="h-6 w-6" strokeWidth={2} /></span>
                <span className="text-2xl font-extrabold text-blue">{i + 1}</span>
              </div>
              <p className="mt-4 text-[17px] font-bold text-ink">{title}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Funkciók */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-14 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 90} className="glass p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-btn)] bg-cyan-soft text-blue"><Icon className="h-6 w-6" strokeWidth={2} /></span>
              <p className="mt-4 text-[17px] font-bold text-ink">{title}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 7 napos próba CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8">
        <div className="rounded-[var(--radius-marketing)] bg-ink px-6 py-10 text-center sm:px-12 sm:py-14">
          <h2 className="text-[1.7rem] font-extrabold tracking-tight text-white sm:text-[2.25rem]">Kezdd el ma, bankkártya nélkül</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-white/80">7 napig minden Pro funkció elérhető. Nincs elköteleződés, bármikor lemondható.</p>
          <ul className="mx-auto mt-5 flex max-w-2xl flex-col items-start gap-2 text-left text-[14px] text-white/90 sm:flex-row sm:items-start sm:justify-center sm:gap-8">
            {["SMS és e-mail csatorna", "Valós kézbesítési státusz", "Saját rövid-linkes kattintásmérés"].map((f) => (
              <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan" /> {f}</li>
            ))}
          </ul>
          <a href="/app" className="cta mx-auto mt-7 flex w-fit items-center gap-2 px-7 py-4 text-[15px]">Indítsd el ingyen <ArrowRight className="h-5 w-5" /></a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-8">
          <Image src="/brand/logo-lockup-transparent.png" alt="otcsillag.hu" width={150} height={55} className="h-8 w-auto" />
          <p className="text-[13px] text-muted">© 2026 Ötcsillag · A jó munkád ötcsillagos nyomot hagy.</p>
        </div>
      </footer>
    </div>
  );
}
