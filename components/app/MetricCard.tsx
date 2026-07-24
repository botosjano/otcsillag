import type { Metric } from "@/lib/mockData";

/** Metrika-kártya. gold variáns KIZÁRÓLAG review/becslés eredményhez. */
export function MetricCard({ m }: { m: Metric }) {
  return (
    <div className={`glass p-4 sm:p-5 ${m.gold ? "border-gold/30 bg-gold-soft/70" : ""}`}>
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">{m.label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className={`text-3xl font-extrabold tracking-tight ${m.gold ? "text-gold-deep" : "text-ink"}`}>{m.value}</span>
        {m.delta && (
          <span className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${m.gold ? "bg-gold/20 text-gold-deep" : "bg-cyan-soft text-blue"}`}>
            {m.delta}
          </span>
        )}
      </div>
    </div>
  );
}
