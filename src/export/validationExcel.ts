import ExcelJS from "exceljs";
import type { ValidationReport } from "../validation/types";

export interface ExportValidationReportToExcelOptions {
  /** Defaults to "Summary". */
  summarySheetName?: string;
  /** Defaults to "Issues". */
  issuesSheetName?: string;
}

const ISSUE_COLUMNS = [
  { header: "Severity", key: "severity", width: 12 },
  { header: "Line", key: "line", width: 10 },
  { header: "Column", key: "column", width: 10 },
  { header: "Path", key: "path", width: 32 },
  { header: "Message", key: "message", width: 48 },
  { header: "Suggestion", key: "suggestion", width: 48 },
];

/**
 * Builds an .xlsx workbook for a `ValidationReport`: a "Summary" sheet (format checked,
 * standard, valid/invalid, error/warning counts) and an "Issues" sheet — one row per
 * `ValidationIssue`, in the order the validator reported them. Returns the raw bytes;
 * write them to disk in Node or wrap them in a Blob in the browser.
 */
export async function exportValidationReportToExcel(
  report: ValidationReport,
  options: ExportValidationReportToExcelOptions = {},
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();

  const errorCount = report.issues.filter((issue) => issue.severity === "error").length;
  const warningCount = report.issues.filter((issue) => issue.severity === "warning").length;

  const summarySheet = workbook.addWorksheet(options.summarySheetName ?? "Summary");
  summarySheet.columns = [
    { header: "Field", key: "field", width: 20 },
    { header: "Value", key: "value", width: 32 },
  ];
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.addRows([
    { field: "Format", value: report.format },
    { field: "Standard", value: report.standard },
    { field: "Result", value: report.valid ? "Valid" : "Invalid" },
    { field: "Total issues", value: report.issueCount },
    { field: "Errors", value: errorCount },
    { field: "Warnings", value: warningCount },
  ]);

  const issuesSheet = workbook.addWorksheet(options.issuesSheetName ?? "Issues");
  issuesSheet.columns = ISSUE_COLUMNS;
  issuesSheet.getRow(1).font = { bold: true };
  for (const issue of report.issues) {
    issuesSheet.addRow({
      severity: issue.severity,
      line: issue.line ?? "",
      column: issue.column ?? "",
      path: issue.path,
      message: issue.message,
      suggestion: issue.suggestion,
    });
  }

  const raw = await workbook.xlsx.writeBuffer();
  return new Uint8Array(raw as unknown as ArrayLike<number>);
}
