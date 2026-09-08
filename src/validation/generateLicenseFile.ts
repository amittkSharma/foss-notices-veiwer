import { offsetToLineColumn } from "./lineUtils";
import { splitWithOffsets } from "./textBlocks";
import type { ValidationIssue, ValidationReport } from "./types";

const SEPARATOR_LINE = /^-{5,}\s*$/gm;
const DEPENDENCY_LINE = /^\s*-\s+(.+)$/gm;
const DEPENDENCY_HAS_VERSION = /^.+@[^@]+$/;
const LICENSE_HEADING = /contains? the following license:/i;
// generate-license-file prepends this banner before the first entry and appends it again
// after the last separator, so the final "block" a naive split produces is often just the
// banner repeated with no license content — that's expected output, not a malformed block.
const CREDIT_BANNER =
  /This file was generated with the generate-license-file npm package!\r?\nhttps:\/\/www\.npmjs\.com\/package\/generate-license-file/i;

const STANDARD =
  "This package's own structural rules for generate-license-file's output — the npm " +
  "package generate-license-file does not publish an official schema for this format.";

/**
 * Checks a generate-license-file text export against the structural shape
 * `parseGenerateLicenseFileText` relies on: dashed separators between blocks, a
 * "contains the following license:" heading per block, and at least one
 * "- name@version" dependency line above each heading. There's no official spec
 * for this format to validate against (see the README's Caveats section) — this
 * validator checks this package's own parsing assumptions instead, so a clean
 * report here means the file will parse the way you expect, not that it's
 * "spec-compliant".
 */
export function validateGenerateLicenseFileText(input: string): ValidationReport {
  const issues: ValidationIssue[] = [];
  const blocks = splitWithOffsets(input, SEPARATOR_LINE).filter(
    (block) => block.text.trim().length > 0,
  );

  if (blocks.length === 0) {
    issues.push({
      line: 1,
      column: 1,
      path: "(document)",
      message:
        "No license blocks found — the file doesn't contain any '-----' separator lines, so it doesn't look like generate-license-file output.",
      suggestion:
        "Confirm this is the unmodified output of `generate-license-file` and that it wasn't truncated when copied.",
      severity: "error",
    });
    return {
      valid: false,
      format: "generate-license-file",
      standard: STANDARD,
      issueCount: 1,
      issues,
    };
  }

  for (const block of blocks) {
    // Skip a block that's nothing but the repeated trailing credit banner — real
    // generate-license-file output ends with exactly this, and it isn't a license block.
    if (block.text.replace(CREDIT_BANNER, "").trim().length === 0) continue;

    const leadingWhitespace = block.text.length - block.text.trimStart().length;
    const blockLine = offsetToLineColumn(input, block.start + leadingWhitespace).line;
    const licenseHeadingMatch = LICENSE_HEADING.exec(block.text);

    if (!licenseHeadingMatch) {
      issues.push({
        line: blockLine,
        column: 1,
        path: "(block)",
        message: `The block starting around line ${blockLine} has no "...contains the following license:" heading.`,
        suggestion:
          'Every block needs a line like "left-pad contains the following license:" before its license text — check the block wasn\'t truncated.',
        severity: "error",
      });
      continue;
    }

    const dependencySection = block.text.slice(0, licenseHeadingMatch.index);
    const dependencyMatches = [...dependencySection.matchAll(DEPENDENCY_LINE)];

    if (dependencyMatches.length === 0) {
      issues.push({
        line: blockLine,
        column: 1,
        path: "(block)",
        message: `The block starting around line ${blockLine} has a license heading but no "- name@version" dependency lines above it.`,
        suggestion:
          'Add at least one dependency line in the form "- package-name@1.2.3" before the license heading.',
        severity: "error",
      });
      continue;
    }

    for (const dependencyMatch of dependencyMatches) {
      const entry = (dependencyMatch[1] ?? "").trim();
      if (!DEPENDENCY_HAS_VERSION.test(entry)) {
        const line = offsetToLineColumn(input, block.start + (dependencyMatch.index ?? 0)).line;
        issues.push({
          line,
          column: 1,
          path: "(dependency line)",
          message: `Dependency entry "${entry}" doesn't look like "name@version" — it will be parsed with an undefined version.`,
          suggestion: `Change it to "${entry}@<version>" if a version number is available.`,
          severity: "warning",
        });
      }
    }
  }

  const valid = issues.every((issue) => issue.severity !== "error");
  return {
    valid,
    format: "generate-license-file",
    standard: STANDARD,
    issueCount: issues.length,
    issues,
  };
}
