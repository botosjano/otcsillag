import { describe, expect, it } from "vitest";
import { normalizeEmail, normalizePhone } from "@/lib/server/normalize";

describe("normalizePhone (FR-CON-002)", () => {
  it("passes through an already-E.164 number", () => {
    expect(normalizePhone("+36301234567")).toBe("+36301234567");
  });

  it("converts a 06-prefixed Hungarian number to E.164", () => {
    expect(normalizePhone("06301234567")).toBe("+36301234567");
  });

  it("converts a bare 36-prefixed number to E.164", () => {
    expect(normalizePhone("36301234567")).toBe("+36301234567");
  });

  it("strips spaces/dashes/parens before validating", () => {
    expect(normalizePhone("+36 (30) 123-4567")).toBe("+36301234567");
  });

  it("rejects an unrecognizable shape", () => {
    expect(normalizePhone("not-a-phone")).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Foo@Bar.COM  ")).toBe("foo@bar.com");
  });

  it("rejects an invalid shape", () => {
    expect(normalizeEmail("not-an-email")).toBeNull();
  });
});
