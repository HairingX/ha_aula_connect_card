import { describe, expect, it } from "vitest";

import { cardLanguage, translator } from "../src/i18n";

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
    expect(translator("da")("noHomework")).toBe("Ingen lektier");
  });

  it("gives English texts otherwise", () => {
    expect(translator("de")("noHomework")).toBe("No homework");
  });

  it("fills in placeholders and leaves unknown ones", () => {
    expect(translator("da")("birthdayOf", { name: "Alma" })).toBe("Alma har fødselsdag");
    expect(translator("en")("weekNumber", { m: 1 })).toBe("Week {n}");
    expect(translator("en")("weekNumber")).toBe("Week {n}");
  });
});
