import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseSpdxDocument } from "./spdx";

const fixturePath = path.resolve(process.cwd(), "fixtures/spdx-sample.json");
const raw = readFileSync(fixturePath, "utf-8");

describe("parseSpdxDocument", () => {
  it("normalizes SPDX packages into NoticesDocument components", () => {
    const doc = parseSpdxDocument(raw);

    expect(doc.source).toBe("spdx");
    expect(doc.project).toEqual({ name: "foss-notices-viewer-sample" });
    expect(doc.components).toHaveLength(3);

    const leftPad = doc.components.find((c) => c.name === "left-pad");
    expect(leftPad?.version).toBe("1.3.0");
    expect(leftPad?.licenses.map((l) => l.id)).toEqual(["MIT"]);
    expect(leftPad?.purl).toBe("pkg:npm/left-pad@1.3.0");
    expect(leftPad?.copyrights[0]?.text).toContain("James Halliday");
  });

  it("treats NOASSERTION copyright as absent", () => {
    const doc = parseSpdxDocument(raw);
    const express = doc.components.find((c) => c.name === "express");
    expect(express?.copyrights).toHaveLength(0);
  });

  it("splits an SPDX license expression into individual ids", () => {
    const doc = parseSpdxDocument(raw);
    const gplTool = doc.components.find((c) => c.name === "some-gpl-tool");
    expect(gplTool?.licenses.map((l) => l.id)).toEqual(["GPL-3.0-or-later"]);
  });

  it("accepts a pre-parsed object as input", () => {
    const doc = parseSpdxDocument(JSON.parse(raw));
    expect(doc.components).toHaveLength(3);
  });

  it("extracts the author from originator, stripping the agent-type prefix", () => {
    const doc = parseSpdxDocument({
      packages: [
        { name: "with-originator", originator: "Person: Jane Doe (jane@example.com)" },
        { name: "with-supplier-only", supplier: "Organization: Acme Inc." },
        { name: "with-neither", originator: "NOASSERTION" },
      ],
    });
    expect(doc.components.find((c) => c.name === "with-originator")?.author).toBe(
      "Jane Doe (jane@example.com)",
    );
    expect(doc.components.find((c) => c.name === "with-supplier-only")?.author).toBe("Acme Inc.");
    expect(doc.components.find((c) => c.name === "with-neither")?.author).toBeUndefined();
  });

  it("leaves project undefined when the document has no name", () => {
    const doc = parseSpdxDocument({ packages: [{ name: "some-pkg" }] });
    expect(doc.project).toBeUndefined();
  });

  it("classifies dependencies as direct or transitive from the relationships graph", () => {
    const doc = parseSpdxDocument(raw);
    expect(doc.components.find((c) => c.name === "left-pad")?.dependencyType).toBe("direct");
    expect(doc.components.find((c) => c.name === "express")?.dependencyType).toBe("direct");
    expect(doc.components.find((c) => c.name === "some-gpl-tool")?.dependencyType).toBe(
      "transitive",
    );
  });

  it("leaves dependencyType undefined when the document has no relationships", () => {
    const doc = parseSpdxDocument({
      packages: [{ SPDXID: "SPDXRef-Package-some-pkg", name: "some-pkg" }],
    });
    expect(doc.components[0]?.dependencyType).toBeUndefined();
  });
});
