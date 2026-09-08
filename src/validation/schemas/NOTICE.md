# Vendored schemas

These JSON Schema files are unmodified copies of the official machine-readable
specifications, vendored so validation works offline and against a pinned
version. They are not this project's own work — see provenance below.

## `spdx-2.3.schema.json`

- Source: <https://github.com/spdx/spdx-spec/blob/support/2.3/schemas/spdx-schema.json>
- Version: SPDX 2.3 (branch `support/2.3`)
- License: Creative Commons Attribution 3.0 Unported (CC-BY-3.0), per the
  `spdx/spdx-spec` repository's `LICENSE` file.

## `cyclonedx-bom-1.5.schema.json`, `cyclonedx-spdx.schema.json`, `cyclonedx-jsf-0.82.schema.json`

- Source: <https://github.com/CycloneDX/specification/tree/1.5/schema>
- Version: CycloneDX 1.5 (tag `1.5`)
- License: Apache License 2.0, per the `CycloneDX/specification` repository's
  `LICENSE` file (also noted in `cyclonedx-bom-1.5.schema.json`'s own
  `$comment`).
- `cyclonedx-jsf-0.82.schema.json` is only referenced for the optional
  `signature` property (JSON Signature Format) — this package doesn't
  validate signatures, but ajv needs the referenced schema present to compile
  `cyclonedx-bom-1.5.schema.json` at all.

Re-vendor by re-running the `curl` commands against the URLs above (swap the
branch/tag to move to a newer spec version), then re-run
`npm run test -- validation`.
