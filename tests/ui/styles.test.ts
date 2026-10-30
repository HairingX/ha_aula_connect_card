import type { CSSResult } from "lit";
import { describe, expect, it } from "vitest";

import { base, blocks, dayStyles, homeworkStyles, weekStyles } from "../../src/ui/styles.ts";

interface Rule {
  /** The at-rule the rule is in, such as "@container aula (min-width: 600px)"; "" for none. */
  readonly within: string;
  /** Its selectors, each with its white space collapsed. */
  readonly selectors: readonly string[];
  /** Its declarations, each with its white space collapsed. */
  readonly declarations: readonly string[];
}

/** Returns a stylesheet's rules, those inside an at-rule with the at-rule's prelude. */
function rules(sheet: CSSResult): Rule[] {
  const css = sheet.cssText.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");
  const result: Rule[] = [];
  const stack: string[] = [];
  let text = "";
  for (const char of css) {
    if (char === "{") {
      stack.push(text.trim());
      text = "";
    } else if (char === "}") {
      const prelude = stack.pop() ?? "";
      if (!prelude.startsWith("@")) {
        result.push({
          within: stack.filter((item) => item.startsWith("@")).join(" "),
          selectors: prelude.split(",").map((item) => item.trim()),
          declarations: text
            .split(";")
            .map((item) => item.trim())
            .filter((item) => item !== ""),
        });
      }
      text = "";
    } else text += char;
  }
  return result;
}

/** Returns the declarations a selector gets, inside an at-rule or none. */
function declared(sheet: CSSResult, selector: string, within = ""): string[] {
  return rules(sheet)
    .filter((rule) => rule.within === within && rule.selectors.includes(selector))
    .flatMap((rule) => rule.declarations);
}

const ALL = [base, blocks, dayStyles, homeworkStyles, weekStyles];

describe("the wall screen", () => {
  it("sets what to bring, set up or quoted, at 30 px, and the subjects at 24 px", () => {
    expect(declared(blocks, ".large .pack-what")).toContain(
      "font-size: calc(var(--ha-font-size-xl, 20px) * 1.5)",
    );
    expect(declared(blocks, ".large .pack-subjects")).toContain(
      "font-size: calc(var(--ha-font-size-l, 16px) * 1.5)",
    );
  });

  it("lets a 12-hour span break before its dash where a column is too narrow", () => {
    const wall = "@container aula (min-width: 480px)";
    expect(declared(blocks, ".large .hours .span", wall)).toContain("white-space: normal");
  });

  it("stands three children side by side on a 1216 px kiosk", () => {
    expect(declared(blocks, ".large .n-3 .cols", "@container child (min-width: 1100px)")).toContain(
      "--aula-n: 3",
    );
    expect(declared(base, ".large .kids-3", "@container kids (min-width: 1100px)")).toContain(
      "--aula-cols: 3",
    );
  });
});

describe("what is never cut", () => {
  it("clamps no quote of the week plan, only the plan's notes behind Vis mere", () => {
    const clamped = ALL.flatMap(rules)
      .filter((rule) => rule.declarations.some((item) => item.includes("line-clamp: 2")))
      .flatMap((rule) => rule.selectors);
    expect(clamped).toEqual([".plan-text"]);
  });

  it("keeps a time span on one line, and wraps a long subject's label", () => {
    expect(declared(base, ".span")).toContain("white-space: nowrap");
    expect(declared(base, ".label.subject")).toContain("white-space: normal");
  });

  it("gives a holiday's dates a line of their own beside a long name, at word boundaries", () => {
    expect(declared(blocks, ".bridge")).toContain("flex-wrap: wrap");
    expect(declared(blocks, ".bridge.alone .bridge-label")).toContain("flex: 1 1 8em");
    expect(declared(blocks, ".bridge-label")).toContain("overflow-wrap: break-word");
  });
});

describe("the cards' layout", () => {
  it("pads a card 16 px at every width, as Home Assistant's own cards", () => {
    const padding = rules(base).filter(
      (rule) =>
        rule.selectors.includes(".body") && rule.declarations.some((d) => d.startsWith("padding")),
    );
    expect(padding.map((rule) => rule.within)).toEqual(["", "@container aula (max-width: 359px)"]);
  });

  it("keeps a wrapping fact's icon by its first line", () => {
    expect(declared(base, ".facts")).toContain("align-items: flex-start");
    expect(declared(base, ".fact")).toContain("align-items: flex-start");
  });

  it("lets a bridge row's time follow its text on a wide card", () => {
    expect(declared(blocks, ".bridge-end", "@container aula (min-width: 600px)")).toContain(
      "margin-inline-start: 0",
    );
  });

  it("sets the homework card's title at 24 px and what it is about at 14 px", () => {
    expect(declared(homeworkStyles, ".title-who .who-name")).toContain(
      "font-size: var(--aula-font-2xl)",
    );
    expect(declared(homeworkStyles, ".title-who .who-meta")).toContain(
      "font-size: var(--aula-font-m)",
    );
  });

  it("puts one child's homework days in columns from 600 px", () => {
    expect(
      declared(homeworkStyles, ".normal .n-1 .hw-days", "@container child (min-width: 600px)"),
    ).toContain("grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))");
  });

  it("keeps the week card's chevrons in one column at the trailing edge", () => {
    const moved = ALL.flatMap(rules).filter(
      (rule) =>
        rule.selectors.some((item) => item.endsWith(".chevron")) &&
        rule.declarations.includes("margin-inline-start: 0"),
    );
    expect(moved.flatMap((rule) => rule.selectors)).toEqual([
      ".homework-card > .fold > summary .chevron",
    ]);
  });
});

describe("the week card's days", () => {
  it("titles the open day a step above its blocks' headers", () => {
    expect(declared(weekStyles, ".open-title")).toContain("font-size: var(--aula-font-xl)");
    expect(declared(blocks, ".block-head")).toContain("font-size: var(--aula-font-l)");
  });

  it("frames a day the user opens as the focus day is framed", () => {
    expect(declared(weekStyles, ".day-row[open]")).toEqual(declared(weekStyles, ".focus-day"));
    expect(declared(weekStyles, ".day-row[open] > summary")).toContain("margin-inline: 0");
  });

  it("puts today's bar on the content's edge, the row closed or open", () => {
    expect(declared(weekStyles, ".today-row::before")).toContain("inset: 0 auto 0 0");
    expect(declared(weekStyles, ".holiday-row")).toContain("padding: var(--aula-space-2) 0");
  });
});
