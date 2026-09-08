import type { NoticesDocument } from "foss-notices-viewer";
import blackDuckInvalidRaw from "../../fixtures/blackduck-invalid-sample.txt?raw";
import blackDuckRaw from "../../fixtures/blackduck-notices-sample.txt?raw";
import cyclonedxInvalidRaw from "../../fixtures/cyclonedx-invalid-sample.json?raw";
import cyclonedxRaw from "../../fixtures/cyclonedx-sample.json?raw";
import generateLicenseFileInvalidRaw from "../../fixtures/generate-license-file-invalid-sample.txt?raw";
import generateLicenseFileRaw from "../../fixtures/generate-license-file-sample.txt?raw";
import spdxInvalidRaw from "../../fixtures/spdx-invalid-sample.json?raw";
import spdxRaw from "../../fixtures/spdx-sample.json?raw";

export type FixtureId = "spdx" | "cyclonedx" | "generate-license-file" | "black-duck";

export const FIXTURE_IDS: FixtureId[] = [
  "spdx",
  "cyclonedx",
  "generate-license-file",
  "black-duck",
];

export interface FixtureMeta {
  label: string;
  raw: string;
}

export const FIXTURES: Record<FixtureId, FixtureMeta> = {
  spdx: {
    label: "SPDX",
    raw: spdxRaw,
  },
  cyclonedx: {
    label: "CycloneDX",
    raw: cyclonedxRaw,
  },
  "generate-license-file": {
    label: "generate-license-file",
    raw: generateLicenseFileRaw,
  },
  "black-duck": {
    label: "Black Duck",
    raw: blackDuckRaw,
  },
};

// A deliberately non-compliant sample per format, purely to demonstrate the schema
// validator catching real issues — each still *parses* fine (the adapters are lenient),
// which is exactly the point: parsing succeeding doesn't mean the file is spec-valid.
export const INVALID_FIXTURES: Record<FixtureId, string> = {
  spdx: spdxInvalidRaw,
  cyclonedx: cyclonedxInvalidRaw,
  "generate-license-file": generateLicenseFileInvalidRaw,
  "black-duck": blackDuckInvalidRaw,
};

// A synthetic large document (120 components) purpose-built to demonstrate paging past a
// single page — at PAGE_SIZE=25 this reaches 5 pages (4 full pages + a 20-item last page).
const PAGINATION_LICENSE_POOL = [
  { id: "MIT", name: "MIT" },
  { id: "Apache-2.0", name: "Apache-2.0" },
  { id: "ISC", name: "ISC" },
  { id: "BSD-3-Clause", name: "BSD-3-Clause" },
  { id: "LGPL-2.1-only", name: "LGPL-2.1-only" },
  { id: "GPL-3.0-only", name: "GPL-3.0-only" },
  { id: "Proprietary-Internal", name: "Proprietary-Internal" },
];

export const PAGINATION_DEMO_DOCUMENT: NoticesDocument = {
  source: "unknown",
  project: { name: "big-monorepo-app", version: "9.1.0" },
  components: Array.from({ length: 120 }, (_, i) => {
    const license = PAGINATION_LICENSE_POOL[i % PAGINATION_LICENSE_POOL.length];
    return {
      name: `demo-package-${String(i + 1).padStart(3, "0")}`,
      version: `${1 + (i % 5)}.${i % 10}.0`,
      author: i % 3 === 0 ? `Contributor ${i}` : undefined,
      licenses: [license],
      copyrights: [],
    };
  }),
};

// A synthetic before/after pair (not tied to any fixture format) purpose-built to
// show every DiffView bucket at once: an unchanged package, a version bump, an
// added package, and a removed package.
export const DIFF_BEFORE: NoticesDocument = {
  source: "unknown",
  components: [
    { name: "left-pad", version: "1.3.0", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
    { name: "express", version: "4.18.0", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
    { name: "old-dep", version: "1.0.0", licenses: [{ id: "ISC", name: "ISC" }], copyrights: [] },
  ],
};

export const DIFF_AFTER: NoticesDocument = {
  source: "unknown",
  components: [
    { name: "left-pad", version: "1.3.0", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
    { name: "express", version: "4.19.2", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
    {
      name: "new-dep",
      version: "2.1.0",
      licenses: [{ id: "GPL-3.0", name: "GPL-3.0" }],
      copyrights: [],
    },
  ],
};
