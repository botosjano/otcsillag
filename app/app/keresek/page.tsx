import type { Metadata } from "next";
import Link from "next/link";
import { Plus, MessageSquare, Mail } from "lucide-react";
import { REQUESTS } from "@/lib/mockData";
import { StatusBadge } from "@/components/app/StatusBadge";

export const metadata: Metadata = { title: "Kérések" };

export default function Page() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-[1.7rem] font-extrabold tracking-tight text-ink sm:text-[2rem]">Kérések</h1>
        <Link href="/app/uj-keres" className="cta flex items-center gap-2 px-5 py-3 text-sm">
          <Plus className="h-5 w-5" /> <span className="hidden sm:inline">Új kérés</span>
        </Link>
      </div>

      {/* Desktop: táblázat-szerű; mobil: kártyák */}
      <div className="glass divide-y divide-line">
        {REQUESTS.map((r) => (
          <div key={r.id} className="flex items-center gap-4 px-4 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-soft text-sm font-bold text-blue">
              {r.name.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-ink">{r.name}</p>
              <p className="flex items-center gap-1.5 text-[13px] text-muted">
                {r.channel === "SMS" ? <MessageSquare className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                {r.channel} · {r.when}
              </p>
            </div>
            <StatusBadge status={r.status} />
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-[13px] text-muted">A státusz valós kézbesítési visszajelzésen alapul; kattintás után az emlékeztető leáll.</p>
    </div>
  );
}
