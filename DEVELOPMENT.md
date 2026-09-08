# Developing foss-notices-viewer

This is the contributor-facing doc: how the package is laid out, how to run
and extend it, and where each feature is proven by a test. See `README.md`
for the consumer-facing API.

## Setup

```bash
npm install
npm test          # vitest run — 205 tests, ~7s
npm run typecheck  # tsc --noEmit
npm run lint       # biome check .
npm run build      # tsup → dist/
```

`npm run dev` runs `tsup --watch` for iterating with a linked/local consumer.
`npm run test:watch` runs vitest in watch mode.

## Layout

```
src/
  core/                    framework-agnostic: parsing, risk, diff. No React import anywhere in here.
    types.ts                the normalized model every adapter produces and every React component consumes;
                             includes the optional `project` field (SPDX/CycloneDX only — see README Caveats)
                             and the optional `dependencyType` field (direct/transitive, SPDX/CycloneDX only)
    risk.ts                 classifyLicense() / classifyComponentRisk() + DEFAULT_LICENSE_RISK_MAP + RISK_LABELS
    disclaimers.ts           ADAPTER_LICENSE_DISCLAIMERS — per-`NoticesSource` license-reliability
                             caveat string, keyed by `NoticesDocument.source`; sources with no
                             license-specific caveat (`"unknown"`) have no entry. Consumed by
                             ComponentRow.tsx's `source` prop; also a public export for a custom UI.
    diff.ts                 diffNotices() — release-over-release comparison
    exportRows.ts            toExportRows() — NoticesDocument → flat name/version/license/risk/author rows,
                             shared by the Excel export and available for any other custom export
    pipeline.ts              the shared format-shape-check → schema-validate → parse pipeline (pure
                             functions: parseByFormat/validateByFormat/checkFormatMatch), plus the
                             NoticesFileFormat type and FORMAT_META/FORMAT_IDS. Statically imports
                             core/adapters/* (cheap) but dynamically imports validation/ by its
                             *published package name* — `"foss-notices-viewer/validation"`, not a
                             relative "../validation" path — because esbuild's CJS output has no
                             code-splitting: a relative cross-entry dynamic import gets inlined at
                             build time, silently duplicating validation/'s ~230KB of vendored JSON
                             Schemas into every CJS consumer of this entry point. The bare specifier
                             is left untouched by marking it `external` in tsup.config.ts, and
                             resolves at runtime through the consumer's own node_modules (see
                             "Cross-entry dynamic imports" below). This is the single source of
                             truth for the pipeline — react/'s NoticesViewer.tsx `adapter` mode,
                             NoticesFileUpload.tsx, and every cli/commands/*.ts file that reads a
                             notices file all go through it, so the logic exists exactly once.
    query.ts                 queryNotices() — pure search/group/sort/risk-filter/pagination over a
                             NoticesDocument (25 rows/page default). react/hooks/useNotices.ts wraps
                             this in React state for `<NoticesViewer>`; cli/commands/list.ts calls
                             it directly — both consumers filter/group/sort identically because
                             they call the same function, not two implementations kept in sync by hand.
    adapters/
      spdx.ts                SPDX 2.x JSON → NoticesDocument
      cyclonedx.ts           CycloneDX 1.4/1.5 JSON → NoticesDocument
      generateLicenseFile.ts plain-text `generate-license-file` output → NoticesDocument
      blackDuck.ts           plain-text Black Duck Notices Report → NoticesDocument
      licenseTextHeuristics.ts  guessLicenseIdFromText() — used only by generateLicenseFile.ts
    index.ts                 re-exports everything above; this is the `foss-notices-viewer` entry point

  react/                   everything in here may import "react"; nothing in core/ may import react/*
    hooks/
      useNotices.ts          thin React wrapper: keeps search/groupBy/riskFilter/sortBy/page as
                             useState, computes the result via useMemo(() => queryNotices(document,
                             {...}), [...]) — core/query.ts is the actual search/group/sort/
                             risk-filter/pagination (25 rows/page) logic; this hook owns nothing
                             but the state and the memoization
      useNoticesDiff.ts      memoized wrapper around diffNotices
      useNoticesFromRaw.ts   reactive wrapper around core/pipeline.ts: re-runs the pipeline
                             whenever `(format, raw)` change, tracked as a `phase` state machine
                             (busy/format-error/schema-invalid/valid/error). Backs
                             NoticesViewer.tsx's `adapter` mode.
    components/
      NoticesViewer.tsx      the batteries-included viewer. Exports one dispatcher component that
                             picks between two internal ones based on whether `adapter` is set:
                             RawNoticesViewer (raw string `document` + `adapter`, calls
                             useNoticesFromRaw, renders <ValidationReportView> on failure) and
                             ParsedNoticesViewer (already-parsed `document: NoticesDocument`, calls
                             useNotices — this is the original, unchanged viewer body and composes
                             everything below). `viewMode` prop seeds ParsedNoticesViewer's own
                             internal view-mode state (still switchable via the toolbar's "View"
                             select) when used alone; passing `onViewModeChange` alongside it makes
                             the toggle fully controlled instead — the "View" select then always
                             reflects the current `viewMode` prop, and every change calls
                             `onViewModeChange` rather than updating internal state, so an external
                             control and the built-in toggle stay in sync in both directions.
      ComponentList.tsx      the (optionally virtualized) list; forwards `viewMode` and `source` to
                             each row and defaults `rowHeight` to 64 (up from 48) to fit
                             multi-license rows, where the license-name/risk columns stack one line
                             per license
      ComponentRow.tsx       one row; `viewMode="detail"` (default) is the original expandable row,
                             `viewMode="summary"` renders only the header, non-interactive. The
                             header is a four-column CSS Grid (`.fnv-row__summary` is `display:
                             grid`, `grid-template-columns: 1.6fr 0.9fr 1fr 0.9fr`, `align-items:
                             baseline`) — a fixed template rather than flexbox's content-driven
                             `justify-content: space-between`, so columns line up at the same
                             x-coordinate on every row regardless of each row's own text length.
                             `align-items: baseline` (rather than `start`) makes every column's
                             first line of text sit on the same baseline even though the columns
                             mix font sizes (the 14px name vs. the 12px version/dependency/
                             license/risk text) — this replaced an earlier `padding-top: 2px` hack
                             on the dependency/license-names/risks columns that approximated the
                             same alignment by eyeballing a pixel offset. Spacing between the
                             smaller inline elements within a column (chevron↔name, name↔version,
                             risk icon↔label) is a consistent 6px throughout, distinct from the
                             4px gap used to stack multiple license/risk lines within one column
                             and the 16px gap between columns. Columns left to right:
                             `.fnv-row__title` (name, then its version — `v1.3.0` — inline right
                             after it via `.fnv-row__version`, e.g. "left-pad v1.3.0");
                             `.fnv-row__dependency` (`<DependencyBadge variant="plain">`, its own
                             column, between name/version and license name); `.fnv-row__license-names`
                             (one `.fnv-row__license-name-text` span per license, plain text); and
                             `.fnv-row__risks` (one `<LicenseBadge variant="plain">` per license,
                             each rendering a small risk-tier `<RiskIcon>` before the label text).
                             Risk and license name are deliberately split into their own columns
                             rather than combined into one badge, and the dependency/risk labels
                             render as plain `.fnv-row__plain-label` text (no color, no pill shape)
                             rather than a `.fnv-badge`. Its expanded detail's `source` prop (a
                             `NoticesSource`) looks up `ADAPTER_LICENSE_DISCLAIMERS[source]` and, if
                             defined, renders it as a `.fnv-row__license-disclaimer` paragraph at
                             the bottom of `.fnv-row__license-list` — omitted entirely for
                             `source === "unknown"` or no `source`.
      RiskIcon.tsx           five hand-authored inline SVG icons keyed by `RiskTier` (no icon
                             library dependency) — check-circle (permissive), circle-with-dot
                             (weak-copyleft), warning-triangle (copyleft), padlock (proprietary),
                             circle-with-question-mark (unknown). Uses `currentColor` for
                             stroke/fill so `.fnv-risk--<tier>` CSS classes control color; a shared
                             `<IconShell>` sets `aria-hidden="true"` directly on the `<svg>` tag
                             (not via a spread prop object, which biome's `noSvgWithoutTitle` a11y
                             rule can't see through statically).
      LicenseBadge.tsx       risk-tier badge; `variant="plain"` (used by ComponentRow's collapsed
                             header) renders a `<RiskIcon>` followed by the risk-tier label, both
                             inside one `.fnv-row__plain-label.fnv-row__risk-label` span (a flex
                             row so the icon and text sit inline) carrying a `.fnv-risk--<tier>`
                             class for icon/text color — no `.fnv-badge` color/pill. Default
                             `variant="badge"` is unchanged (colored pill) for any other consumer
                             of this exported component. `label` still combines into "MIT ·
                             Permissive" form when passed, independent of `variant`. (Unrelated:
                             `SummaryHeader`'s own risk-tier counts use their own
                             `.fnv-summary__chip--*` markup, not `<LicenseBadge>`, and are
                             unaffected by this — colored pills there are unchanged.)
      DependencyBadge.tsx    Direct/Transitive/Unknown label, rendered in its own
                             `.fnv-row__dependency` grid column, between the name/version column
                             and the license-name/risk columns. `variant="plain"` (used here)
                             renders plain `.fnv-row__plain-label` text instead of the default
                             colored `.fnv-badge` pill.
      SearchBar.tsx / SummaryHeader.tsx
      ProjectHeader.tsx      the analyzed project's own name/version, rendered above SummaryHeader
                             when document.project is present
      DiffView.tsx           added/removed/changed summary between two documents
      ExportButton.tsx       split button — main body exports to Excel (default, unchanged
                             behavior), its caret opens a menu to pick Excel or JSON instead;
                             reaches export/ via a dynamic import() either way so exceljs is
                             never in this entry point's static dependency graph
      ExportValidationButton.tsx  same pattern as ExportButton.tsx, for a ValidationReport instead
                             of a NoticesDocument; rendered inside ValidationReportView.tsx
      NoticesFileUpload.tsx  a thin file-picker front end for NoticesViewer.tsx's `adapter` mode:
                             owns only the format `<select>` + file input + FileReader read, then
                             renders `<NoticesViewer adapter={format} document={text}
                             viewMode="detail" />` — all format-shape-check/validation/
                             parsing lives in core/pipeline.ts, not here.
    styles.css               plain CSS, classes prefixed `fnv-`; copied to dist/styles.css at build time
    index.ts                 this is the `foss-notices-viewer/react` entry point

  export/                  Excel + JSON export. Kept as a separate entry point (like validation/
                           below) so core/ and react/ consumers never bundle exceljs unless they
                           actually import from here or click <ExportButton>.
    excel.ts                exportNoticesToExcel() — builds the workbook via exceljs, using
                            core/exportRows.ts for the row data
    json.ts                 exportNoticesToJson() — the same core/exportRows.ts rows, serialized
                            to indented JSON bytes; no dependency, so it's kept in this entry
                            point (not statically imported into ExportButton.tsx) purely so both
                            formats share one dynamic import() and exceljs still never leaks in
    validationExcel.ts      exportValidationReportToExcel() — builds a Summary + Issues workbook
                            from a ValidationReport via exceljs
    index.ts                this is the `foss-notices-viewer/export` entry point

  validation/              schema/structural validation. Pulls in ajv/ajv-formats/json-source-map —
                           kept as a separate entry point so core/ and react/ consumers never bundle
                           those dependencies unless they actually import from here.
    types.ts                ValidationReport / ValidationIssue — the shape every validate*() returns
    jsonSchemaValidator.ts  shared ajv engine: compiles+caches a schema, runs it with allErrors: true,
                            and turns each ajv ErrorObject into a ValidationIssue (line/column via
                            json-source-map, a keyword-specific suggested fix)
    lineUtils.ts            offsetToLineColumn() — character-offset → 1-indexed line/column
    textBlocks.ts           splitWithOffsets() — like String#split, but keeps each piece's original
                            offset; used by the two plain-text validators below
    spdx.ts                 validateSpdxDocument() — wraps jsonSchemaValidator with the vendored
                            official SPDX 2.3 schema
    cyclonedx.ts            validateCycloneDxBom() — wraps jsonSchemaValidator with the vendored
                            official CycloneDX 1.5 schema (+ its split spdx/jsf sub-schemas)
    generateLicenseFile.ts  validateGenerateLicenseFileText() — structural checks only (no
                            official schema exists for this format)
    blackDuck.ts            validateBlackDuckNotices() — structural checks only (same caveat)
    schemas/                vendored, unmodified copies of the official SPDX/CycloneDX JSON
                            Schemas, plus NOTICE.md documenting their provenance/license
    index.ts                this is the `foss-notices-viewer/validation` entry point

  cli/                     the non-React consumption path — a real `commander`-based executable
                           for scripting/CI. Imports only from core/ and export/ (dynamically, same
                           rule as react/); never imports react/*, and nothing in core/ or react/
                           imports from here. This is a separate tsup entry (see tsup.config.ts),
                           built ESM-only with a `#!/usr/bin/env node` banner and no .d.ts (a CLI
                           has no public API to publish types for).
    bin.ts                  the executable entry point: reads its own version via
                            createRequire(import.meta.url), builds the program, calls
                            .parseAsync(process.argv), and translates a thrown CommanderError
                            (help/version/usage — commander already printed the message) or
                            CliError (an expected, user-facing failure) into `process.exitCode`
                            instead of letting either crash with a raw stack trace.
    program.ts               createProgram(version) — builds the full commander.Command tree.
                            Kept separate from bin.ts so tests can build a program and call
                            .parseAsync(argv) directly against it, asserting on output/exit codes
                            without spawning a real child process. Registers all five commands,
                            wires the global --no-color flag (a preAction hook that only ever
                            narrows color *off* — it never overrides support/color.ts's own
                            TTY/NO_COLOR auto-detection with a naive default-on), and calls
                            .exitOverride() so a bad/help/version invocation throws instead of
                            calling process.exit() mid test run.
    commands/
      validate.ts            `validate <file>` — core/pipeline.ts's checkFormatMatch +
                             validateByFormat, printed as a colorized human report or --json
      parse.ts               `parse <file>` — core/pipeline.ts's parseByFormat, printed as pretty
                             JSON to stdout or a --out file
      list.ts                `list <file>` — the terminal equivalent of <NoticesViewer>'s list:
                             core/query.ts's queryNotices, rendered via support/table.ts instead of
                             HTML. Shows every matching row by default (unlike the React default of
                             25/page) — --page/--page-size opts into pagination.
      report.ts               `report <file> -o <path>` — the terminal equivalent of
                             <ExportButton>: exportNoticesToExcel/exportNoticesToJson (dynamically
                             imported from ../../export, same "real npm dependency → relative
                             import is fine" rule as ExportButton.tsx), format inferred from
                             --out's extension or overridden via --as
      diff.ts                 `diff <before> <after>` — the terminal equivalent of <DiffView>:
                             core/diff.ts's diffNotices, plus --fail-on-change for a CI compliance
                             gate
    support/                 CLI-only plumbing — none of this is imported from core/ or react/
      errors.ts               CliError — an expected, user-facing failure (bad input file, invalid
                              risk map) as opposed to an unexpected bug; carries an `exitCode`
      color.ts                dependency-free ANSI helper; auto-disables when stdout isn't a TTY or
                              NO_COLOR is set (see https://no-color.org), same convention as git/
                              eslint/npm
      table.ts                renderTable() — a plain aligned text table (no box-drawing
                              characters), measuring visible width (ANSI codes stripped) so colored
                              cells still line up
      io.ts                   readInputFile()/writeOutputFile() — fs wrappers that turn a missing/
                              unreadable file into a CliError instead of a raw Node error
      riskMap.ts              loadRiskMapFile() — validates a --risk-map JSON file's shape before
                              it reaches the library (the same `licenseRiskMap` shape
                              <NoticesViewer> takes)
      load.ts                 addFormatOption()/loadDocument() — the shared -f/--format (+
                              --section-delimiter) option every file-reading command wires
                              identically

fixtures/                  sample input files shared by tests AND by the README examples above —
                            keep these realistic; they're the closest thing this repo has to
                            integration fixtures against real tool output. Each of the four formats
                            also has a deliberately-invalid `*-invalid-sample.*` sibling, used by
                            the validator tests and the live demo's "schema errors" toggle.

examples/                 a separate, standalone app (own package.json/tsconfig) — a live
                           playground demonstrating every feature. Not part of the published
                           package; see "Live demo" below.
  src/CodeSnippet.tsx      <pre><code> block; every demo panel renders one showing the actual
                           component invocation (reflecting any prop toggle in that panel)
```

Every `*.test.ts(x)` file sits next to the file it tests (colocated, not in a
separate `tests/` tree) — when you touch `src/core/adapters/spdx.ts`, the
test you need to update is right there as `spdx.test.ts`.

## Feature → test map

Use this to find where a feature is proven, or to know what to add a test
for when you touch it:

| Feature | Test file |
|---|---|
| SPDX JSON parsing (incl. NOASSERTION handling, purl extraction, `originator`/`supplier` → author) | `src/core/adapters/spdx.test.ts` |
| CycloneDX JSON parsing (incl. license expressions like `(MIT OR Apache-2.0)`, `author`/`supplier.name` → author) | `src/core/adapters/cyclonedx.test.ts` |
| `generate-license-file` text parsing (shared-license-block expansion, credit banner stripping) | `src/core/adapters/generateLicenseFile.test.ts` |
| Best-effort SPDX id guessing from raw license text | `src/core/adapters/licenseTextHeuristics.test.ts` |
| Black Duck Notices Report parsing (incl. custom section delimiter, and the copyright line no longer duplicated inside the license text) | `src/core/adapters/blackDuck.test.ts` |
| License risk classification, incl. OR-expressions and custom overrides | `src/core/risk.test.ts` |
| Release-over-release diffing (added/removed/changed/unchanged) | `src/core/diff.test.ts` |
| Flattening a `NoticesDocument` to export rows (incl. `purl`) — same shape across all four adapters, multi-license joining, worst-case risk, "No information" fallbacks, custom risk map | `src/core/exportRows.test.ts` |
| Search/group/sort/risk-filter/pagination state (25 rows/page, resets to page 1 on filter/sort/group change); search matches name, version, author, purl, and license id | `src/react/hooks/useNotices.test.tsx` |
| `<NoticesViewer>` rendering, search interaction, row expansion, pagination controls | `src/react/components/NoticesViewer.test.tsx` |
| `<NoticesViewer>` built-in "Filter by risk" select, and its `<ProjectHeader>` wiring for `document.source`/`document.generatedAt` | `src/react/components/NoticesViewer.test.tsx` |
| `<NoticesViewer>` `adapter` mode: raw content → parsed+validated viewer, invalid schema → report instead of viewer, format-shape mismatch caught before validation, re-validates when `adapter` changes for the same raw content | `src/react/components/NoticesViewer.test.tsx` |
| `<ComponentRow>` license name/id + risk tier display, author display, package URL (purl) display with "No information" fallback, expand/collapse affordance, and a single combined "No information" fallback for missing license text/url (fixes the SPDX double-line bug) | `src/react/components/ComponentRow.test.tsx` |
| `<ComponentRow>` `viewMode`: dependency type in its own column (not nested in name/version, not alongside license/risk), and `"summary"` mode showing only the header with no expand affordance and no author/copyright rendered | `src/react/components/ComponentRow.test.tsx` |
| `<ComponentRow>` collapsed header layout: four top-aligned grid columns, left to right — name/version (version inline right after the name), dependency type, license name, risk tier (with icon) — each column's own text left-aligned | `src/react/components/ComponentRow.test.tsx` |
| `<ComponentRow>` renders the dependency type and risk tier as plain left-aligned text (`variant="plain"`), not colored `.fnv-badge` pills; risk label includes a risk-tier `<RiskIcon>` | `src/react/components/ComponentRow.test.tsx` |
| `ADAPTER_LICENSE_DISCLAIMERS` has an entry for every real adapter (`spdx`/`cyclonedx`/`generate-license-file`/`black-duck`) and none for `"unknown"` | `src/core/disclaimers.test.ts` |
| `<ComponentRow>` `source` prop: shows that adapter's license disclaimer in the expanded detail, a different one per source, and none when `source` is omitted or `"unknown"` | `src/react/components/ComponentRow.test.tsx` |
| `<NoticesViewer>` forwards `document.source` down to the disclaimer shown in an expanded row | `src/react/components/NoticesViewer.test.tsx` |
| `<NoticesViewer>` view toggle (detail default / summary), and summary mode removing the click-to-expand affordance | `src/react/components/NoticesViewer.test.tsx` |
| `<NoticesViewer>` `viewMode` prop used alone: seeds the starting mode without a click, and the built-in toggle can still switch away from it | `src/react/components/NoticesViewer.test.tsx` |
| `<NoticesViewer>` `viewMode` + `onViewModeChange` used together: the "View" select stays pinned to `viewMode` and calls `onViewModeChange` on change instead of switching itself, and reflects an externally-updated `viewMode` on rerender | `src/react/components/NoticesViewer.test.tsx` |
| `<NoticesFileUpload>` always renders its viewer with `viewMode="detail"` | `src/react/components/NoticesFileUpload.test.tsx` |
| `<DiffView>` rendering | `src/react/components/DiffView.test.tsx` |
| Building a real `.xlsx` workbook (header row incl. Package URL, one row per component, custom sheet name/risk map) — round-tripped back through exceljs to check actual cell values | `src/export/excel.test.ts` |
| Serializing the same flat rows to indented JSON bytes, and honoring a custom risk map | `src/export/json.test.ts` |
| `<ExportButton>` split-button behavior: main-button click still downloads .xlsx unchanged (Blob mime type, anchor click, object-URL revoke), its error/retry state, opening/closing the Excel-vs-JSON dropdown menu (incl. click-outside-to-close), and choosing "Export as JSON" from the menu | `src/react/components/ExportButton.test.tsx` |
| Building a `ValidationReport` `.xlsx` workbook (Summary + Issues sheets, custom sheet names, zero-issue reports) | `src/export/validationExcel.test.ts` |
| `<ExportValidationButton>` download flow and its error/retry state | `src/react/components/ExportValidationButton.test.tsx` |
| `<ProjectHeader>` rendering (name + version, "No information" fallback, renders nothing without project meta, `source`/`generatedAt` shown independently of the project block) | `src/react/components/ProjectHeader.test.tsx` |
| SPDX/CycloneDX `project` extraction (document `name` / `metadata.component`), and its absence when not present | `src/core/adapters/spdx.test.ts`, `src/core/adapters/cyclonedx.test.ts` |
| SPDX/CycloneDX `dependencyType` classification (direct/transitive via `relationships`/`dependencies` graph BFS), and `undefined` when no graph is present | `src/core/adapters/spdx.test.ts`, `src/core/adapters/cyclonedx.test.ts` |
| `<DependencyBadge>` rendering (Direct/Transitive/Unknown) and its presence on `<ComponentRow>`'s collapsed summary | `src/react/components/DependencyBadge.test.tsx`, `src/react/components/ComponentRow.test.tsx` |
| Character-offset → line/column conversion | `src/validation/lineUtils.test.ts` |
| Delimiter-preserving text splitting (with offsets) | `src/validation/textBlocks.test.ts` |
| SPDX validation against the official 2.3 schema (incl. multi-issue reports, JSON syntax errors) | `src/validation/spdx.test.ts` |
| CycloneDX validation against the official 1.5 schema (incl. the split spdx/jsf sub-schemas) | `src/validation/cyclonedx.test.ts` |
| `generate-license-file` structural validation (incl. the trailing repeated credit banner) | `src/validation/generateLicenseFile.test.ts` |
| Black Duck structural validation (incl. line numbers for section headers/bodies) | `src/validation/blackDuck.test.ts` |
| `<ValidationReportView>` rendering | `src/react/components/ValidationReportView.test.tsx` |
| `<NoticesFileUpload>` end-to-end pipeline: valid file → viewer, invalid schema → report instead of viewer, format-shape mismatch caught before validation, switching format resets prior results | `src/react/components/NoticesFileUpload.test.tsx` |

Run a single file while iterating: `npx vitest run src/core/adapters/spdx.test.ts`.

## Live demo

`examples/` is a small Vite + React app you can run locally (`npm run demo`
from the repo root, or `cd examples && npm run dev`). It's a good first stop
when you want to see a change instead of reading assertions:

- An "Adapter mode" tab (the default): pick a format, edit the sample text (or
  paste a real file's contents), and it's passed straight to
  `<NoticesViewer adapter={format} document={text} />` — no `parse*`/
  `validate*` import in this tab's own code, proving the internal pipeline
  does the format-shape check, schema validation, and parsing on its own. A
  button loads either the matching `fixtures/*` sample or the matching
  `fixtures/*-invalid-sample.*` one, a note under the format dropdown says
  whether that format has an official schema, a second note (`FIELD_NOTES` in
  `examples/src/App.tsx`) on which fields — author, project, dependency type —
  that format's adapter actually populates (so "Unknown"/"No information"
  on the plain-text formats reads as expected behavior, not a demo bug), and
  a live look at search, group-by, sort-by, the detail/summary view toggle,
  and row expansion follows once validation passes. A `viewMode="summary"`
  checkbox below the textarea demos the prop as fully controlled — it's
  passed alongside `onViewModeChange`, so checking/unchecking it and using
  the viewer's own "View" select both update the same state and stay in
  sync in both directions, same as the Paging tab below — and a `licenseRiskMap` checkbox
  (`STRICT_RISK_MAP` in `examples/src/App.tsx`) demonstrates overriding the
  default risk classification by reclassifying GPL/AGPL as "Proprietary" —
  visible on the SPDX/CycloneDX/Black Duck samples, which each carry a
  GPL-or-AGPL-licensed package; the `generate-license-file` sample has none,
  so the checkbox has no visible effect there. Expanding any row also shows
  that format's `ADAPTER_LICENSE_DISCLAIMERS` entry at the bottom of its
  license section — this needs no demo-side code at all, since
  `<NoticesViewer>` derives it from `document.source`/`adapter` on its own;
  switching the format dropdown and re-expanding a row is the fastest way to
  compare all four disclaimers side by side. The built-in "Filter by risk"
  select, the package URL (purl) line in an expanded row, and the source/
  generated-date line in the project header also need no demo-side code —
  the SPDX and CycloneDX samples already carry `purl`/`created`/`timestamp`
  fields, so switching to either format shows them; the
  `generate-license-file`/Black Duck samples show "No information"/no
  generated-date line instead, which is expected (see Caveats in the
  README). There used to be five separate tabs
  covering this ground (one
  static tab per adapter, plus a near-duplicate "Paste your own" tab that
  did manual `parse*`/`validate*` calls instead) — they were folded into
  this one interactive tab once `adapter` mode made the manual-pipeline demo
  redundant.
- An "Upload a file" tab rendering `<NoticesFileUpload>` bare — pick a format,
  upload any `fixtures/*` file, and see the format-shape check, schema
  validation, and viewer/report branching happen for real (try it with the
  wrong format selected, or one of the `*-invalid-sample.*` fixtures). Under
  the hood this is just a file picker handing raw text to `<NoticesViewer>`'s
  `adapter` mode above — see the "Adapter mode" tab for the same pipeline
  without the file-upload step.
- A "Diff two releases" tab rendering `<DiffView>` against a small synthetic
  before/after pair (`examples/src/fixtures.ts`) chosen to exercise all four
  buckets (added/removed/changed/unchanged) at once.
- A "Paging (120 packages)" tab rendering a synthetic 120-component
  `NoticesDocument` (`PAGINATION_DEMO_DOCUMENT` in `examples/src/fixtures.ts`)
  through `<NoticesViewer>` — enough rows to reach all 5 pages at
  `PAGE_SIZE=25`. It also carries a `project` field, so this tab doubles as
  the `<ProjectHeader>` demo, and includes a `virtualized` toggle and a
  `viewMode="summary"` toggle, also wired as fully controlled via
  `onViewModeChange` — same two-way sync as the Adapter mode tab above.
- Every panel renders a `<CodeSnippet>` (`examples/src/CodeSnippet.tsx`)
  showing the actual component invocation for that panel, including the
  current value of any interactive prop toggle (e.g. `virtualized` in the
  fixture and pagination tabs) — so changing the toggle and watching both the
  snippet and the rendered viewer update side by side is the intended way to
  explore a prop's effect.
- The toolbar's "Export to Excel" split button also needs no demo-side code:
  clicking it downloads the .xlsx as before, and its caret opens a menu to
  download the same rows as JSON instead — both go through `<ExportButton>`
  unchanged. A footer below the tabs points to the headless `useNotices` hook
  and the `toExportRows`/`exportNoticesToExcel`/`exportNoticesToJson` export
  helpers for anyone building a custom UI instead of using the components
  directly, and to the README's API reference and Caveats section for
  anything the demo doesn't cover.

It is **not** a published part of the package — it's a separate app
(`examples/package.json`, own `tsconfig.json`) that resolves the
`foss-notices-viewer` / `foss-notices-viewer/react` / `foss-notices-viewer/validation`
subpaths straight to this repo's `src/` via aliases in `examples/vite.config.ts`
(and mirrored `paths` in `examples/tsconfig.json`, since Vite and `tsc` resolve
modules independently). That means it always runs against current source with no
build/link step, but also means if you add a new export, it's visible in the
demo immediately without touching the alias config (a brand new *subpath*
still needs one alias + one `paths` entry, as it did for `/validation`).

Run its own checks from `examples/`: `npm run typecheck` (no test suite of
its own — it's a manual/visual tool, not something to unit test) and
`npm run build` (a production Vite build, useful to sanity-check the app
itself still bundles cleanly; not something that gets deployed anywhere by
this repo).

## Adding a new format adapter

1. Add `src/core/adapters/<format>.ts` exporting `parse<Format>(input): NoticesDocument`.
   Keep it dependency-free and framework-agnostic — no React import.
2. Add a realistic fixture under `fixtures/` (prefer a real sample from the
   tool's own docs/source over a hand-invented one — see the git history of
   `generateLicenseFile.ts` for why: its adapter was built by reading the
   tool's actual formatter source, not guessing at the output shape).
3. Add `src/core/adapters/<format>.test.ts` next to it, and re-export from
   `src/core/adapters/index.ts`.
4. If the tool doesn't carry an SPDX id (like `generate-license-file`),
   reuse `guessLicenseIdFromText` rather than writing a second heuristic.
5. Update the "Caveats" section of `README.md` if the new format has a
   similar reliability caveat (unpublished/varying vendor format, guessed
   fields, etc).

## Adding schema validation for a new format

1. Check whether the format has an official machine-readable schema. If it
   does (like SPDX/CycloneDX): vendor an unmodified copy under
   `src/validation/schemas/`, record its source/version/license in
   `src/validation/schemas/NOTICE.md`, and write a thin wrapper
   (`src/validation/<format>.ts`) that calls `validateJsonAgainstSchema` with
   that schema and a `standard` string naming the spec and version. If the
   schema `$ref`s other files (like CycloneDX's `spdx`/`jsf` sub-schemas),
   pass them via `extraSchemas`.
2. If it doesn't (like `generate-license-file`/Black Duck): write a validator
   that checks this package's own parsing assumptions instead — the same
   structural shape the corresponding `parse*` adapter relies on — and say so
   plainly in its `standard` string and doc comment. Don't imply spec
   compliance that doesn't exist.

   **Severity rule for hand-rolled validators**: an issue is `"error"` if the
   corresponding parser fallback loses or misattributes a field the adapter
   depends on (e.g. a malformed header line where the whole line gets used
   as the name and the version is left `undefined` — the component that
   comes out is genuinely wrong, not just incomplete). It's `"warning"` only
   if the parser's fallback is *correct as far as it goes* and the missing
   piece is a field the adapter never claimed to always populate (e.g. an
   absent copyright line — the name/version stay correct, only an optional
   field is missing). Getting this wrong is exactly the bug found in
   `src/validation/blackDuck.ts`'s original header-mismatch check: it used
   `"warning"`, so a file whose component names were pure garbage still
   reported `valid: true`, and `<NoticesFileUpload>` rendered the garbled
   rows straight into the viewer instead of stopping at the validation
   report. When in doubt, ask: "if this passes, would `<NoticesFileUpload>`
   show something misleading?" — if yes, it's an error, not a warning.
3. Whichever kind, make sure it reports **every** issue in one pass (never
   throws/stops at the first) and that every issue has a `line`, a `message`,
   and a `suggestion`. For plain-text formats, use `splitWithOffsets` +
   `offsetToLineColumn` to keep line numbers accurate.
4. Add a valid and a deliberately-invalid fixture under `fixtures/` (the
   invalid one exercises the multi-issue-report behavior in both the test
   suite and the live demo's "schema errors" toggle), a colocated
   `src/validation/<format>.test.ts`, and re-export from
   `src/validation/index.ts`.
5. Wire it into `examples/src/App.tsx`'s `validateByFormat` and
   `examples/src/fixtures.ts`'s `INVALID_FIXTURES` so the live demo picks it
   up automatically.
6. Update the "Schema validation" table in `README.md`.

## Adding a new React component

- New presentational pieces go in `src/react/components/`, re-exported (both
  value and its `Props` type) from `src/react/index.ts`.
- Prefer deriving from `useNotices`/`useNoticesDiff` rather than duplicating
  filtering/grouping/diffing logic in a component — that logic is unit
  tested once in `core/`; components should only be tested for rendering
  and interaction (see `NoticesViewer.test.tsx` for the pattern: render,
  `userEvent.type`/`click`, assert on `screen`).
- Any new CSS goes in `src/react/styles.css`, class-prefixed `fnv-` to avoid
  colliding with a consuming app's own classes.

## Cross-entry dynamic imports

`<ExportButton>`/`<ExportValidationButton>`, `core/pipeline.ts` (consumed by
`<NoticesViewer>`'s `adapter` mode and, through it, `<NoticesFileUpload>`),
and `cli/commands/report.ts` all need something from a separate, heavy entry
point (`export/`, `validation/`) only sometimes — on click, once `adapter` is
set, or when that particular CLI command runs — so it must not be a static
import. But the cases need a different specifier, and mixing them up either
breaks resolution or silently reintroduces the exact bloat the dynamic
import was meant to avoid:

- **`ExportButton.tsx`** (and `cli/commands/report.ts`, its terminal
  equivalent) use a plain relative dynamic import: `import("../../export")`.
  This is fine because `export/`'s only heavy dependency, `exceljs`, is a
  genuine external npm package — tsup/esbuild automatically excludes real
  `dependencies` from the bundle, so even though esbuild's CJS output has no
  code-splitting (a dynamic `import()` inside a CJS file gets resolved and
  inlined at build time, same as a synchronous `require`), all that gets
  inlined is a thin wrapper. The actual `require("exceljs")` call, and thus
  exceljs's real weight, only executes at call-time regardless of which
  chunk contains that line of text.
- **`core/pipeline.ts`** uses the package's own published name instead:
  `import("foss-notices-viewer/validation")`, with that exact string added to
  `external` in `tsup.config.ts`. This is *required*, not a style choice,
  because `validation/`'s weight (~230KB) is vendored JSON Schema **source**
  (`src/validation/schemas/*.json`), statically imported at module top level
  inside `spdx.ts`/`cyclonedx.ts` — not an external package tsup can exclude
  automatically. A relative `import("../validation")` here would get
  inlined by esbuild's CJS output exactly like the export case, but this time
  there's no lazy `require()` boundary protecting anything: the whole ~230KB
  schema payload would ship statically inside every entry that reaches
  `core/pipeline.ts` — which, since the CLI's `validate`/`parse`/`list`/
  `diff` commands all call it too, now includes `cli.js` as well as
  `react.cjs`/`index.cjs` — whether or not that particular consumer ever
  triggers a schema validation. (This actually happened during development —
  `react.cjs` ballooned from ~34KB to ~305KB before the fix; check
  `dist/react.cjs`'s size after touching this file if you're ever unsure.)
  Marking the bare specifier `external` stops esbuild from touching it at all,
  in both ESM and CJS output; at runtime, Node's ordinary
  node_modules-resolution walk (starting from, e.g.,
  `node_modules/foss-notices-viewer/dist/react.cjs` or `dist/cli.js`) finds
  `foss-notices-viewer` again in the consumer's own `node_modules` — the same
  package that got installed in the first place, nothing exotic.
- Because there's no real `node_modules/foss-notices-viewer` self-link in
  this dev repo, two build-time tools need their own alias back to
  `src/validation/index.ts` for the same specifier: `vitest.config.ts` adds a
  `resolve.alias` entry for the test run, and `tsconfig.json` adds a matching
  `compilerOptions.paths` entry so tsup's `dts` build step (which type-checks
  via the TypeScript compiler, not esbuild) can resolve the bare specifier
  too — esbuild only sees `external` at bundle time and doesn't care, but
  `tsc` still needs to find a declaration to generate the `.d.ts` output, and
  without the `paths` entry it fails with "Could not find a declaration file
  for module 'foss-notices-viewer/validation'". Production code doesn't need
  either alias — they're the dev-time equivalent of the "consumer's own
  node_modules" resolution above. `cli/bin.ts` itself has no `.d.ts` output
  (a CLI has no public API to publish types for — see `tsup.config.ts`'s
  `dts: false` on its entry), but it still pulls in `core/pipeline.ts`
  through its commands, so the DTS build for the *other* entries (`index`,
  `react`) that also reach `core/pipeline.ts` needs this fix regardless of
  whether the CLI entry is built at all.
- **Rule of thumb for any future cross-entry dynamic import**: if the target
  entry point's heavy cost comes from a real npm `dependency`, a relative
  import is fine. If it comes from vendored/authored source bundled directly
  into that entry point, use the bare package-name specifier + `external`
  instead, and add matching `vitest.config.ts` and `tsconfig.json` aliases.

## Known limitations (intentional, not bugs)

- `ComponentList` virtualization assumes a uniform *collapsed* row height;
  expanding a row doesn't re-measure scroll math. Acceptable since expanding
  is the exception, not the default view — see README Caveats. The default
  `rowHeight` (64) assumes a single-license row; a component with multiple
  licenses stacks one line per license in the license-name/risk columns, and
  a custom CSS theme that changes that layout's height should pass a
  matching `rowHeight` explicitly.
- The Black Duck adapter is best-effort against an unpublished vendor
  format. It's deliberately small and dependency-free so a team hitting a
  different template can fork/patch it rather than filing upstream.
- `DEFAULT_LICENSE_RISK_MAP` is a starting point, not exhaustive and not
  legal advice — every consumer is expected to override it.
- `generate-license-file`/Black Duck validation checks this package's own
  structural assumptions, not a published standard — see README Caveats.
  Their validators also can't fully check a block/section once its header
  is malformed (e.g. a missing license heading short-circuits the
  dependency-line check for that block), matching the same limitation the
  real parser has: without a recognizable header, there's no reliable way
  to know where the block's other parts begin.
- ajv's official CycloneDX schema references two `format` keywords
  (`iri-reference`, `idn-email`) that `ajv-formats` doesn't implement.
  `jsonSchemaValidator.ts` registers them as permissive no-ops rather than
  enforcing them, so a CycloneDX field using either format is never flagged
  even if it's malformed — acceptable since this package's guarantee is
  schema-shape validation, not full RFC 3987/6531 conformance.
