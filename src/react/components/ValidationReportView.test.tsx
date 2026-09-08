import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ValidationReport } from "../../validation/types";
import { ValidationReportView } from "./ValidationReportView";

const validReport: ValidationReport = {
  valid: true,
  format: "spdx",
  standard: "SPDX 2.3 JSON Schema (official, spdx.org)",
  issueCount: 0,
  issues: [],
};

const invalidReport: ValidationReport = {
  valid: false,
  format: "spdx",
  standard: "SPDX 2.3 JSON Schema (official, spdx.org)",
  issueCount: 1,
  issues: [
    {
      line: 4,
      column: 19,
      path: "/creationInfo",
      message: "/creationInfo: must have required property 'creators'",
      suggestion: 'Add the missing "creators" property inside /creationInfo.',
      severity: "error",
    },
  ],
};

describe("ValidationReportView", () => {
  it("renders a clean summary with no issues listed", () => {
    render(<ValidationReportView report={validReport} />);
    expect(screen.getByText("✓ Valid")).toBeInTheDocument();
    expect(screen.getByText("No issues found.")).toBeInTheDocument();
  });

  it("renders each issue with its line, message, and suggestion", () => {
    render(<ValidationReportView report={invalidReport} />);
    expect(screen.getByText("✗ Invalid")).toBeInTheDocument();
    expect(screen.getByText("1 error(s), 0 warning(s).")).toBeInTheDocument();
    expect(screen.getByText("line 4:19")).toBeInTheDocument();
    expect(screen.getByText(/must have required property 'creators'/)).toBeInTheDocument();
    expect(screen.getByText(/Add the missing "creators" property/)).toBeInTheDocument();
  });
});
