import { describe, expect, it } from "vitest";
import { queryNotices } from "./query";
import type { NoticesDocument } from "./types";

const document: NoticesDocument = {
  source: "unknown",
  components: [
    {
      name: "left-pad",
      version: "1.3.0",
      licenses: [{ id: "MIT", name: "MIT" }],
      copyrights: [],
    },
    {
      name: "express",
      version: "4.19.0",
      licenses: [{ id: "MIT", name: "MIT" }],
      copyrights: [],
    },
    {
      name: "gnu-tool",
      version: "2.0.0",
      licenses: [{ id: "GPL-3.0", name: "GPL-3.0" }],
      copyrights: [],
    },
  ],
};

describe("queryNotices", () => {
  it("returns every component ungrouped, sorted by name, with no options", () => {
    const result = queryNotices(document);
    expect(result.total).toBe(3);
    expect(result.filteredCount).toBe(3);
    expect(result.groups).toEqual([
      {
        key: "all",
        components: [document.components[1], document.components[2], document.components[0]],
      },
    ]);
  });

  it("filters by search text across name/version/license id", () => {
    const result = queryNotices(document, { search: "gpl" });
    expect(result.filteredCount).toBe(1);
    expect(result.groups[0]?.components[0]?.name).toBe("gnu-tool");
  });

  it("filters by risk tier", () => {
    const result = queryNotices(document, { riskFilter: "copyleft" });
    expect(result.filteredCount).toBe(1);
    expect(result.groups[0]?.components[0]?.name).toBe("gnu-tool");
  });

  it("respects a custom license risk map", () => {
    const result = queryNotices(document, {
      riskFilter: "proprietary",
      licenseRiskMap: { "GPL-3.0": "proprietary" },
    });
    expect(result.filteredCount).toBe(1);
    expect(result.groups[0]?.components[0]?.name).toBe("gnu-tool");
  });

  it("groups by license id", () => {
    const result = queryNotices(document, { groupBy: "license" });
    expect(result.groups.map((g) => g.key)).toEqual(["GPL-3.0", "MIT"]);
    expect(result.groups.find((g) => g.key === "MIT")?.components).toHaveLength(2);
  });

  it("groups by risk tier", () => {
    const result = queryNotices(document, { groupBy: "risk" });
    expect(result.groups.map((g) => g.key).sort()).toEqual(["copyleft", "permissive"]);
  });

  it("paginates rows and clamps an out-of-range page into bounds", () => {
    const page1 = queryNotices(document, { pageSize: 2, page: 1 });
    expect(page1.groups[0]?.components).toHaveLength(2);
    expect(page1.pageCount).toBe(2);

    const page2 = queryNotices(document, { pageSize: 2, page: 2 });
    expect(page2.groups[0]?.components).toHaveLength(1);

    const clamped = queryNotices(document, { pageSize: 2, page: 99 });
    expect(clamped.page).toBe(2);
  });
});
