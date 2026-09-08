import type { Component, LicenseInfo, NoticesDocument } from "../types";
import { guessLicenseIdFromText } from "./licenseTextHeuristics";

const SEPARATOR_LINE = /^-{5,}\s*$/m;
// The tool prepends this banner before the first entry and appends it again after the
// last separator, with no separator of its own between the header banner and entry #1 —
// so it must be stripped out before splitting, not filtered out block-by-block.
const CREDIT_BANNER =
  /This file was generated with the generate-license-file npm package!\r?\nhttps:\/\/www\.npmjs\.com\/package\/generate-license-file/gi;
const DEPENDENCY_LINE = /^\s*-\s+(.+)$/gm;
const LICENSE_HEADING = /contains? the following license:/i;
const NOTICES_HEADING = /with the following notices:/i;

function splitNameVersion(entry: string): { name: string; version?: string } {
  const trimmed = entry.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return { name: trimmed };
  return { name: trimmed.slice(0, at), version: trimmed.slice(at + 1) };
}

/**
 * Parses the plain-text output of the `generate-license-file` npm package
 * (https://www.npmjs.com/package/generate-license-file). That tool groups
 * dependencies that share identical license text into one block, separated
 * by lines of dashes — so this adapter expands each block back into one
 * `Component` per dependency, all sharing the same parsed license.
 *
 * The tool embeds only the raw license *text*, never an SPDX id, so the
 * license id here is a best-effort guess (see `guessLicenseIdFromText`) —
 * falls back to "Unknown License" for anything unrecognized.
 */
export function parseGenerateLicenseFileText(input: string): NoticesDocument {
  const blocks = input
    .replace(CREDIT_BANNER, "")
    .split(SEPARATOR_LINE)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  const components: Component[] = [];

  for (const block of blocks) {
    const licenseHeadingMatch = LICENSE_HEADING.exec(block);
    if (!licenseHeadingMatch) continue;

    const dependencySection = block.slice(0, licenseHeadingMatch.index);
    const rest = block.slice(licenseHeadingMatch.index + licenseHeadingMatch[0].length).trim();

    const noticesMatch = NOTICES_HEADING.exec(rest);
    const licenseText = (noticesMatch ? rest.slice(0, noticesMatch.index) : rest).trim();
    const noticesText = noticesMatch
      ? rest.slice(noticesMatch.index + noticesMatch[0].length).trim()
      : "";

    const dependencies = [...dependencySection.matchAll(DEPENDENCY_LINE)].map((match) =>
      splitNameVersion(match[1] ?? ""),
    );
    if (dependencies.length === 0) continue;

    const licenseId = guessLicenseIdFromText(licenseText);
    const licenses: LicenseInfo[] = [{ id: licenseId, name: licenseId, text: licenseText }];

    for (const dependency of dependencies) {
      components.push({
        name: dependency.name,
        version: dependency.version,
        licenses,
        copyrights: noticesText ? [{ text: noticesText }] : [],
      });
    }
  }

  return { source: "generate-license-file", components };
}
