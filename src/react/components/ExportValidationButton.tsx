import { useState } from "react";
import type { ValidationReport } from "../../validation/types";

export interface ExportValidationButtonProps {
  report: ValidationReport;
  /** Defaults to "validation-report.xlsx". */
  filename?: string;
}

/**
 * Exports a `ValidationReport` (Summary + Issues sheets) to a downloaded .xlsx file.
 * Dynamically imports `foss-notices-viewer/export` on click, so exceljs is never
 * pulled into the main bundle for consumers who don't export.
 */
export function ExportValidationButton({ report, filename }: ExportValidationButtonProps) {
  const [status, setStatus] = useState<"idle" | "exporting" | "error">("idle");

  async function handleClick() {
    setStatus("exporting");
    try {
      const { exportValidationReportToExcel } = await import("../../export");
      const bytes = await exportValidationReportToExcel(report);
      const blob = new Blob([bytes as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = filename ?? "validation-report.xlsx";
      link.click();
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch (error) {
      console.error("foss-notices-viewer: validation report export failed", error);
      setStatus("error");
    }
  }

  return (
    <button
      type="button"
      className="fnv-export-button"
      onClick={handleClick}
      disabled={status === "exporting"}
    >
      {status === "exporting"
        ? "Exporting…"
        : status === "error"
          ? "Export failed — retry"
          : "Export validation report"}
    </button>
  );
}
