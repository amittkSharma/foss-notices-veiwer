import type { NoticesSource } from "../core/types";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  /** 1-indexed line number in the original input, or null if not attributable to one line. */
  line: number | null;
  /** 1-indexed column on that line, or null. */
  column: number | null;
  /** JSON pointer (JSON formats) or a synthetic locator (text formats) identifying what failed. */
  path: string;
  /** What's wrong. */
  message: string;
  /** A concrete next step to fix it. */
  suggestion: string;
  severity: ValidationSeverity;
}

export interface ValidationReport {
  valid: boolean;
  format: NoticesSource;
  /** What the input was checked against — an official spec's JSON Schema, or this package's own structural rules. */
  standard: string;
  issueCount: number;
  /** Every issue found in one pass — never just the first. */
  issues: ValidationIssue[];
}
