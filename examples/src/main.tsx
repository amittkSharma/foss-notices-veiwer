import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "foss-notices-viewer/styles.css";
import "./demo.css";
import { App } from "./App";
import { Screenshot } from "./Screenshot";

const container = document.getElementById("root");
if (!container) throw new Error("#root element not found");

const screenshotMode = new URLSearchParams(location.search).get("screenshot");

createRoot(container).render(
  <StrictMode>
    {screenshotMode === "viewer" || screenshotMode === "diff" ? (
      <Screenshot mode={screenshotMode} />
    ) : (
      <App />
    )}
  </StrictMode>,
);
