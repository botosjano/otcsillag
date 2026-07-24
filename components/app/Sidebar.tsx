"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SIDEBAR_NAV } from "./navItems";
import { BUSINESS } from "@/lib/mockData";

/** Desktop bal oldalsáv (>= 1200px): logó, cégnév, navigáció, alul profil. */
export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-nav shrink-0 flex-col border-r border-line px-4 py-6 xl:flex">
      <Link href="/app" className="px-2">
        <Image src="/brand/logo-lockup.png" alt="otcsillag.hu" width={150} height={55} className="logo-blend h-9 w-auto" priority />
      </Link>

      <div className="mt-5 flex items-center gap-2.5 rounded-[var(--radius-card)] bg-cyan-soft px-3 py-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue text-sm font-extrabold text-white">{BUSINESS.initials}</span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-ink">{BUSINESS.name}</p>
          <p className="text-[11px] text-muted">Áttekintő</p>
        </div>
      </div>

      <nav className="mt-5 flex flex-col gap-1" aria-label="Fő navigáció">
        {SIDEBAR_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[var(--radius-btn)] px-3 py-2.5 text-[14px] font-semibold transition-colors ${
                active ? "bg-cyan-soft text-blue" : "text-ink-2 hover:bg-cyan-soft/60 hover:text-ink"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-blue" : "text-muted"}`} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 rounded-[var(--radius-card)] border border-line px-3 py-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{BUSINESS.owner.slice(0, 2)}</span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-ink">{BUSINESS.owner}</p>
          <p className="truncate text-[11px] text-muted">{BUSINESS.email}</p>
        </div>
      </div>
    </aside>
  );
}
