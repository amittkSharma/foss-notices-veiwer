import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { NoticesDocument } from "../core/types";
import { exportNoticesToExcel } from "./excel";

const document: NoticesDocument = {
  source: "unknown",
  components: [
    {
      name: "left-pad",
      version: "1.3.0",
      author: "James Halliday",
      licenses: [{ id: "MIT", name: "MIT" }],
      copyrights: [],
    },
    {
      name: "gpl-tool",
      version: "2.0.0",
      licenses: [{ id: "GPL-3.0", name: "GPL-3.0" }],
      copyrights: [],
    },
    { name: "bare-package", licenses: [], copyrights: [] },
  ],
};

async function readBack(bytes: Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
  return workbook;
}

describe("exportNoticesToExcel", () => {
  it("writes a real .xlsx workbook with a header row and one row per component", async () => {
    const bytes = await exportNoticesToExcel(document);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
    // The zip local-file-header signature ("PK\x03\x04") confirms this is a real .xlsx
    // (a zip archive), not e.g. a CSV mislabeled with an .xlsx extension.
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);

    const workbook = await readBack(bytes);
    const sheet = workbook.getWorksheet("Notices");
    expect(sheet).toBeDefined();
    expect(sheet?.getRow(1).values).toEqual([
      undefined,
      "Package Name",
      "Version",
      "License",
      "Risk",
      "Author",
      "Package URL",
    ]);
    expect(sheet?.getRow(2).values).toEqual([
      undefined,
      "left-pad",
      "1.3.0",
      "MIT",
      "Permissive",
      "James Halliday",
      "No information",
    ]);
    expect(sheet?.getRow(3).values).toEqual([
      undefined,
      "gpl-tool",
      "2.0.0",
      "GPL-3.0",
      "Copyleft",
      "No information",
      "No information",
    ]);
    expect(sheet?.getRow(4).values).toEqual([
      undefined,
      "bare-package",
      "No information",
      "No information",
      "Unknown",
      "No information",
      "No information",
    ]);
  });

  it("honors a custom sheet name and license risk map", async () => {
    const bytes = await exportNoticesToExcel(document, {
      sheetName: "Custom",
      licenseRiskMap: { MIT: "proprietary" },
    });
    const workbook = await readBack(bytes);
    const sheet = workbook.getWorksheet("Custom");
    expect(sheet).toBeDefined();
    expect(sheet?.getRow(2).getCell(4).value).toBe("Proprietary");
  });
});
