import { validateJsonAgainstSchema } from "./jsonSchemaValidator";
import bomSchema from "./schemas/cyclonedx-bom-1.5.schema.json";
import jsfSchema from "./schemas/cyclonedx-jsf-0.82.schema.json";
import spdxExpressionSchema from "./schemas/cyclonedx-spdx.schema.json";
import type { ValidationReport } from "./types";

/**
 * Validates a CycloneDX BOM against the official CycloneDX 1.5 JSON Schema
 * (https://github.com/CycloneDX/specification/tree/1.5/schema), reporting
 * every violation found — not just the first — each with a line number and
 * a suggested fix.
 */
export function validateCycloneDxBom(input: string | Record<string, unknown>): ValidationReport {
  return validateJsonAgainstSchema({
    input,
    format: "cyclonedx",
    standard: "CycloneDX 1.5 JSON Schema (official, cyclonedx.org)",
    schema: bomSchema as Record<string, unknown>,
    extraSchemas: [
      spdxExpressionSchema as Record<string, unknown>,
      jsfSchema as Record<string, unknown>,
    ],
  });
}
