import { describe, expect, it, vi } from "vitest";
import { createProgram } from "../program";
import { CliError } from "../support/errors";

async function run(argv: string[]) {
  process.exitCode = undefined;
  await createProgram("0.0.0-test").parseAsync(["node", "foss-notices-viewer", ...argv]);
  const exitCode = process.exitCode;
  process.exitCode = undefined;
  return exitCode;
}

describe("validate", () => {
  it("prints a passing human report and exits 0 for a valid file", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const exitCode = await run(["validate", "fixtures/spdx-sample.json", "-f", "spdx"]);

    expect(exitCode).toBe(0);
    expect(log.mock.calls.flat().join("\n")).toContain("valid (0 warnings)");
    log.mockRestore();
  });

  it("exits 1 and prints issues for an invalid file", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const exitCode = await run(["validate", "fixtures/spdx-invalid-sample.json", "-f", "spdx"]);

    expect(exitCode).toBe(1);
    expect(log.mock.calls.flat().join("\n")).toContain("invalid");
    log.mockRestore();
  });

  it("prints the full ValidationReport as JSON with --json", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await run(["validate", "fixtures/spdx-invalid-sample.json", "-f", "spdx", "--json"]);

    const report = JSON.parse(log.mock.calls[0]?.[0] as string);
    expect(report.valid).toBe(false);
    expect(report.format).toBe("spdx");
    expect(report.issues.length).toBeGreaterThan(0);
    log.mockRestore();
  });

  it("respects --fail-on never", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const exitCode = await run([
      "validate",
      "fixtures/spdx-invalid-sample.json",
      "-f",
      "spdx",
      "--fail-on",
      "never",
    ]);

    expect(exitCode).toBe(0);
  });

  it("throws a CliError when the file doesn't match the selected format", async () => {
    await expect(
      run(["validate", "fixtures/spdx-sample.json", "-f", "generate-license-file"]),
    ).rejects.toBeInstanceOf(CliError);
  });

  it("throws a CliError for a missing file", async () => {
    await expect(run(["validate", "does-not-exist.json", "-f", "spdx"])).rejects.toThrow(
      "No such file",
    );
  });
});
