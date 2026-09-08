import { RISK_LABELS, classifyComponentRisk } from "./risk";
import type { NoticesDocument, RiskTier } from "./types";

const NO_INFO = "No information";

export interface NoticesExportRow {
  name: string;
  version: string;
  license: string;
  risk: string;
  author: string;
  purl: string;
}

export interface ToExportRowsOptions {
  licenseRiskMap?: Record<string, RiskTier>;
}

/**
 * Flattens a NoticesDocument down to the basic per-component fields (name, version,
 * license, risk, author, purl) used by the Excel export. Operates on the normalized model,
 * so it works the same regardless of which adapter (SPDX, CycloneDX, generate-license-file,
 * Black Duck) produced the document. Multiple licenses on one component are joined with "; ".
 */
export function toExportRows(
  document: NoticesDocument,
  options: ToExportRowsOptions = {},
): NoticesExportRow[] {
  return document.components.map((component) => {
    const license =
      component.licenses.length > 0
        ? component.licenses.map((l) => l.name || l.id || NO_INFO).join("; ")
        : NO_INFO;
    const risk = RISK_LABELS[classifyComponentRisk(component, options.licenseRiskMap)];

    return {
      name: component.name || NO_INFO,
      version: component.version || NO_INFO,
      license,
      risk,
      author: component.author || NO_INFO,
      purl: component.purl || NO_INFO,
    };
  });
}
