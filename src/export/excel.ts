import ExcelJS from "exceljs";
import { toExportRows } from "../core/exportRows";
import type { NoticesDocument, RiskTier } from "../core/types";

export interface ExportNoticesToExcelOptions {
  licenseRiskMap?: Record<string, RiskTier>;
  /** Defaults to "Notices". */
  sheetName?: string;
}

const COLUMNS = [
  { header: "Package Name", key: "name", width: 32 },
  { header: "Version", key: "version", width: 16 },
  { header: "License", key: "license", width: 32 },
  { header: "Risk", key: "risk", width: 16 },
  { header: "Author", key: "author", width: 28 },
  { header: "Package URL", key: "purl", width: 36 },
];

/**
 * Builds an .xlsx workbook — one sheet, one row per component — with the basic
 * fields: package name, version, license, risk tier, author, and package URL. Works the
 * same regardless of which adapter (SPDX, CycloneDX, generate-license-file, Black Duck)
 * produced the document, since it operates on the normalized `NoticesDocument` model.
 * Returns the raw bytes; write them to disk in Node or wrap them in a Blob in the browser.
 */
export async function exportNoticesToExcel(
  document: NoticesDocument,
  options: ExportNoticesToExcelOptions = {},
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(options.sheetName ?? "Notices");
  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };

  for (const row of toExportRows(document, { licenseRiskMap: options.licenseRiskMap })) {
    sheet.addRow(row);
  }

  // exceljs's own .d.ts declares `writeBuffer()` as an incomplete local `Buffer` type (just
  // `extends ArrayBuffer`, missing Uint8Array's members) that doesn't match what's actually
  // returned at runtime (a real Node Buffer, or a Uint8Array-compatible polyfill in the
  // browser build) — copying through `new Uint8Array(...)` works correctly either way.
  const raw = await workbook.xlsx.writeBuffer();
  return new Uint8Array(raw as unknown as ArrayLike<number>);
}
