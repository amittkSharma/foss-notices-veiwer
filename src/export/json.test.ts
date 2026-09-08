import { describe, expect, it } from "vitest";
import type { NoticesDocument } from "../core/types";
import { exportNoticesToJson } from "./json";

const document: NoticesDocument = {
  source: "unknown",
  components: [
    {
      name: "left-pad",
      version: "1.3.0",
      author: "James Halliday",
      purl: "pkg:npm/left-pad@1.3.0",
      licenses: [{ id: "MIT", name: "MIT" }],
      copyrights: [],
    },
    { name: "bare-package", licenses: [], copyrights: [] },
  ],
};

describe("exportNoticesToJson", () => {
  it("serializes the same flat rows as the Excel export to indented JSON bytes", () => {
    const bytes = exportNoticesToJson(document);

    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("\n"); // indented, not minified
    expect(JSON.parse(text)).toEqual([
      {
        name: "left-pad",
        version: "1.3.0",
        license: "MIT",
        risk: "Permissive",
        author: "James Halliday",
        purl: "pkg:npm/left-pad@1.3.0",
      },
      {
        name: "bare-package",
        version: "No information",
        license: "No information",
        risk: "Unknown",
        author: "No information",
        purl: "No information",
      },
    ]);
  });

  it("honors a custom license risk map", () => {
    const doc: NoticesDocument = {
      source: "unknown",
      components: [
        { name: "internal-lib", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
      ],
    };
    const rows = JSON.parse(
      new TextDecoder().decode(
        exportNoticesToJson(doc, { licenseRiskMap: { MIT: "proprietary" } }),
      ),
    );
    expect(rows[0].risk).toBe("Proprietary");
  });
});
