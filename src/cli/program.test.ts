import { CommanderError } from "commander";
import { describe, expect, it, vi } from "vitest";
import { createProgram } from "./program";
import { isColorEnabled, setColorEnabled } from "./support/color";

function run(argv: string[]) {
  return createProgram("1.2.3").parseAsync(["node", "foss-notices-viewer", ...argv]);
}

describe("createProgram", () => {
  it("prints the given version and exits 0 for --version", async () => {
    // commander's version handler writes via the raw output stream (process.stdout.write),
    // not console.log — it fires from an "option:version" listener during argument parsing,
    // before this program's own action code (and its preAction hook) ever runs.
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const error = await run(["--version"]).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CommanderError);
    expect((error as CommanderError).exitCode).toBe(0);
    expect(write).toHaveBeenCalledWith("1.2.3\n");
    write.mockRestore();
  });

  it("lists every command in --help", async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const error = await run(["--help"]).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CommanderError);
    expect((error as CommanderError).code).toBe("commander.helpDisplayed");
  });

  it("rejects with a CommanderError (not a process exit) for an unknown command", async () => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const error = await run(["bogus-command"]).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CommanderError);
    expect((error as CommanderError).exitCode).toBe(1);
  });

  it("only disables color when --no-color is passed, leaving auto-detection alone otherwise", async () => {
    // --version short-circuits before the preAction hook runs at all, so exercise the hook via
    // a real command instead.
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    setColorEnabled(true);
    await run(["list", "fixtures/spdx-sample.json", "-f", "spdx"]);
    expect(isColorEnabled()).toBe(true);

    await run(["--no-color", "list", "fixtures/spdx-sample.json", "-f", "spdx"]);
    expect(isColorEnabled()).toBe(false);
  });
});
