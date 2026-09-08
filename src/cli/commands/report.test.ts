import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProgram } from "../program";
import { CliError } from "../support/errors";

function run(argv: string[]) {
  return createProgram("0.0.0-test").parseAsync(["node", "foss-notices-viewer", ...argv]);
}

describe("report", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "fnv-report-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes a JSON report inferred from the .json extension", async () => {
    const out = path.join(dir, "notices.json");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await run(["report", "fixtures/spdx-sample.json", "-f", "spdx", "-o", out]);

    const rows = JSON.parse(readFileSync(out, "utf-8"));
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveProperty("license");
    expect(log).toHaveBeenCalledWith(expect.stringContaining("3 component(s)"));
    log.mockRestore();
  });

  it("writes an .xlsx workbook inferred from the extension", async () => {
    const out = path.join(dir, "notices.xlsx");
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    await run(["report", "fixtures/spdx-sample.json", "-f", "spdx", "-o", out]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(out);
    const sheet = workbook.getWorksheet("Notices");
    expect(sheet?.rowCount).toBe(4); // header + 3 components
  });

  it("--as overrides the inferred format even with a mismatched extension", async () => {
    const out = path.join(dir, "notices.dat");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await run(["report", "fixtures/spdx-sample.json", "-f", "spdx", "-o", out, "--as", "json"]);

    const rows = JSON.parse(readFileSync(out, "utf-8"));
    expect(rows).toHaveLength(3);
    log.mockRestore();
  });

  it("uses --sheet-name for the xlsx worksheet", async () => {
    const out = path.join(dir, "notices.xlsx");
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    await run([
      "report",
      "fixtures/spdx-sample.json",
      "-f",
      "spdx",
      "-o",
      out,
      "--sheet-name",
      "ThirdParty",
    ]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(out);
    expect(workbook.getWorksheet("ThirdParty")).toBeDefined();
  });

  it("throws a CliError when the format can't be inferred from the extension", async () => {
    const out = path.join(dir, "notices.dat");
    await expect(
      run(["report", "fixtures/spdx-sample.json", "-f", "spdx", "-o", out]),
    ).rejects.toBeInstanceOf(CliError);
  });
});
