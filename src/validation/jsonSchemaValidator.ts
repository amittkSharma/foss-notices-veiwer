import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { type Pointers, parse as parseWithSourceMap } from "json-source-map";
import type { NoticesSource } from "../core/types";
import { offsetToLineColumn } from "./lineUtils";
import type { ValidationIssue, ValidationReport } from "./types";

const compiledValidators = new WeakMap<Record<string, unknown>, ValidateFunction>();

function getCompiledValidator(
  schema: Record<string, unknown>,
  extraSchemas: Record<string, unknown>[],
): ValidateFunction {
  const cached = compiledValidators.get(schema);
  if (cached) return cached;

  // allErrors: collect every violation in one pass instead of stopping at the first.
  // strict: false — the vendored official schemas use constructs (e.g. $comment) ajv's
  // strict mode warns about; that's a property of the upstream schema, not a bug here.
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  // ajv-formats doesn't ship these two RFC 3987/6531 formats, which the official CycloneDX
  // schema uses for URL/email-like fields. Registering them as permissive no-ops (rather than
  // leaving them "unknown") avoids ajv's noisy per-schema-path console warning; this package
  // doesn't need to enforce them strictly to satisfy the "whole file, one report" requirement.
  ajv.addFormat("iri-reference", true);
  ajv.addFormat("idn-email", true);
  for (const extraSchema of extraSchemas) {
    const id = (extraSchema as { $id?: string }).$id;
    if (!id || !ajv.getSchema(id)) ajv.addSchema(extraSchema);
  }
  const compiled = ajv.compile(schema);
  compiledValidators.set(schema, compiled);
  return compiled;
}

function describeError(error: ErrorObject): string {
  const location = error.instancePath || "the document root";
  return `${location}: ${error.message ?? "does not match the schema"}`;
}

function suggestFix(error: ErrorObject): string {
  const params = error.params as Record<string, unknown>;
  const at = error.instancePath || "the document root";
  switch (error.keyword) {
    case "required":
      return `Add the missing "${params.missingProperty}" property inside ${at}.`;
    case "type":
      return `Change the value at ${at} to type "${params.type}".`;
    case "enum":
      return `Use one of the allowed values at ${at}: ${(params.allowedValues as unknown[] | undefined)?.join(", ")}.`;
    case "additionalProperties":
      return `Remove the unexpected property "${params.additionalProperty}" from ${at} (check it isn't a typo of an allowed field).`;
    case "pattern":
      return `Update the value at ${at} to match the required pattern ${params.pattern}.`;
    case "format":
      return `Update the value at ${at} to a valid "${params.format}".`;
    case "const":
      return `Set the value at ${at} to ${JSON.stringify(params.allowedValue)}.`;
    case "minItems":
      return `Add at least ${params.limit} item(s) at ${at}.`;
    case "minLength":
      return `The value at ${at} is shorter than the required minimum of ${params.limit} character(s).`;
    case "oneOf":
    case "anyOf":
      return `The value at ${at} must match one of the allowed shapes for this field — see the schema for the alternatives.`;
    default:
      return `Check the value at ${at} against the schema (failed rule: "${error.keyword}").`;
  }
}

/** For `required`/`additionalProperties`, point at the specific missing/extra key instead of its parent object. */
function resolvePointer(error: ErrorObject): string {
  if (error.keyword === "required") {
    const missing = (error.params as { missingProperty?: string }).missingProperty;
    return missing ? `${error.instancePath}/${missing}` : error.instancePath;
  }
  if (error.keyword === "additionalProperties") {
    const extra = (error.params as { additionalProperty?: string }).additionalProperty;
    return extra ? `${error.instancePath}/${extra}` : error.instancePath;
  }
  return error.instancePath;
}

function buildIssues(
  errors: ErrorObject[] | null | undefined,
  pointers: Pointers,
): ValidationIssue[] {
  if (!errors) return [];
  return errors.map((error) => {
    const pointer = resolvePointer(error);
    // The exact pointer misses for a *missing* required property (it doesn't exist in the
    // source), so fall back to the position of the object that should have contained it.
    const position =
      pointers[pointer]?.key ?? pointers[pointer]?.value ?? pointers[error.instancePath]?.value;
    return {
      line: position ? position.line + 1 : null,
      column: position ? position.column + 1 : null,
      path: error.instancePath || "/",
      message: describeError(error),
      suggestion: suggestFix(error),
      severity: "error",
    };
  });
}

function jsonSyntaxErrorIssue(rawText: string, error: unknown): ValidationIssue {
  const message = error instanceof Error ? error.message : String(error);
  const offset = Number(/position (\d+)/.exec(message)?.[1]);
  const position = Number.isFinite(offset) ? offsetToLineColumn(rawText, offset) : null;
  return {
    line: position?.line ?? null,
    column: position?.column ?? null,
    path: "/",
    message: `The input isn't valid JSON: ${message}`,
    suggestion:
      "Fix the JSON syntax error at the reported position (common causes: a trailing comma, an unescaped quote, or a missing bracket), then re-validate.",
    severity: "error",
  };
}

export interface JsonSchemaValidationOptions {
  input: string | Record<string, unknown>;
  format: NoticesSource;
  standard: string;
  schema: Record<string, unknown>;
  extraSchemas?: Record<string, unknown>[];
}

/**
 * Validates a JSON document against an official JSON Schema, reporting every violation in
 * a single pass (not just the first) with a line/column and a concrete fix suggestion for each.
 */
export function validateJsonAgainstSchema(options: JsonSchemaValidationOptions): ValidationReport {
  const { input, format, standard, schema, extraSchemas = [] } = options;

  let data: unknown;
  let pointers: Pointers = {};

  if (typeof input === "string") {
    try {
      const parsed = parseWithSourceMap(input);
      data = parsed.data;
      pointers = parsed.pointers;
    } catch (error) {
      const issue = jsonSyntaxErrorIssue(input, error);
      return { valid: false, format, standard, issueCount: 1, issues: [issue] };
    }
  } else {
    data = input;
  }

  const validate = getCompiledValidator(schema, extraSchemas);
  const valid = Boolean(validate(data));
  const issues = valid ? [] : buildIssues(validate.errors, pointers);

  return { valid, format, standard, issueCount: issues.length, issues };
}
