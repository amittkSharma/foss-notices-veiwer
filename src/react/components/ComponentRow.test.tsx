import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Component } from "../../core/types";
import { ComponentRow } from "./ComponentRow";

function renderExpanded(component: Component) {
  render(<ComponentRow component={component} />);
  return screen.getByRole("button", { name: new RegExp(component.name) });
}

describe("ComponentRow", () => {
  it("shows the license name and the risk tier (with icon) on the collapsed row, dependency type between name and license", () => {
    const component: Component = {
      name: "left-pad",
      version: "1.3.0",
      licenses: [{ id: "MIT", name: "MIT" }],
      copyrights: [],
    };
    const { container } = render(<ComponentRow component={component} />);
    expect(screen.getByText("Permissive")).toBeInTheDocument();
    expect(screen.getByText("MIT")).toBeInTheDocument();
    const summaryEl = container.querySelector(".fnv-row__summary");
    const title = summaryEl?.querySelector(".fnv-row__title");
    const dependency = summaryEl?.querySelector(".fnv-row__dependency");
    const names = summaryEl?.querySelector(".fnv-row__license-names");
    const risks = summaryEl?.querySelector(".fnv-row__risks");
    // Left-to-right order: package name/version, dependency type, license name, then risk.
    expect(summaryEl?.children[0]).toBe(title);
    expect(summaryEl?.children[1]).toBe(dependency);
    expect(summaryEl?.children[2]).toBe(names);
    expect(summaryEl?.children[3]).toBe(risks);
    expect(names?.textContent).toBe("MIT");
    expect(risks?.querySelector(".fnv-row__plain-label")?.textContent).toBe("Permissive");
    expect(risks?.querySelector("svg")).toBeInTheDocument();
  });

  it("shows the version right after the package name, before the dependency type column", () => {
    const component: Component = {
      name: "left-pad",
      version: "1.3.0",
      dependencyType: "direct",
      licenses: [{ id: "MIT", name: "MIT" }],
      copyrights: [],
    };
    const { container } = render(<ComponentRow component={component} />);
    const name = container.querySelector(".fnv-row__name");
    const version = container.querySelector(".fnv-row__version");
    const title = container.querySelector(".fnv-row__title");
    const dependency = container.querySelector(".fnv-row__dependency");
    expect(name?.textContent).toBe("▸left-padv1.3.0");
    expect(version?.textContent).toBe("v1.3.0");
    // Version is nested inside the name column, which comes before the dependency column.
    expect(name?.contains(version)).toBe(true);
    const summaryEl = container.querySelector(".fnv-row__summary");
    const children = Array.from(summaryEl?.children ?? []);
    expect(children.indexOf(title as Element)).toBe(0);
    expect(children.indexOf(dependency as Element)).toBe(1);
  });

  it("shows a license name/id with no text/url as a single 'No information' line in the expanded detail", async () => {
    const user = userEvent.setup();
    const component: Component = {
      name: "dual-licensed-lib",
      version: "1.0.0",
      author: "Some Author",
      licenses: [
        { id: "MIT", name: "MIT" },
        { id: "Apache-2.0", name: "Apache-2.0" },
      ],
      copyrights: [{ text: "Copyright (c) someone" }],
    };
    const summary = renderExpanded(component);
    await user.click(summary);

    // "Permissive" appears once per license in the collapsed row's risk column.
    expect(screen.getAllByText("Permissive")).toHaveLength(2);
    // "MIT"/"Apache-2.0" each appear twice: once in the collapsed row's license-name
    // column, once in the expanded detail's license section.
    expect(screen.getAllByText("MIT")).toHaveLength(2);
    expect(screen.getAllByText("Apache-2.0")).toHaveLength(2);
    // Neither license carries text/url (expression-derived licenses never do) — each shows
    // ONE combined "No information" line, not a separate one for url and one for text.
    // Plus one more for the missing package URL.
    expect(screen.getAllByText("No information")).toHaveLength(3);
  });

  it("renders author information in the expanded detail", async () => {
    const user = userEvent.setup();
    const component: Component = {
      name: "left-pad",
      version: "1.3.0",
      author: "Jane Doe",
      licenses: [{ id: "MIT", name: "MIT" }],
      copyrights: [],
    };
    const summary = renderExpanded(component);
    await user.click(summary);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("renders the package URL in the expanded detail", async () => {
    const user = userEvent.setup();
    const component: Component = {
      name: "left-pad",
      version: "1.3.0",
      purl: "pkg:npm/left-pad@1.3.0",
      licenses: [{ id: "MIT", name: "MIT" }],
      copyrights: [],
    };
    const summary = renderExpanded(component);
    await user.click(summary);

    expect(screen.getByText("pkg:npm/left-pad@1.3.0")).toBeInTheDocument();
  });

  it("states 'No information' instead of leaving author/copyright blank", async () => {
    const user = userEvent.setup();
    const component: Component = {
      name: "left-pad",
      version: "1.3.0",
      licenses: [],
      copyrights: [],
    };
    const summary = renderExpanded(component);
    await user.click(summary);

    // Once for the collapsed row's badge, once each for the missing author,
    // package URL, copyright, and license section in the expanded detail.
    expect(screen.getAllByText("No information")).toHaveLength(5);
  });

  it("shows the dependency type badge on the collapsed row", () => {
    const component: Component = {
      name: "left-pad",
      version: "1.3.0",
      dependencyType: "direct",
      licenses: [{ id: "MIT", name: "MIT" }],
      copyrights: [],
    };
    render(<ComponentRow component={component} />);
    expect(screen.getByText("Direct")).toBeInTheDocument();
  });

  it("shows 'Unknown' for the dependency type when the source format has no graph", () => {
    const component: Component = {
      name: "left-pad",
      version: "1.3.0",
      licenses: [{ id: "MIT", name: "MIT" }],
      copyrights: [],
    };
    render(<ComponentRow component={component} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("places the dependency type in its own column, between the name/version and the license/risk columns", () => {
    const component: Component = {
      name: "left-pad",
      version: "1.3.0",
      dependencyType: "direct",
      licenses: [{ id: "MIT", name: "MIT" }],
      copyrights: [],
    };
    const { container } = render(<ComponentRow component={component} />);
    const title = container.querySelector(".fnv-row__title");
    const dependency = container.querySelector(".fnv-row__dependency");
    const names = container.querySelector(".fnv-row__license-names");
    const risks = container.querySelector(".fnv-row__risks");
    expect(title?.textContent).not.toContain("Direct");
    expect(dependency?.textContent).toBe("Direct");
    expect(names?.textContent).not.toContain("Direct");
    expect(risks?.textContent).not.toContain("Direct");
  });

  it("renders the dependency type and risk as plain left-aligned text, not colored pills", () => {
    const component: Component = {
      name: "left-pad",
      version: "1.3.0",
      dependencyType: "direct",
      licenses: [{ id: "MIT", name: "MIT" }],
      copyrights: [],
    };
    const { container } = render(<ComponentRow component={component} />);
    expect(container.querySelector(".fnv-badge--dependency-direct")).toBeNull();
    expect(container.querySelector(".fnv-badge--permissive")).toBeNull();
    const dependencyLabel = container.querySelector(".fnv-row__dependency .fnv-row__plain-label");
    const riskLabel = container.querySelector(".fnv-row__risks .fnv-row__plain-label");
    expect(dependencyLabel?.textContent).toBe("Direct");
    expect(riskLabel?.textContent).toBe("Permissive");
  });

  describe("license disclaimer", () => {
    const component: Component = {
      name: "left-pad",
      version: "1.3.0",
      licenses: [{ id: "MIT", name: "MIT" }],
      copyrights: [],
    };

    it("shows the adapter's license-reliability disclaimer in the expanded detail when a source is given", async () => {
      const user = userEvent.setup();
      render(<ComponentRow component={component} source="spdx" />);
      await user.click(screen.getByRole("button", { name: /left-pad/ }));

      expect(screen.getByText(/SPDX only records a license identifier/)).toBeInTheDocument();
    });

    it("shows a different disclaimer for a different source", async () => {
      const user = userEvent.setup();
      render(<ComponentRow component={component} source="generate-license-file" />);
      await user.click(screen.getByRole("button", { name: /left-pad/ }));

      expect(screen.getByText(/best-effort guess/)).toBeInTheDocument();
    });

    it("shows no disclaimer when source is omitted", async () => {
      const user = userEvent.setup();
      const { container } = render(<ComponentRow component={component} />);
      await user.click(screen.getByRole("button", { name: /left-pad/ }));

      expect(container.querySelector(".fnv-row__license-disclaimer")).not.toBeInTheDocument();
    });

    it("shows no disclaimer for a source with none defined (e.g. 'unknown')", async () => {
      const user = userEvent.setup();
      const { container } = render(<ComponentRow component={component} source="unknown" />);
      await user.click(screen.getByRole("button", { name: /left-pad/ }));

      expect(container.querySelector(".fnv-row__license-disclaimer")).not.toBeInTheDocument();
    });
  });

  describe("summary view", () => {
    const component: Component = {
      name: "left-pad",
      version: "1.3.0",
      author: "Jane Doe",
      dependencyType: "transitive",
      licenses: [{ id: "MIT", name: "MIT" }],
      copyrights: [{ text: "Copyright (c) someone" }],
    };

    it("shows only the header: name, version, dependency type, license, and risk", () => {
      render(<ComponentRow component={component} viewMode="summary" />);
      expect(screen.getByText("left-pad")).toBeInTheDocument();
      expect(screen.getByText("v1.3.0")).toBeInTheDocument();
      expect(screen.getByText("Transitive")).toBeInTheDocument();
      expect(screen.getByText("Permissive")).toBeInTheDocument();
      expect(screen.getByText("MIT")).toBeInTheDocument();
    });

    it("places name/version, dependency type, license name, and risk left-to-right, all top-aligned", () => {
      const { container } = render(<ComponentRow component={component} viewMode="summary" />);
      const summaryEl = container.querySelector(".fnv-row__summary");
      const title = summaryEl?.querySelector(".fnv-row__title");
      const dependency = summaryEl?.querySelector(".fnv-row__dependency");
      const names = summaryEl?.querySelector(".fnv-row__license-names");
      const risks = summaryEl?.querySelector(".fnv-row__risks");
      // Left-to-right order, as direct children of the same top-aligned row: package
      // name/version, dependency type, license name, then risk.
      expect(summaryEl?.children[0]).toBe(title);
      expect(summaryEl?.children[1]).toBe(dependency);
      expect(summaryEl?.children[2]).toBe(names);
      expect(summaryEl?.children[3]).toBe(risks);
      expect(names?.textContent).toBe("MIT");
      expect(risks?.querySelector(".fnv-row__plain-label")?.textContent).toBe("Permissive");
    });

    it("has no click-to-expand affordance", () => {
      render(<ComponentRow component={component} viewMode="summary" />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("never renders author or copyright detail", () => {
      render(<ComponentRow component={component} viewMode="summary" />);
      expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
      expect(screen.queryByText("Copyright (c) someone")).not.toBeInTheDocument();
    });
  });
});
