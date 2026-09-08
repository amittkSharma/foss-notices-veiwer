import { Command } from "commander";
import { registerDiffCommand } from "./commands/diff";
import { registerListCommand } from "./commands/list";
import { registerParseCommand } from "./commands/parse";
import { registerReportCommand } from "./commands/report";
import { registerValidateCommand } from "./commands/validate";
import { setColorEnabled } from "./support/color";

/**
 * Builds the CLI's command tree. Kept separate from the executable entry (`bin.ts`) so tests
 * can build a program, call `.parseAsync(argv, { from: "user" })` against it directly, and
 * assert on output/exit codes — without going through a real child process.
 */
export function createProgram(version: string): Command {
  const program = new Command()
    .name("foss-notices-viewer")
    .description(
      "Parse, validate, list, export, and diff SPDX/CycloneDX/generate-license-file/Black " +
        "Duck notices files — the CLI counterpart to this package's React components, sharing " +
        "the exact same parsers, risk classification, and query logic.",
    )
    .version(version, "-v, --version", "print the installed version")
    .option("--no-color", "disable colored output (also respects the NO_COLOR env var)")
    .showHelpAfterError("(run with --help for usage)")
    .configureHelp({ showGlobalOptions: true })
    // Lets tests call `program.parseAsync(...)` and assert on a thrown `CommanderError`
    // instead of the process actually exiting mid test run.
    .exitOverride();

  program.hook("preAction", (thisCommand) => {
    // Only ever narrows color off — leaves color.ts's own TTY/NO_COLOR auto-detection alone
    // when `--no-color` wasn't passed, instead of overriding it with a naive "true" default.
    if (thisCommand.opts().color === false) {
      setColorEnabled(false);
    }
  });

  registerValidateCommand(program);
  registerParseCommand(program);
  registerListCommand(program);
  registerReportCommand(program);
  registerDiffCommand(program);

  return program;
}
