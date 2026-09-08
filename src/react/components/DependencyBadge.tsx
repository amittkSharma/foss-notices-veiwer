import type { DependencyType } from "../../core/types";

export interface DependencyBadgeProps {
  dependencyType: DependencyType | undefined;
  /** "badge" (default) is the colored pill; "plain" is left-aligned text with no color/shape. */
  variant?: "badge" | "plain";
}

const LABELS: Record<DependencyType | "unknown", string> = {
  direct: "Direct",
  transitive: "Transitive",
  unknown: "Unknown",
};

export function DependencyBadge({ dependencyType, variant = "badge" }: DependencyBadgeProps) {
  const kind = dependencyType ?? "unknown";
  const label = LABELS[kind];
  const className =
    variant === "plain" ? "fnv-row__plain-label" : `fnv-badge fnv-badge--dependency-${kind}`;

  return (
    <span className={className} title={`Dependency type: ${label}`}>
      {label}
    </span>
  );
}
