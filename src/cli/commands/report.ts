import { extname } from "node:path";
import { type Command, Option } from "commander";
import { CliError } from "../support/errors";
import { writeOutputFile } from "../support/io";
import { addFormatOption, loadDocument } from "../support/load";
import { loadRiskMapFile } from "../support/riskMap";

type ReportFormat = "xlsx" | "json";

interface ReportOptions {
  format: string;
  sectionDelimiter?: string;
  out: string;
  as?: ReportFormat;
  riskMap?: string;
  sheetName?: string;
}

function reportFormatFor(outPath: string, override?: ReportFormat): ReportFormat {
  if (override) return override;
  const ext = extname(outPath).toLowerCase();
  if (ext === ".xlsx") return "xlsx";
  if (ext === ".json") return "json";
  throw new CliError(
    `Can't infer a report format from "${outPath}" — pass --as xlsx|json, or use a .xlsx/.json extension`,
  );
}

export function registerReportCommand(program: Command): void {
  const command = program
    .command("report <file>")
    .summary("export a notices file's components to an Excel or JSON report")
    .description(
      "The terminal equivalent of <ExportButton>: the same flat rows (name, version, " +
        "license, risk, author, purl), written straight to disk instead of triggering a " +
        "browser download.",
    );
  addFormatOption(command);
  command
    .requiredOption("-o, --out <path>", "output file path (e.g. notices.xlsx, notices.json)")
    .addOption(
      new Option(
        "--as <format>",
        "report format (default: inferred from --out's extension)",
      ).choices(["xlsx", "json"] satisfies ReportFormat[]),
    )
    .option("--risk-map <path>", 'JSON file of {"License-Id": "risk-tier"} overrides')
    .option("--sheet-name <name>", 'worksheet name for xlsx reports (default: "Notices")')
    .action(async (file: string, options: ReportOptions) => {
      const { document } = loadDocument(file, options.format, {
        sectionDelimiter: options.sectionDelimiter,
      });
      const licenseRiskMap = options.riskMap ? loadRiskMapFile(options.riskMap) : undefined;
      const reportFormat = reportFormatFor(options.out, options.as);

      const { exportNoticesToExcel, exportNoticesToJson } = await import("../../export");
      const bytes =
        reportFormat === "xlsx"
          ? await exportNoticesToExcel(document, {
              licenseRiskMap,
              sheetName: options.sheetName,
            })
          : exportNoticesToJson(document, { licenseRiskMap });

      writeOutputFile(options.out, bytes);
      console.log(`Wrote ${document.components.length} component(s) to ${options.out}`);
    });
}
