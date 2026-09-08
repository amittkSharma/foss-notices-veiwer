import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { NoticesDocument } from "../../core/types";
import { NoticesViewer } from "./NoticesViewer";

function fixture(name: string): string {
  return readFileSync(path.resolve(process.cwd(), "fixtures", name), "utf-8");
}

const document: NoticesDocument = {
  source: "unknown",
  components: [
    { name: "left-pad", version: "1.3.0", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
    {
      name: "gpl-tool",
      version: "2.0.0",
      licenses: [{ id: "GPL-3.0", name: "GPL-3.0" }],
      copyrights: [],
    },
  ],
};

describe("NoticesViewer", () => {
  it("renders every component with a summary count", () => {
    render(<NoticesViewer document={document} virtualized={false} />);
    expect(screen.getByText("2 of 2 components")).toBeInTheDocument();
    expect(screen.getByText("left-pad")).toBeInTheDocument();
    expect(screen.getByText("gpl-tool")).toBeInTheDocument();
  });

  it("filters the visible rows as the user types in the search box", async () => {
    const user = userEvent.setup();
    render(<NoticesViewer document={document} virtualized={false} />);

    await user.type(screen.getByLabelText("Search components"), "gpl");

    expect(screen.getByText("1 of 2 components")).toBeInTheDocument();
    expect(screen.queryByText("left-pad")).not.toBeInTheDocument();
    expect(screen.getByText("gpl-tool")).toBeInTheDocument();
  });

  it("filters the visible rows by risk tier via the built-in select", async () => {
    const user = userEvent.setup();
    render(<NoticesViewer document={document} virtualized={false} />);

    await user.selectOptions(screen.getByLabelText("Filter by risk"), "copyleft");

    expect(screen.getByText("1 of 2 components")).toBeInTheDocument();
    expect(screen.queryByText("left-pad")).not.toBeInTheDocument();
    expect(screen.getByText("gpl-tool")).toBeInTheDocument();
  });

  it("shows the document's source and generatedAt in the project header", () => {
    const withMeta: NoticesDocument = { ...document, generatedAt: "2026-08-01T12:00:00Z" };
    render(<NoticesViewer document={withMeta} virtualized={false} />);

    expect(screen.getByText("Unknown source")).toBeInTheDocument();
    expect(screen.getByText("Generated 2026-08-01")).toBeInTheDocument();
  });

  it("expands a row to reveal its license text on click", async () => {
    const user = userEvent.setup();
    const withLicenseText: NoticesDocument = {
      source: "unknown",
      components: [
        {
          name: "left-pad",
          version: "1.3.0",
          licenses: [{ id: "MIT", name: "MIT", text: "MIT License full text" }],
          copyrights: [],
        },
      ],
    };
    render(<NoticesViewer document={withLicenseText} virtualized={false} />);

    expect(screen.queryByText("MIT License full text")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /left-pad/ }));
    expect(screen.getByText("MIT License full text")).toBeInTheDocument();
  });

  it("paginates at 25 rows per page and shows no pagination controls under that", () => {
    render(<NoticesViewer document={document} virtualized={false} />);
    expect(screen.queryByLabelText("Pagination")).not.toBeInTheDocument();
  });

  it("shows pagination controls and advances pages once there are more than 25 rows", async () => {
    const user = userEvent.setup();
    const manyComponents: NoticesDocument = {
      source: "unknown",
      components: Array.from({ length: 30 }, (_, i) => ({
        name: `pkg-${String(i).padStart(2, "0")}`,
        licenses: [{ id: "MIT", name: "MIT" }],
        copyrights: [],
      })),
    };
    render(<NoticesViewer document={manyComponents} virtualized={false} />);

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText(/pkg-00/)).toBeInTheDocument();
    expect(screen.queryByText(/pkg-29/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next page" }));

    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByText(/pkg-29/)).toBeInTheDocument();
    expect(screen.queryByText(/pkg-00/)).not.toBeInTheDocument();
  });

  it("defaults to detail view, unchanged from before the view toggle existed", () => {
    render(<NoticesViewer document={document} virtualized={false} />);
    expect(screen.getByRole("button", { name: /left-pad/ })).toBeInTheDocument();
  });

  it("switches to summary view: header-only rows with no expand affordance", async () => {
    const user = userEvent.setup();
    render(<NoticesViewer document={document} virtualized={false} />);

    await user.selectOptions(screen.getByLabelText("View"), "summary");

    expect(screen.getByText("left-pad")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /left-pad/ })).not.toBeInTheDocument();
  });

  it("honors viewMode='summary' as the starting view, without a click", () => {
    render(<NoticesViewer document={document} virtualized={false} viewMode="summary" />);

    expect(screen.getByText("left-pad")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /left-pad/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText("View")).toHaveValue("summary");
  });

  it("still lets the user switch away from a viewMode='summary' start when uncontrolled (no onViewModeChange)", async () => {
    const user = userEvent.setup();
    render(<NoticesViewer document={document} virtualized={false} viewMode="summary" />);

    await user.selectOptions(screen.getByLabelText("View"), "detail");

    expect(screen.getByRole("button", { name: /left-pad/ })).toBeInTheDocument();
  });

  it("shows the source adapter's license disclaimer in an expanded row", async () => {
    const user = userEvent.setup();
    const spdxDocument: NoticesDocument = {
      source: "spdx",
      components: [
        {
          name: "left-pad",
          version: "1.3.0",
          licenses: [{ id: "MIT", name: "MIT" }],
          copyrights: [],
        },
      ],
    };
    render(<NoticesViewer document={spdxDocument} virtualized={false} />);

    await user.click(screen.getByRole("button", { name: /left-pad/ }));

    expect(screen.getByText(/SPDX only records a license identifier/)).toBeInTheDocument();
  });

  it("stays pinned to viewMode when onViewModeChange is passed, until the caller updates it", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <NoticesViewer
        document={document}
        virtualized={false}
        viewMode="detail"
        onViewModeChange={handleChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText("View"), "summary");

    // Notifies the caller...
    expect(handleChange).toHaveBeenCalledWith("summary");
    // ...but the select stays on "detail" (the still-current prop value) until the caller
    // actually re-renders with the new viewMode.
    expect(screen.getByLabelText("View")).toHaveValue("detail");
    expect(screen.getByRole("button", { name: /left-pad/ })).toBeInTheDocument();
  });

  it("reflects an externally-updated viewMode prop when controlled", async () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <NoticesViewer
        document={document}
        virtualized={false}
        viewMode="detail"
        onViewModeChange={handleChange}
      />,
    );

    rerender(
      <NoticesViewer
        document={document}
        virtualized={false}
        viewMode="summary"
        onViewModeChange={handleChange}
      />,
    );

    expect(screen.getByLabelText("View")).toHaveValue("summary");
    expect(screen.queryByRole("button", { name: /left-pad/ })).not.toBeInTheDocument();
  });
});

describe("NoticesViewer with adapter (raw content mode)", () => {
  it("parses, validates, and renders raw SPDX content without a caller-side parser", async () => {
    render(
      <NoticesViewer adapter="spdx" document={fixture("spdx-sample.json")} virtualized={false} />,
    );

    expect(await screen.findByText("left-pad")).toBeInTheDocument();
  });

  it("shows the validation report instead of the viewer when raw content fails schema validation", async () => {
    render(
      <NoticesViewer
        adapter="spdx"
        document={fixture("spdx-invalid-sample.json")}
        virtualized={false}
      />,
    );

    expect(await screen.findByText("✗ Invalid")).toBeInTheDocument();
    expect(screen.queryByLabelText("Group by")).not.toBeInTheDocument();
  });

  it("shows a format-mismatch message when the content shape doesn't match the adapter", async () => {
    render(
      <NoticesViewer
        adapter="black-duck"
        document={fixture("spdx-sample.json")}
        virtualized={false}
      />,
    );

    expect(
      await screen.findByText(/expects a plain-text notices file, but this one looks like JSON/i),
    ).toBeInTheDocument();
  });

  it("re-validates when the adapter changes for the same raw content", async () => {
    const raw = fixture("spdx-sample.json");
    const { rerender } = render(
      <NoticesViewer adapter="spdx" document={raw} virtualized={false} />,
    );
    expect(await screen.findByText("left-pad")).toBeInTheDocument();

    rerender(<NoticesViewer adapter="cyclonedx" document={raw} virtualized={false} />);
    expect(await screen.findByText("✗ Invalid")).toBeInTheDocument();
    expect(screen.queryByText("left-pad")).not.toBeInTheDocument();
  });
});
