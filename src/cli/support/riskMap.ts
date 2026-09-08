import type { RiskTier } from "../../core/types";
import { CliError } from "./errors";
import { readInputFile } from "./io";

const VALID_TIERS: readonly RiskTier[] = [
  "permissive",
  "weak-copyleft",
  "copyleft",
  "proprietary",
  "unknown",
];

/**
 * Loads a `--risk-map <file>` override: a flat JSON object of `{ "License-Id": RiskTier }`,
 * the same shape passed to `<NoticesViewer licenseRiskMap>`. Validated here because it's user
 * input crossing into the library — a typo'd tier name should fail fast with a clear message,
 * not silently fall back to "unknown" three commands later.
 */
export function loadRiskMapFile(path: string): Record<string, RiskTier> {
  const raw = readInputFile(path);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new CliError(`${path} is not valid JSON: ${(error as Error).message}`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new CliError(`${path} must contain a flat JSON object of {"License-Id": "risk-tier"}`);
  }

  const map: Record<string, RiskTier> = {};
  for (const [licenseId, tier] of Object.entries(parsed)) {
    if (typeof tier !== "string" || !VALID_TIERS.includes(tier as RiskTier)) {
      throw new CliError(
        `${path}: "${licenseId}" has an invalid risk tier (${JSON.stringify(tier)}) — must be one of ${VALID_TIERS.join(", ")}`,
      );
    }
    map[licenseId] = tier as RiskTier;
  }
  return map;
}
