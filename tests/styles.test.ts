import { describe, expect, it } from "vitest";

import { styles } from "../src/styles";

const css = styles.cssText;

function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
}

describe("styles", () => {
  it("never wraps the lesson times, and sizes their column to them", () => {
    expect(rule(".lesson-time")).toMatch(/white-space:\s*nowrap/);
    expect(rule(".lessons")).toMatch(/grid-template-columns:\s*max-content minmax\(0, 1fr\)/);
    expect(rule(".span")).toMatch(/white-space:\s*nowrap/);
  });

  it("uses the theme's primary colour only for text, lines and outlines, never a surface", () => {
    const uses = [...css.matchAll(/([\w-]+)\s*:[^;{}]*var\(--acc-primary\)/g)].map(
      (match) => match[1],
    );
    expect(uses.length).toBeGreaterThan(0);
    for (const property of uses) {
      expect(["color", "border-left-color", "outline", "background"]).toContain(property);
    }
    // The pulse of the loading state is the one small dot filled with it.
    expect(rule(".pulse")).toMatch(/background:\s*var\(--acc-primary\)/);
    expect(uses.filter((property) => property === "background")).toHaveLength(1);
    expect(css).not.toMatch(/color-mix\([^;]*primary/);
  });

  it("has no blue of its own", () => {
    for (const [hex] of css.matchAll(/#[0-9a-f]{6}\b/gi)) {
      const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
      expect(b, hex).toBeLessThanOrEqual(Math.max(r ?? 0, g ?? 0) + 16);
    }
  });
});
