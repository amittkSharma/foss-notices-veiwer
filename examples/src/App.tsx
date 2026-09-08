import type { RiskTier } from "foss-notices-viewer";
import { DiffView, NoticesFileUpload, NoticesViewer } from "foss-notices-viewer/react";
import { useState } from "react";
import { CodeSnippet } from "./CodeSnippet";
import {
  DIFF_AFTER,
  DIFF_BEFORE,
  FIXTURES,
  FIXTURE_IDS,
  type FixtureId,
  INVALID_FIXTURES,
  PAGINATION_DEMO_DOCUMENT,
} from "./fixtures";

type TabId = "adapter" | "upload" | "diff" | "pagination";

const TABS: { id: TabId; label: string }[] = [
  { id: "adapter", label: "Adapter mode" },
  { id: "upload", label: "Upload a file" },
  { id: "diff", label: "Diff two releases" },
  { id: "pagination", label: "Paging (120 packages)" },
];

const SCHEMA_NOTES: Record<FixtureId, string> = {
  spdx: "Validated against the official SPDX 2.3 JSON Schema — a real compliance check.",
  cyclonedx: "Validated against the official CycloneDX 1.5 JSON Schema — a real compliance check.",
  "generate-license-file":
    "No official schema exists for this format — validated against this package's own inferred structural rules.",
  "black-duck":
    "No official schema exists for this vendor format — validated against this package's own inferred structural rules.",
};

// What a person can actually expect to see populated for each format, so "Unknown"
// dependency types or a missing project header/purl/generated-date on the plain-text
// formats read as expected behavior, not a bug in the viewer.
const FIELD_NOTES: Record<FixtureId, string> = {
  spdx: 'This sample carries a dependency graph, an author, a package URL (purl), a project name, and a generation date — so the "Direct/Transitive" column, the Author field, each row\'s Package URL, and the project header above the list (name plus source/generated date) are all populated.',
  cyclonedx:
    'This sample carries a dependency graph, an author, a package URL (purl), a project name/version, and a generation date — so the "Direct/Transitive" column, the Author field, each row\'s Package URL, and the project header above the list (name/version plus source/generated date) are all populated.',
  "generate-license-file":
    'This plain-text format has no dependency graph, author field, package URL, project identifier, or generation date at all — so every row\'s dependency type reads "Unknown", Author/Package URL are always "No information", and the project header shows only the source, with no name or generated date. That\'s expected for this format, not a gap in the viewer.',
  "black-duck":
    'This plain-text format has no dependency graph, author field, package URL, project identifier, or generation date at all — so every row\'s dependency type reads "Unknown", Author/Package URL are always "No information", and the project header shows only the source, with no name or generated date. That\'s expected for this format, not a gap in the viewer.',
};

// Demonstrates overriding the built-in default risk classification (`licenseRiskMap`) with a
// stricter, org-specific policy — e.g. a legal team that wants any GPL/AGPL-licensed code
// flagged for manual sign-off ("proprietary") rather than the default "copyleft" bucket.
const STRICT_RISK_MAP: Record<string, RiskTier> = {
  "GPL-2.0": "proprietary",
  "GPL-2.0-only": "proprietary",
  "GPL-2.0-or-later": "proprietary",
  "GPL-3.0": "proprietary",
  "GPL-3.0-only": "proprietary",
  "GPL-3.0-or-later": "proprietary",
  "AGPL-3.0": "proprietary",
  "AGPL-3.0-only": "proprietary",
  "AGPL-3.0-or-later": "proprietary",
};

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>("adapter");

  return (
    <div className="demo">
      <header className="demo__header">
        <h1>foss-notices-viewer</h1>
        <p>
          Turns a notices/SBOM export you're probably already generating — an SPDX or CycloneDX
          SBOM, a <code>generate-license-file</code> text file, or a Black Duck Notices Report —
          into a searchable, risk-classified, exportable open-source license list, so you don't have
          to write an ad hoc parser and a throwaway list component yourself.
        </p>
        <p>
          Every tab below renders the real <code>&lt;NoticesViewer&gt;</code> /{" "}
          <code>&lt;DiffView&gt;</code> / <code>&lt;NoticesFileUpload&gt;</code> components through
          the actual package source — nothing here is mocked. Each viewer bundles its own search
          box, group-by (none / license / risk tier), sort-by (name / license), and filter-by-risk
          controls, a detail/summary view toggle, pagination, expandable rows, and an "Export to
          Excel" button (top of the toolbar) — click it directly for a real summary spreadsheet
          (including each package's URL), or open its caret for a JSON export of the same rows
          instead — try all of them. Every license is also shown with a risk-tier icon and label
          (permissive, weak-copyleft, copyleft, proprietary, or unknown) from a built-in default
          classification that your own org can override, as demonstrated by the risk-policy checkbox
          on the "Adapter mode" tab. Expanding a row also shows its package URL (purl), and the
          source format/generation date show above the list when the document carries them.
        </p>
      </header>
      <nav className="demo__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? "demo__tab demo__tab--active" : "demo__tab"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <main className="demo__panel">
        {activeTab === "adapter" ? (
          <AdapterPanel />
        ) : activeTab === "upload" ? (
          <UploadPanel />
        ) : activeTab === "diff" ? (
          <DiffPanel />
        ) : (
          <PaginationPanel />
        )}
      </main>
      <footer className="demo__footer">
        <p>
          Building a custom UI instead? The headless <code>useNotices</code> hook exposes the same
          search/group/sort/paginate state with no markup of its own, and <code>toExportRows</code>/
          <code>exportNoticesToExcel</code>/<code>exportNoticesToJson</code> let you build your own
          export — see the package README for the full API reference and this project's documented
          caveats (which fields each format does and doesn't carry, what schema validation does and
          doesn't guarantee, and more) before relying on any of this for a compliance decision.
        </p>
      </footer>
    </div>
  );
}

function AdapterPanel() {
  const [formatId, setFormatId] = useState<FixtureId>("spdx");
  const [text, setText] = useState(FIXTURES.spdx.raw);
  const [viewMode, setViewMode] = useState<"detail" | "summary">("detail");
  const [strictRiskPolicy, setStrictRiskPolicy] = useState(false);
  const licenseRiskMap = strictRiskPolicy ? STRICT_RISK_MAP : undefined;

  return (
    <>
      <p className="demo__hint">
        <code>&lt;NoticesViewer&gt;</code> can take raw notices content directly: pass{" "}
        <code>adapter</code> (the format id) alongside <code>document</code> as a string, and it
        parses, schema-validates, and renders internally — no <code>parse*</code>/
        <code>validate*</code> import needed on your side. Edit the text below (or paste your own
        file's contents) to see it re-validate live.
      </p>
      <div className="demo__paste-controls">
        <label htmlFor="adapter-format">Format</label>
        <select
          id="adapter-format"
          value={formatId}
          onChange={(event) => {
            const next = event.target.value as FixtureId;
            setFormatId(next);
            setText(FIXTURES[next].raw);
          }}
        >
          {FIXTURE_IDS.map((id) => (
            <option key={id} value={id}>
              {FIXTURES[id].label}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setText(FIXTURES[formatId].raw)}>
          Load valid example
        </button>
        <button type="button" onClick={() => setText(INVALID_FIXTURES[formatId])}>
          Load example with schema errors
        </button>
      </div>
      <p className="demo__schema-note">{SCHEMA_NOTES[formatId]}</p>
      <p className="demo__schema-note">{FIELD_NOTES[formatId]}</p>
      <p className="demo__schema-note">
        Expand any row below to see this format's own license-reliability disclaimer at the bottom
        of its license section — that comes from <code>&lt;NoticesViewer&gt;</code> alone, no extra
        prop required.
      </p>
      <textarea
        className="demo__textarea"
        value={text}
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
        rows={12}
        aria-label="Adapter mode notices file contents"
      />
      <div className="demo__controls">
        <label>
          <input
            type="checkbox"
            checked={viewMode === "summary"}
            onChange={(event) => setViewMode(event.target.checked ? "summary" : "detail")}
          />{" "}
          <code>viewMode="summary"</code> — collapses every row to just its header (checking/
          unchecking this stays in sync with the viewer's own "View" toggle in both directions, via{" "}
          <code>onViewModeChange</code>)
        </label>
        <label>
          <input
            type="checkbox"
            checked={strictRiskPolicy}
            onChange={(event) => setStrictRiskPolicy(event.target.checked)}
          />{" "}
          <code>licenseRiskMap</code> override — reclassify GPL/AGPL licenses as "Proprietary"
          instead of the default "Copyleft" (a stricter, org-specific policy layered on top of the
          built-in default; has no visible effect on samples with no GPL/AGPL license)
        </label>
      </div>
      <CodeSnippet
        code={`import { NoticesViewer } from "foss-notices-viewer/react";

<NoticesViewer
  adapter="${formatId}"
  document={text}
  viewMode="${viewMode}"
  onViewModeChange={setViewMode}${licenseRiskMap ? '\n  licenseRiskMap={{ "GPL-3.0-only": "proprietary", /* ... */ }}' : ""}
/>`}
      />
      <NoticesViewer
        adapter={formatId}
        document={text}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        licenseRiskMap={licenseRiskMap}
      />
    </>
  );
}

function UploadPanel() {
  return (
    <>
      <p className="demo__hint">
        Pick the adapter that matches your file, then upload it —{" "}
        <code>&lt;NoticesFileUpload&gt;</code> reads it, sanity-checks its content against the
        chosen format, runs it through official schema validation, and only then hands it to{" "}
        <code>&lt;NoticesViewer&gt;</code>. Try uploading any of the sample files under{" "}
        <code>fixtures/</code> with the wrong format selected, or one of the{" "}
        <code>*-invalid-sample.json</code> files, to see the friendly error paths. Which fields show
        up afterward — author, project name, dependency type — depends on the format you pick, not
        on the viewer: see the notes on the "Adapter mode" tab for exactly what each format does and
        doesn't carry.
      </p>
      <CodeSnippet
        code={`import { NoticesFileUpload } from "foss-notices-viewer/react";

<NoticesFileUpload />`}
      />
      <NoticesFileUpload />
    </>
  );
}

function DiffPanel() {
  return (
    <>
      <p className="demo__hint">
        A synthetic "before" and "after" release snapshot: <code>express</code> got a version bump,{" "}
        <code>old-dep</code> was removed, <code>new-dep</code> (GPL-3.0) was added, and{" "}
        <code>left-pad</code> is unchanged. <code>&lt;DiffView&gt;</code> only reports what changed
        at the package level (added, removed, or version/license changed) — it doesn't itself re-run
        risk classification on the result, so pair it with <code>&lt;NoticesViewer&gt;</code> or the
        underlying <code>diffNotices</code> output if a reviewer also needs to see risk tiers on the
        diff.
      </p>
      <CodeSnippet
        code={`import { DiffView } from "foss-notices-viewer/react";

<DiffView before={before} after={after} />`}
      />
      <DiffView before={DIFF_BEFORE} after={DIFF_AFTER} />
    </>
  );
}

function PaginationPanel() {
  const [virtualized, setVirtualized] = useState(false);
  const [viewMode, setViewMode] = useState<"detail" | "summary">("detail");

  return (
    <>
      <p className="demo__hint">
        A synthetic document with 120 components — <code>&lt;NoticesViewer&gt;</code> paginates at
        25 rows per page, so this reaches all 5 pages. It also carries a <code>project</code> field
        ("big-monorepo-app" v9.1.0), shown at the top so it's clear which project this notices
        document describes. This document has no source dependency graph, so every row's
        dependency-type column reads "Unknown" — the same fallback used for
        <code>generate-license-file</code>/Black Duck-derived documents (see the "Adapter mode"
        tab).
      </p>
      <div className="demo__controls">
        <label>
          <input
            type="checkbox"
            checked={virtualized}
            onChange={(event) => setVirtualized(event.target.checked)}
          />{" "}
          <code>virtualized</code> prop — renders only the visible rows, useful once a single page
          gets large
        </label>
        <label>
          <input
            type="checkbox"
            checked={viewMode === "summary"}
            onChange={(event) => setViewMode(event.target.checked ? "summary" : "detail")}
          />{" "}
          <code>viewMode="summary"</code> — collapses every row to just its header (checking/
          unchecking this stays in sync with the viewer's own "View" toggle in both directions, via{" "}
          <code>onViewModeChange</code>)
        </label>
      </div>
      <CodeSnippet
        code={`import { NoticesViewer } from "foss-notices-viewer/react";

<NoticesViewer
  document={document}${virtualized ? "\n  virtualized" : ""}
  viewMode="${viewMode}"
  onViewModeChange={setViewMode}
/>`}
      />
      <NoticesViewer
        document={PAGINATION_DEMO_DOCUMENT}
        virtualized={virtualized}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
    </>
  );
}
