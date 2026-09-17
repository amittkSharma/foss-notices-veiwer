import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProgram } from "../program";

function run(argv: string[]) {
  return createProgram("0.0.0-test").parseAsync(["node", "foss-notices-viewer", ...argv]);
}

function output(log: ReturnType<typeof vi.spyOn>): string {
  return log.mock.calls.map((call: unknown[]) => call.join(" ")).join("\n");
}

describe("list", () => {
  it("prints a summary line and a table of every component by default", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await run(["list", "fixtures/spdx-sample.json", "-f", "spdx"]);

    const text = output(log);
    expect(text).toContain("3 component(s)");
    expect(text).toContain("left-pad");
    expect(text).toContain("express");
    expect(text).toContain("some-gpl-tool");
    log.mockRestore();
  });

  it("filters by --search", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await run(["list", "fixtures/spdx-sample.json", "-f", "spdx", "--search", "left-pad"]);

    const text = output(log);
    expect(text).toContain("left-pad");
    expect(text).not.toContain("express");
    log.mockRestore();
  });

  it("groups by risk with --group-by risk", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await run(["list", "fixtures/spdx-sample.json", "-f", "spdx", "--group-by", "risk"]);

    const text = output(log);
    expect(text).toContain("copyleft (1)");
    expect(text).toContain("permissive (2)");
    log.mockRestore();
  });

  it("filters by --risk", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await run(["list", "fixtures/spdx-sample.json", "-f", "spdx", "--risk", "copyleft"]);

    const text = output(log);
    expect(text).toContain("some-gpl-tool");
    expect(text).not.toContain("left-pad");
    log.mockRestore();
  });

  it("prints the QueryNoticesResult as JSON with --json", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await run(["list", "fixtures/spdx-sample.json", "-f", "spdx", "--json"]);

    const result = JSON.parse(log.mock.calls[0]?.[0] as string);
    expect(result.total).toBe(3);
    expect(result.groups[0].components).toHaveLength(3);
    log.mockRestore();
  });

  describe("with --risk-map", () => {
    let dir: string;

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it("reclassifies risk using the supplied overrides", async () => {
      dir = mkdtempSync(path.join(tmpdir(), "fnv-list-"));
      const riskMapPath = path.join(dir, "risk-map.json");
      writeFileSync(riskMapPath, JSON.stringify({ MIT: "copyleft" }));

      const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
      await run([
        "list",
        "fixtures/spdx-sample.json",
        "-f",
        "spdx",
        "--risk-map",
        riskMapPath,
        "--group-by",
        "risk",
      ]);

      const text = output(log);
      expect(text).toContain("copyleft (3)");
      log.mockRestore();
    });
  });

  it("paginates with --page/--page-size", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await run([
      "list",
      "fixtures/spdx-sample.json",
      "-f",
      "spdx",
      "--page",
      "1",
      "--page-size",
      "2",
      "--json",
    ]);

    const result = JSON.parse(log.mock.calls[0]?.[0] as string);
    expect(result.pageCount).toBe(2);
    expect(result.groups[0].components).toHaveLength(2);
    log.mockRestore();
  });
});
