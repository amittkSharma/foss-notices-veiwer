import { useState } from "react";
import { ADAPTER_LICENSE_DISCLAIMERS } from "../../core/disclaimers";
import { classifyLicense } from "../../core/risk";
import type { Component, NoticesSource, RiskTier } from "../../core/types";
import { DependencyBadge } from "./DependencyBadge";
import { LicenseBadge } from "./LicenseBadge";

export type ComponentRowViewMode = "summary" | "detail";

export interface ComponentRowProps {
  component: Component;
  licenseRiskMap?: Record<string, RiskTier>;
  viewMode?: ComponentRowViewMode;
  /** The source document's adapter, used to show a license-reliability disclaimer in the
   * detail view (see `ADAPTER_LICENSE_DISCLAIMERS`). Omit to show no disclaimer. */
  source?: NoticesSource;
}

const NO_INFO = "No information";

export function ComponentRow({
  component,
  licenseRiskMap,
  viewMode = "detail",
  source,
}: ComponentRowProps) {
  const [expanded, setExpanded] = useState(false);
  const isSummary = viewMode === "summary";

  const licenseEntries =
    component.licenses.length === 0
      ? [{ key: "__no-license", risk: "unknown" as const, name: NO_INFO }]
      : component.licenses.map((license) => ({
          key: license.id || license.name || NO_INFO,
          risk: classifyLicense(license.id, licenseRiskMap),
          name: license.name || license.id || NO_INFO,
        }));

  const licenseNames = (
    <span className="fnv-row__license-names">
      {licenseEntries.map((entry) => (
        <span key={entry.key} className="fnv-row__license-name-text">
          {entry.name}
        </span>
      ))}
    </span>
  );

  const riskBadges = (
    <span className="fnv-row__risks">
      {licenseEntries.map((entry) => (
        <LicenseBadge key={entry.key} risk={entry.risk} variant="plain" />
      ))}
    </span>
  );

  const titleBlock = (
    <span className="fnv-row__title">
      <span className="fnv-row__name">
        {!isSummary && (
          <span className="fnv-row__chevron" aria-hidden="true">
            {expanded ? "▾" : "▸"}
          </span>
        )}
        {component.name}
        {component.version && <span className="fnv-row__version">v{component.version}</span>}
      </span>
    </span>
  );

  const dependencyColumn = (
    <span className="fnv-row__dependency">
      <DependencyBadge dependencyType={component.dependencyType} variant="plain" />
    </span>
  );

  if (isSummary) {
    return (
      <li className="fnv-row">
        <div className="fnv-row__summary fnv-row__summary--static">
          {titleBlock}
          {dependencyColumn}
          {licenseNames}
          {riskBadges}
        </div>
      </li>
    );
  }

  return (
    <li className="fnv-row">
      <button
        type="button"
        className="fnv-row__summary"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        title={expanded ? "Click to collapse details" : "Click to expand details"}
      >
        {titleBlock}
        {dependencyColumn}
        {licenseNames}
        {riskBadges}
      </button>
      {expanded && (
        <div className="fnv-row__detail">
          {component.homepage && (
            <p>
              <a href={component.homepage} target="_blank" rel="noreferrer">
                {component.homepage}
              </a>
            </p>
          )}
          <p className="fnv-row__author">
            <strong>Author: </strong>
            {component.author || NO_INFO}
          </p>
          <p className="fnv-row__purl">
            <strong>Package URL: </strong>
            {component.purl || NO_INFO}
          </p>
          <div className="fnv-row__copyrights">
            <strong>Copyright</strong>
            {component.copyrights.length === 0 ? (
              <p>{NO_INFO}</p>
            ) : (
              component.copyrights.map((copyright) => (
                <pre key={copyright.text} className="fnv-row__copyright">
                  {copyright.text}
                </pre>
              ))
            )}
          </div>
          <div className="fnv-row__license-list">
            <strong>{component.licenses.length === 1 ? "License" : "Licenses"}</strong>
            {component.licenses.length === 0 ? (
              <p>{NO_INFO}</p>
            ) : (
              component.licenses.map((license) => (
                <div key={license.id} className="fnv-row__license">
                  <p className="fnv-row__license-name">{license.name || license.id || NO_INFO}</p>
                  {license.url && (
                    <p className="fnv-row__license-url">
                      <a href={license.url} target="_blank" rel="noreferrer">
                        {license.url}
                      </a>
                    </p>
                  )}
                  {/* url and text are reported as one combined "No information" when both are
                      missing, rather than two separate identical lines (e.g. every SPDX-derived
                      license, since that format never carries either field). */}
                  {license.text ? (
                    <pre className="fnv-row__license-text">{license.text}</pre>
                  ) : !license.url ? (
                    <p className="fnv-row__license-text">{NO_INFO}</p>
                  ) : null}
                </div>
              ))
            )}
            {source && ADAPTER_LICENSE_DISCLAIMERS[source] && (
              <p className="fnv-row__license-disclaimer">{ADAPTER_LICENSE_DISCLAIMERS[source]}</p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
