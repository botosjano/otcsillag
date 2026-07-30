import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SIDEBAR_NAV } from "@/components/app/navItems";

export const metadata: Metadata = { title: "Több" };

// A mobil bottom-nav "Több" gombja egyedüli belépési pont ezekhez az
// aloldalakhoz (Sablonok, Import és integrációk, Beállítások), mivel a
// Sidebar csak desktopon (>=1200px) látszik. Az Áttekintő és a Kérések már
// saját bottom-nav gombot kap, azokat itt nem ismételjük.
const MORE_NAV = SIDEBAR_NAV.filter((item) => item.href !== "/app" && item.href !== "/app/keresek");

export default function Page() {
  return (
    <div>
      <h1 className="mb-6 text-[1.7rem] font-extrabold tracking-tight text-ink sm:text-[2rem]">Több</h1>
      <div className="glass divide-y divide-line">
        {MORE_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 px-4 py-4 first:rounded-t-[var(--radius-card)] last:rounded-b-[var(--radius-card)] hover:bg-cyan-soft/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-soft text-blue">
              <Icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className="flex-1 font-bold text-ink">{label}</p>
            <ChevronRight className="h-5 w-5 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
