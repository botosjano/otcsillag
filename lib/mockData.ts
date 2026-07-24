/**
 * Demó adatok az Ötcsillag app-hoz (UI-kártyák). A valós adat a backend-szakaszban
 * jön (SMS/email küldés, kézbesítési callback, usage ledger).
 */
export const BUSINESS = { name: "FékPont Autószerviz", owner: "Andrea Balogh", email: "andrea@fekpont.hu", initials: "F" };

export type Metric = { key: string; label: string; value: string; delta?: string; gold?: boolean };
export const METRICS: Metric[] = [
  { key: "sent", label: "Elküldött kérések", value: "84", delta: "+18%" },
  { key: "delivered", label: "Kézbesített üzenetek", value: "79", delta: "94%" },
  { key: "clicks", label: "Link kattintások", value: "31", delta: "39%" },
  { key: "reviews", label: "Új értékelés (becslés)", value: "12", gold: true },
];

// Egyszerű idősor a kérések/kattintások charthoz (14 nap).
export const SERIES_REQUESTS = [4, 6, 5, 8, 7, 9, 11, 10, 13, 12, 15, 14, 17, 19];
export const SERIES_CLICKS = [1, 2, 2, 3, 3, 4, 5, 4, 6, 6, 7, 7, 9, 11];

export type Activity = { id: string; name: string; action: string; when: string; status: RequestStatus };
export const ACTIVITY: Activity[] = [
  { id: "a1", name: "Kiss Anna", action: "Link megnyitva", when: "12 perce", status: "clicked" },
  { id: "a2", name: "Nagy Roland", action: "Üzenet kézbesítve", when: "40 perce", status: "delivered" },
  { id: "a3", name: "Molnár Eszter", action: "Kérés elküldve", when: "1 órája", status: "submitted" },
];

export type RequestStatus = "scheduled" | "submitted" | "delivered" | "clicked" | "failed" | "cancelled" | "suppressed";
export const STATUS_LABEL: Record<RequestStatus, string> = {
  scheduled: "Ütemezve",
  submitted: "Elküldve",
  delivered: "Kézbesítve",
  clicked: "Link megnyitva",
  failed: "Sikertelen",
  cancelled: "Visszavonva",
  suppressed: "Letiltva",
};

export type Request = { id: string; name: string; channel: "SMS" | "E-mail"; when: string; status: RequestStatus };
export const REQUESTS: Request[] = [
  { id: "r1", name: "Kiss Anna", channel: "SMS", when: "Ma, 09:12", status: "clicked" },
  { id: "r2", name: "Nagy Roland", channel: "SMS", when: "Ma, 08:40", status: "delivered" },
  { id: "r3", name: "Molnár Eszter", channel: "E-mail", when: "Tegnap, 16:10", status: "submitted" },
  { id: "r4", name: "Tóth Zoltán", channel: "SMS", when: "Tegnap, 11:03", status: "scheduled" },
  { id: "r5", name: "Horváth Kata", channel: "SMS", when: "2 napja", status: "failed" },
];

export const getRequest = (id: string) => REQUESTS.find((r) => r.id === id);

/** Kérés eseménylánca (FR-REQ-004). Időrend stabil; kattintás után az
 *  emlékeztető leáll (nem ír vissza korábbi állapotot). */
export type TimelineEvent = { status: RequestStatus; label: string; when: string; done: boolean };
export function requestTimeline(status: RequestStatus): TimelineEvent[] {
  const order: RequestStatus[] = ["scheduled", "submitted", "delivered", "clicked"];
  const idx = order.indexOf(status);
  const times = ["Ma, 09:00", "Ma, 09:12", "Ma, 09:13", "Ma, 09:41"];
  const labels: Record<string, string> = {
    scheduled: "Kérés ütemezve", submitted: "Kérés elküldve", delivered: "Üzenet kézbesítve", clicked: "Értékelési link megnyitva",
  };
  if (status === "failed") {
    return [
      { status: "scheduled", label: "Kérés ütemezve", when: "Ma, 09:00", done: true },
      { status: "submitted", label: "Kérés elküldve", when: "Ma, 09:12", done: true },
      { status: "failed", label: "Sikertelen kézbesítés", when: "Ma, 09:14", done: true },
    ];
  }
  return order.map((s, i) => ({ status: s, label: labels[s], when: times[i], done: idx >= 0 && i <= idx }));
}

export const USAGE = { plan: "Pro próba", used: 34, limit: 50, trialDaysLeft: 5 };

export type Template = { id: string; name: string; category: string; body: string };
export const TEMPLATES: Template[] = [
  { id: "t1", name: "Általános köszönet", category: "SMS", body: "Kedves {{név}}! Köszönjük, hogy minket választott. Ha elégedett volt, értékeljen minket a Google-on: {{link}}" },
  { id: "t2", name: "Szerviz után", category: "SMS", body: "Kedves {{név}}! Reméljük, elégedett az autójával. Egy percben értékelhet minket: {{link}}" },
  { id: "t3", name: "E-mail – hosszú", category: "E-mail", body: "Kedves {{név}}!\n\nKöszönjük a bizalmát. Visszajelzése sokat segít. Értékelés: {{link}}" },
];

export const MESSAGE_TEMPLATE =
  "Kedves {{név}}! Köszönjük, hogy minket választott a FékPont Autószerviznél. Ha elégedett volt, egy kattintással értékelhet minket a Google-on: {{link}}";
