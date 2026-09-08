import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CliError } from "./errors";
import { loadRiskMapFile } from "./riskMap";

describe("loadRiskMapFile", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "fnv-riskmap-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function write(contents: string): string {
    const file = path.join(dir, "risk-map.json");
    writeFileSync(file, contents);
    return file;
  }

  it("loads a valid flat map", () => {
    const file = write(JSON.stringify({ "GPL-3.0-or-later": "proprietary" }));
    expect(loadRiskMapFile(file)).toEqual({ "GPL-3.0-or-later": "proprietary" });
  });

  it("rejects invalid JSON", () => {
    const file = write("{ not json");
    expect(() => loadRiskMapFile(file)).toThrow(CliError);
  });

  it("rejects a JSON array", () => {
    const file = write("[]");
    expect(() => loadRiskMapFile(file)).toThrow(CliError);
  });

  it("rejects an unknown risk tier value", () => {
    const file = write(JSON.stringify({ MIT: "super-risky" }));
    expect(() => loadRiskMapFile(file)).toThrow(/invalid risk tier/);
  });

  it("throws a CliError for a missing file", () => {
    expect(() => loadRiskMapFile(path.join(dir, "missing.json"))).toThrow("No such file");
  });
});
