import { chmodSync, copyFileSync } from "node:fs";
import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/core/index.ts",
      react: "src/react/index.ts",
      validation: "src/validation/index.ts",
      export: "src/export/index.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: false,
    minify: true,
    // "npm run clean" removes dist/ up front instead — tsup's own `clean: true` would race
    // against the CLI config object below when both build in parallel.
    clean: false,
    // "foss-notices-viewer/validation": a cross-entry dynamic import (see NoticesFileUpload.tsx)
    // that must stay a real runtime import, not get inlined — CJS output can't code-split.
    external: ["react", "react-dom", "foss-notices-viewer/validation"],
    onSuccess: async () => {
      copyFileSync("src/react/styles.css", "dist/styles.css");
    },
  },
  {
    entry: { cli: "src/cli/bin.ts" },
    // A CLI executable has no CJS consumer and no public types to publish — ESM-only output.
    format: ["esm"],
    dts: false,
    sourcemap: false,
    minify: true,
    clean: false,
    banner: { js: "#!/usr/bin/env node" },
    // Same cross-entry rule as above: the CLI's validate command reaches validation/'s vendored
    // schemas through the exact same dynamic import.
    external: ["foss-notices-viewer/validation"],
    onSuccess: async () => {
      chmodSync("dist/cli.js", 0o755);
    },
  },
]);
