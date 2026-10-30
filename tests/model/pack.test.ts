import { describe, expect, it } from "vitest";

import type { Lesson } from "../../src/core/types.ts";
import { packRows } from "../../src/model/pack.ts";
import { subjectNamer } from "../../src/model/subjects.ts";

const namer = subjectNamer([]);

function lesson(title: string): Lesson {
  return { id: title, start: "", end: "", title, teachers: [], location: null, status: null };
}

describe("the configured things to bring", () => {
  const rules = [
    { subject: "Idræt", items: ["Idrætstøj", "Indendørssko", "Håndklæde"] },
    { subject: "SVØ", items: ["Badetøj", "håndklæde"] },
  ];

  it("matches a rule to a lesson by any of the subject's names, in the timetable's order", () => {
    expect(packRows([lesson("DAN"), lesson("3.B IDR"), lesson("IDR")], rules, namer)).toEqual([
      { subject: namer("3.B IDR"), items: ["Idrætstøj", "Indendørssko", "Håndklæde"] },
    ]);
  });

  it("lists a thing once a day, under the first subject that needs it", () => {
    expect(packRows([lesson("Svømning"), lesson("IDR")], rules, namer)).toEqual([
      { subject: namer("Svømning"), items: ["Badetøj", "håndklæde"] },
      { subject: namer("IDR"), items: ["Idrætstøj", "Indendørssko"] },
    ]);
  });

  it("matches nothing to an ambiguous code", () => {
    expect(packRows([lesson("BI")], [{ subject: "Biologi", items: ["Lup"] }], namer)).toEqual([]);
  });

  it("asks for nothing for a cancelled lesson", () => {
    const cancelled = { ...lesson("IDR"), status: "Aflyst" };
    expect(packRows([cancelled], [{ subject: "Idræt", items: ["Tøj"] }], namer)).toEqual([]);
  });
});
