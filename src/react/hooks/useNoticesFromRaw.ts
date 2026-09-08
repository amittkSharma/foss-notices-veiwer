import { useEffect, useState } from "react";
import {
  type NoticesFileFormat,
  checkFormatMatch,
  parseByFormat,
  validateByFormat,
} from "../../core/pipeline";
import type { NoticesDocument } from "../../core/types";
import type { ValidationReport } from "../../validation/types";

export type NoticesFromRawPhase = "busy" | "format-error" | "schema-invalid" | "valid" | "error";

export interface NoticesFromRawState {
  phase: NoticesFromRawPhase;
  errorMessage: string | null;
  report: ValidationReport | null;
  document: NoticesDocument | null;
}

/**
 * Runs the format-shape check → schema validation → parse pipeline against a raw notices
 * string, re-running whenever `format`/`raw` change. Backs `<NoticesViewer>`'s `adapter` prop
 * mode, so the pipeline itself lives in exactly one place (`core/pipeline.ts`) regardless of
 * which component triggers it.
 */
export function useNoticesFromRaw(format: NoticesFileFormat, raw: string): NoticesFromRawState {
  const [state, setState] = useState<NoticesFromRawState>({
    phase: "busy",
    errorMessage: null,
    report: null,
    document: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ phase: "busy", errorMessage: null, report: null, document: null });

    (async () => {
      try {
        const formatError = checkFormatMatch(format, raw);
        if (formatError) {
          if (!cancelled) {
            setState({
              phase: "format-error",
              errorMessage: formatError,
              report: null,
              document: null,
            });
          }
          return;
        }

        const report = await validateByFormat(format, raw);
        if (cancelled) return;

        if (!report.valid) {
          setState({ phase: "schema-invalid", errorMessage: null, report, document: null });
          return;
        }

        const document = parseByFormat(format, raw);
        if (cancelled) return;
        setState({ phase: "valid", errorMessage: null, report, document });
      } catch (error) {
        if (!cancelled) {
          setState({
            phase: "error",
            errorMessage: error instanceof Error ? error.message : String(error),
            report: null,
            document: null,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [format, raw]);

  return state;
}
