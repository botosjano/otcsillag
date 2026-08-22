import { describe, expect, it } from "vitest";
import { decideReminderAction } from "@/lib/server/reminders";

const BASE = {
  requestCancelled: false,
  contactSuppressed: false,
  hasClick: false,
  reviewDetected: false,
  reminderCount: 0,
  maxReminders: 1,
  subscriptionCanSend: true,
  usageWithinLimit: true,
};

describe("decideReminderAction (spec 10.3)", () => {
  it("stops when the request is cancelled", () => {
    expect(decideReminderAction({ ...BASE, requestCancelled: true })).toBe("stop");
  });

  it("stops when the contact is suppressed", () => {
    expect(decideReminderAction({ ...BASE, contactSuppressed: true })).toBe("stop");
  });

  it("stops when there was already a click", () => {
    expect(decideReminderAction({ ...BASE, hasClick: true })).toBe("stop");
  });

  it("stops when a review was detected", () => {
    expect(decideReminderAction({ ...BASE, reviewDetected: true })).toBe("stop");
  });

  it("expires once the reminder budget is used up", () => {
    expect(decideReminderAction({ ...BASE, reminderCount: 1, maxReminders: 1 })).toBe("expire");
  });

  it("enqueues a reminder when allowed and within limit", () => {
    expect(decideReminderAction(BASE)).toBe("enqueue_reminder");
  });

  it("pauses and notifies the owner when over the usage limit", () => {
    expect(decideReminderAction({ ...BASE, usageWithinLimit: false })).toBe("pause_and_notify_owner");
  });

  it("pauses and notifies the owner when the subscription cannot send", () => {
    expect(decideReminderAction({ ...BASE, subscriptionCanSend: false })).toBe("pause_and_notify_owner");
  });
});
