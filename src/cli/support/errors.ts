/**
 * Thrown by a command action for an expected, user-facing failure (bad input file, invalid
 * risk map, invalid document) — as opposed to an unexpected bug, which should surface as a
 * plain `Error` with its stack trace intact. `index.ts` catches this type specially: it prints
 * `message` alone (no stack) and exits with `exitCode`.
 */
export class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}
