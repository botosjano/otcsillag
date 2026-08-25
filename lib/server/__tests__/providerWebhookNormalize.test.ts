import { describe, expect, it } from "vitest";
import { normalizeSeeMeDlrPayload } from "@/lib/server/providers/smsWebhook";
import { normalizeMyLinkEmailPayload } from "@/lib/server/providers/emailWebhook";

describe("normalizeSeeMeDlrPayload", () => {
  it("maps a DELIVRD dlr to the canonical 'delivered' status", () => {
    const result = normalizeSeeMeDlrPayload({
      event_id: "evt_1",
      message_id: "msg_1",
      status: "DELIVRD",
      occurred_at: "2026-08-20T10:00:00Z",
    });
    expect(result).toEqual({
      externalEventId: "evt_1",
      providerReference: "msg_1",
      status: "delivered",
      occurredAt: "2026-08-20T10:00:00Z",
    });
  });

  it("returns null for an unrecognized status", () => {
    expect(normalizeSeeMeDlrPayload({ event_id: "evt_1", message_id: "msg_1", status: "WEIRD" })).toBeNull();
  });

  it("returns null when required fields are missing", () => {
    expect(normalizeSeeMeDlrPayload({ status: "DELIVERED" })).toBeNull();
  });
});

describe("normalizeMyLinkEmailPayload", () => {
  it("maps a bounced event", () => {
    const result = normalizeMyLinkEmailPayload({
      event_id: "evt_2",
      message_id: "msg_2",
      event: "hard_bounce",
      occurred_at: "2026-08-20T11:00:00Z",
    });
    expect(result?.status).toBe("bounced");
  });

  it("returns null for an unmapped event type", () => {
    expect(normalizeMyLinkEmailPayload({ event_id: "e", message_id: "m", event: "opened" })).toBeNull();
  });
});
