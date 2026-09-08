import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { ValidationReport } from "../validation/types";
import { exportValidationReportToExcel } from "./validationExcel";

const report: ValidationReport = {
  valid: false,
  format: "spdx",
  standard: "SPDX 2.3 JSON Schema",
  issueCount: 2,
  issues: [
    {
      line: 4,
      column: 10,
      path: "/packages/0/name",
      message: "Missing required property 'name'",
      suggestion: "Add a 'name' field to this package entry.",
      severity: "error",
    },
    {
      line: null,
      column: null,
      path: "/packages/1/licenseConcluded",
      message: "Unrecognized SPDX license expression",
      suggestion: "Use a valid SPDX license identifier or expression.",
      severity: "warning",
    },
  ],
};

async function readBack(bytes: Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
  return workbook;
}

describe("exportValidationReportToExcel", () => {
  it("writes a real .xlsx workbook with a Summary sheet and an Issues sheet", async () => {
    const bytes = await exportValidationReportToExcel(report);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);

    const workbook = await readBack(bytes);

    const summary = workbook.getWorksheet("Summary");
    expect(summary).toBeDefined();
    expect(summary?.getRow(1).values).toEqual([undefined, "Field", "Value"]);
    expect(summary?.getRow(2).values).toEqual([undefined, "Format", "spdx"]);
    expect(summary?.getRow(3).values).toEqual([undefined, "Standard", "SPDX 2.3 JSON Schema"]);
    expect(summary?.getRow(4).values).toEqual([undefined, "Result", "Invalid"]);
    expect(summary?.getRow(5).values).toEqual([undefined, "Total issues", 2]);
    expect(summary?.getRow(6).values).toEqual([undefined, "Errors", 1]);
    expect(summary?.getRow(7).values).toEqual([undefined, "Warnings", 1]);

    const issues = workbook.getWorksheet("Issues");
    expect(issues).toBeDefined();
    expect(issues?.getRow(1).values).toEqual([
      undefined,
      "Severity",
      "Line",
      "Column",
      "Path",
      "Message",
      "Suggestion",
    ]);
    expect(issues?.getRow(2).values).toEqual([
      undefined,
      "error",
      4,
      10,
      "/packages/0/name",
      "Missing required property 'name'",
      "Add a 'name' field to this package entry.",
    ]);
    expect(issues?.getRow(3).values).toEqual([
      undefined,
      "warning",
      "",
      "",
      "/packages/1/licenseConcluded",
      "Unrecognized SPDX license expression",
      "Use a valid SPDX license identifier or expression.",
    ]);
  });

  it("honors custom sheet names", async () => {
    const bytes = await exportValidationReportToExcel(report, {
      summarySheetName: "Overview",
      issuesSheetName: "Findings",
    });
    const workbook = await readBack(bytes);
    expect(workbook.getWorksheet("Overview")).toBeDefined();
    expect(workbook.getWorksheet("Findings")).toBeDefined();
  });

  it("reports zero errors and warnings for a valid report with no issues", async () => {
    const bytes = await exportValidationReportToExcel({
      valid: true,
      format: "cyclonedx",
      standard: "CycloneDX 1.5 JSON Schema",
      issueCount: 0,
      issues: [],
    });
    const workbook = await readBack(bytes);
    const summary = workbook.getWorksheet("Summary");
    expect(summary?.getRow(4).values).toEqual([undefined, "Result", "Valid"]);
    expect(summary?.getRow(6).values).toEqual([undefined, "Errors", 0]);
    expect(summary?.getRow(7).values).toEqual([undefined, "Warnings", 0]);
  });
});
