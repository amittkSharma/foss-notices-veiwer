import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateSpdxDocument } from "./spdx";

const read = (name: string) => readFileSync(path.resolve(process.cwd(), "fixtures", name), "utf-8");

describe("validateSpdxDocument", () => {
  it("reports no issues for a document satisfying the official SPDX 2.3 schema", () => {
    const report = validateSpdxDocument(read("spdx-sample.json"));
    expect(report.valid).toBe(true);
    expect(report.issueCount).toBe(0);
    expect(report.format).toBe("spdx");
    expect(report.standard).toContain("SPDX 2.3");
  });

  it("collects every schema violation in one pass, not just the first", () => {
    const report = validateSpdxDocument(read("spdx-invalid-sample.json"));
    expect(report.valid).toBe(false);
    expect(report.issueCount).toBeGreaterThan(1);

    const missingSpdxId = report.issues.find((issue) => issue.message.includes("'SPDXID'"));
    expect(missingSpdxId?.line).toBe(1);
    expect(missingSpdxId?.suggestion).toContain("SPDXID");

    const wrongType = report.issues.find((issue) => issue.path.endsWith("/versionInfo"));
    expect(wrongType?.message).toContain("must be string");

    const extraProperty = report.issues.find((issue) =>
      issue.message.includes("additional properties"),
    );
    expect(extraProperty?.suggestion).toContain("packageOwner");
  });

  it("reports a line/column for a JSON syntax error instead of throwing", () => {
    const report = validateSpdxDocument('{ "spdxVersion": "SPDX-2.3", ');
    expect(report.valid).toBe(false);
    expect(report.issueCount).toBe(1);
    expect(report.issues[0]?.message).toContain("isn't valid JSON");
  });

  it("accepts a pre-parsed object as input", () => {
    const report = validateSpdxDocument(JSON.parse(read("spdx-sample.json")));
    expect(report.valid).toBe(true);
  });
});
