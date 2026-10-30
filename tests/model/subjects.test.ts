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
});
