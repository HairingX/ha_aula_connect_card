import { defineConfig } from "vitest/config";

const version = process.env.CARD_VERSION ?? "0.0.0";

export default defineConfig({
  define: {
    __CARD_VERSION__: JSON.stringify(version),
  },
  build: {
    lib: {
      entry: "src/aula-connect-card.ts",
      formats: ["es"],
      fileName: () => "aula-connect-card.js",
    },
    target: "es2022",
    // Vite keeps whitespace in a library's ES module for the bundlers that consume it; this one
    // is loaded by the browser as it is.
    rolldownOptions: { output: { minify: true } },
    sourcemap: false,
    emptyOutDir: true,
  },
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      reporter: ["text", "html"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
