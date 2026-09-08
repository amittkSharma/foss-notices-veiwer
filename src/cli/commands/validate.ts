import { type Command, Option } from "commander";
import { type NoticesFileFormat, checkFormatMatch, validateByFormat } from "../../core/pipeline";
import type { ValidationIssue, ValidationReport } from "../../validation/types";
import { color } from "../support/color";
import { CliError } from "../support/errors";
import { readInputFile } from "../support/io";
import { addFormatOption, parseSectionDelimiter } from "../support/load";

interface ValidateOptions {
  format: NoticesFileFormat;
  sectionDelimiter?: string;
  json?: boolean;
  failOn: "error" | "warning" | "never";
}

function formatIssue(issue: ValidationIssue): string {
  const badge = issue.severity === "error" ? color.red("error") : color.yellow("warning");
  const where =
    issue.line !== null ? color.dim(`${issue.line}:${issue.column ?? 1}`) : color.dim(issue.path);
  return [
    `  ${badge}  ${where}  ${issue.message}`,
    `      ${color.dim("→")} ${issue.suggestion}`,
  ].join("\n");
}

function printHumanReport(report: ValidationReport): void {
  console.log(`${color.bold(report.format)} — checked against ${report.standard}`);
  console.log(
    report.valid
      ? color.green(`✓ valid (${report.issueCount} warning${report.issueCount === 1 ? "" : "s"})`)
      : color.red(`✗ invalid (${report.issueCount} issue${report.issueCount === 1 ? "" : "s"})`),
  );
  if (report.issues.length > 0) {
    console.log();
    for (const issue of report.issues) {
      console.log(formatIssue(issue));
    }
  }
}

function exitCodeFor(report: ValidationReport, failOn: ValidateOptions["failOn"]): number {
  if (failOn === "never") return 0;
  if (failOn === "warning") return report.issueCount > 0 ? 1 : 0;
  return report.valid ? 0 : 1;
}

export function registerValidateCommand(program: Command): void {
  const command = program
    .command("validate <file>")
    .summary("check a notices file against its format's schema/structural rules")
    .description(
      "Validates a notices file the same way <NoticesViewer adapter> does: SPDX/CycloneDX " +
        "against their official JSON Schemas, generate-license-file/Black Duck against this " +
        "package's own structural rules (no official schema exists for either).",
    );
  addFormatOption(command);
  command
    .addOption(
      new Option("--fail-on <level>", "what should make the process exit non-zero")
        .choices(["error", "warning", "never"])
        .default("error"),
    )
    .option("--json", "print the full ValidationReport as JSON instead of a human summary")
    .action(async (file: string, options: ValidateOptions) => {
      const raw = readInputFile(file);
      const shapeError = checkFormatMatch(options.format, raw);
      if (shapeError) throw new CliError(shapeError);

      const report = await validateByFormat(options.format, raw, {
        sectionDelimiter: parseSectionDelimiter(options.sectionDelimiter),
      });

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        printHumanReport(report);
      }

      process.exitCode = exitCodeFor(report, options.failOn);
    });
}
