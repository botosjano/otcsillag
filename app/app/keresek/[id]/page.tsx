import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Inbox, ChevronRight, MessageSquare, Mail, Info, Send, X } from "lucide-react";
import { getRequest } from "@/lib/mockData";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Timeline } from "@/components/app/Timeline";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: getRequest(id)?.name ?? "Kérés" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = getRequest(id);
  if (!r) notFound();
  const clicked = r.status === "clicked";

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-2 text-sm text-muted" aria-label="Útvonal">
        <Link href="/app/keresek" className="flex items-center gap-1 hover:text-ink"><Inbox className="h-4 w-4" /> Kérések</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="truncate text-ink">{r.name}</span>
      </nav>

      {/* Fejléc */}
      <div className="mb-6 flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cyan-soft text-xl font-extrabold text-blue">{r.name.slice(0, 1)}</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[1.6rem] font-extrabold tracking-tight text-ink sm:text-[2rem]">{r.name}</h1>
          <p className="flex items-center gap-1.5 text-[13px] text-muted">
            {r.channel === "SMS" ? <MessageSquare className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />} {r.channel} · {r.when}
          </p>
        </div>
        <StatusBadge status={r.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        {/* Eseménylánc */}
        <div className="glass p-5 sm:p-6">
          <h2 className="mb-4 text-[15px] font-extrabold text-ink">Eseménylánc</h2>
          <Timeline status={r.status} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="glass flex items-start gap-2.5 p-4 text-[13px] text-ink-2">
            <Info className="h-4 w-4 shrink-0 text-blue" />
            {clicked
              ? "Az ügyfél megnyitotta az értékelési linket, ezért az emlékeztetőt leállítottuk. A tényleges Google-értékelést nem tudjuk garantálni."
              : "Kattintás után az emlékeztetőt automatikusan leállítjuk. A státusz valós kézbesítési visszajelzésen alapul."}
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/app/uj-keres" className="cta flex items-center justify-center gap-2 py-3.5 text-[15px]">
              <Send className="h-5 w-5" /> Új kérés az ügyfélnek
            </Link>
            {(r.status === "scheduled" || r.status === "submitted") && (
              <button type="button" className="flex items-center justify-center gap-2 rounded-[var(--radius-btn)] border border-line bg-white py-3.5 text-[15px] font-bold text-ink-2 transition-colors hover:border-danger/40 hover:text-danger">
                <X className="h-5 w-5" /> Kérés visszavonása
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
