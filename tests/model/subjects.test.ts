import { describe, expect, it } from "vitest";

import { DANISH_SUBJECTS, subjectKey, subjectNamer } from "../../src/model/subjects.ts";

describe("subject keys", () => {
  it.each([
    ["N/T", "nt"],
    ["3.B IDR", "idr"],
    ["IDR 3b", "idr"],
    ["(6.A) Dansk", "dansk"],
    ["0A Matematik", "matematik"],
    ["Håndværk & design", "håndværkogdesign"],
    ["  Fysik-kemi ", "fysikkemi"],
    ["5A", "5a"],
  ])("gives %j the key %j", (text, key) => {
    expect(subjectKey(text)).toBe(key);
  });
});

describe("the namer", () => {
  const namer = subjectNamer([]);

  it.each([
    ["IDR", "Idræt"],
    ["BHK", "Børnehaveklasse"],
    ["3.B IDR", "Idræt"],
    ["dan", "Dansk"],
    ["N/T", "Natur/teknologi"],
    ["Natur og teknologi", "Natur/teknologi"],
    ["H&D", "Håndværk og design"],
    ["Engelsk", "Engelsk"],
    ["BI", "BI"],
    ["Lejrskole", "Lejrskole"],
    ["3.B Kristendomskundskab og filosofi", "Kristendomskundskab og filosofi"],
    ["Valgfag 7a", "Valgfag"],
    ["3.B", "3.B"],
  ])("names %j %j", (raw, name) => {
    expect(namer(raw).name).toBe(name);
  });

  it("matches an abbreviation and a full name by one key", () => {
    expect(namer("IDR").key).toBe(namer("Idræt").key);
    expect(namer("3.B IDR").key).toBe(namer("Idræt").key);
    expect(namer("BI").key).not.toBe(namer("Biologi").key);
  });

  it("takes configured names first, and a name to itself turns writing out off", () => {
    const own = subjectNamer([
      { aula: "UUV", name: "Bevægelse" },
      { aula: "IDR", name: "IDR" },
    ]);
    expect(own("UUV").name).toBe("Bevægelse");
    expect(own("IDR").name).toBe("IDR");
    expect(own("DAN").name).toBe("Dansk");
  });

  it("shows abbreviations as Aula has them while writing out is off, still one subject with the name", () => {
    const kept = subjectNamer([{ aula: "UUV", name: "Bevægelse" }], false);
    expect(kept("3.B IDR").name).toBe("IDR");
    expect(kept("IDR").key).toBe(namer("Idræt").key);
    expect(kept("Idræt").name).toBe("Idræt");
    expect(kept("UUV").name).toBe("Bevægelse");
  });

  it("knows each subject by its own name too", () => {
    for (const row of DANISH_SUBJECTS.split(";")) {
      const [name, ...aliases] = row.split(",");
      for (const alias of aliases) expect(namer(alias).name).toBe(name);
    }
  });

  it("gives every built-in subject but a second teacher a colour of its own, under each of its names", () => {
    const colours = new Set<string>();
    for (const row of DANISH_SUBJECTS.split(";")) {
      const [name = "", ...aliases] = row.split(",");
      const color = namer(name).color;
      if (name === "2 lærere") {
        expect(color).toBeUndefined();
        continue;
      }
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
      colours.add(String(color));
      for (const alias of aliases) expect(namer(`3.B ${alias}`).color).toBe(color);
    }
    expect(colours.size).toBe(DANISH_SUBJECTS.split(";").length - 1);
    expect(namer("Dansk").color).toBe("#e57373");
    expect(namer("Skak").color).toBeUndefined();
  });

  it("takes a configured colour over the built-in one, and an empty one as no colour", () => {
    const given = subjectNamer([
      { aula: "DAN", color: "#000000" },
      { aula: "Matematik", color: null },
      { aula: "Skak", color: "#123456" },
    ]);
    expect(given("Dansk").color).toBe("#000000");
    expect(given("MAT").color).toBeUndefined();
    expect(given("Skak").color).toBe("#123456");
    expect(given("ENG").color).toBe("#81c784");
  });

  it("keeps the built-in colour and merging of a subject named anew", () => {
    const renamed = subjectNamer([
      { aula: "DAN", name: "Dans" },
      { aula: "2Lær", name: "Ekstra lærer" },
    ]);
    expect(renamed("DAN")).toMatchObject({ name: "Dans", color: "#e57373" });
    expect(renamed("2Lær")).toMatchObject({ name: "Ekstra lærer", merge: "overlap" });
  });

  it("takes from each row for a subject only what it gives", () => {
    const rows = subjectNamer([
      { aula: "Dansk", color: "#000000" },
      { aula: "DAN", merge: "never" },
      { aula: "DA", name: undefined },
    ]);
    expect(rows("DA")).toMatchObject({ color: "#000000", merge: "never" });
  });
});
