import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { NoticesDocument } from "../../core/types";
import { DiffView } from "./DiffView";

const before: NoticesDocument = {
  source: "unknown",
  components: [
    { name: "a", version: "1.0.0", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
    { name: "b", version: "2.0.0", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
  ],
};

const after: NoticesDocument = {
  source: "unknown",
  components: [
    { name: "a", version: "1.1.0", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
    {
      name: "c",
      version: "1.0.0",
      licenses: [{ id: "Apache-2.0", name: "Apache-2.0" }],
      copyrights: [],
    },
  ],
};

describe("DiffView", () => {
  it("renders added, removed, and changed sections", () => {
    render(<DiffView before={before} after={after} />);

    expect(screen.getByText("Added (1)")).toBeInTheDocument();
    expect(screen.getByText("c@1.0.0")).toBeInTheDocument();

    expect(screen.getByText("Removed (1)")).toBeInTheDocument();
    expect(screen.getByText("b@2.0.0")).toBeInTheDocument();

    expect(screen.getByText("Changed (1)")).toBeInTheDocument();
    expect(screen.getByText(/a: 1\.0\.0 → 1\.1\.0/)).toBeInTheDocument();
  });
});
