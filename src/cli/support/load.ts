import { Option } from "commander";
import type { Command } from "commander";
import {
  FORMAT_IDS,
  type NoticesFileFormat,
  checkFormatMatch,
  parseByFormat,
} from "../../core/pipeline";
import type { NoticesDocument } from "../../core/types";
import { CliError } from "./errors";
import { readInputFile } from "./io";

/**
 * Wires the `-f, --format <format>` option every command that reads a notices file shares —
 * `.choices()` gives commander both an upfront "unknown format" error and a self-documenting
 * `--help` line, so this is the single place that list is defined.
 */
export function addFormatOption(command: Command): Command {
  return command
    .addOption(
      new Option("-f, --format <format>", "notices file format")
        .choices(FORMAT_IDS)
        .makeOptionMandatory(),
    )
    .option(
      "--section-delimiter <pattern>",
      'override the Black Duck section-divider regex, e.g. "^-{10,}$" (black-duck only)',
    );
}

function assertFormat(format: string): asserts format is NoticesFileFormat {
  if (!FORMAT_IDS.includes(format as NoticesFileFormat)) {
    throw new CliError(`Unknown format "${format}" — must be one of ${FORMAT_IDS.join(", ")}`);
  }
}

export function parseSectionDelimiter(pattern?: string): RegExp | undefined {
  if (!pattern) return undefined;
  try {
    return new RegExp(pattern, "m");
  } catch (error) {
    throw new CliError(`Invalid --section-delimiter pattern: ${(error as Error).message}`);
  }
}

export interface LoadedDocument {
  raw: string;
  document: NoticesDocument;
}

/**
 * Reads `filePath`, checks its shape against `format` (the same cheap check
 * `<NoticesViewer adapter>` runs before the expensive schema validation, so a wrong `--format`
 * fails fast with a specific message instead of a wall of parser errors), then parses it.
 */
export function loadDocument(
  filePath: string,
  format: string,
  options: { sectionDelimiter?: string } = {},
): LoadedDocument {
  assertFormat(format);
  const raw = readInputFile(filePath);
  const shapeError = checkFormatMatch(format, raw);
  if (shapeError) throw new CliError(shapeError);
  const document = parseByFormat(format, raw, {
    sectionDelimiter: parseSectionDelimiter(options.sectionDelimiter),
  });
  return { raw, document };
}
