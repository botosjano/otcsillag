import { MousePointerClick, Check, Send, Clock, TriangleAlert, X, Ban, type LucideIcon } from "lucide-react";
import { STATUS_LABEL, type RequestStatus } from "@/lib/mockData";

const CFG: Record<RequestStatus, { icon: LucideIcon; cls: string }> = {
  clicked: { icon: MousePointerClick, cls: "bg-cyan-soft text-blue" },
  delivered: { icon: Check, cls: "bg-cyan-soft text-blue-deep" },
  submitted: { icon: Send, cls: "bg-page text-ink-2" },
  scheduled: { icon: Clock, cls: "bg-page text-muted" },
  failed: { icon: TriangleAlert, cls: "bg-[#fbeaec] text-danger" },
  cancelled: { icon: X, cls: "bg-page text-muted" },
  suppressed: { icon: Ban, cls: "bg-page text-muted" },
};

/** Státusz-jelvény: a szín SOSEM az egyetlen jelölő -- ikon + szöveg. */
export function StatusBadge({ status }: { status: RequestStatus }) {
  const { icon: Icon, cls } = CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold ${cls}`}>
      <Icon className="h-3.5 w-3.5" /> {STATUS_LABEL[status]}
    </span>
  );
}
