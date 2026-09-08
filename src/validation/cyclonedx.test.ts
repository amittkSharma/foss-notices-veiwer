import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateCycloneDxBom } from "./cyclonedx";

const read = (name: string) => readFileSync(path.resolve(process.cwd(), "fixtures", name), "utf-8");

describe("validateCycloneDxBom", () => {
  it("reports no issues for a BOM satisfying the official CycloneDX 1.5 schema", () => {
    const report = validateCycloneDxBom(read("cyclonedx-sample.json"));
    expect(report.valid).toBe(true);
    expect(report.issueCount).toBe(0);
    expect(report.format).toBe("cyclonedx");
    expect(report.standard).toContain("CycloneDX 1.5");
  });

  it("collects every schema violation in one pass, not just the first", () => {
    const report = validateCycloneDxBom(read("cyclonedx-invalid-sample.json"));
    expect(report.valid).toBe(false);
    expect(report.issueCount).toBeGreaterThan(1);

    const missingVersion = report.issues.find(
      (issue) => issue.message.includes("'version'") && issue.path === "/",
    );
    expect(missingVersion?.line).toBe(1);

    const missingName = report.issues.find(
      (issue) => issue.path === "/components/1" && issue.message.includes("'name'"),
    );
    expect(missingName).toBeDefined();
  });

  it("resolves the split spdx/jsf schema files referenced by the BOM schema", () => {
    // If `extraSchemas` weren't wired up, ajv.compile would throw before this ever ran.
    const report = validateCycloneDxBom(read("cyclonedx-sample.json"));
    expect(report).toBeDefined();
  });
});
