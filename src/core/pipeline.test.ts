import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FORMAT_IDS, checkFormatMatch, parseByFormat, validateByFormat } from "./pipeline";

function fixture(name: string): string {
  return readFileSync(path.resolve(process.cwd(), "fixtures", name), "utf-8");
}

describe("FORMAT_IDS", () => {
  it("lists all four adapters, in the order shown in format pickers", () => {
    expect(FORMAT_IDS).toEqual(["spdx", "cyclonedx", "generate-license-file", "black-duck"]);
  });
});

describe("parseByFormat", () => {
  it("dispatches to the matching adapter for every format", () => {
    expect(parseByFormat("spdx", fixture("spdx-sample.json")).source).toBe("spdx");
    expect(parseByFormat("cyclonedx", fixture("cyclonedx-sample.json")).source).toBe("cyclonedx");
    expect(
      parseByFormat("generate-license-file", fixture("generate-license-file-sample.txt")).source,
    ).toBe("generate-license-file");
    expect(parseByFormat("black-duck", fixture("blackduck-notices-sample.txt")).source).toBe(
      "black-duck",
    );
  });

  it("passes a custom sectionDelimiter through to the Black Duck adapter", () => {
    const text = "###\nleft-pad 1.3.0\nLicense: MIT\n###\nCopyright Jane Doe\n###";
    const doc = parseByFormat("black-duck", text, { sectionDelimiter: /^###\s*$/m });
    expect(doc.components).toHaveLength(1);
    expect(doc.components[0]?.name).toBe("left-pad");
  });
});

describe("validateByFormat", () => {
  it("dispatches to the matching validator for every format", async () => {
    await expect(validateByFormat("spdx", fixture("spdx-sample.json"))).resolves.toMatchObject({
      valid: true,
      format: "spdx",
    });
    await expect(
      validateByFormat("cyclonedx", fixture("cyclonedx-sample.json")),
    ).resolves.toMatchObject({ valid: true, format: "cyclonedx" });
  });

  it("passes a custom sectionDelimiter through to the Black Duck validator", async () => {
    const text = "###\nleft-pad 1.3.0\nLicense: MIT\n###\nCopyright Jane Doe\n###";
    await expect(
      validateByFormat("black-duck", text, { sectionDelimiter: /^###\s*$/m }),
    ).resolves.toMatchObject({ valid: true });
  });
});

describe("checkFormatMatch", () => {
  it("flags JSON-format input that fails to parse as JSON", () => {
    expect(checkFormatMatch("spdx", "not json")).toContain("must be valid JSON");
  });

  it("flags plain-text-format input that looks like JSON", () => {
    expect(checkFormatMatch("generate-license-file", '{"a":1}')).toContain("looks like JSON");
  });

  it("passes well-formed input for its own format", () => {
    expect(checkFormatMatch("spdx", fixture("spdx-sample.json"))).toBeNull();
    expect(checkFormatMatch("black-duck", fixture("blackduck-notices-sample.txt"))).toBeNull();
  });
});
