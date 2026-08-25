import { smsSegments, type SmsInfo } from "@/lib/sms";

/**
 * FR-MSG-008: a feladónév-korlát miatt a vállalkozás neve a message body
 * ELEJÉN jelenik meg (SMS-nél a feladó jellemzően egy megosztott short code,
 * a vállalkozás azonosítása csak a szövegben lehetséges).
 */
export function renderSmsBody(businessName: string, template: string, vars: Record<string, string>): string {
  const body = applyVars(template, vars);
  return body.startsWith(businessName) ? body : `${businessName}: ${body}`;
}

export function applyVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => vars[key] ?? match);
}

export function computeSmsCost(businessName: string, template: string, vars: Record<string, string>): SmsInfo {
  return smsSegments(renderSmsBody(businessName, template, vars));
}
