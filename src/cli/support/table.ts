import { color } from "./color";

const MAX_COLUMN_WIDTH = 48;

// Strips ANSI SGR codes before measuring width — a colored cell's *visible* width is what
// matters for alignment, not its string length (which includes the invisible escape bytes).
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching the ESC byte is the point.
const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;
function visibleWidth(text: string): number {
  return text.replace(ANSI_PATTERN, "").length;
}

function truncate(text: string, width: number): string {
  return visibleWidth(text) > width ? `${text.slice(0, width - 1)}…` : text;
}

function pad(text: string, width: number): string {
  return text + " ".repeat(Math.max(0, width - visibleWidth(text)));
}

/**
 * Renders a plain aligned text table — no box-drawing characters, matching the minimalist
 * style of `npm ls`/`git status`/`docker ps` rather than a heavier bordered-grid look.
 * Column widths are derived from content (header included), capped at `MAX_COLUMN_WIDTH` so one
 * long license name/purl doesn't blow out the whole table.
 */
export function renderTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, i) =>
    Math.min(
      MAX_COLUMN_WIDTH,
      Math.max(visibleWidth(header), ...rows.map((row) => visibleWidth(row[i] ?? ""))),
    ),
  );

  const renderRow = (cells: string[]) =>
    cells.map((cell, i) => pad(truncate(cell, widths[i] ?? 0), widths[i] ?? 0)).join("  ");

  const lines = [
    color.bold(renderRow(headers)),
    color.dim(widths.map((w) => "-".repeat(w)).join("  ")),
    ...rows.map((row) => renderRow(row)),
  ];
  return lines.join("\n");
}
