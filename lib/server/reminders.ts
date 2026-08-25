/**
 * Emlékeztető szabály, spec 10.3:
 *
 * if request.cancelled or contact.suppressed: stop
 * elif request.has_click or request.review_detected: stop
 * elif reminder_count >= organization.max_reminders: expire
 * elif subscription.can_send and usage.within_limit: enqueue_reminder()
 * else: pause_and_notify_owner()
 */
export type ReminderAction = "stop" | "expire" | "enqueue_reminder" | "pause_and_notify_owner";

export function decideReminderAction(input: {
  requestCancelled: boolean;
  contactSuppressed: boolean;
  hasClick: boolean;
  reviewDetected: boolean;
  reminderCount: number;
  maxReminders: number;
  subscriptionCanSend: boolean;
  usageWithinLimit: boolean;
}): ReminderAction {
  if (input.requestCancelled || input.contactSuppressed) return "stop";
  if (input.hasClick || input.reviewDetected) return "stop";
  if (input.reminderCount >= input.maxReminders) return "expire";
  if (input.subscriptionCanSend && input.usageWithinLimit) return "enqueue_reminder";
  return "pause_and_notify_owner";
}
