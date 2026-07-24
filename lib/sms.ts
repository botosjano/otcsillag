/**
 * SMS-szegmens számítás (FR-TPL-002). A magyar ő/ű/í/á/ú nincs a GSM-7
 * alapkészletben -> UCS-2 kódolás (70/67 karakter/szegmens), ami a
 * spec szerint kulcsfontosságú költség-figyelmeztetés a küldés előtt.
 */
export type SmsInfo = { encoding: "GSM-7" | "UCS-2"; segments: number; chars: number };

export function smsSegments(text: string): SmsInfo {
  const chars = text.length;
  // Nem-ASCII (pl. ő, ű) -> UCS-2. Egyszerű, de a magyar esetre helyes közelítés.
  const isAscii = /^[\x00-\x7F]*$/.test(text);
  if (isAscii) {
    const per = chars <= 160 ? 160 : 153;
    return { encoding: "GSM-7", segments: Math.max(1, Math.ceil(chars / per)), chars };
  }
  const per = chars <= 70 ? 70 : 67;
  return { encoding: "UCS-2", segments: Math.max(1, Math.ceil(chars / per)), chars };
}
