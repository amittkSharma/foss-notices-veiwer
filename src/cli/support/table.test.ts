import { describe, expect, it } from "vitest";
import { setColorEnabled } from "./color";
import { renderTable } from "./table";

describe("renderTable", () => {
  it("aligns columns to the widest cell (header included)", () => {
    setColorEnabled(false);
    const text = renderTable(
      ["Name", "License"],
      [
        ["left-pad", "MIT"],
        ["some-gpl-tool", "GPL-3.0-or-later"],
      ],
    );
    const lines = text.split("\n");
    expect(lines[0]?.length).toBe(lines[2]?.length);
  });

  it("truncates a cell wider than the column cap with an ellipsis", () => {
    setColorEnabled(false);
    const longLicense = "A".repeat(80);
    const text = renderTable(["Name", "License"], [["pkg", longLicense]]);
    expect(text).toContain("…");
    expect(text).not.toContain(longLicense);
  });

  it("measures visible width, ignoring ANSI color codes embedded in a cell", () => {
    setColorEnabled(false);
    // The escape codes here are literal test input (simulating a pre-colored cell, e.g. from
    // `colorForRisk`), independent of color.ts's own `enabled` flag, which is off so
    // `color.bold`/`color.dim` (used for the header/separator) stay plain for this assertion.
    const text = renderTable(["Risk"], [["\x1b[32mPermissive\x1b[0m"]]);
    const lines = text.split("\n");
    // header "Risk" (4) vs colored "Permissive" (10 visible chars) — the wider one wins,
    // and the separator dash line must match that visible width, not the raw string length.
    expect(lines[1]).toBe("-".repeat(10));
  });
});
