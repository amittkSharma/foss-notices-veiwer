import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Aliases the published package's subpaths straight to this repo's src/, so the
// demo always runs against the current source — no `npm run build` / `npm link`
// step needed while iterating. A real consumer would just `npm install
// foss-notices-viewer` instead of these aliases.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^foss-notices-viewer\/styles\.css$/,
        replacement: path.resolve(dirname, "../src/react/styles.css"),
      },
      {
        find: /^foss-notices-viewer\/react$/,
        replacement: path.resolve(dirname, "../src/react/index.ts"),
      },
      {
        find: /^foss-notices-viewer\/validation$/,
        replacement: path.resolve(dirname, "../src/validation/index.ts"),
      },
      {
        find: /^foss-notices-viewer$/,
        replacement: path.resolve(dirname, "../src/core/index.ts"),
      },
    ],
  },
});
