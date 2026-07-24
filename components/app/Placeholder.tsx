import { Sparkles } from "lucide-react";
export function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <h1 className="mb-6 text-[1.7rem] font-extrabold tracking-tight text-ink sm:text-[2rem]">{title}</h1>
      <div className="glass flex items-center gap-3 p-5 text-ink-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-soft text-blue"><Sparkles className="h-5 w-5" /></span>
        <p className="text-[15px]">{note}</p>
      </div>
    </div>
  );
}
