import type { ValidationReport } from "../validation/types";
import {
  type BlackDuckAdapterOptions,
  parseBlackDuckNotices,
  parseCycloneDxBom,
  parseGenerateLicenseFileText,
  parseSpdxDocument,
} from "./adapters";
import type { NoticesDocument, NoticesSource } from "./types";

export type NoticesFileFormat = Exclude<NoticesSource, "unknown">;

export interface NoticesFormatMeta {
  label: string;
  kind: "json" | "text";
}

export const FORMAT_META: Record<NoticesFileFormat, NoticesFormatMeta> = {
  spdx: { label: "SPDX", kind: "json" },
  cyclonedx: { label: "CycloneDX", kind: "json" },
  "generate-license-file": { label: "generate-license-file", kind: "text" },
  "black-duck": { label: "Black Duck Notices Report", kind: "text" },
};

export const FORMAT_IDS: NoticesFileFormat[] = [
  "spdx",
  "cyclonedx",
  "generate-license-file",
  "black-duck",
];

/**
 * Only meaningful for `"black-duck"` — silently ignored by the other three formats, which
 * have no equivalent override.
 */
export interface FormatAdapterOptions {
  sectionDelimiter?: BlackDuckAdapterOptions["sectionDelimiter"];
}

export function parseByFormat(
  format: NoticesFileFormat,
  text: string,
  options: FormatAdapterOptions = {},
): NoticesDocument {
  switch (format) {
    case "spdx":
      return parseSpdxDocument(text);
    case "cyclonedx":
      return parseCycloneDxBom(text);
    case "generate-license-file":
      return parseGenerateLicenseFileText(text);
    case "black-duck":
      return parseBlackDuckNotices(text, { sectionDelimiter: options.sectionDelimiter });
  }
}

export async function validateByFormat(
  format: NoticesFileFormat,
  text: string,
  options: FormatAdapterOptions = {},
): Promise<ValidationReport> {
  // Imported by its published package name, not a relative "../validation" path: esbuild's
  // CJS output has no code-splitting, so a relative cross-entry dynamic import gets inlined —
  // silently duplicating validation's ~230KB of vendored JSON Schemas into every consumer of
  // this module's entry point (core, react, and now the CLI), even ones that never touch this
  // pipeline. The package-name specifier is left untouched by the bundler (see
  // tsup.config.ts's `external`) and resolves at runtime through the consumer's own
  // node_modules, exactly like importing any other installed package.
  const validation = await import("foss-notices-viewer/validation");
  switch (format) {
    case "spdx":
      return validation.validateSpdxDocument(text);
    case "cyclonedx":
      return validation.validateCycloneDxBom(text);
    case "generate-license-file":
      return validation.validateGenerateLicenseFileText(text);
    case "black-duck":
      return validation.validateBlackDuckNotices(text, {
        sectionDelimiter: options.sectionDelimiter,
      });
  }
}

/**
 * Checks the input's content shape against what the selected format expects — SPDX/CycloneDX
 * are JSON, generate-license-file/Black Duck are plain text — before running the (much more
 * expensive) full schema validation. Catches the most common mistake (wrong format selected
 * for the content in hand) with an immediate, specific message instead of a wall of schema
 * errors.
 */
export function checkFormatMatch(format: NoticesFileFormat, text: string): string | null {
  const meta = FORMAT_META[format];
  const looksLikeJson = /^\s*[{[]/.test(text);

  if (meta.kind === "json") {
    try {
      JSON.parse(text);
      return null;
    } catch {
      return `${meta.label} files must be valid JSON, but this file doesn't parse as JSON. Double-check you selected the right format.`;
    }
  }

  if (looksLikeJson) {
    return `${meta.label} expects a plain-text notices file, but this one looks like JSON. Did you mean SPDX or CycloneDX?`;
  }

  return null;
}
