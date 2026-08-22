import { describe, expect, it } from "vitest";
import { verifyHmacSignatureHex } from "@/lib/server/signature";

describe("verifyHmacSignatureHex", () => {
  const secret = "test-webhook-secret";
  const body = JSON.stringify({ event_id: "evt_1", status: "DELIVERED" });

  async function sign(s: string, b: string): Promise<string> {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(s), { name: "HMAC", hash: "SHA-256" }, false, [
      "sign",
    ]);
    const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(b));
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  it("accepts a correctly signed body", async () => {
    const signature = await sign(secret, body);
    expect(await verifyHmacSignatureHex(secret, body, signature)).toBe(true);
  });

  it("rejects a tampered body", async () => {
    const signature = await sign(secret, body);
    expect(await verifyHmacSignatureHex(secret, body + "x", signature)).toBe(false);
  });

  it("rejects the wrong secret", async () => {
    const signature = await sign("wrong-secret", body);
    expect(await verifyHmacSignatureHex(secret, body, signature)).toBe(false);
  });

  it("rejects a missing signature", async () => {
    expect(await verifyHmacSignatureHex(secret, body, "")).toBe(false);
  });
});
