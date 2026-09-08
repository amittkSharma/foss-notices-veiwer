import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProgram } from "../program";

function run(argv: string[]) {
  return createProgram("0.0.0-test").parseAsync(["node", "foss-notices-viewer", ...argv]);
}

describe("parse", () => {
  it("prints the parsed NoticesDocument as JSON to stdout", async () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await run(["parse", "fixtures/spdx-sample.json", "-f", "spdx"]);

    const document = JSON.parse(write.mock.calls[0]?.[0] as string);
    expect(document.source).toBe("spdx");
    expect(document.components).toHaveLength(3);
    write.mockRestore();
  });

  describe("with --out", () => {
    let dir: string;

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it("writes the parsed document to a file instead of stdout", async () => {
      dir = mkdtempSync(path.join(tmpdir(), "fnv-parse-"));
      const out = path.join(dir, "parsed.json");
      const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

      await run(["parse", "fixtures/spdx-sample.json", "-f", "spdx", "-o", out]);

      const document = JSON.parse(readFileSync(out, "utf-8"));
      expect(document.components).toHaveLength(3);
      expect(log).toHaveBeenCalledWith(expect.stringContaining("3 component(s)"));
      log.mockRestore();
    });
  });

  it("passes --section-delimiter through to the Black Duck adapter", async () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await run([
      "parse",
      "fixtures/blackduck-notices-sample.txt",
      "-f",
      "black-duck",
      "--section-delimiter",
      "^={5,}\\s*$",
    ]);

    const document = JSON.parse(write.mock.calls[0]?.[0] as string);
    expect(document.source).toBe("black-duck");
    expect(document.components.length).toBeGreaterThan(0);
    write.mockRestore();
  });
});
