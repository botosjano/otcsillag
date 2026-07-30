import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

/** App-váz: desktopon fix bal oldalsáv, mobilon felső logó-sáv + fix alsó navigáció. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col xl:flex-row">
      <Sidebar />

      {/* Mobil felső sáv */}
      <header className="flex items-center justify-between px-5 pt-5 pb-1 xl:hidden">
        <Link href="/app">
          <Image src="/brand/logo-lockup-transparent.png" alt="otcsillag.hu" width={130} height={48} className="h-8 w-auto" priority />
        </Link>
      </header>

      <main className="mx-auto w-full max-w-canvas flex-1 px-5 pb-28 pt-4 sm:px-8 xl:px-9 xl:pb-10 xl:pt-8">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
