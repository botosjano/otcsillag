import { describe, expect, it } from "vitest";
import { computeDisplayStatus, nextCanonicalMessageState } from "@/lib/server/canonicalStatus";

describe("nextCanonicalMessageState", () => {
  it("advances forward when the incoming event has a higher rank", () => {
    const current = { status: "submitted" as const, occurredAt: "2026-08-20T10:00:00Z" };
    const incoming = { status: "delivered" as const, occurredAt: "2026-08-20T10:01:00Z" };
    expect(nextCanonicalMessageState(current, incoming)).toEqual(incoming);
  });

  it("rejects a regression: a late-arriving 'submitted' callback after 'delivered' is already canonical", () => {
    const current = { status: "delivered" as const, occurredAt: "2026-08-20T10:01:00Z" };
    // occurred_at is EARLIER (the real send event), but it reached the server AFTER delivered.
    const incoming = { status: "submitted" as const, occurredAt: "2026-08-20T09:59:00Z" };
    expect(nextCanonicalMessageState(current, incoming)).toEqual(current);
  });

  it("with no prior state, accepts whatever arrives first", () => {
    const incoming = { status: "queued" as const, occurredAt: "2026-08-20T10:00:00Z" };
    expect(nextCanonicalMessageState(null, incoming)).toEqual(incoming);
  });

  it("same rank: keeps the later occurred_at", () => {
    const current = { status: "failed" as const, occurredAt: "2026-08-20T10:00:00Z" };
    const olderDuplicate = { status: "bounced" as const, occurredAt: "2026-08-20T09:00:00Z" };
    expect(nextCanonicalMessageState(current, olderDuplicate)).toEqual(current);

    const newerSameRank = { status: "bounced" as const, occurredAt: "2026-08-20T11:00:00Z" };
    expect(nextCanonicalMessageState(current, newerSameRank)).toEqual(newerSameRank);
  });
});

describe("computeDisplayStatus", () => {
  it("cancelled always wins", () => {
    expect(
      computeDisplayStatus({ requestStatus: "cancelled", messageStatus: "delivered", hasClick: true }),
    ).toBe("cancelled");
  });

  it("a click recorded after the fact is never reverted by a later-processed 'submitted' event", () => {
    // This is the Timeline component invariant (components/app/Timeline.tsx):
    // "időrend stabil, kattintás után nincs visszaírás".
    expect(
      computeDisplayStatus({ requestStatus: "active", messageStatus: "submitted", hasClick: true }),
    ).toBe("clicked");
  });

  it("suppressed at send-time short-circuits before any click can exist", () => {
    expect(
      computeDisplayStatus({ requestStatus: "active", messageStatus: "suppressed", hasClick: false }),
    ).toBe("suppressed");
  });

  it("maps delivered/failed/submitted/scheduled as expected", () => {
    expect(computeDisplayStatus({ requestStatus: "active", messageStatus: "delivered", hasClick: false })).toBe(
      "delivered",
    );
    expect(computeDisplayStatus({ requestStatus: "active", messageStatus: "bounced", hasClick: false })).toBe(
      "failed",
    );
    expect(computeDisplayStatus({ requestStatus: "active", messageStatus: "queued", hasClick: false })).toBe(
      "submitted",
    );
    expect(computeDisplayStatus({ requestStatus: "scheduled", messageStatus: null, hasClick: false })).toBe(
      "scheduled",
    );
  });
});
