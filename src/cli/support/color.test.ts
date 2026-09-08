import { afterEach, describe, expect, it } from "vitest";
import { color, colorForRisk, isColorEnabled, setColorEnabled } from "./color";

describe("color", () => {
  afterEach(() => {
    setColorEnabled(false);
  });

  it("wraps text in ANSI codes when enabled", () => {
    setColorEnabled(true);
    expect(color.red("x")).toBe("\x1b[31mx\x1b[0m");
    expect(color.bold("x")).toBe("\x1b[1mx\x1b[0m");
  });

  it("returns plain text when disabled", () => {
    setColorEnabled(false);
    expect(color.red("x")).toBe("x");
  });

  it("tracks enabled state via isColorEnabled", () => {
    setColorEnabled(true);
    expect(isColorEnabled()).toBe(true);
    setColorEnabled(false);
    expect(isColorEnabled()).toBe(false);
  });
});

describe("colorForRisk", () => {
  it("maps every risk tier to a distinct painter, and falls back to gray for unknown tiers", () => {
    setColorEnabled(true);
    expect(colorForRisk("permissive")("x")).toBe(color.green("x"));
    expect(colorForRisk("weak-copyleft")("x")).toBe(color.yellow("x"));
    expect(colorForRisk("copyleft")("x")).toBe(color.red("x"));
    expect(colorForRisk("proprietary")("x")).toBe(color.magenta("x"));
    expect(colorForRisk("unknown")("x")).toBe(color.gray("x"));
    expect(colorForRisk("something-else")("x")).toBe(color.gray("x"));
  });
});
