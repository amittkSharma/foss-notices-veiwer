import { describe, expect, it } from "vitest";
import { classifyLicense } from "./risk";

describe("classifyLicense", () => {
  it("classifies known permissive, weak-copyleft, and copyleft ids", () => {
    expect(classifyLicense("MIT")).toBe("permissive");
    expect(classifyLicense("MPL-2.0")).toBe("weak-copyleft");
    expect(classifyLicense("GPL-3.0-or-later")).toBe("copyleft");
  });

  it("returns unknown for an unrecognized id", () => {
    expect(classifyLicense("Some-Made-Up-License-1.0")).toBe("unknown");
  });

  it("returns unknown for a missing id", () => {
    expect(classifyLicense(undefined)).toBe("unknown");
    expect(classifyLicense(null)).toBe("unknown");
  });

  it("resolves an SPDX OR-expression to the worst referenced tier", () => {
    expect(classifyLicense("(MIT OR GPL-3.0)")).toBe("copyleft");
    expect(classifyLicense("(MIT OR Apache-2.0)")).toBe("permissive");
  });

  it("lets a custom map override or extend the defaults", () => {
    expect(classifyLicense("MIT", { MIT: "proprietary" })).toBe("proprietary");
    expect(classifyLicense("Acme-Internal-1.0", { "Acme-Internal-1.0": "proprietary" })).toBe(
      "proprietary",
    );
  });
});
