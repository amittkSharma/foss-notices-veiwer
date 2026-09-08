import { RISK_LABELS } from "../../core/risk";
import type { RiskTier } from "../../core/types";
import { RiskIcon } from "./RiskIcon";

export interface LicenseBadgeProps {
  risk: RiskTier;
  /** The license id/name to display. Defaults to the risk-tier label for backward compatibility. */
  label?: string;
  /** Append the risk-tier label after `label` (e.g. "MIT · Permissive"). Default true when `label` is set. */
  showRiskLabel?: boolean;
  /** "badge" (default) is the colored pill; "plain" is left-aligned text with no color/shape. */
  variant?: "badge" | "plain";
}

export function LicenseBadge({
  risk,
  label,
  showRiskLabel = true,
  variant = "badge",
}: LicenseBadgeProps) {
  const riskLabel = RISK_LABELS[risk];
  const display = label ? (showRiskLabel ? `${label} · ${riskLabel}` : label) : riskLabel;

  if (variant === "plain") {
    return (
      <span
        className={`fnv-row__plain-label fnv-row__risk-label fnv-risk--${risk}`}
        title={riskLabel}
      >
        <RiskIcon risk={risk} />
        <span>{display}</span>
      </span>
    );
  }

  return (
    <span className={`fnv-badge fnv-badge--${risk}`} title={riskLabel}>
      {display}
    </span>
  );
}
