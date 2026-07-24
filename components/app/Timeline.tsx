import { Check, Clock, TriangleAlert } from "lucide-react";
import { requestTimeline, type RequestStatus } from "@/lib/mockData";

/** Kérés eseménylánca -- időrend stabil, kattintás után nincs visszaírás. */
export function Timeline({ status }: { status: RequestStatus }) {
  const events = requestTimeline(status);
  return (
    <ol className="relative flex flex-col gap-5 pl-2">
      {events.map((e, i) => {
        const isFail = e.status === "failed";
        const isClick = e.status === "clicked" && e.done;
        return (
          <li key={i} className="relative flex items-start gap-3.5">
            {i < events.length - 1 && (
              <span className={`absolute left-[15px] top-8 h-[calc(100%-4px)] w-0.5 ${e.done ? "bg-cyan" : "bg-line"}`} />
            )}
            <span
              className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                isFail ? "bg-[#fbeaec] text-danger" : e.done ? "bg-cyan-soft text-blue" : "border border-line bg-white text-muted"
              }`}
            >
              {isFail ? <TriangleAlert className="h-4 w-4" /> : e.done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Clock className="h-4 w-4" />}
            </span>
            <div className="pt-0.5">
              <p className={`text-[14px] font-bold ${isFail ? "text-danger" : isClick ? "text-blue" : e.done ? "text-ink" : "text-muted"}`}>{e.label}</p>
              <p className="text-[12px] text-muted">{e.done ? e.when : "Függőben"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
