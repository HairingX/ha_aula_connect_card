/**
 * Writes `scripts/ha-tokens.css`: Home Assistant's own design-token CSS, as its frontend defines
 * it, for the screenshots to render the cards as Home Assistant shows them. It takes a checkout
 * of `home-assistant/frontend` at the release `hacs.json`'s minimum Home Assistant uses:
 * `node scripts/extract-ha-tokens.ts <frontend checkout> [output]`.
 *
 * The CSS holds the core, typography, semantic and colour globals as `.theme-light` and
 * `.theme-dark`, the `--rgb-*` triples Home Assistant derives for a dark theme's hex colours, and
 * the reduced-motion block.
 *
 * @packageDocumentation
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [frontend, output = "scripts/ha-tokens.css"] = process.argv.slice(2);
if (frontend === undefined) {
  throw new Error("Usage: node scripts/extract-ha-tokens.ts <frontend checkout> [output]");
}
const theme = join(frontend, "src/resources/theme");

/** Returns the `css` blocks a theme module exports, by name. */
function blocks(file: string): Map<string, string> {
  const text = readFileSync(join(theme, file), "utf8");
  return new Map(
    [...text.matchAll(/export const (\w+) = css`([\s\S]*?)`;/g)].map((match) => [
      match[1] ?? "",
      match[2] ?? "",
    ]),
  );
}

/** Returns the declarations of a block's first `html { ... }` rule. */
function body(css: string | undefined): string {
  return /html\s*\{([\s\S]*?)\n {2}\}/.exec(css ?? "")?.[1] ?? "";
}

const core = blocks("core.globals.ts").get("coreStyles");
const semantic = blocks("semantic.globals.ts");
const colorSemantic = blocks("color/semantic.globals.ts");
const color = blocks("color/color.globals.ts");
const light = [
  body(core),
  body(blocks("typography.globals.ts").get("typographyStyles")),
  body(semantic.get("semanticStyles")),
  body(blocks("color/core.globals.ts").get("coreColorStyles")),
  body(colorSemantic.get("semanticColorStyles")),
  body(color.get("colorStyles")),
].join("\n");
const dark = [
  body(semantic.get("darkSemanticStyles")),
  body(colorSemantic.get("darkSemanticColorStyles")),
  body(color.get("darkColorStyles")),
].join("\n");
// Home Assistant derives an rgb triple for every hex colour a dark theme sets.
const rgb = [...dark.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((match) => {
  const hex = match[2] ?? "#000000";
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  return `--rgb-${match[1] ?? ""}: ${String(r)}, ${String(g)}, ${String(b)};`;
});
const reduced =
  /@media \(prefers-reduced-motion: reduce\)\s*\{\s*html\s*\{([\s\S]*?)\}\s*\}/.exec(
    core ?? "",
  )?.[1] ?? "";
const version =
  /^version\s*=\s*"([^"]+)"/m.exec(readFileSync(join(frontend, "pyproject.toml"), "utf8"))?.[1] ??
  "unknown";

const css =
  `/* Home Assistant's design tokens, from home-assistant/frontend ${version}, src/resources/theme.\n` +
  ` * Copyright Home Assistant, licensed under the Apache License 2.0. Written by\n` +
  ` * scripts/extract-ha-tokens.ts for the screenshots; the cards do not include it. */\n` +
  `.theme-light, .theme-dark {${light}\n}\n` +
  `.theme-dark {${dark}\n${rgb.join("\n")}\n}\n` +
  `@media (prefers-reduced-motion: reduce) { .theme-light, .theme-dark {${reduced}} }\n`;
writeFileSync(output, css);
console.info(
  `Wrote ${output}: frontend ${version}, ${String(css.split("--").length - 1)} custom properties.`,
);
