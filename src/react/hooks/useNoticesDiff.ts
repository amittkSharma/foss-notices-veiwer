import { useMemo } from "react";
import { diffNotices } from "../../core/diff";
import type { NoticesDocument } from "../../core/types";

/** Memoized wrapper around `diffNotices` for use in a component render. */
export function useNoticesDiff(before: NoticesDocument, after: NoticesDocument) {
  return useMemo(() => diffNotices(before, after), [before, after]);
}
