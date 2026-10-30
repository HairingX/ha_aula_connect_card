import { gzipSync } from "node:zlib";

import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const version = process.env.CARD_VERSION ?? "0.0.0";

/**
 * Returns CSS without its comments and the whitespace it needs only to be read. Quoted strings,
 * such as a generated ", ", are kept as they are.
 */
export function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/("[^"]*")/)
    .map((part, index) =>
      index % 2 === 1
        ? part
        : part
            .replace(/\s+/g, " ")
            .replace(/\s*([{};,])\s*/g, "$1")
            .replace(/:\s+/g, ":")
            .replace(/;}/g, "}"),
    )
    .join("")
    .trim();
}

/**
 * Returns CSS with the cards' own tokens, `--aula-*`, renamed to short names: the most used
 * first. They are set and read only in the cards' styles, so a name never has to be read.
 */
export function shortenTokens(css: string): string {
  const uses = new Map<string, number>();
  for (const [name] of css.matchAll(/--aula-[\w-]+/g)) uses.set(name, (uses.get(name) ?? 0) + 1);
  const names = new Map(
    [...uses.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name], index) => [name, `--_${index.toString(36)}`]),
  );
  return css.replace(/--aula-[\w-]+/g, (name) => names.get(name) ?? name);
}

/** Minifies the styles' `css` literals, which hold no expressions, and shortens their tokens. */
function minifyStyles(): Plugin {
  return {
    name: "aula:minify-styles",
    apply: "build",
    transform(code, id) {
      if (!id.endsWith("/src/ui/styles.ts")) return null;
      return {
        code: shortenTokens(
          code.replace(/css`([^`]*)`/g, (_match, body: string) => `css\`${minifyCss(body)}\``),
        ),
        map: null,
      };
    },
  };
}

/**
 * Collapses the indentation of lit's templates in the minified bundle: a run of white space
 * renders as one space. Only a line break followed by indentation is a template's: the minifier
 * writes "\n" as a template literal holding a line break, which must stay.
 */
function collapseTemplates(): Plugin {
  return {
    name: "aula:collapse-templates",
    apply: "build",
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type === "chunk")
          output.code = output.code.replace(/\n(?:[ \t]*\n)*[ \t]{2,}/g, " ");
      }
    },
  };
}

/** The most the bundle may weigh: as it is served, and gzipped at zlib's default level. */
export interface Budget {
  /** Bytes as served. */
  readonly raw: number;
  /** Bytes gzipped. */
  readonly gzip: number;
}

/** The card's budget, in bytes; growth beyond it fails the build. */
export const BUDGET: Budget = { raw: 108_000, gzip: 35_000 };

/** Returns a line for each limit of the budget the code is over; none when it fits. */
export function overBudget(code: string, budget: Budget): string[] {
  const raw = Buffer.byteLength(code);
  const gzip = gzipSync(code).length;
  return [
    ...(raw > budget.raw ? [`${String(raw)} bytes, over the budget of ${String(budget.raw)}`] : []),
    ...(gzip > budget.gzip
      ? [`${String(gzip)} bytes gzipped, over the budget of ${String(budget.gzip)}`]
      : []),
  ];
}

/** Fails the build when a chunk, as it is written, is over the budget. */
function budget(limits: Budget): Plugin {
  return {
    name: "aula:budget",
    apply: "build",
    writeBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        const problems = overBudget(output.code, limits);
        if (problems.length > 0) this.error(`${output.fileName}: ${problems.join("; ")}`);
      }
    },
  };
}

export default defineConfig({
  define: {
    __CARD_VERSION__: JSON.stringify(version),
  },
  plugins: [minifyStyles(), collapseTemplates(), budget(BUDGET)],
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "aula-connect-card.js",
    },
    target: "es2022",
    // Vite keeps whitespace in a library's ES module for the bundlers that consume it; this one
    // is loaded by the browser as it is.
    rolldownOptions: { output: { minify: true, comments: false } },
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
