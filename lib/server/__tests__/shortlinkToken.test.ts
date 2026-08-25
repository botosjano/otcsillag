import { describe, expect, it } from "vitest";
import { generateShortLinkToken, hashShortLinkToken } from "@/lib/server/shortlinkToken";

describe("generateShortLinkToken", () => {
  it("produces url-safe, non-guessable tokens (FR-LINK-001)", () => {
    const token = generateShortLinkToken();
    expect(token).not.toMatch(/[+/=]/);
    expect(token.length).toBeGreaterThan(20);
  });

  it("never repeats across calls", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateShortLinkToken()));
    expect(tokens.size).toBe(50);
  });
});

describe("hashShortLinkToken", () => {
  it("is deterministic for the same token", async () => {
    const token = generateShortLinkToken();
    expect(await hashShortLinkToken(token)).toBe(await hashShortLinkToken(token));
  });

  it("differs for different tokens", async () => {
    const a = await hashShortLinkToken("token-a");
    const b = await hashShortLinkToken("token-b");
    expect(a).not.toBe(b);
  });
});
