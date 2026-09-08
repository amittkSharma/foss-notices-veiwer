/**
 * A minimal, dependency-free ANSI helper — the CLI already has real dependencies (ajv,
 * exceljs, commander) for things only they can do; hand-rolling ~20 lines of SGR codes avoids
 * adding one more just to bold and color a few words. Respects the https://no-color.org
 * convention and disables automatically when stdout isn't a TTY (e.g. piped into a file or
 * `less`), same as most professional CLIs (git, eslint, npm).
 */
let enabled = Boolean(process.stdout.isTTY) && process.env.NO_COLOR === undefined;

/** Called from the root command's `--no-color` flag / `NO_COLOR` env var handling. */
export function setColorEnabled(value: boolean): void {
  enabled = value;
}

export function isColorEnabled(): boolean {
  return enabled;
}

function wrap(code: number, text: string): string {
  return enabled ? `[${code}m${text}[0m` : text;
}

export const color = {
  bold: (text: string) => wrap(1, text),
  dim: (text: string) => wrap(2, text),
  red: (text: string) => wrap(31, text),
  green: (text: string) => wrap(32, text),
  yellow: (text: string) => wrap(33, text),
  blue: (text: string) => wrap(34, text),
  magenta: (text: string) => wrap(35, text),
  cyan: (text: string) => wrap(36, text),
  gray: (text: string) => wrap(90, text),
};

/** Colors risk tiers consistently with the React `<LicenseBadge>`'s tier → color mapping. */
export function colorForRisk(risk: string): (text: string) => string {
  switch (risk) {
    case "permissive":
      return color.green;
    case "weak-copyleft":
      return color.yellow;
    case "copyleft":
      return color.red;
    case "proprietary":
      return color.magenta;
    default:
      return color.gray;
  }
}
