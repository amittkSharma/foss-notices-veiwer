export interface SummaryHeaderProps {
  total: number;
  filteredCount: number;
  riskCounts?: Record<string, number>;
}

export function SummaryHeader({ total, filteredCount, riskCounts = {} }: SummaryHeaderProps) {
  return (
    <div className="fnv-summary">
      <span>
        {filteredCount} of {total} components
      </span>
      {Object.entries(riskCounts).map(([risk, count]) =>
        count > 0 ? (
          <span key={risk} className={`fnv-summary__chip fnv-summary__chip--${risk}`}>
            {count} {risk}
          </span>
        ) : null,
      )}
    </div>
  );
}
