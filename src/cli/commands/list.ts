import { type Command, Option } from "commander";
import { DEFAULT_PAGE_SIZE, type GroupBy, type SortBy, queryNotices } from "../../core/query";
import { RISK_LABELS, classifyComponentRisk } from "../../core/risk";
import type { Component, DependencyType, NoticesDocument, RiskTier } from "../../core/types";
import { color, colorForRisk } from "../support/color";
import { addFormatOption, loadDocument } from "../support/load";
import { loadRiskMapFile } from "../support/riskMap";
import { renderTable } from "../support/table";

interface ListOptions {
  format: string;
  sectionDelimiter?: string;
  search?: string;
  groupBy: GroupBy;
  risk: RiskTier | "all";
  sortBy: SortBy;
  riskMap?: string;
  page?: string;
  pageSize?: string;
  json?: boolean;
}

const DEPENDENCY_TYPE_LABELS: Record<DependencyType, string> = {
  direct: "Direct",
  transitive: "Transitive",
};

function componentRow(component: Component, riskMap?: Record<string, RiskTier>): string[] {
  const risk = classifyComponentRisk(component, riskMap);
  const paint = colorForRisk(risk);
  const licenses =
    component.licenses.length > 0
      ? component.licenses.map((l) => l.name || l.id).join("; ")
      : "No information";

  return [
    `${component.name} ${color.dim(`v${component.version ?? "?"}`)}`,
    component.dependencyType ? DEPENDENCY_TYPE_LABELS[component.dependencyType] : "Unknown",
    licenses,
    paint(RISK_LABELS[risk]),
  ];
}

function riskCounts(
  document: NoticesDocument,
  riskMap?: Record<string, RiskTier>,
): Record<RiskTier, number> {
  const counts: Record<RiskTier, number> = {
    permissive: 0,
    "weak-copyleft": 0,
    copyleft: 0,
    proprietary: 0,
    unknown: 0,
  };
  for (const component of document.components) {
    counts[classifyComponentRisk(component, riskMap)] += 1;
  }
  return counts;
}

function printSummary(document: NoticesDocument, riskMap?: Record<string, RiskTier>): void {
  const counts = riskCounts(document, riskMap);
  const parts = (Object.keys(RISK_LABELS) as RiskTier[])
    .filter((tier) => counts[tier] > 0)
    .map((tier) => colorForRisk(tier)(`${counts[tier]} ${RISK_LABELS[tier]}`));
  console.log(
    `${color.bold(String(document.components.length))} component(s)  ·  ${parts.join("  ·  ")}`,
  );
}

export function registerListCommand(program: Command): void {
  const command = program
    .command("list <file>")
    .summary("print a searchable, groupable table of a notices file's components")
    .description(
      "The terminal equivalent of <NoticesViewer>'s list: same search/group/sort/risk-filter " +
        "logic (core/query.ts's queryNotices), rendered as a plain-text table instead of HTML. " +
        "Shows every matching row by default — pass --page/--page-size to paginate instead.",
    );
  addFormatOption(command);
  command
    .option("-s, --search <text>", "filter by name, version, author, purl, or license id")
    .addOption(
      new Option("-g, --group-by <mode>", "group rows")
        .choices(["none", "license", "risk"])
        .default("none"),
    )
    .addOption(
      new Option("-r, --risk <tier>", "show only components at this risk tier")
        .choices(["all", "permissive", "weak-copyleft", "copyleft", "proprietary", "unknown"])
        .default("all"),
    )
    .addOption(
      new Option("--sort-by <field>", "sort order").choices(["name", "license"]).default("name"),
    )
    .option("--risk-map <path>", 'JSON file of {"License-Id": "risk-tier"} overrides')
    .option("--page <n>", "1-indexed page to show (default: show everything)")
    .option("--page-size <n>", `rows per page (default: ${DEFAULT_PAGE_SIZE} once --page is set)`)
    .option("--json", "print the matching rows as JSON instead of a table")
    .action((file: string, options: ListOptions) => {
      const { document } = loadDocument(file, options.format, {
        sectionDelimiter: options.sectionDelimiter,
      });
      const licenseRiskMap = options.riskMap ? loadRiskMapFile(options.riskMap) : undefined;

      const page = options.page ? Number(options.page) : 1;
      const pageSize = options.pageSize
        ? Number(options.pageSize)
        : options.page
          ? DEFAULT_PAGE_SIZE
          : Number.MAX_SAFE_INTEGER;

      const result = queryNotices(document, {
        search: options.search,
        groupBy: options.groupBy,
        riskFilter: options.risk,
        sortBy: options.sortBy,
        licenseRiskMap,
        page,
        pageSize,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      printSummary(document, licenseRiskMap);
      if (result.filteredCount !== document.components.length) {
        console.log(color.dim(`${result.filteredCount} match current filters`));
      }
      console.log();

      for (const group of result.groups) {
        if (options.groupBy !== "none") {
          console.log(color.bold(`${group.key} (${group.components.length})`));
        }
        if (group.components.length === 0) {
          console.log(color.dim("  (no components)"));
        } else {
          console.log(
            renderTable(
              ["Package", "Dependency", "License", "Risk"],
              group.components.map((c) => componentRow(c, licenseRiskMap)),
            ),
          );
        }
        console.log();
      }

      if (result.pageCount > 1) {
        console.log(color.dim(`Page ${result.page} of ${result.pageCount}`));
      }
    });
}
