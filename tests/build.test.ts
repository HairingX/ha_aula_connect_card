import { describe, expect, it } from "vitest";

import { BUDGET, minifyCss, overBudget, shortenTokens } from "../vite.config.ts";

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
