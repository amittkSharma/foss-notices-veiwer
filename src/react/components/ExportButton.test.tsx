import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NoticesDocument } from "../../core/types";
import { ExportButton } from "./ExportButton";

const document: NoticesDocument = {
  source: "unknown",
  components: [
    { name: "left-pad", version: "1.3.0", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
  ],
};

describe("ExportButton", () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => "blob:mock-url");
    revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    clickSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("builds an .xlsx blob and triggers a download when the main button is clicked", async () => {
    const user = userEvent.setup();
    render(<ExportButton document={document} filename="custom-notices.xlsx" />);

    await user.click(screen.getByRole("button", { name: "Export to Excel" }));

    expect(
      await screen.findByRole("button", { name: "Export to Excel" }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const [blob] = createObjectURL.mock.calls[0] as [Blob];
    expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("falls back to an error state if the export fails", async () => {
    const user = userEvent.setup();
    createObjectURL.mockImplementation(() => {
      throw new Error("boom");
    });
    render(<ExportButton document={document} />);

    await user.click(screen.getByRole("button", { name: "Export to Excel" }));

    expect(
      await screen.findByRole("button", { name: "Export failed — retry" }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("opens a dropdown with Excel/JSON options when the caret is clicked", async () => {
    const user = userEvent.setup();
    render(<ExportButton document={document} />);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Choose export format" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Export as Excel" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Export as JSON" })).toBeInTheDocument();
  });

  it("builds a JSON blob named notices.json when 'Export as JSON' is chosen from the menu", async () => {
    const user = userEvent.setup();
    render(<ExportButton document={document} />);

    await user.click(screen.getByRole("button", { name: "Choose export format" }));
    await user.click(screen.getByRole("menuitem", { name: "Export as JSON" }));

    expect(
      await screen.findByRole("button", { name: "Export to Excel" }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const [blob] = createObjectURL.mock.calls[0] as [Blob];
    expect(blob.type).toBe("application/json");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu when clicking outside of it", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <ExportButton document={document} />
        <button type="button">Outside</button>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Choose export format" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
