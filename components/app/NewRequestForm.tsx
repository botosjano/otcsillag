"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquare, Mail, User, Phone, Clock, Send, CheckCircle2, TriangleAlert, Home } from "lucide-react";
import { MESSAGE_TEMPLATE, USAGE } from "@/lib/mockData";
import { smsSegments } from "@/lib/sms";

type Channel = "SMS" | "E-mail";

const inputCls =
  "w-full rounded-[var(--radius-btn)] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-blue";

export function NewRequestForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<Channel>("SMS");
  const [scheduled, setScheduled] = useState(false);
  const [sent, setSent] = useState(false);

  const message = useMemo(
    () => MESSAGE_TEMPLATE.replaceAll("{{név}}", name.trim() || "Ügyfél").replaceAll("{{link}}", "otcs.hu/r/9fK2"),
    [name],
  );
  const sms = useMemo(() => smsSegments(message), [message]);

  const canSubmit = name.trim() && (channel === "SMS" ? phone.trim() : email.trim());
  const overLimit = USAGE.used + sms.segments > USAGE.limit;

  if (sent) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="glass flex flex-col items-center px-6 py-14 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-soft text-blue">
            <CheckCircle2 className="h-9 w-9" strokeWidth={2.5} />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold text-ink">{scheduled ? "Kérés ütemezve" : "Kérés elküldve"}</h2>
          <p className="mt-2 max-w-sm text-[15px] text-ink-2">
            {name.trim()} részére {channel === "SMS" ? "SMS-ben" : "e-mailben"} {scheduled ? "a következő munkaidőben, csendes időszakot figyelve megy ki." : "kiment az értékeléskérés."}
          </p>
          <div className="mt-7 flex gap-3">
            <Link href="/app/keresek" className="rounded-[var(--radius-btn)] border border-line bg-white px-5 py-3 text-sm font-bold text-ink hover:border-blue/40">Kérések</Link>
            <Link href="/app" className="cta flex items-center gap-2 px-5 py-3 text-sm"><Home className="h-4 w-4" /> Áttekintő</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[1.7rem] font-extrabold tracking-tight text-ink sm:text-[2rem]">Új értékeléskérés</h1>
        <p className="mt-1 text-[15px] text-ink-2">Töltsd ki az ügyfél adatait. A küldés előtt minden részletet megmutatunk.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_.85fr]">
        {/* Űrlap */}
        <form onSubmit={(e) => { e.preventDefault(); if (canSubmit) setSent(true); }} className="glass flex flex-col gap-4 p-5 sm:p-6">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-[13px] font-bold text-ink">Ügyfél neve</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <input id="name" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kiss Anna" className={`${inputCls} pl-11`} />
            </div>
          </div>

          {/* Csatorna */}
          <div>
            <span className="mb-1.5 block text-[13px] font-bold text-ink">Kézbesítési csatorna</span>
            <div className="grid grid-cols-2 gap-2">
              {(["SMS", "E-mail"] as Channel[]).map((c) => (
                <button key={c} type="button" onClick={() => setChannel(c)}
                  className={`flex items-center justify-center gap-2 rounded-[var(--radius-btn)] border py-3 text-sm font-bold transition-colors ${channel === c ? "border-blue bg-cyan-soft text-blue" : "border-line bg-white text-ink-2 hover:border-blue/40"}`}>
                  {c === "SMS" ? <MessageSquare className="h-4 w-4" /> : <Mail className="h-4 w-4" />} {c}
                </button>
              ))}
            </div>
          </div>

          {channel === "SMS" ? (
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-[13px] font-bold text-ink">Telefonszám</label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+36 30 555 0123" className={`${inputCls} pl-11`} />
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-bold text-ink">E-mail cím</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                <input id="email" name="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="anna@example.hu" className={`${inputCls} pl-11`} />
              </div>
            </div>
          )}

          {/* Időzítés */}
          <div>
            <span className="mb-1.5 block text-[13px] font-bold text-ink">Küldés időpontja</span>
            <div className="grid grid-cols-2 gap-2">
              {[{ v: false, l: "Most" }, { v: true, l: "Munkaidőben" }].map(({ v, l }) => (
                <button key={l} type="button" onClick={() => setScheduled(v)}
                  className={`flex items-center justify-center gap-2 rounded-[var(--radius-btn)] border py-3 text-sm font-bold transition-colors ${scheduled === v ? "border-blue bg-cyan-soft text-blue" : "border-line bg-white text-ink-2 hover:border-blue/40"}`}>
                  <Clock className="h-4 w-4" /> {l}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[12px] text-muted">A küldés a szervezet időzónája és csendes időszaka szerint történik.</p>
          </div>

          <button type="submit" disabled={!canSubmit} className="cta mt-1 flex items-center justify-center gap-2 py-4 text-[15px] disabled:cursor-not-allowed">
            <Send className="h-5 w-5" /> {scheduled ? "Ütemezés" : "Küldés"}
          </button>
        </form>

        {/* Előnézet + költség */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--radius-card)] bg-ink p-5 text-white">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-cyan">Üzenet előnézete</p>
            <p className="mt-3 text-[14px] leading-relaxed text-white/90">{message}</p>
          </div>

          {channel === "SMS" && (
            <div className={`glass p-4 ${overLimit ? "border-danger/30 bg-[#fdf0f1]" : ""}`}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-bold text-ink">SMS-szegmens</span>
                <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${sms.encoding === "UCS-2" ? "bg-gold-soft text-gold-deep" : "bg-cyan-soft text-blue"}`}>
                  {sms.segments} szegmens · {sms.encoding}
                </span>
              </div>
              <p className="mt-2 text-[12px] text-muted">
                {sms.chars} karakter. {sms.encoding === "UCS-2" && "Az ékezetek (ő, ű) miatt UCS-2 kódolás, rövidebb szegmensek."}
              </p>
              <div className="mt-2.5 flex items-center gap-2 border-t border-line pt-2.5 text-[12px]">
                {overLimit ? (
                  <span className="flex items-center gap-1.5 font-bold text-danger"><TriangleAlert className="h-4 w-4" /> A keret ({USAGE.limit} SMS) elérve.</span>
                ) : (
                  <span className="text-ink-2">Keret hatása: <span className="font-bold text-ink">{USAGE.used + sms.segments} / {USAGE.limit} SMS</span> a próbaidőszakban.</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
