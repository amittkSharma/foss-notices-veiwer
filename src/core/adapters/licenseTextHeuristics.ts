interface Heuristic {
  id: string;
  test: (text: string) => boolean;
}

/**
 * Best-effort SPDX id detection from raw license *text*. Needed because some
 * inputs (generate-license-file's plain-text output) only carry the license
 * body, never an SPDX identifier. This is a heuristic, not a license
 * classifier — verify before relying on it for a compliance decision.
 */
const HEURISTICS: Heuristic[] = [
  {
    id: "MIT",
    test: (t) =>
      /\bmit license\b/i.test(t) || /permission is hereby granted, free of charge/i.test(t),
  },
  {
    id: "Apache-2.0",
    test: (t) => /apache license/i.test(t) && /version 2\.0/i.test(t),
  },
  {
    id: "ISC",
    test: (t) => /permission to use, copy, modify, and\/or distribute this software/i.test(t),
  },
  {
    id: "BSD-3-Clause",
    test: (t) =>
      /redistribution and use in source and binary forms/i.test(t) && /neither the name/i.test(t),
  },
  {
    id: "BSD-2-Clause",
    test: (t) =>
      /redistribution and use in source and binary forms/i.test(t) && !/neither the name/i.test(t),
  },
  {
    id: "GPL-3.0",
    test: (t) => /gnu general public license/i.test(t) && /version 3/i.test(t),
  },
  {
    id: "GPL-2.0",
    test: (t) => /gnu general public license/i.test(t) && /version 2/i.test(t),
  },
  {
    id: "LGPL-3.0",
    test: (t) => /gnu lesser general public license/i.test(t) && /version 3/i.test(t),
  },
  {
    id: "LGPL-2.1",
    test: (t) => /gnu lesser general public license/i.test(t) && /version 2\.1/i.test(t),
  },
  {
    id: "MPL-2.0",
    test: (t) => /mozilla public license/i.test(t) && /2\.0/.test(t),
  },
  {
    id: "Unlicense",
    test: (t) => /this is free and unencumbered software released into the public domain/i.test(t),
  },
];

export function guessLicenseIdFromText(text: string): string {
  for (const heuristic of HEURISTICS) {
    if (heuristic.test(text)) return heuristic.id;
  }
  return "Unknown License";
}
