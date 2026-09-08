import type { NoticesDocument } from "../../core/types";
import { useNoticesDiff } from "../hooks/useNoticesDiff";

export interface DiffViewProps {
  before: NoticesDocument;
  after: NoticesDocument;
}

/** Compares two notices documents — e.g. across releases — for compliance review. */
export function DiffView({ before, after }: DiffViewProps) {
  const diff = useNoticesDiff(before, after);

  return (
    <div className="fnv-diff">
      <section>
        <h3>Added ({diff.added.length})</h3>
        <ul>
          {diff.added.map((c) => (
            <li key={c.name} className="fnv-diff__added">
              {c.name}@{c.version ?? "?"}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>Removed ({diff.removed.length})</h3>
        <ul>
          {diff.removed.map((c) => (
            <li key={c.name} className="fnv-diff__removed">
              {c.name}@{c.version ?? "?"}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>Changed ({diff.changed.length})</h3>
        <ul>
          {diff.changed.map((change) => (
            <li key={change.name} className="fnv-diff__changed">
              {change.name}: {change.before.version ?? "?"} → {change.after.version ?? "?"}
              {change.licensesChanged ? " (license changed)" : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
