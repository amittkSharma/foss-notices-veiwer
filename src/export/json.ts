import { toExportRows } from "../core/exportRows";
import type { NoticesDocument, RiskTier } from "../core/types";

export interface ExportNoticesToJsonOptions {
  licenseRiskMap?: Record<string, RiskTier>;
}

/**
 * Serializes the same flat rows `exportNoticesToExcel` writes to a spreadsheet (name,
 * version, license, risk, author, purl) to indented JSON bytes instead — for scripting/
 * automation consumers rather than a human reviewer. Needs no extra dependency (unlike the
 * Excel export's `exceljs`), so it's safe to call directly without a dynamic import.
 */
export function exportNoticesToJson(
  document: NoticesDocument,
  options: ExportNoticesToJsonOptions = {},
): Uint8Array {
  const rows = toExportRows(document, { licenseRiskMap: options.licenseRiskMap });
  return new TextEncoder().encode(JSON.stringify(rows, null, 2));
}
