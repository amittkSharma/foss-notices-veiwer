import { createRequire } from "node:module";
import { CommanderError } from "commander";
import { createProgram } from "./program";
import { color } from "./support/color";
import { CliError } from "./support/errors";

// Tried in order: "../package.json" is correct for the published/built entry (dist/cli.js);
// "../../package.json" covers running this file directly from source (src/cli/bin.ts) in dev.
function readVersion(): string {
  const require = createRequire(import.meta.url);
  for (const candidate of ["../package.json", "../../package.json"]) {
    try {
      return (require(candidate) as { version: string }).version;
    } catch {
      // try the next candidate
    }
  }
  return "0.0.0";
}

async function main(): Promise<void> {
  const program = createProgram(readVersion());
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof CommanderError) {
      process.exitCode = error.exitCode;
      return;
    }
    if (error instanceof CliError) {
      console.error(color.red(`error: ${error.message}`));
      process.exitCode = error.exitCode;
      return;
    }
    throw error;
  }
}

main();
