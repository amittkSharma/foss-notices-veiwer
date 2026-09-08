import { classifyComponentRisk } from "./risk";
import type { Component, NoticesDocument, RiskTier } from "./types";

export type GroupBy = "none" | "license" | "risk";
export type SortBy = "name" | "license";

export const DEFAULT_PAGE_SIZE = 25;

export interface NoticesGroup {
  key: string;
  components: Component[];
}

export interface QueryNoticesOptions {
  search?: string;
  groupBy?: GroupBy;
  riskFilter?: RiskTier | "all";
  sortBy?: SortBy;
  licenseRiskMap?: Record<string, RiskTier>;
  /** 1-indexed. Clamped into range, so an out-of-bounds value never yields an empty result. */
  page?: number;
  /** Defaults to 25 — the same page size `<NoticesViewer>` uses. */
  pageSize?: number;
}

export interface QueryNoticesResult {
  total: number;
  filteredCount: number;
  groups: NoticesGroup[];
  page: number;
  pageCount: number;
  pageSize: number;
}

function licenseKey(component: Component): string {
  return component.licenses[0]?.name || component.licenses[0]?.id || "";
}

function groupInto(
  scored: { component: Component; risk: RiskTier }[],
  groupBy: GroupBy,
): NoticesGroup[] {
  const buckets = new Map<string, Component[]>();
  for (const { component, risk } of scored) {
    const keys =
      groupBy === "risk"
        ? [risk]
        : component.licenses.length > 0
          ? component.licenses.map((l) => l.id)
          : ["Unknown License"];
    for (const key of keys) {
      const bucket = buckets.get(key) ?? [];
      bucket.push(component);
      buckets.set(key, bucket);
    }
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, components]) => ({ key, components }));
}

/**
 * Pure search/group/sort/risk-filter/paginate over a `NoticesDocument` — no framework
 * dependency, no state. `useNotices` wraps this in React state for `<NoticesViewer>`; the
 * `list`/`report` CLI commands call it directly, so both consumers filter/group/sort
 * identically from identical input.
 */
export function queryNotices(
  document: NoticesDocument,
  options: QueryNoticesOptions = {},
): QueryNoticesResult {
  const {
    search = "",
    groupBy = "none",
    riskFilter = "all",
    sortBy = "name",
    licenseRiskMap,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = options;

  const withRisk = document.components.map((component) => ({
    component,
    risk: classifyComponentRisk(component, licenseRiskMap),
  }));

  const query = search.trim().toLowerCase();
  const filtered = withRisk.filter(({ component, risk }) => {
    if (riskFilter !== "all" && risk !== riskFilter) return false;
    if (!query) return true;
    const haystack = [
      component.name,
      component.version,
      component.author,
      component.purl,
      ...component.licenses.map((l) => l.id),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "license") {
      const cmp = licenseKey(a.component).localeCompare(licenseKey(b.component));
      if (cmp !== 0) return cmp;
    }
    return a.component.name.localeCompare(b.component.name);
  });

  const groups: NoticesGroup[] =
    groupBy === "none"
      ? [{ key: "all", components: sorted.map((f) => f.component) }]
      : groupInto(sorted, groupBy);

  // Pagination operates on rendered rows, not distinct components — a component that
  // belongs to two groups (e.g. dual-licensed, grouped by license) is one row per group.
  const flatRows = groups.flatMap((group) =>
    group.components.map((component) => ({ key: group.key, component })),
  );
  const pageCount = Math.max(1, Math.ceil(flatRows.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);

  const start = (currentPage - 1) * pageSize;
  const pageRows = flatRows.slice(start, start + pageSize);
  const order: string[] = [];
  const buckets = new Map<string, Component[]>();
  for (const row of pageRows) {
    if (!buckets.has(row.key)) {
      buckets.set(row.key, []);
      order.push(row.key);
    }
    buckets.get(row.key)?.push(row.component);
  }
  const pagedGroups = order.map((key) => ({ key, components: buckets.get(key) ?? [] }));

  return {
    total: document.components.length,
    filteredCount: filtered.length,
    groups: pagedGroups,
    page: currentPage,
    pageCount,
    pageSize,
  };
}
