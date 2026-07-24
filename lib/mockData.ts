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

export const USAGE = { plan: "Pro próba", used: 34, limit: 50, trialDaysLeft: 5 };

export const MESSAGE_TEMPLATE =
  "Kedves {{név}}! Köszönjük, hogy minket választott a FékPont Autószerviznél. Ha elégedett volt, egy kattintással értékelhet minket a Google-on: {{link}}";
