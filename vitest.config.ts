import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Tests exercise the real source, not a built/installed package, so this stands in for
      // the self-referencing package-name import used in NoticesFileUpload.tsx (see its comment
      // and tsup.config.ts's `external`) — at runtime that resolves through the consumer's own
      // node_modules instead.
      "foss-notices-viewer/validation": fileURLToPath(
        new URL("./src/validation/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
