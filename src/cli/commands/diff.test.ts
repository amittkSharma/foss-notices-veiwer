import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProgram } from "../program";
import { CliError } from "../support/errors";

function run(argv: string[]) {
  return createProgram("0.0.0-test").parseAsync(["node", "foss-notices-viewer", ...argv]);
}

function output(log: ReturnType<typeof vi.spyOn>): string {
  return log.mock.calls.map((call) => call.join(" ")).join("\n");
}

describe("diff", () => {
  it("reports everything unchanged when comparing a file to itself", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await run(["diff", "fixtures/spdx-sample.json", "fixtures/spdx-sample.json", "-f", "spdx"]);

    const text = output(log);
    expect(text).toContain("Added (0)");
    expect(text).toContain("Removed (0)");
    expect(text).toContain("Changed (0)");
    expect(text).toContain("Unchanged: 3");
    log.mockRestore();
  });

  it("prints the full NoticesDiff as JSON with --json", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await run([
      "diff",
      "fixtures/spdx-sample.json",
      "fixtures/spdx-sample.json",
      "-f",
      "spdx",
      "--json",
    ]);

    const diff = JSON.parse(log.mock.calls[0]?.[0] as string);
    expect(diff.unchanged).toHaveLength(3);
    log.mockRestore();
  });

  it("requires --format, or both --before-format and --after-format", async () => {
    await expect(
      run(["diff", "fixtures/spdx-sample.json", "fixtures/spdx-sample.json"]),
    ).rejects.toBeInstanceOf(CliError);
  });

  describe("with a modified after-file", () => {
    let dir: string;

    beforeEach(() => {
      dir = mkdtempSync(path.join(tmpdir(), "fnv-diff-"));
    });

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects an added component and sets exit 1 with --fail-on-change", async () => {
      const before = JSON.parse(readFileSync("fixtures/spdx-sample.json", "utf-8"));
      before.packages = before.packages.filter((p: { name: string }) => p.name !== "some-gpl-tool");
      const beforePath = path.join(dir, "before.json");
      writeFileSync(beforePath, JSON.stringify(before));

      process.exitCode = undefined;
      const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
      await run([
        "diff",
        beforePath,
        "fixtures/spdx-sample.json",
        "-f",
        "spdx",
        "--fail-on-change",
      ]);

      const text = output(log);
      expect(text).toContain("Added (1)");
      expect(process.exitCode).toBe(1);
      process.exitCode = undefined;
      log.mockRestore();
    });
  });
});
