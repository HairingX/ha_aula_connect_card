import { describe, expect, it } from "vitest";

import { cardLanguage, translator } from "../../src/core/i18n.ts";

describe("cardLanguage", () => {
  it.each([
    ["da", "da"],
    ["da-DK", "da"],
    ["DA", "da"],
    ["en", "en"],
    ["nb", "en"],
    [undefined, "en"],
  ])("gives %s as %s", (language, expected) => {
    expect(cardLanguage(language)).toBe(expected);
  });
});

describe("translator", () => {
  it("gives Danish texts in Danish", () => {
    expect(translator("da")("noHomework")).toBe("Intet i ugeplanen.");
  });

  it("gives English texts otherwise", () => {
    expect(translator("de")("noHomework")).toBe("Nothing in the week plan.");
  });

  it("fills in placeholders and leaves unknown ones", () => {
    expect(translator("da")("birthdayOf", { n: 1, names: "Alma" })).toBe("Alma har fødselsdag");
    expect(translator("en")("weekNumber", { m: 1 })).toBe("Week {n}");
    expect(translator("en")("weekNumber")).toBe("Week {n}");
  });

  it("picks the singular or plural form by n", () => {
    const da = translator("da");
    expect(da("daysWithoutSchool", { n: 2 })).toBe("+ 2 dage uden skole");
    expect(da("daysWithoutSchool", { n: 1 })).toBe("+ 1 dag uden skole");
    expect(translator("en")("daysWithoutSchool", { n: 3 })).toBe("+ 3 days without school");
    expect(translator("en")("daysWithoutSchool")).toBe("+ {n} days without school");
  });
});
