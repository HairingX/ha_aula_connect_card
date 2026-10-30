import { describe, expect, it } from "vitest";

import {
  BUDGET,
  collapseTemplates,
  minifyCss,
  overBudget,
  shortenTextKeys,
  shortenTokens,
} from "../vite.config.ts";

describe("the styles' minifier", () => {
  it("drops comments and the white space only a reader needs", () => {
    expect(minifyCss("/* why */\n.a {\n  color: red;\n  margin: 0 auto;\n}\n")).toBe(
      ".a{color:red;margin:0 auto}",
    );
  });

  it("drops the spaces around combinators, multiplication and division, and a leading zero", () => {
    expect(
      minifyCss(
        ".a > .b + .c { width: calc(24px * var(--s)); inset: calc(var(--g) / -2); opacity: 0.3; margin: 10.5px }",
      ),
    ).toBe(".a>.b+.c{width:calc(24px*var(--s));inset:calc(var(--g)/-2);opacity:.3;margin:10.5px}");
  });

  it("keeps the spaces calc() needs around an addition and a subtraction", () => {
    expect(minifyCss(".a { padding: calc(var(--i) + var(--g)) calc(var(--g) - 2px) }")).toBe(
      ".a{padding:calc(var(--i) + var(--g)) calc(var(--g) - 2px)}",
    );
  });

  it("keeps a quoted string as it is", () => {
    expect(minifyCss('.who + .who::before {\n  content: ", ";\n}')).toBe(
      '.who+.who::before{content:", "}',
    );
  });
});

describe("the tokens' short names", () => {
  it("gives the most used token the shortest name, and renames every use", () => {
    expect(
      shortenTokens(
        ".a{--aula-gap:1px;--aula-ink:red;color:var(--aula-ink);background:var(--aula-ink)}",
      ),
    ).toBe(".a{--_1:1px;--_0:red;color:var(--_0);background:var(--_0)}");
  });
});

describe("the templates' white space", () => {
  it("collapses a template's indentation and the space before a tag's end", () => {
    expect(collapseTemplates('html`<span class="a"\n      >${x}</span\n    >`')).toBe(
      'html`<span class="a">${x}</span>`',
    );
  });

  it("keeps a line break the minifier writes as a template literal", () => {
    expect(collapseTemplates("a.split(`\n`)")).toBe("a.split(`\n`)");
  });
});

describe("the texts' short keys", () => {
  it("renames a camelCase key the bundle has only as the texts' property and as strings", () => {
    expect(
      shortenTextKeys('var T={noHomework:[`a`,`b`],now:[`c`,`d`]};t(`noHomework`);t("now")', [
        "noHomework",
        "now",
      ]),
    ).toBe('var T={q0:[`a`,`b`],now:[`c`,`d`]};t(`q0`);t("now")');
  });

  it("keeps a key that is also a name in the code, or a word in a longer string", () => {
    const code =
      "var T={weekPlan:[`a`,`b`],showMore:[`c`,`d`]};x.weekPlan;t(`weekPlan`);y=`showMore x`";
    expect(shortenTextKeys(code, ["weekPlan", "showMore"])).toBe(code);
  });

  it("gives a key a name the bundle does not have yet", () => {
    expect(shortenTextKeys("var T={noHomework:1};q0;t(`noHomework`)", ["noHomework"])).toBe(
      "var T={q1:1};q0;t(`q1`)",
    );
  });
});

describe("the bundle's budget", () => {
  it("passes a bundle that fits", () => {
    expect(overBudget("export{};", BUDGET)).toEqual([]);
  });

  it("names each limit a bundle is over", () => {
    const code = "x".repeat(200);
    expect(overBudget(code, { raw: 100, gzip: 1_000 })).toEqual([
      "200 bytes, over the budget of 100",
    ]);
    expect(overBudget(code, { raw: 1_000, gzip: 10 })).toEqual([
      expect.stringMatching(/^\d+ bytes gzipped, over the budget of 10$/),
    ]);
  });

  it("counts bytes, not characters", () => {
    expect(overBudget("ø".repeat(60), { raw: 100, gzip: 1_000 })).toEqual([
      "120 bytes, over the budget of 100",
    ]);
  });
});
