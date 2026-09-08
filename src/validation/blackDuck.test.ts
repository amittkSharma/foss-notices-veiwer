import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateBlackDuckNotices } from "./blackDuck";

const read = (name: string) => readFileSync(path.resolve(process.cwd(), "fixtures", name), "utf-8");

describe("validateBlackDuckNotices", () => {
  it("reports no issues for a real Black Duck Notices Report export", () => {
    const report = validateBlackDuckNotices(read("blackduck-notices-sample.txt"));
    expect(report.valid).toBe(true);
    expect(report.issueCount).toBe(0);
    expect(report.format).toBe("black-duck");
  });

  it("errors with the correct line when a section header doesn't match '<name> <version>'", () => {
    const report = validateBlackDuckNotices(read("blackduck-invalid-sample.txt"));
    const headerIssue = report.issues.find((i) => i.path === "(section header)");
    expect(headerIssue?.severity).toBe("error");
    expect(headerIssue?.line).toBe(4); // the "1.3.0" line itself, not the delimiter above it
    expect(headerIssue?.message).toContain('"1.3.0"');
    expect(report.valid).toBe(false);
  });

  it("warns when a section body has no Copyright line", () => {
    const report = validateBlackDuckNotices(read("blackduck-invalid-sample.txt"));
    const bodyIssue = report.issues.find((i) => i.path === "(section body)");
    expect(bodyIssue?.severity).toBe("warning");
  });

  it("reports an error when no section delimiter lines are found", () => {
    const report = validateBlackDuckNotices("no delimiters in this text at all");
    expect(report.valid).toBe(false);
    expect(report.issueCount).toBe(1);
    expect(report.issues[0]?.severity).toBe("error");
  });
});
