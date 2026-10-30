import { describe, expect, it } from "vitest";

import { glue, htmlToText, initials, TEXT_CACHE_SIZE } from "../../src/core/text.ts";

describe("htmlToText", () => {
  it("keeps plain text as it is, trimmed", () => {
    expect(htmlToText("  Side 32 \t opgave 1  ")).toBe("Side 32 opgave 1");
  });

  it("keeps converting once it has seen more notes than it keeps", () => {
    for (let i = 0; i <= TEXT_CACHE_SIZE; i++) htmlToText(`<p>Side ${String(i)}</p>`);
    expect(htmlToText("<p>Side 1</p>")).toBe("Side 1");
  });

  it("gives the text of HTML with a line per paragraph and bullets for list items", () => {
    expect(
      htmlToText(
        "<p>Læs <b>kapitel 4</b>.</p><p>Skriv tre spørgsmål.</p><ul><li>Bog</li><li>Pen</li></ul>",
      ),
    ).toBe("Læs kapitel 4.\nSkriv tre spørgsmål.\n• Bog\n• Pen");
  });

  it("turns line breaks and entities into text", () => {
    expect(htmlToText("Husk&nbsp;madpakke<br>og&nbsp;regntøj &amp; støvler")).toBe(
      "Husk madpakke\nog regntøj & støvler",
    );
  });

  it("gives markup and scripts as nothing that runs", () => {
    const text = htmlToText(
      '<img src="x" onerror="window.ran = true"><script>window.ran = true</script>Hej',
    );
    expect(text).toContain("Hej");
    expect(text).not.toContain("<img");
    expect((window as unknown as { ran?: boolean }).ran).toBeUndefined();
  });

  it("gives nothing for empty HTML", () => {
    expect(htmlToText("<p></p>")).toBe("");
  });
});

describe("initials", () => {
  it("gives the initials of a full name", () => {
    expect(initials("Mette  juhl Hansen")).toBe("MJH");
  });

  it("gives the initial of a single name", () => {
    expect(initials(" Karen ")).toBe("K");
  });
});

describe("glue", () => {
  it.each([
    [
      "Husk madpakke – vi spiser i klassen.",
      "Husk madpakke\u00a0–\u2060\u00a0vi spiser i klassen.",
    ],
    ["Side 32–33", "Side 32–\u206033"],
    ["Frikvarter · 35 min", "Frikvarter\u00a0·\u2060\u00a035 min"],
    ["Oct 10\u2009–\u200918", "Oct 10\u202f–\u2060\u202f18"],
    ["Pause — så videre", "Pause\u00a0—\u2060\u00a0så videre"],
    ["Ingen streg", "Ingen streg"],
  ])("joins the dashes and dots of %j to the words beside them", (text, glued) => {
    expect(glue(text)).toBe(glued);
  });
});
