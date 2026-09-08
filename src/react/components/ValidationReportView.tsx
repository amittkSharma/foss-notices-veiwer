import type { ValidationReport } from "../../validation/types";
import { ExportValidationButton } from "./ExportValidationButton";

export interface ValidationReportViewProps {
  report: ValidationReport;
}

/**
 * Renders a `ValidationReport` (from `foss-notices-viewer/validation`) as a summary plus a
 * list of every issue found, each with its line/column, message, and suggested fix. Takes the
 * report as plain data — import the `validate*` functions from `foss-notices-viewer/validation`
 * yourself, so consumers who don't validate never pull ajv into their bundle via this component.
 */
export function ValidationReportView({ report }: ValidationReportViewProps) {
  const errorCount = report.issues.filter((issue) => issue.severity === "error").length;
  const warningCount = report.issues.filter((issue) => issue.severity === "warning").length;

  return (
    <div className="fnv-validation">
      <div
        className={`fnv-validation__summary fnv-validation__summary--${report.valid ? "valid" : "invalid"}`}
      >
        <span className="fnv-validation__status">{report.valid ? "✓ Valid" : "✗ Invalid"}</span>
        <span className="fnv-validation__counts">
          {report.issueCount === 0
            ? "No issues found."
            : `${errorCount} error(s), ${warningCount} warning(s).`}
        </span>
      </div>
      <p className="fnv-validation__standard">Checked against: {report.standard}</p>
      <ExportValidationButton report={report} />
      {report.issues.length > 0 && (
        <ul className="fnv-validation__issues">
          {report.issues.map((issue, index) => (
            <li
              key={`${issue.path}:${issue.line}:${issue.column}:${index}`}
              className={`fnv-validation__issue fnv-validation__issue--${issue.severity}`}
            >
              <div className="fnv-validation__issue-header">
                <span
                  className={`fnv-badge fnv-badge--${issue.severity === "error" ? "copyleft" : "weak-copyleft"}`}
                >
                  {issue.severity}
                </span>
                <span className="fnv-validation__location">
                  {issue.line != null
                    ? `line ${issue.line}${issue.column != null ? `:${issue.column}` : ""}`
                    : issue.path}
                </span>
              </div>
              <p className="fnv-validation__message">{issue.message}</p>
              {issue.suggestion && (
                <p className="fnv-validation__suggestion">
                  <strong>Suggested fix:</strong> {issue.suggestion}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
