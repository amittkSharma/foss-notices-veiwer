import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { CliError } from "./errors";

/** Reads a file as UTF-8 text, turning a missing/unreadable file into a friendly `CliError`. */
export function readInputFile(path: string): string {
  try {
    return readFileSync(path, "utf-8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new CliError(`No such file: ${path}`);
    }
    if (code === "EISDIR") {
      throw new CliError(`${path} is a directory, not a file`);
    }
    throw new CliError(`Could not read ${path}: ${(error as Error).message}`);
  }
}

/** Writes bytes to a file, creating any missing parent directories first. */
export function writeOutputFile(path: string, data: Uint8Array | string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}
