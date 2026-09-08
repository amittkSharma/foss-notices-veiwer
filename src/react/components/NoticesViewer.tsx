import { useState } from "react";
import type { NoticesFileFormat } from "../../core/pipeline";
import { RISK_LABELS } from "../../core/risk";
import type { NoticesDocument, RiskTier } from "../../core/types";
import { type GroupBy, type SortBy, useNotices } from "../hooks/useNotices";
import { useNoticesFromRaw } from "../hooks/useNoticesFromRaw";
import { ComponentList } from "./ComponentList";
import type { ComponentRowViewMode } from "./ComponentRow";
import { ExportButton } from "./ExportButton";
import { ProjectHeader } from "./ProjectHeader";
import { SearchBar } from "./SearchBar";
import { SummaryHeader } from "./SummaryHeader";
import { ValidationReportView } from "./ValidationReportView";

interface NoticesViewerCommonProps {
  licenseRiskMap?: Record<string, RiskTier>;
  virtualized?: boolean;
  /**
   * The detail/summary view toggle. `"detail"` (default) is the original expandable-row
   * behavior; `"summary"` collapses every row to just its header (name, version, dependency
   * type, license/risk) with no click-to-expand. Uncontrolled on its own — the built-in "View"
   * select manages its own state, starting from this value. Pass `onViewModeChange` alongside
   * it to fully control the toggle from outside, so an external control stays in sync with the
   * built-in "View" select in both directions.
   */
  viewMode?: ComponentRowViewMode;
  /** Called whenever the built-in "View" select changes. Pair with `viewMode` to control it. */
  onViewModeChange?: (viewMode: ComponentRowViewMode) => void;
}

export type NoticesViewerProps =
  | (NoticesViewerCommonProps & {
      document: NoticesDocument;
      adapter?: undefined;
    })
  | (NoticesViewerCommonProps & {
      /**
       * Raw notices content — a JSON string for SPDX/CycloneDX, a plain-text string for
       * generate-license-file/Black Duck — instead of an already-parsed `NoticesDocument`.
       * When set, `<NoticesViewer>` parses and schema-validates `document` itself, so
       * consumers never need to import a `parse*`/`validate*` function directly. Renders the
       * validation report instead of the list if validation fails.
       */
      adapter: NoticesFileFormat;
      document: string;
    });

/**
 * Dispatches on whether `adapter` is set: with it, `document` is raw content that gets
 * parsed+validated internally (`RawNoticesViewer`); without it, `document` is already a
 * `NoticesDocument` and gets rendered directly (`ParsedNoticesViewer`).
 */
export function NoticesViewer(props: NoticesViewerProps) {
  if (props.adapter) {
    return (
      <RawNoticesViewer
        adapter={props.adapter}
        raw={props.document}
        licenseRiskMap={props.licenseRiskMap}
        virtualized={props.virtualized}
        viewMode={props.viewMode}
        onViewModeChange={props.onViewModeChange}
      />
    );
  }
  return (
    <ParsedNoticesViewer
      document={props.document}
      licenseRiskMap={props.licenseRiskMap}
      virtualized={props.virtualized}
      viewMode={props.viewMode}
      onViewModeChange={props.onViewModeChange}
    />
  );
}

interface RawNoticesViewerProps extends NoticesViewerCommonProps {
  adapter: NoticesFileFormat;
  raw: string;
}

function RawNoticesViewer({
  adapter,
  raw,
  licenseRiskMap,
  virtualized,
  viewMode,
  onViewModeChange,
}: RawNoticesViewerProps) {
  const { phase, errorMessage, report, document } = useNoticesFromRaw(adapter, raw);

  if (phase === "busy") {
    return <p className="fnv-viewer__status">Validating…</p>;
  }

  if (phase === "format-error" || phase === "error") {
    return (
      <p className="fnv-viewer__error" role="alert">
        {errorMessage}
      </p>
    );
  }

  if (phase === "schema-invalid") {
    return report ? <ValidationReportView report={report} /> : null;
  }

  if (!document) {
    return null;
  }

  return (
    <>
      {report && report.issueCount > 0 && (
        <details className="fnv-viewer__validation">
          <summary>Schema validation: ✓ valid, {report.issueCount} warning(s)</summary>
          <ValidationReportView report={report} />
        </details>
      )}
      <ParsedNoticesViewer
        document={document}
        licenseRiskMap={licenseRiskMap}
        virtualized={virtualized}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
    </>
  );
}

interface ParsedNoticesViewerProps extends NoticesViewerCommonProps {
  document: NoticesDocument;
}

function ParsedNoticesViewer({
  document,
  licenseRiskMap,
  virtualized,
  viewMode: viewModeProp,
  onViewModeChange,
}: ParsedNoticesViewerProps) {
  const {
    search,
    setSearch,
    groupBy,
    setGroupBy,
    riskFilter,
    setRiskFilter,
    sortBy,
    setSortBy,
    groups,
    total,
    filteredCount,
    page,
    setPage,
    pageCount,
  } = useNotices(document, {
    licenseRiskMap,
  });
  // Controlled when `onViewModeChange` is passed (the "View" select then always reflects
  // `viewMode`, and the caller owns updates); otherwise `viewMode` only seeds the initial
  // internal state, and the select manages itself from there.
  const isControlled = onViewModeChange !== undefined;
  const [internalViewMode, setInternalViewMode] = useState<ComponentRowViewMode>(
    viewModeProp ?? "detail",
  );
  const viewMode = isControlled ? (viewModeProp ?? "detail") : internalViewMode;

  function handleViewModeChange(next: ComponentRowViewMode) {
    setInternalViewMode(next);
    onViewModeChange?.(next);
  }

  const riskCounts =
    groupBy === "risk"
      ? groups.reduce<Record<string, number>>((acc, group) => {
          acc[group.key] = group.components.length;
          return acc;
        }, {})
      : {};

  return (
    <div className="fnv-viewer">
      <ProjectHeader
        project={document.project}
        source={document.source}
        generatedAt={document.generatedAt}
      />
      <SummaryHeader total={total} filteredCount={filteredCount} riskCounts={riskCounts} />
      <div className="fnv-toolbar">
        <SearchBar value={search} onChange={setSearch} />
        <select
          value={groupBy}
          onChange={(event) => setGroupBy(event.target.value as GroupBy)}
          aria-label="Group by"
        >
          <option value="none">No grouping</option>
          <option value="license">Group by license</option>
          <option value="risk">Group by risk</option>
        </select>
        <select
          value={riskFilter}
          onChange={(event) => setRiskFilter(event.target.value as RiskTier | "all")}
          aria-label="Filter by risk"
        >
          <option value="all">All risk levels</option>
          {(Object.keys(RISK_LABELS) as RiskTier[]).map((risk) => (
            <option key={risk} value={risk}>
              {RISK_LABELS[risk]}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortBy)}
          aria-label="Sort by"
        >
          <option value="name">Sort by name</option>
          <option value="license">Sort by license</option>
        </select>
        <select
          value={viewMode}
          onChange={(event) => handleViewModeChange(event.target.value as ComponentRowViewMode)}
          aria-label="View"
        >
          <option value="detail">Detail view</option>
          <option value="summary">Summary view</option>
        </select>
        <ExportButton document={document} licenseRiskMap={licenseRiskMap} />
      </div>
      {groups.map((group) => (
        <section key={group.key} className="fnv-group">
          {groupBy !== "none" && (
            <h3 className="fnv-group__title">
              {group.key} ({group.components.length})
            </h3>
          )}
          <ComponentList
            components={group.components}
            licenseRiskMap={licenseRiskMap}
            virtualized={virtualized}
            viewMode={viewMode}
            source={document.source}
          />
        </section>
      ))}
      {pageCount > 1 && (
        <nav className="fnv-pagination" aria-label="Pagination">
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            ← Previous
          </button>
          <span className="fnv-pagination__status">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
          >
            Next →
          </button>
        </nav>
      )}
    </div>
  );
}
