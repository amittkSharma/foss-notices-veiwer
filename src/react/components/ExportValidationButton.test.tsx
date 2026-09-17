import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ValidationReport } from "../../validation/types";
import { ExportValidationButton } from "./ExportValidationButton";

const report: ValidationReport = {
  valid: true,
  format: "spdx",
  standard: "SPDX 2.3 JSON Schema",
  issueCount: 0,
  issues: [],
};

describe("ExportValidationButton", () => {
  let createObjectURL: ReturnType<typeof vi.fn<typeof URL.createObjectURL>>;
  let revokeObjectURL: ReturnType<typeof vi.fn<typeof URL.revokeObjectURL>>;
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

  it("builds an .xlsx blob and triggers a download when clicked", async () => {
    const user = userEvent.setup();
    render(<ExportValidationButton report={report} filename="custom-report.xlsx" />);

    await user.click(screen.getByRole("button", { name: "Export validation report" }));

    expect(
      await screen.findByRole("button", { name: "Export validation report" }, { timeout: 5000 }),
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
    render(<ExportValidationButton report={report} />);

    await user.click(screen.getByRole("button", { name: "Export validation report" }));

    expect(
      await screen.findByRole("button", { name: "Export failed — retry" }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
