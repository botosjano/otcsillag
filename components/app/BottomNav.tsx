"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { BOTTOM_NAV } from "./navItems";

function isActive(href: string, pathname: string) {
  return href === "/app" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

/** Mobil fix alsó navigáció (< 1200px). Középen a kiemelt "Új kérés". */
export function BottomNav() {
  const pathname = usePathname();
  const left = BOTTOM_NAV.slice(0, 1);
  const right = BOTTOM_NAV.slice(1);

  return (
    <nav
      aria-label="Alsó navigáció"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-line bg-white/92 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md xl:hidden"
    >
      {left.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} aria-current={isActive(href, pathname) ? "page" : undefined} className="flex flex-1 flex-col items-center gap-1 py-2">
          <Icon className={`h-6 w-6 ${isActive(href, pathname) ? "text-blue" : "text-muted"}`} strokeWidth={2} />
          <span className={`text-[11px] font-semibold ${isActive(href, pathname) ? "text-blue" : "text-muted"}`}>{label}</span>
        </Link>
      ))}

      <div className="flex flex-1 justify-center">
        <Link href="/app/uj-keres" aria-label="Új kérés" className="-mt-5 flex flex-col items-center gap-1">
          <span className="cta flex h-14 w-14 items-center justify-center rounded-full">
            <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
          </span>
          <span className="text-[11px] font-semibold text-blue">Új kérés</span>
        </Link>
      </div>

      {right.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} aria-current={isActive(href, pathname) ? "page" : undefined} className="flex flex-1 flex-col items-center gap-1 py-2">
          <Icon className={`h-6 w-6 ${isActive(href, pathname) ? "text-blue" : "text-muted"}`} strokeWidth={2} />
          <span className={`text-[11px] font-semibold ${isActive(href, pathname) ? "text-blue" : "text-muted"}`}>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
