import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { dispatchScheduledMessage } from "@/lib/server/dispatch";
import { buildDispatchDeps } from "@/lib/server/dispatchDeps";
import { decideReminderAction } from "@/lib/server/reminders";
import { hasClick } from "@/lib/server/shortlink";

export const runtime = "nodejs";

const BATCH_SIZE = 50;

/**
 * 10.1 háttérfolyamatok, cron-hívású belépési pont (pl. Vercel Cron ->
 * `POST /api/cron/dispatch`, l. README "Nyitott döntések" a tényleges
 * ütemező-infra bekötéséhez): message.dispatch (esedékes ütemezett kérések
 * elküldése) + request.evaluate_reminder (emlékeztető-döntés a 10.3 szabály
 * szerint).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const deps = buildDispatchDeps();
  const nowIso = new Date().toISOString();

  // message.dispatch: esedékes, még el nem küldött kérések.
  const { data: due, error: dueError } = await supabase
    .from("review_requests")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .limit(BATCH_SIZE);
  if (dueError) throw new Error(`cron dispatch due-lookup failed: ${dueError.message}`);

  let dispatched = 0;
  let skipped = 0;
  let failed = 0;
  let blocked = 0;
  for (const row of due ?? []) {
    // A csatorna a kérés létrehozásakor a hívó oldal dönti el (jelenleg nem
    // tárolt review_requests-szinten -- l. README "Nyitott döntés": a
    // csatornaválasztás request-szintű mezővé emelése külön kis migráció).
    // MVP-ként az "sms"-t feltételezzük alapértelmezettként, amíg ez nincs
    // eldöntve.
    //
    // EGY SOR HIBÁJA NEM SZAKÍTHATJA MEG A BATCH-T (Elemér PR#11-review-ja):
    // korábban egy dobás (pl. suppression-RPC hiba) kiejtette a batch teljes
    // hátralévő részét arra a futásra. A claim miatt a hibázott sor
    // `dispatching`-ben marad, tehát a következő tick sem küldi ki újra --
    // ezért a hibát naplózzuk és a KÖVETKEZŐ sorral folytatjuk.
    try {
      const result = await dispatchScheduledMessage(supabase, row.id, "sms", deps);
      if (result.status === "skipped") skipped += 1;
      else if (result.status === "blocked") blocked += 1;
      else dispatched += 1;
    } catch (err) {
      failed += 1;
      console.error("[cron/dispatch] sor feldolgozása elhasalt", {
        requestId: row.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // BERAGADT CLAIM-EK JELENTÉSE. Szándékosan NEM szabadítjuk fel automatikusan
  // (l. a 0003 migráció indoklása): egy lassú, de élő dispatch alól kihúzva a
  // sort pont a duplikált küldést hoznánk vissza. Csak láthatóvá tesszük.
  const stuckSince = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: stuck } = await supabase
    .from("review_requests")
    .select("id, dispatch_claimed_at")
    .eq("status", "dispatching")
    .lt("dispatch_claimed_at", stuckSince)
    .limit(20);
  if (stuck && stuck.length > 0) {
    console.error("[cron/dispatch] beragadt dispatch-claim (emberi döntés kell: kiment-e az üzenet?)", {
      count: stuck.length,
      requestIds: stuck.map((r) => r.id),
    });
  }

  // request.evaluate_reminder: aktív kérések, ahol a legutóbbi üzenet
  // kézbesítve lett, de nincs kattintás, és még nincs emlékeztető kiküldve.
  const { data: active, error: activeError } = await supabase
    .from("review_requests")
    .select("id, reminder_count, organizations(max_reminders), short_links(id)")
    .eq("status", "active")
    .limit(BATCH_SIZE);
  if (activeError) throw new Error(`cron dispatch active-lookup failed: ${activeError.message}`);

  let reminders = 0;
  let expired = 0;
  for (const row of active ?? []) {
    const org = row.organizations as unknown as { max_reminders: number } | null;
    const shortLink = row.short_links as unknown as { id: string } | null;
    const clicked = shortLink ? await hasClick(supabase, shortLink.id) : false;

    const action = decideReminderAction({
      requestCancelled: false,
      contactSuppressed: false,
      hasClick: clicked,
      reviewDetected: false, // Google review-szinkron későbbi fázis (spec 5.7).
      reminderCount: row.reminder_count,
      maxReminders: org?.max_reminders ?? 1,
      subscriptionCanSend: true, // billing/usage-limit kártya (3a9a231f) még nincs bekötve.
      usageWithinLimit: true,
    });

    if (action === "stop" && clicked) {
      await supabase.from("review_requests").update({ status: "completed", updated_at: nowIso }).eq("id", row.id);
    } else if (action === "expire") {
      await supabase.from("review_requests").update({ status: "expired", updated_at: nowIso }).eq("id", row.id);
      expired += 1;
    } else if (action === "enqueue_reminder") {
      await supabase
        .from("review_requests")
        .update({ reminder_count: row.reminder_count + 1, updated_at: nowIso })
        .eq("id", row.id);
      // A tényleges emlékeztető-küldés (FR-MSG-006 max. egy alapértelmezett
      // emlékeztető) a message.dispatch pipeline-t hívná meg attempt_type
      // "reminder"-rel -- ez a bekötés a szó szerinti üzenetküldés helyett
      // csak a reminder_count-ot lépteti, amíg a csendes időszak (FR-MSG-005)
      // és a szervezeti időzóna-logika nincs kártyázva.
      reminders += 1;
    }
    // "pause_and_notify_owner" -- admin-riasztás, l. README nyitott döntés.
  }

  // A `skipped`/`failed` is a válaszban van: enélkül egy néma kihagyás vagy
  // hibázó sor ugyanúgy "0 dispatched"-nek látszana, mint az üres batch.
  return NextResponse.json({ dispatched, skipped, blocked, failed, reminders, expired });
}
