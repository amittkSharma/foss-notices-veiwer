import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCycloneDxBom } from "./cyclonedx";

const fixturePath = path.resolve(process.cwd(), "fixtures/cyclonedx-sample.json");
const raw = readFileSync(fixturePath, "utf-8");

describe("parseCycloneDxBom", () => {
  it("normalizes CycloneDX components into NoticesDocument components", () => {
    const doc = parseCycloneDxBom(raw);

    expect(doc.source).toBe("cyclonedx");
    expect(doc.generatedAt).toBe("2026-08-01T00:00:00Z");
    expect(doc.project).toEqual({ name: "checkout-service", version: "2.4.0" });
    expect(doc.components).toHaveLength(3);

    const lodash = doc.components.find((c) => c.name === "lodash");
    expect(lodash?.licenses).toEqual([{ id: "MIT", name: "MIT" }]);
    expect(lodash?.homepage).toBe("https://lodash.com");
    expect(lodash?.copyrights[0]?.text).toContain("OpenJS Foundation");
  });

  it("extracts the author field, falling back to the supplier name", () => {
    const bom = {
      bomFormat: "CycloneDX",
      specVersion: "1.5",
      components: [
        { type: "library", name: "with-author", author: "Acme Inc" },
        {
          type: "library",
          name: "with-supplier-only",
          supplier: { name: "Supplier Org" },
        },
        { type: "library", name: "with-neither" },
      ],
    };
    const doc = parseCycloneDxBom(bom);
    expect(doc.components.find((c) => c.name === "with-author")?.author).toBe("Acme Inc");
    expect(doc.components.find((c) => c.name === "with-supplier-only")?.author).toBe(
      "Supplier Org",
    );
    expect(doc.components.find((c) => c.name === "with-neither")?.author).toBeUndefined();
  });

  it("expands a license expression into individual license entries", () => {
    const doc = parseCycloneDxBom(raw);
    const dual = doc.components.find((c) => c.name === "dual-licensed-lib");
    expect(dual?.licenses.map((l) => l.id)).toEqual(["MIT", "Apache-2.0"]);
  });

  it("passes through a license id that has no known risk classification", () => {
    const doc = parseCycloneDxBom(raw);
    const agpl = doc.components.find((c) => c.name === "agpl-lib");
    expect(agpl?.licenses[0]?.id).toBe("AGPL-3.0-only");
  });

  it("leaves project undefined when metadata.component is absent", () => {
    const bom = {
      bomFormat: "CycloneDX",
      specVersion: "1.5",
      components: [{ type: "library", name: "with-neither" }],
    };
    const doc = parseCycloneDxBom(bom);
    expect(doc.project).toBeUndefined();
  });

  it("classifies dependencies as direct or transitive from the dependencies graph", () => {
    const doc = parseCycloneDxBom(raw);
    expect(doc.components.find((c) => c.name === "lodash")?.dependencyType).toBe("direct");
    expect(doc.components.find((c) => c.name === "dual-licensed-lib")?.dependencyType).toBe(
      "direct",
    );
    expect(doc.components.find((c) => c.name === "agpl-lib")?.dependencyType).toBe("transitive");
  });

  it("leaves dependencyType undefined when the bom has no dependencies array", () => {
    const bom = {
      bomFormat: "CycloneDX",
      specVersion: "1.5",
      metadata: { component: { "bom-ref": "root", name: "root-project" } },
      components: [{ type: "library", "bom-ref": "some-lib", name: "some-lib" }],
    };
    const doc = parseCycloneDxBom(bom);
    expect(doc.components[0]?.dependencyType).toBeUndefined();
  });
});
