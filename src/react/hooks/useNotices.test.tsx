import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { NoticesDocument } from "../../core/types";
import { useNotices } from "./useNotices";

const document: NoticesDocument = {
  source: "unknown",
  components: [
    { name: "left-pad", version: "1.3.0", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
    { name: "express", version: "4.19.2", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
    {
      name: "gpl-tool",
      version: "2.0.0",
      licenses: [{ id: "GPL-3.0", name: "GPL-3.0" }],
      copyrights: [],
    },
  ],
};

describe("useNotices", () => {
  it("returns every component ungrouped by default", () => {
    const { result } = renderHook(() => useNotices(document));
    expect(result.current.total).toBe(3);
    expect(result.current.filteredCount).toBe(3);
    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0]?.components).toHaveLength(3);
  });

  it("filters by search text across name and license id", () => {
    const { result } = renderHook(() => useNotices(document));
    act(() => result.current.setSearch("gpl"));
    expect(result.current.filteredCount).toBe(1);
    expect(result.current.groups[0]?.components[0]?.name).toBe("gpl-tool");
  });

  it("filters by search text across author and purl", () => {
    const withMeta: NoticesDocument = {
      source: "unknown",
      components: [
        ...document.components,
        {
          name: "left-pad-fork",
          version: "1.3.0",
          author: "Jane Doe",
          purl: "pkg:npm/left-pad-fork@1.3.0",
          licenses: [{ id: "MIT", name: "MIT" }],
          copyrights: [],
        },
      ],
    };
    const { result } = renderHook(() => useNotices(withMeta));

    act(() => result.current.setSearch("Jane Doe"));
    expect(result.current.groups[0]?.components.map((c) => c.name)).toEqual(["left-pad-fork"]);

    act(() => result.current.setSearch("left-pad-fork@1.3.0"));
    expect(result.current.groups[0]?.components.map((c) => c.name)).toEqual(["left-pad-fork"]);
  });

  it("groups by license id", () => {
    const { result } = renderHook(() => useNotices(document));
    act(() => result.current.setGroupBy("license"));
    const keys = result.current.groups.map((g) => g.key).sort();
    expect(keys).toEqual(["GPL-3.0", "MIT"]);
  });

  it("filters by risk tier", () => {
    const { result } = renderHook(() => useNotices(document));
    act(() => result.current.setRiskFilter("copyleft"));
    expect(result.current.filteredCount).toBe(1);
    expect(result.current.groups[0]?.components[0]?.name).toBe("gpl-tool");
  });

  it("honors a custom license risk map", () => {
    const { result } = renderHook(() =>
      useNotices(document, { licenseRiskMap: { MIT: "proprietary" } }),
    );
    act(() => result.current.setRiskFilter("proprietary"));
    expect(result.current.filteredCount).toBe(2);
  });

  it("sorts by package name by default", () => {
    const { result } = renderHook(() => useNotices(document));
    expect(result.current.groups[0]?.components.map((c) => c.name)).toEqual([
      "express",
      "gpl-tool",
      "left-pad",
    ]);
  });

  it("sorts by license, falling back to name within the same license", () => {
    const { result } = renderHook(() => useNotices(document));
    act(() => result.current.setSortBy("license"));
    // gpl-tool is GPL-3.0, express/left-pad are both MIT (sorted by name within the tie).
    expect(result.current.groups[0]?.components.map((c) => c.name)).toEqual([
      "gpl-tool",
      "express",
      "left-pad",
    ]);
  });

  it("paginates at 25 rows per page and resets to page 1 when the filter changes", () => {
    const manyComponents: NoticesDocument = {
      source: "unknown",
      components: Array.from({ length: 30 }, (_, i) => ({
        name: `pkg-${String(i).padStart(2, "0")}`,
        licenses: [{ id: "MIT", name: "MIT" }],
        copyrights: [],
      })),
    };
    const { result } = renderHook(() => useNotices(manyComponents));

    expect(result.current.pageCount).toBe(2);
    expect(result.current.page).toBe(1);
    expect(result.current.groups[0]?.components).toHaveLength(25);

    act(() => result.current.setPage(2));
    expect(result.current.page).toBe(2);
    expect(result.current.groups[0]?.components).toHaveLength(5);

    act(() => result.current.setSearch("pkg-0"));
    expect(result.current.page).toBe(1);
  });
});
