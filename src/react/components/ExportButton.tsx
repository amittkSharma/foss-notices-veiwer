import { useEffect, useRef, useState } from "react";
import type { NoticesDocument, RiskTier } from "../../core/types";

export type ExportFormat = "excel" | "json";

export interface ExportButtonProps {
  document: NoticesDocument;
  licenseRiskMap?: Record<string, RiskTier>;
  /** Defaults to "notices.xlsx" for the Excel format, "notices.json" for JSON. */
  filename?: string;
}

const FORMAT_META: Record<
  ExportFormat,
  { label: string; defaultFilename: string; mimeType: string }
> = {
  excel: {
    label: "Excel",
    defaultFilename: "notices.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  json: {
    label: "JSON",
    defaultFilename: "notices.json",
    mimeType: "application/json",
  },
};

function downloadBytes(bytes: Uint8Array, filename: string, mimeType: string) {
  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports the document's basic per-component fields (name, version, license, risk,
 * author, purl) to a downloaded file. A split button: clicking the main button exports
 * to Excel (unchanged from before JSON existed); the caret opens a menu to choose Excel
 * or JSON instead. Both formats dynamically import `foss-notices-viewer/export` on click,
 * so exceljs is never pulled into the main bundle for consumers who don't export.
 */
export function ExportButton({ document: doc, licenseRiskMap, filename }: ExportButtonProps) {
  const [status, setStatus] = useState<"idle" | "exporting" | "error">("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (!groupRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    window.document.addEventListener("mousedown", handleClickOutside);
    return () => window.document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function handleExport(format: ExportFormat) {
    setMenuOpen(false);
    setStatus("exporting");
    try {
      const { exportNoticesToExcel, exportNoticesToJson } = await import("../../export");
      const bytes =
        format === "excel"
          ? await exportNoticesToExcel(doc, { licenseRiskMap })
          : exportNoticesToJson(doc, { licenseRiskMap });
      const meta = FORMAT_META[format];
      downloadBytes(bytes, filename ?? meta.defaultFilename, meta.mimeType);
      setStatus("idle");
    } catch (error) {
      console.error(`foss-notices-viewer: ${FORMAT_META[format].label} export failed`, error);
      setStatus("error");
    }
  }

  const label =
    status === "exporting"
      ? "Exporting…"
      : status === "error"
        ? "Export failed — retry"
        : "Export to Excel";

  return (
    <div className="fnv-export-button-group" ref={groupRef}>
      <button
        type="button"
        className="fnv-export-button fnv-export-button--main"
        onClick={() => handleExport("excel")}
        disabled={status === "exporting"}
      >
        {label}
      </button>
      <button
        type="button"
        className="fnv-export-button fnv-export-button--caret"
        onClick={() => setMenuOpen((open) => !open)}
        disabled={status === "exporting"}
        aria-label="Choose export format"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        ▾
      </button>
      {menuOpen && (
        <div className="fnv-export-button__menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className="fnv-export-button__menu-item"
            onClick={() => handleExport("excel")}
          >
            Export as Excel
          </button>
          <button
            type="button"
            role="menuitem"
            className="fnv-export-button__menu-item"
            onClick={() => handleExport("json")}
          >
            Export as JSON
          </button>
        </div>
      )}
    </div>
  );
}
