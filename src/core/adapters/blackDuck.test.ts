import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseBlackDuckNotices } from "./blackDuck";

const fixturePath = path.resolve(process.cwd(), "fixtures/blackduck-notices-sample.txt");
const raw = readFileSync(fixturePath, "utf-8");

describe("parseBlackDuckNotices", () => {
  it("parses each divider-bracketed section into a component", () => {
    const doc = parseBlackDuckNotices(raw);

    expect(doc.source).toBe("black-duck");
    expect(doc.components).toHaveLength(2);

    const leftPad = doc.components.find((c) => c.name === "left-pad");
    expect(leftPad?.version).toBe("1.3.0");
    expect(leftPad?.licenses[0]?.id).toBe("MIT License");
    expect(leftPad?.copyrights[0]?.text).toContain("James Halliday");
  });

  it("extracts the license name and version for a second component", () => {
    const doc = parseBlackDuckNotices(raw);
    const gplTool = doc.components.find((c) => c.name === "some-gpl-tool");
    expect(gplTool?.version).toBe("2.0.0");
    expect(gplTool?.licenses[0]?.id).toBe("GNU General Public License v3.0");
  });

  it("does not duplicate the copyright line inside the license text", () => {
    const doc = parseBlackDuckNotices(raw);
    const leftPad = doc.components.find((c) => c.name === "left-pad");
    expect(leftPad?.licenses[0]?.text).not.toContain("James Halliday");
    expect(leftPad?.copyrights[0]?.text).toContain("James Halliday");
  });

  it("supports a custom section delimiter for non-default report templates", () => {
    const customInput = raw.replace(/=/g, "*");
    const doc = parseBlackDuckNotices(customInput, { sectionDelimiter: /^\*{10,}\s*$/m });
    expect(doc.components).toHaveLength(2);
  });
});
