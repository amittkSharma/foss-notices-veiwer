import { type ChangeEvent, useId, useState } from "react";
import { FORMAT_IDS, FORMAT_META, type NoticesFileFormat } from "../../core/pipeline";
import type { RiskTier } from "../../core/types";
import { NoticesViewer } from "./NoticesViewer";

export type { NoticesFileFormat };

export interface NoticesFileUploadProps {
  licenseRiskMap?: Record<string, RiskTier>;
  virtualized?: boolean;
  /** The format pre-selected on first render. Defaults to "spdx". */
  defaultFormat?: NoticesFileFormat;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * A pick-a-format, upload-a-file front end for `<NoticesViewer>`'s `adapter` prop mode: this
 * component only owns the file picker UI — it reads the uploaded file and hands the raw text
 * straight to `<NoticesViewer adapter document>`, which does the format-shape check, schema
 * validation, and parsing itself (see `../../core/pipeline` and `../hooks/useNoticesFromRaw`).
 */
export function NoticesFileUpload({
  licenseRiskMap,
  virtualized,
  defaultFormat = "spdx",
}: NoticesFileUploadProps) {
  const [format, setFormat] = useState<NoticesFileFormat>(defaultFormat);
  const [fileName, setFileName] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const fileInputId = useId();
  const formatSelectId = useId();

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setFileName(null);
      setText(null);
      setReadError(null);
      return;
    }

    setFileName(file.name);
    setText(null);
    setReadError(null);

    try {
      setText(await readFileAsText(file));
    } catch (error) {
      setReadError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="fnv-upload">
      <div className="fnv-upload__controls">
        <label htmlFor={formatSelectId}>Format</label>
        <select
          id={formatSelectId}
          value={format}
          onChange={(event) => setFormat(event.target.value as NoticesFileFormat)}
        >
          {FORMAT_IDS.map((id) => (
            <option key={id} value={id}>
              {FORMAT_META[id].label}
            </option>
          ))}
        </select>
        <label htmlFor={fileInputId}>Notices file</label>
        <input id={fileInputId} type="file" onChange={handleFileChange} />
      </div>
      {fileName && <p className="fnv-upload__filename">Selected: {fileName}</p>}
      {readError && (
        <p className="fnv-upload__error" role="alert">
          {readError}
        </p>
      )}
      {text != null && (
        <NoticesViewer
          adapter={format}
          document={text}
          licenseRiskMap={licenseRiskMap}
          virtualized={virtualized}
          viewMode="detail"
        />
      )}
    </div>
  );
}
