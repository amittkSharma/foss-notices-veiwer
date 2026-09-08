import { validateJsonAgainstSchema } from "./jsonSchemaValidator";
import spdxSchema from "./schemas/spdx-2.3.schema.json";
import type { ValidationReport } from "./types";

/**
 * Validates an SPDX document against the official SPDX 2.3 JSON Schema
 * (https://github.com/spdx/spdx-spec/blob/support/2.3/schemas/spdx-schema.json),
 * reporting every violation found — not just the first — each with a line
 * number and a suggested fix.
 */
export function validateSpdxDocument(input: string | Record<string, unknown>): ValidationReport {
  return validateJsonAgainstSchema({
    input,
    format: "spdx",
    standard: "SPDX 2.3 JSON Schema (official, spdx.org)",
    schema: spdxSchema as Record<string, unknown>,
  });
}
