import { describe, expect, it } from "vitest";
import { applyVars, renderSmsBody } from "@/lib/server/template";

describe("applyVars", () => {
  it("substitutes {{var}} placeholders", () => {
    expect(applyVars("Szia {{name}}! Link: {{link}}", { name: "Anna", link: "https://x" })).toBe(
      "Szia Anna! Link: https://x",
    );
  });

  it("leaves unknown placeholders untouched", () => {
    expect(applyVars("{{unknown}}", {})).toBe("{{unknown}}");
  });
});

describe("renderSmsBody (FR-MSG-008)", () => {
  it("prefixes the business name when not already present", () => {
    expect(renderSmsBody("FékPont", "Köszönjük! {{link}}", { link: "https://x" })).toBe(
      "FékPont: Köszönjük! https://x",
    );
  });

  it("does not double-prefix when the template already starts with the business name", () => {
    expect(renderSmsBody("FékPont", "FékPont: köszönjük! {{link}}", { link: "https://x" })).toBe(
      "FékPont: köszönjük! https://x",
    );
  });
});
