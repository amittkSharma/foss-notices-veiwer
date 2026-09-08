import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateGenerateLicenseFileText } from "./generateLicenseFile";

const read = (name: string) => readFileSync(path.resolve(process.cwd(), "fixtures", name), "utf-8");

describe("validateGenerateLicenseFileText", () => {
  it("reports no issues for real generate-license-file output, including its trailing repeated banner", () => {
    const report = validateGenerateLicenseFileText(read("generate-license-file-sample.txt"));
    expect(report.valid).toBe(true);
    expect(report.issueCount).toBe(0);
    expect(report.format).toBe("generate-license-file");
  });

  it("flags a block with no license heading, with a line number and suggestion", () => {
    const report = validateGenerateLicenseFileText(
      read("generate-license-file-invalid-sample.txt"),
    );
    expect(report.valid).toBe(false);
    const issue = report.issues.find((i) => i.message.includes("no"));
    expect(issue?.message).toContain("contains the following license");
    expect(issue?.line).toBeGreaterThan(1);
    expect(issue?.suggestion).toBeTruthy();
  });

  it("warns (without failing) on a dependency line missing a version", () => {
    const report = validateGenerateLicenseFileText(
      [
        "The following npm package may be included in this product:",
        "",
        "- left-pad",
        "",
        "This package contains the following license:",
        "MIT License",
      ].join("\n"),
    );
    const warning = report.issues.find((i) => i.severity === "warning");
    expect(warning?.message).toContain("left-pad");
    expect(warning?.suggestion).toContain("left-pad@<version>");
  });

  it("reports an error when there are no separator lines at all", () => {
    const report = validateGenerateLicenseFileText("just some unrelated text");
    expect(report.valid).toBe(false);
    expect(report.issueCount).toBe(1);
    expect(report.issues[0]?.severity).toBe("error");
  });
});
