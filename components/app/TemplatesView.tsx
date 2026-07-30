import { Plus, FileText, MessageSquare, Mail, Pencil, Database, Clock, BellOff, Zap } from "lucide-react";
import { TEMPLATES, USAGE } from "@/lib/mockData";
import { smsSegments } from "@/lib/sms";

const RULES = [
  { icon: Zap, title: "Azonnali küldés", desc: "Munkaidőben, csendes időszakot figyelve.", on: true },
  { icon: BellOff, title: "Egy emlékeztető", desc: "3 nap múlva, ha nem történt kattintás.", on: true },
  { icon: Clock, title: "Csendes órák", desc: "20:00 – 08:00 között nem küldünk.", on: true },
];

export function TemplatesView() {
  const pct = Math.min(100, Math.round((USAGE.used / USAGE.limit) * 100));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-[1.7rem] font-extrabold tracking-tight text-ink sm:text-[2rem]">Üzenetsablonok</h1>
        <button type="button" aria-label="Új sablon" className="cta flex items-center gap-2 px-5 py-3 text-sm"><Plus className="h-5 w-5" /> <span className="hidden sm:inline">Új sablon</span></button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
        {/* Sablonok */}
        <div className="flex flex-col gap-4">
          {TEMPLATES.map((t) => {
            const seg = smsSegments(t.body);
            return (
              <div key={t.id} className="glass p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-btn)] bg-cyan-soft text-blue">
                      {t.category === "SMS" ? <MessageSquare className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                    </span>
                    <div>
                      <p className="font-bold text-ink">{t.name}</p>
                      <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t.category}</p>
                    </div>
                  </div>
                  <button type="button" className="flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-line px-3 py-2 text-[13px] font-bold text-blue transition-colors hover:bg-cyan-soft/50">
                    <Pencil className="h-4 w-4" /> Szerkesztés
                  </button>
                </div>
                <p className="mt-3 whitespace-pre-line rounded-[var(--radius-btn)] bg-page/70 p-3 text-[13px] leading-relaxed text-ink-2">{t.body}</p>
                {t.category === "SMS" && (
                  <p className="mt-2 text-[12px] text-muted">
                    {seg.chars} karakter · {seg.segments} szegmens ·{" "}
                    <span className={seg.encoding === "UCS-2" ? "font-bold text-gold-deep" : "font-bold text-blue"}>{seg.encoding}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Usage + szabályok */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--radius-card)] bg-ink p-5 text-white">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-cyan"><Database className="h-4 w-4" /> Csomag használat</div>
            <p className="mt-2 text-3xl font-extrabold">{USAGE.used} / {USAGE.limit} SMS</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-cyan" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-[12px] text-white/70">{USAGE.plan} · {USAGE.trialDaysLeft} nap van hátra.</p>
            <button type="button" className="mt-4 w-full rounded-[var(--radius-btn)] bg-white py-2.5 text-sm font-bold text-ink transition-colors hover:bg-white/90">Csomag és számlázás</button>
          </div>

          <div className="glass p-5">
            <h2 className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-ink"><FileText className="h-4 w-4 text-blue" /> Küldési szabályok</h2>
            <ul className="flex flex-col gap-3">
              {RULES.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-soft text-blue"><Icon className="h-4 w-4" /></span>
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-ink">{title}</p>
                    <p className="text-[12px] text-muted">{desc}</p>
                  </div>
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
