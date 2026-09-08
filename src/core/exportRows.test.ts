import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseBlackDuckNotices } from "./adapters/blackDuck";
import { parseCycloneDxBom } from "./adapters/cyclonedx";
import { parseGenerateLicenseFileText } from "./adapters/generateLicenseFile";
import { parseSpdxDocument } from "./adapters/spdx";
import { toExportRows } from "./exportRows";

function fixture(name: string) {
  return readFileSync(path.resolve(process.cwd(), "fixtures", name), "utf-8");
}

describe("toExportRows", () => {
  it("produces the same row shape for every adapter's output", () => {
    const documents = [
      parseSpdxDocument(fixture("spdx-sample.json")),
      parseCycloneDxBom(fixture("cyclonedx-sample.json")),
      parseGenerateLicenseFileText(fixture("generate-license-file-sample.txt")),
      parseBlackDuckNotices(fixture("blackduck-notices-sample.txt")),
    ];

    for (const doc of documents) {
      const rows = toExportRows(doc);
      expect(rows).toHaveLength(doc.components.length);
      for (const row of rows) {
        expect(row).toEqual(
          expect.objectContaining({
            name: expect.any(String),
            version: expect.any(String),
            license: expect.any(String),
            risk: expect.any(String),
            author: expect.any(String),
            purl: expect.any(String),
          }),
        );
      }
    }
  });

  it("reports the SPDX-derived author (originator) and a humanized risk label", () => {
    const rows = toExportRows(parseSpdxDocument(fixture("spdx-sample.json")));
    const leftPad = rows.find((r) => r.name === "left-pad");
    expect(leftPad?.author).toBe("James Halliday (mail@substack.net)");
    expect(leftPad?.license).toBe("MIT");
    expect(leftPad?.risk).toBe("Permissive");
    expect(leftPad?.purl).toBe("pkg:npm/left-pad@1.3.0");
  });

  it("joins multiple licenses with '; ' and reports the worst risk among them", () => {
    const doc = {
      source: "unknown" as const,
      components: [
        {
          name: "dual-licensed",
          licenses: [
            { id: "MIT", name: "MIT" },
            { id: "GPL-3.0", name: "GPL-3.0" },
          ],
          copyrights: [],
        },
      ],
    };
    const [row] = toExportRows(doc);
    expect(row?.license).toBe("MIT; GPL-3.0");
    expect(row?.risk).toBe("Copyleft");
  });

  it("states 'No information' rather than an empty string for missing fields", () => {
    const doc = {
      source: "unknown" as const,
      components: [{ name: "bare-package", licenses: [], copyrights: [] }],
    };
    const [row] = toExportRows(doc);
    expect(row).toEqual({
      name: "bare-package",
      version: "No information",
      license: "No information",
      risk: "Unknown",
      author: "No information",
      purl: "No information",
    });
  });

  it("honors a custom license risk map", () => {
    const doc = {
      source: "unknown" as const,
      components: [
        { name: "internal-lib", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
      ],
    };
    const [row] = toExportRows(doc, { licenseRiskMap: { MIT: "proprietary" } });
    expect(row?.risk).toBe("Proprietary");
  });
});
