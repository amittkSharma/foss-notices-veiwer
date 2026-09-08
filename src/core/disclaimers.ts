import type { NoticesSource } from "./types";

/**
 * Per-adapter caveats about the reliability of the *license information itself* — as opposed to
 * the general field-availability caveats in the README's Caveats section. Shown under the
 * license section of `<ComponentRow>`'s detail view. Sources with no license-specific caveat
 * (e.g. `"unknown"`, for a document assembled by hand rather than through an adapter) have no
 * entry and render nothing.
 */
export const ADAPTER_LICENSE_DISCLAIMERS: Partial<Record<NoticesSource, string>> = {
  spdx: "SPDX only records a license identifier — never the license's full text or a canonical URL — so those fields read \"No information\" above by design. Verify against the license's own official text before treating this as a compliance record.",
  cyclonedx:
    "CycloneDX only records a license identifier or SPDX expression — never the license's full text or a canonical URL — so those fields read \"No information\" above by design. Verify against the license's own official text before treating this as a compliance record.",
  "generate-license-file":
    'This format embeds only the raw license text, never an SPDX id — the license name shown above is a best-effort guess from that text (falling back to "Unknown License" when unrecognized). Verify it against the license text before relying on it.',
  "black-duck":
    "Black Duck's Notices Report layout isn't a published standard and varies by report template/version — verify this license against the original report before relying on it.",
};
