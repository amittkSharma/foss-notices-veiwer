import { useState } from "react";
import type { Component, NoticesSource, RiskTier } from "../../core/types";
import { ComponentRow, type ComponentRowViewMode } from "./ComponentRow";

export interface ComponentListProps {
  components: Component[];
  licenseRiskMap?: Record<string, RiskTier>;
  /** Windowed rendering for large SBOMs. Default on; disable for small lists or snapshot tests. */
  virtualized?: boolean;
  /** Assumed collapsed row height in px. Expanding a row grows it visually, but scroll math
   * isn't re-measured — acceptable since expanding is the exception, not the default view.
   * Default accounts for the two-line collapsed header (name/version, then dependency badge). */
  rowHeight?: number;
  viewportHeight?: number;
  viewMode?: ComponentRowViewMode;
  /** Forwarded to each `<ComponentRow>` to show its license-reliability disclaimer. */
  source?: NoticesSource;
}

const OVERSCAN = 6;

export function ComponentList({
  components,
  licenseRiskMap,
  virtualized = true,
  rowHeight = 64,
  viewportHeight = 480,
  viewMode = "detail",
  source,
}: ComponentListProps) {
  const [scrollTop, setScrollTop] = useState(0);

  if (!virtualized || components.length === 0) {
    return (
      <ul className="fnv-list">
        {components.map((component) => (
          <ComponentRow
            key={`${component.name}@${component.version ?? ""}`}
            component={component}
            licenseRiskMap={licenseRiskMap}
            viewMode={viewMode}
            source={source}
          />
        ))}
      </ul>
    );
  }

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + OVERSCAN * 2;
  const endIndex = Math.min(components.length, startIndex + visibleCount);
  const visible = components.slice(startIndex, endIndex);

  return (
    <div
      className="fnv-list-viewport"
      style={{ height: viewportHeight, overflowY: "auto" }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div style={{ height: components.length * rowHeight, position: "relative" }}>
        <ul
          className="fnv-list"
          style={{ position: "absolute", top: startIndex * rowHeight, left: 0, right: 0 }}
        >
          {visible.map((component) => (
            <ComponentRow
              key={`${component.name}@${component.version ?? ""}`}
              component={component}
              licenseRiskMap={licenseRiskMap}
              viewMode={viewMode}
              source={source}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
