# Changelog

## 1.0.0 (2026-10-15)

### ⚠ BREAKING CHANGES

* Package renamed from `foss-notices-viewer` to `@amittksharma/foss-notices-viewer`. No code changes. Imports, including the `/react`, `/validation`, `/export` and `/styles.css` subpaths, and `npx` calls need the scoped name. The CLI commands (`foss-notices-viewer`, `fnv`) are unchanged.

### Features

* Publish with npm provenance (`provenance=true` in `.npmrc`).
* Add `publishConfig.access: public` and extra `keywords`.
