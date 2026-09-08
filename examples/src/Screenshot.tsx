import { DiffView, NoticesViewer } from "foss-notices-viewer/react";
import { useEffect } from "react";
import {
  SCREENSHOT_DIFF_AFTER,
  SCREENSHOT_DIFF_BEFORE,
  SCREENSHOT_DOCUMENT,
} from "./screenshotFixtures";

/**
 * README-screenshot-only harness, rendered instead of <App> when the URL has
 * `?screenshot=viewer` or `?screenshot=diff`. Not part of the published package or the
 * interactive playground — just a clean, chrome-free mount point to capture headless
 * screenshots against real components/real fixtures for the README.
 */
export function Screenshot({ mode }: { mode: "viewer" | "diff" }) {
  useEffect(() => {
    if (mode !== "viewer") return;
    const timer = setTimeout(() => {
      document.querySelectorAll<HTMLElement>(".fnv-row__summary")[0]?.click();
    }, 150);
    return () => clearTimeout(timer);
  }, [mode]);

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: 24, background: "#fff" }}>
      {mode === "viewer" ? (
        <NoticesViewer document={SCREENSHOT_DOCUMENT} virtualized={false} />
      ) : (
        <DiffView before={SCREENSHOT_DIFF_BEFORE} after={SCREENSHOT_DIFF_AFTER} />
      )}
    </div>
  );
}
