import { describe, expect, it } from "vitest";

import { htmlToText, initials } from "../../src/core/text.ts";

describe("htmlToText", () => {
  it("keeps plain text as it is, trimmed", () => {
    expect(htmlToText("  Side 32 \t opgave 1  ")).toBe("Side 32 opgave 1");
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
