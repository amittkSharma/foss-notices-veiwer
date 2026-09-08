import type { NoticesDocument } from "foss-notices-viewer";

// Hand-built, README-screenshot-only fixtures — deliberately varied (every risk tier, mixed
// direct/transitive, an author + purl on most rows) so a single screenshot shows the viewer at
// its most representative, not its sparsest test fixture.
export const SCREENSHOT_DOCUMENT: NoticesDocument = {
  source: "spdx",
  generatedAt: "2026-08-01T00:00:00Z",
  project: { name: "checkout-service", version: "4.2.0" },
  components: [
    {
      name: "express",
      version: "4.19.2",
      author: "TJ Holowaychuk",
      purl: "pkg:npm/express@4.19.2",
      dependencyType: "direct",
      licenses: [{ id: "MIT", name: "MIT" }],
      copyrights: [{ text: "Copyright (c) 2009-2014 TJ Holowaychuk" }],
    },
    {
      name: "react",
      version: "18.3.1",
      author: "Meta Platforms, Inc.",
      purl: "pkg:npm/react@18.3.1",
      dependencyType: "direct",
      licenses: [{ id: "MIT", name: "MIT" }],
      copyrights: [{ text: "Copyright (c) Meta Platforms, Inc. and affiliates" }],
    },
    {
      name: "aws-sdk",
      version: "2.1691.0",
      author: "Amazon Web Services",
      purl: "pkg:npm/aws-sdk@2.1691.0",
      dependencyType: "direct",
      licenses: [{ id: "Apache-2.0", name: "Apache-2.0" }],
      copyrights: [{ text: "Copyright Amazon.com, Inc. or its affiliates" }],
    },
    {
      name: "node-fetch",
      version: "2.7.0",
      dependencyType: "transitive",
      licenses: [{ id: "MIT", name: "MIT" }],
      copyrights: [],
    },
    {
      name: "readline-sync",
      version: "1.4.10",
      dependencyType: "transitive",
      licenses: [{ id: "LGPL-3.0-only", name: "LGPL-3.0-only" }],
      copyrights: [],
    },
    {
      name: "some-gpl-tool",
      version: "2.0.0",
      dependencyType: "transitive",
      licenses: [{ id: "GPL-3.0-or-later", name: "GPL-3.0-or-later" }],
      copyrights: [],
    },
    {
      name: "internal-billing-sdk",
      version: "9.4.1",
      author: "Platform Team",
      dependencyType: "direct",
      licenses: [{ id: "Proprietary-Internal", name: "Proprietary-Internal" }],
      copyrights: [{ text: "Copyright (c) 2026 Internal Corp" }],
    },
    {
      name: "legacy-widget",
      version: "0.9.3",
      dependencyType: "transitive",
      licenses: [],
      copyrights: [],
    },
  ],
};

export const SCREENSHOT_DIFF_BEFORE: NoticesDocument = {
  source: "unknown",
  project: { name: "checkout-service", version: "4.1.0" },
  components: [
    { name: "express", version: "4.18.0", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
    { name: "react", version: "18.2.0", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
    {
      name: "aws-sdk",
      version: "2.1690.0",
      licenses: [{ id: "Apache-2.0", name: "Apache-2.0" }],
      copyrights: [],
    },
    {
      name: "old-currency-lib",
      version: "1.2.0",
      licenses: [{ id: "ISC", name: "ISC" }],
      copyrights: [],
    },
  ],
};

export const SCREENSHOT_DIFF_AFTER: NoticesDocument = {
  source: "unknown",
  project: { name: "checkout-service", version: "4.2.0" },
  components: [
    { name: "express", version: "4.19.2", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
    { name: "react", version: "18.3.1", licenses: [{ id: "MIT", name: "MIT" }], copyrights: [] },
    {
      name: "aws-sdk",
      version: "2.1691.0",
      licenses: [{ id: "Apache-2.0", name: "Apache-2.0" }],
      copyrights: [],
    },
    {
      name: "some-gpl-tool",
      version: "2.0.0",
      licenses: [{ id: "GPL-3.0-or-later", name: "GPL-3.0-or-later" }],
      copyrights: [],
    },
  ],
};
