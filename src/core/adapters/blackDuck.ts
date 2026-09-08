import type { Component, LicenseInfo, NoticesDocument } from "../types";

export interface BlackDuckAdapterOptions {
  /**
   * Black Duck's "Notices Report" template isn't a published standard and
   * varies by report configuration. Override this if your org's export uses
   * a different section-divider line than the default `===...===`.
   */
  sectionDelimiter?: RegExp;
}

const DEFAULT_DELIMITER = /^={10,}\s*$/m;
const NAME_VERSION_LINE = /^(.+?)\s+([\w][\w.+-]*)$/;
const LICENSE_LINE = /^License:\s*(.+)$/im;
const COPYRIGHT_LINE = /^(copyright\s.+)$/im;

/**
 * Best-effort parser for Black Duck's plain-text "Notices Report" export:
 * component sections bracketed by divider lines, each with a
 * `<name> <version>` header line, a `License: <name>` line, and a body
 * containing the copyright statement(s) and full license text.
 *
 * Tuned to the most commonly seen template. If your org's Black Duck export
 * uses a different layout, pass `sectionDelimiter` or fork this adapter —
 * it's intentionally small and dependency-free.
 */
export function parseBlackDuckNotices(
  input: string,
  options: BlackDuckAdapterOptions = {},
): NoticesDocument {
  const delimiter = options.sectionDelimiter ?? DEFAULT_DELIMITER;
  const parts = input
    .split(delimiter)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const components: Component[] = [];

  for (let i = 0; i < parts.length; i += 1) {
    const header = parts[i];
    if (!header) continue;

    const licenseLineMatch = LICENSE_LINE.exec(header);
    if (!licenseLineMatch) continue;

    const nameVersionLine = header.split(/\r?\n/)[0]?.trim() ?? "";
    const headerMatch = NAME_VERSION_LINE.exec(nameVersionLine);
    const name = headerMatch?.[1] ?? nameVersionLine;
    const version = headerMatch?.[2];
    const licenseName = (licenseLineMatch[1] ?? "").trim();

    const body = parts[i + 1] ?? "";
    const copyrightMatch = COPYRIGHT_LINE.exec(body);
    const copyrightText = copyrightMatch?.[1];
    // The copyright line lives inside `body` alongside the license text. It's already
    // surfaced separately as `copyrights` below, so it must be stripped out here —
    // otherwise it renders twice: once as the copyright notice, once again as part of
    // the raw license text.
    const licenseText = body
      .split(/\r?\n/)
      .filter((line) => !COPYRIGHT_LINE.test(line))
      .join("\n")
      .trim();

    const licenses: LicenseInfo[] = [
      { id: licenseName, name: licenseName, text: licenseText || undefined },
    ];

    components.push({
      name,
      version,
      licenses,
      copyrights: copyrightText ? [{ text: copyrightText.trim() }] : [],
    });

    i += 1; // the next part was this section's body, already consumed
  }

  return { source: "black-duck", components };
}
