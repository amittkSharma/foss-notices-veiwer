import type { Component, RiskTier } from "./types";

/**
 * A curated default — not exhaustive. Override per-org via the `customMap` argument
 * or the `licenseRiskMap` prop on the React components.
 */
export const DEFAULT_LICENSE_RISK_MAP: Record<string, RiskTier> = {
  MIT: "permissive",
  "Apache-2.0": "permissive",
  "BSD-2-Clause": "permissive",
  "BSD-3-Clause": "permissive",
  ISC: "permissive",
  "0BSD": "permissive",
  Unlicense: "permissive",
  "CC0-1.0": "permissive",
  "MPL-2.0": "weak-copyleft",
  "LGPL-2.1": "weak-copyleft",
  "LGPL-2.1-only": "weak-copyleft",
  "LGPL-2.1-or-later": "weak-copyleft",
  "LGPL-3.0": "weak-copyleft",
  "LGPL-3.0-only": "weak-copyleft",
  "LGPL-3.0-or-later": "weak-copyleft",
  "EPL-1.0": "weak-copyleft",
  "EPL-2.0": "weak-copyleft",
  "GPL-2.0": "copyleft",
  "GPL-2.0-only": "copyleft",
  "GPL-2.0-or-later": "copyleft",
  "GPL-3.0": "copyleft",
  "GPL-3.0-only": "copyleft",
  "GPL-3.0-or-later": "copyleft",
  "AGPL-3.0": "copyleft",
  "AGPL-3.0-only": "copyleft",
  "AGPL-3.0-or-later": "copyleft",
};

const RISK_ORDER: RiskTier[] = [
  "permissive",
  "weak-copyleft",
  "copyleft",
  "proprietary",
  "unknown",
];

function worstOf(a: RiskTier, b: RiskTier): RiskTier {
  return RISK_ORDER.indexOf(b) > RISK_ORDER.indexOf(a) ? b : a;
}

/**
 * Classifies a single SPDX id (or a simple SPDX expression such as
 * "(MIT OR Apache-2.0)") into a risk tier. For expressions, returns the
 * *worst* tier among the referenced ids — a conservative default for
 * compliance review, since the safest license in an OR-expression is not
 * guaranteed to be the one a consumer actually complies with.
 */
export function classifyLicense(
  licenseId: string | undefined | null,
  customMap: Record<string, RiskTier> = {},
): RiskTier {
  if (!licenseId) return "unknown";

  const map = { ...DEFAULT_LICENSE_RISK_MAP, ...customMap };
  const normalized = licenseId.trim();
  const direct = map[normalized];
  if (direct) return direct;

  const ids = normalized
    .match(/[A-Za-z0-9.\-+]+/g)
    ?.filter((token) => !["OR", "AND", "WITH"].includes(token));
  if (!ids || ids.length === 0) return "unknown";

  const tiers = ids.map((id) => map[id]).filter((tier): tier is RiskTier => Boolean(tier));
  if (tiers.length === 0) return "unknown";

  return tiers.reduce(worstOf, "permissive");
}

/** Human-readable label for each risk tier, e.g. for a badge or an exported spreadsheet column. */
export const RISK_LABELS: Record<RiskTier, string> = {
  permissive: "Permissive",
  "weak-copyleft": "Weak Copyleft",
  copyleft: "Copyleft",
  proprietary: "Proprietary",
  unknown: "Unknown",
};

/**
 * A component can carry several licenses (dual-licensed, or an SPDX expression per license
 * entry) — this returns the *worst* tier among all of them, the same conservative rule
 * `classifyLicense` applies within a single OR-expression.
 */
export function classifyComponentRisk(
  component: Component,
  customMap: Record<string, RiskTier> = {},
): RiskTier {
  if (component.licenses.length === 0) return "unknown";
  return component.licenses.reduce<RiskTier>(
    (worst, license) => worstOf(worst, classifyLicense(license.id, customMap)),
    "permissive",
  );
}
