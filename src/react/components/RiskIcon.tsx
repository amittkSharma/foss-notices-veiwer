import type { ReactElement, ReactNode, SVGProps } from "react";
import type { RiskTier } from "../../core/types";

export interface RiskIconProps {
  risk: RiskTier;
}

const ICON_PROPS: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 16 16",
  width: 14,
  height: 14,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  focusable: false,
};

function IconShell({ children }: { children: ReactNode }) {
  return (
    <svg {...ICON_PROPS} aria-hidden="true">
      {children}
    </svg>
  );
}

// Check inside a circle — low-risk, nothing further to review.
function PermissiveIcon() {
  return (
    <IconShell>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M5.2 8.4 7.1 10.3 10.8 5.9" />
    </IconShell>
  );
}

// Circle with a raised dot — a minor obligation worth a second look.
function WeakCopyleftIcon() {
  return (
    <IconShell>
      <circle cx="8" cy="8" r="6.25" />
      <line x1="8" y1="4.8" x2="8" y2="8.8" />
      <circle cx="8" cy="11.2" r="0.9" fill="currentColor" stroke="none" />
    </IconShell>
  );
}

// Warning triangle — a real compliance obligation.
function CopyleftIcon() {
  return (
    <IconShell>
      <path d="M8 2.6 14.4 13.4 1.6 13.4Z" />
      <line x1="8" y1="6.6" x2="8" y2="10" />
      <circle cx="8" cy="11.8" r="0.9" fill="currentColor" stroke="none" />
    </IconShell>
  );
}

// Padlock — usage is restricted.
function ProprietaryIcon() {
  return (
    <IconShell>
      <rect x="3.6" y="7.4" width="8.8" height="6.2" rx="1" />
      <path d="M5.6 7.4V5.3a2.4 2.4 0 0 1 4.8 0v2.1" />
    </IconShell>
  );
}

// Circle with a question mark — nothing could be classified.
function UnknownIcon() {
  return (
    <IconShell>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M6.2 6.4a1.9 1.7 0 1 1 2.7 1.5c-0.6 0.4-1 0.8-1 1.5" />
      <circle cx="8" cy="11.3" r="0.9" fill="currentColor" stroke="none" />
    </IconShell>
  );
}

const ICONS: Record<RiskTier, ReactElement> = {
  permissive: <PermissiveIcon />,
  "weak-copyleft": <WeakCopyleftIcon />,
  copyleft: <CopyleftIcon />,
  proprietary: <ProprietaryIcon />,
  unknown: <UnknownIcon />,
};

export function RiskIcon({ risk }: RiskIconProps) {
  return ICONS[risk];
}
