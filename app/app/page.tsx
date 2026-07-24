import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Star, ArrowRight, Lightbulb } from "lucide-react";
import { MetricCard } from "@/components/app/MetricCard";
import { MiniChart } from "@/components/app/MiniChart";
import { StatusBadge } from "@/components/app/StatusBadge";
import { BUSINESS, METRICS, SERIES_REQUESTS, SERIES_CLICKS, ACTIVITY } from "@/lib/mockData";

export const metadata: Metadata = { title: "Áttekintő" };

export default function Dashboard() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-[1.7rem] font-extrabold tracking-tight text-ink sm:text-[2rem]">
          Jó reggelt, {BUSINESS.owner.split(" ")[0]}!
        </h1>
        <Link href="/app/uj-keres" className="cta flex items-center gap-2 px-5 py-3 text-sm">
          <Plus className="h-5 w-5" /> <span className="hidden sm:inline">Új kérés</span>
        </Link>
      </div>

      {/* Metrikák */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {METRICS.map((m) => <MetricCard key={m.key} m={m} />)}
      </div>

      {/* Chart + oldalsáv */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="glass p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold text-ink">Kérések és kattintások</h2>
            <div className="flex items-center gap-3 text-[12px] font-semibold text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue" /> Kérések</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-cyan" /> Kattintások</span>
            </div>
          </div>
          <div className="mt-4">
            <MiniChart a={SERIES_REQUESTS} b={SERIES_CLICKS} />
          </div>
          <p className="mt-3 text-[13px] text-muted">Ma 19 SMS ment el, ebből 11 kattintással.</p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Cél */}
          <div className="glass border-gold/25 bg-gold-soft/60 p-5">
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-4 w-4 fill-gold text-gold" strokeWidth={1} />)}
            </div>
            <p className="mt-2 text-[15px] font-extrabold text-ink">Az első 10 értékelés felé</p>
            <p className="text-[13px] text-ink-2">Az eddigi kattintásokból becsülve jó úton haladsz.</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-gold" style={{ width: "70%" }} />
            </div>
          </div>

          {/* Legutóbbi aktivitás */}
          <div className="glass p-5">
            <h2 className="mb-3 text-[15px] font-extrabold text-ink">Legutóbbi aktivitás</h2>
            <ul className="flex flex-col gap-3">
              {ACTIVITY.map((a) => (
                <li key={a.id} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-soft text-sm font-bold text-blue">
                    {a.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-ink">{a.name}</p>
                    <p className="text-[12px] text-muted">{a.when}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Tipp */}
      <div className="glass mt-4 flex items-start gap-3 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-soft text-blue"><Lightbulb className="h-5 w-5" /></span>
        <p className="text-[14px] text-ink-2">
          <span className="font-bold text-ink">Tipp:</span> a kérést a munka után 1–2 órával küldve többen kattintanak. Az időzítést a beállításoknál módosíthatod.
        </p>
        <Link href="/app/beallitasok" className="ml-auto hidden shrink-0 items-center gap-1 text-sm font-bold text-blue hover:underline sm:flex">
          Beállítás <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
