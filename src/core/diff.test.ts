import { describe, expect, it } from "vitest";
import { diffNotices } from "./diff";
import type { NoticesDocument } from "./types";

function doc(components: NoticesDocument["components"]): NoticesDocument {
  return { source: "unknown", components };
}

describe("diffNotices", () => {
  const before = doc([
    { name: "a", version: "1.0.0", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
    { name: "b", version: "2.0.0", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
    { name: "c", version: "3.0.0", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
  ]);

  const after = doc([
    { name: "a", version: "1.0.0", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
    { name: "b", version: "2.1.0", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
    {
      name: "d",
      version: "1.0.0",
      licenses: [{ id: "Apache-2.0", name: "Apache-2.0" }],
      copyrights: [],
    },
  ]);

  it("reports components present only in the after document as added", () => {
    const diff = diffNotices(before, after);
    expect(diff.added.map((c) => c.name)).toEqual(["d"]);
  });

  it("reports components present only in the before document as removed", () => {
    const diff = diffNotices(before, after);
    expect(diff.removed.map((c) => c.name)).toEqual(["c"]);
  });

  it("reports a version bump as changed", () => {
    const diff = diffNotices(before, after);
    const change = diff.changed.find((c) => c.name === "b");
    expect(change?.versionChanged).toBe(true);
    expect(change?.licensesChanged).toBe(false);
  });

  it("reports an unchanged component as unchanged", () => {
    const diff = diffNotices(before, after);
    expect(diff.unchanged.map((c) => c.name)).toEqual(["a"]);
  });

  it("flags a license change independently of a version change", () => {
    const relicensed = doc([
      {
        name: "a",
        version: "1.0.0",
        licenses: [{ id: "GPL-3.0", name: "GPL-3.0" }],
        copyrights: [],
      },
    ]);
    const componentA = before.components.find((c) => c.name === "a");
    if (!componentA) throw new Error("fixture missing component 'a'");
    const diff = diffNotices(doc([componentA]), relicensed);
    expect(diff.changed[0]?.licensesChanged).toBe(true);
    expect(diff.changed[0]?.versionChanged).toBe(false);
  });
});
