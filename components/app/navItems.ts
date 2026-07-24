import { LayoutDashboard, Send, Inbox, FileText, Plug, Settings, MoreHorizontal, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const SIDEBAR_NAV: NavItem[] = [
  { href: "/app", label: "Áttekintő", icon: LayoutDashboard },
  { href: "/app/uj-keres", label: "Új értékeléskérés", icon: Send },
  { href: "/app/keresek", label: "Kérések", icon: Inbox },
  { href: "/app/sablonok", label: "Sablonok", icon: FileText },
  { href: "/app/integraciok", label: "Import és integrációk", icon: Plug },
  { href: "/app/beallitasok", label: "Beállítások", icon: Settings },
];

export const BOTTOM_NAV: NavItem[] = [
  { href: "/app", label: "Áttekintő", icon: LayoutDashboard },
  { href: "/app/keresek", label: "Kérések", icon: Inbox },
  { href: "/app/tobb", label: "Több", icon: MoreHorizontal },
];
