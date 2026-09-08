import type { Command } from "commander";
import { writeOutputFile } from "../support/io";
import { addFormatOption, loadDocument } from "../support/load";

interface ParseOptions {
  format: string;
  sectionDelimiter?: string;
  out?: string;
}

export function registerParseCommand(program: Command): void {
  const command = program
    .command("parse <file>")
    .summary("parse a notices file into the normalized NoticesDocument model, as JSON")
    .description(
      "Runs the same adapter <NoticesViewer document> would receive already-parsed — useful " +
        "for piping into jq, feeding a custom script, or inspecting exactly what one of the " +
        "four adapters extracted from a file.",
    );
  addFormatOption(command);
  command
    .option("-o, --out <path>", "write to a file instead of stdout")
    .action((file: string, options: ParseOptions) => {
      const { document } = loadDocument(file, options.format, {
        sectionDelimiter: options.sectionDelimiter,
      });
      const json = `${JSON.stringify(document, null, 2)}\n`;

      if (options.out) {
        writeOutputFile(options.out, json);
        console.log(`Wrote ${document.components.length} component(s) to ${options.out}`);
      } else {
        process.stdout.write(json);
      }
    });
}
