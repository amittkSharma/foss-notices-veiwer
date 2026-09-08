import { type Command, Option } from "commander";
import { diffNotices } from "../../core/diff";
import { FORMAT_IDS, type NoticesFileFormat } from "../../core/pipeline";
import { color } from "../support/color";
import { CliError } from "../support/errors";
import { loadDocument } from "../support/load";

interface DiffOptions {
  format?: NoticesFileFormat;
  beforeFormat?: NoticesFileFormat;
  afterFormat?: NoticesFileFormat;
  sectionDelimiter?: string;
  json?: boolean;
  failOnChange?: boolean;
}

function componentLine(name: string, version: string | undefined): string {
  return `${name}@${version ?? "?"}`;
}

export function registerDiffCommand(program: Command): void {
  program
    .command("diff <before> <after>")
    .summary("compare two notices files — added, removed, and changed components")
    .description(
      "The terminal equivalent of <DiffView>: same core/diff.ts comparison by component name, " +
        "useful for release-over-release compliance review (did a version bump also change a " +
        "declared license?) or as a CI gate with --fail-on-change.",
    )
    .addOption(
      new Option("-f, --format <format>", "format for both files")
        .choices(FORMAT_IDS)
        .conflicts(["beforeFormat", "afterFormat"]),
    )
    .addOption(
      new Option("--before-format <format>", "format for <before>, if it differs").choices(
        FORMAT_IDS,
      ),
    )
    .addOption(
      new Option("--after-format <format>", "format for <after>, if it differs").choices(
        FORMAT_IDS,
      ),
    )
    .option(
      "--section-delimiter <pattern>",
      "override the Black Duck section-divider regex (black-duck only)",
    )
    .option("--json", "print the full NoticesDiff as JSON instead of a human summary")
    .option("--fail-on-change", "exit 1 if anything was added, removed, or changed")
    .action((before: string, after: string, options: DiffOptions) => {
      const beforeFormat = options.format ?? options.beforeFormat;
      const afterFormat = options.format ?? options.afterFormat;
      if (!beforeFormat || !afterFormat) {
        throw new CliError("specify --format, or both --before-format and --after-format");
      }

      const beforeDoc = loadDocument(before, beforeFormat, {
        sectionDelimiter: options.sectionDelimiter,
      }).document;
      const afterDoc = loadDocument(after, afterFormat, {
        sectionDelimiter: options.sectionDelimiter,
      }).document;

      const diff = diffNotices(beforeDoc, afterDoc);

      if (options.json) {
        console.log(JSON.stringify(diff, null, 2));
      } else {
        console.log(color.bold(`Added (${diff.added.length})`));
        for (const c of diff.added) {
          console.log(color.green(`  + ${componentLine(c.name, c.version)}`));
        }

        console.log(color.bold(`Removed (${diff.removed.length})`));
        for (const c of diff.removed) {
          console.log(color.red(`  - ${componentLine(c.name, c.version)}`));
        }

        console.log(color.bold(`Changed (${diff.changed.length})`));
        for (const change of diff.changed) {
          const licenseNote = change.licensesChanged ? color.yellow(" (license changed)") : "";
          console.log(
            `  ~ ${change.name}: ${change.before.version ?? "?"} → ${change.after.version ?? "?"}${licenseNote}`,
          );
        }

        console.log(color.dim(`Unchanged: ${diff.unchanged.length}`));
      }

      const changed = diff.added.length + diff.removed.length + diff.changed.length > 0;
      if (options.failOnChange && changed) {
        process.exitCode = 1;
      }
    });
}
