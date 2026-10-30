import { describe, expect, it } from "vitest";

import { BUDGET, minifyCss, overBudget, shortenTokens } from "../vite.config.ts";

describe("the styles' minifier", () => {
  it("drops comments and the white space only a reader needs", () => {
    expect(minifyCss("/* why */\n.a {\n  color: red;\n  margin: 0 auto;\n}\n")).toBe(
      ".a{color:red;margin:0 auto}",
    );
  });

  it("keeps a quoted string as it is", () => {
    expect(minifyCss('.who + .who::before {\n  content: ", ";\n}')).toBe(
      '.who + .who::before{content:", "}',
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
