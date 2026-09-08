import { useEffect, useMemo, useState } from "react";
import { DEFAULT_PAGE_SIZE, type GroupBy, type SortBy, queryNotices } from "../../core/query";
import type { NoticesDocument, RiskTier } from "../../core/types";

export type { GroupBy, NoticesGroup, SortBy } from "../../core/query";

export const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export interface UseNoticesOptions {
  licenseRiskMap?: Record<string, RiskTier>;
}

/**
 * Drives search, grouping, and risk-tier filtering over a NoticesDocument. Kept separate
 * from `<NoticesViewer>` so teams with their own design system can build a custom UI on top
 * of the same state logic. The actual filter/sort/group/paginate work is `core/query.ts`'s
 * `queryNotices` — a pure function also used directly by the CLI's `list`/`report` commands —
 * this hook only owns the React state and re-runs it in a `useMemo`.
 */
export function useNotices(document: NoticesDocument, options: UseNoticesOptions = {}) {
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [riskFilter, setRiskFilter] = useState<RiskTier | "all">("all");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [page, setPage] = useState(1);

  const result = useMemo(
    () =>
      queryNotices(document, {
        search,
        groupBy,
        riskFilter,
        sortBy,
        licenseRiskMap: options.licenseRiskMap,
        page,
      }),
    [document, search, groupBy, riskFilter, sortBy, page, options.licenseRiskMap],
  );

  // Any change to what's shown or how it's ordered should land back on page 1 —
  // otherwise the user can land on a now-empty or out-of-range page. The deps are
  // intentional reset triggers; the effect body doesn't need to read their values.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deps are reset triggers, not reads.
  useEffect(() => {
    setPage(1);
  }, [document, search, groupBy, riskFilter, sortBy]);

  return {
    search,
    setSearch,
    groupBy,
    setGroupBy,
    riskFilter,
    setRiskFilter,
    sortBy,
    setSortBy,
    total: result.total,
    filteredCount: result.filteredCount,
    groups: result.groups,
    page: result.page,
    setPage,
    pageCount: result.pageCount,
    pageSize: result.pageSize,
  };
}
