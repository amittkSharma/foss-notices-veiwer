import { offsetToLineColumn } from "./lineUtils";
import { splitWithOffsets } from "./textBlocks";
import type { ValidationIssue, ValidationReport } from "./types";

const DEFAULT_DELIMITER = /^={10,}\s*$/m;
const NAME_VERSION_LINE = /^(.+?)\s+([\w][\w.+-]*)$/;
const LICENSE_LINE = /^License:\s*(.+)$/im;
const COPYRIGHT_LINE = /^(copyright\s.+)$/im;

const STANDARD =
  "This package's own structural rules for Black Duck's plain-text Notices Report — Black " +
  "Duck does not publish an official schema for this format, and the layout varies by report " +
  "template/version (see the README's Caveats section).";

export interface BlackDuckValidationOptions {
  /** Must match whatever `sectionDelimiter` you pass to `parseBlackDuckNotices`, if any. */
  sectionDelimiter?: RegExp;
}

/**
 * Checks a Black Duck Notices Report export against the structural shape
 * `parseBlackDuckNotices` relies on: sections divided by delimiter lines, each
 * component section having a "<name> <version>" header line and a "License:"
 * line. A clean report means the file will parse the way you expect, not that
 * it's "spec-compliant" — no such spec exists for this vendor format.
 */
export function validateBlackDuckNotices(
  input: string,
  options: BlackDuckValidationOptions = {},
): ValidationReport {
  const delimiter = options.sectionDelimiter ?? DEFAULT_DELIMITER;
  const issues: ValidationIssue[] = [];
  const parts = splitWithOffsets(input, delimiter).filter((part) => part.text.trim().length > 0);

  if (parts.length === 0) {
    issues.push({
      line: 1,
      column: 1,
      path: "(document)",
      message:
        "No section delimiter lines were found, so this doesn't look like a Black Duck Notices Report.",
      suggestion:
        "Confirm the export uses long '='-only divider lines between sections, or pass the matching `sectionDelimiter` to both the parser and this validator.",
      severity: "error",
    });
    return { valid: false, format: "black-duck", standard: STANDARD, issueCount: 1, issues };
  }

  let componentsFound = 0;
  for (let i = 0; i < parts.length; i += 1) {
    const header = parts[i];
    if (!header) continue;

    const licenseLineMatch = LICENSE_LINE.exec(header.text);
    if (!licenseLineMatch) continue; // preamble/summary section, not a component — not an error

    componentsFound += 1;
    // header.text starts right after the delimiter match, which is typically the
    // newline that ended the delimiter's own line — skip that leading whitespace so
    // the reported line/first-line point at the actual "<name> <version>" content,
    // not the blank line the delimiter left behind.
    const leadingWhitespace = header.text.length - header.text.trimStart().length;
    const headerLine = offsetToLineColumn(input, header.start + leadingWhitespace).line;
    const nameVersionLine = header.text.trim().split(/\r?\n/)[0]?.trim() ?? "";

    if (!NAME_VERSION_LINE.exec(nameVersionLine)) {
      issues.push({
        line: headerLine,
        column: 1,
        path: "(section header)",
        message: `The section starting around line ${headerLine} has a "License:" line, but its first line ("${nameVersionLine}") doesn't match the expected "<name> <version>" shape.`,
        suggestion:
          'Make the section\'s first line "<component name> <version>" (e.g. "left-pad 1.3.0") — otherwise the whole line is used as the name and the version is left undefined.',
        // Unlike a missing Copyright line (an optional field simply absent), this means the
        // parser has no reliable name or version at all — it falls back to using the whole
        // line as the name, producing a genuinely garbled component. That's not something to
        // wave through as a warning.
        severity: "error",
      });
    }

    const body = parts[i + 1]?.text ?? "";
    if (!COPYRIGHT_LINE.exec(body)) {
      issues.push({
        line: headerLine,
        column: 1,
        path: "(section body)",
        message: `No "Copyright ..." line found in the section starting around line ${headerLine}.`,
        suggestion:
          'Add a line starting with "Copyright" in the section body if the source material has one — otherwise it will be omitted from the parsed output.',
        severity: "warning",
      });
    }

    i += 1; // the next part was this section's body, already consumed
  }

  if (componentsFound === 0) {
    issues.push({
      line: 1,
      column: 1,
      path: "(document)",
      message:
        'Sections were found, but none had a "License:" line, so no components could be parsed.',
      suggestion:
        'Check that each component section includes a line starting with "License:" (case-insensitive).',
      severity: "error",
    });
  }

  const valid = issues.every((issue) => issue.severity !== "error");
  return {
    valid,
    format: "black-duck",
    standard: STANDARD,
    issueCount: issues.length,
    issues,
  };
}
