import { describe, expect, it } from "vitest";

import type { Lesson, Task } from "../../src/core/types.ts";
import { noteView } from "../../src/model/notes.ts";
import { isReminder, packRows, quotes, sentences } from "../../src/model/pack.ts";
import { subjectNamer } from "../../src/model/subjects.ts";

const namer = subjectNamer([]);

function lesson(title: string): Lesson {
  return { id: title, start: "", end: "", title, teachers: [], location: null, status: null };
}

function note(subject: string, content: string, type = "comment"): Task {
  return {
    id: content,
    date: "2026-10-30",
    type,
    title: null,
    content,
    subject,
    group: "",
    author: "",
  };
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
});

describe("the week plan's reminders", () => {
  it.each([
    "Husk blokfløjte.",
    "Medbring madpakke.",
    "Tag tre blade med i en pose.",
    "Eleverne skal have idrætstøj med.",
    "Remember your PE kit.",
    "Please bring a towel.",
  ])("quotes %j", (sentence) => {
    expect(isReminder(sentence)).toBe(true);
  });

  it.each(["Vi tager med bussen.", "Vi husker at øve.", "Madpakke, regntøj, gummistøvler"])(
    "does not quote %j",
    (sentence) => {
      expect(isReminder(sentence)).toBe(false);
    },
  );

  it("splits at line breaks and after a full stop, an exclamation or a question", () => {
    expect(sentences("Vi går i skoven. Husk tøj til vejret!\n• Madpakke\nKan du? Ja")).toEqual([
      "Vi går i skoven.",
      "Husk tøj til vejret!",
      "Madpakke",
      "Kan du?",
      "Ja",
    ]);
  });

  it("quotes each sentence once, by the timetable's order, at most three", () => {
    const notes = [
      note("Musik", "Vi synger. Husk blokfløjte."),
      note("Dansk", "Husk læsebogen. Medbring en blyant. Husk blokfløjte."),
      note("Idræt", "Husk indendørssko.", "task"),
      note("", "Tag en pose med."),
    ].map((item) => noteView(item, namer));
    const keys = ["dansk", "idræt", "musik"];
    expect(quotes(notes, keys).map((quote) => [quote.text, quote.subject?.name])).toEqual([
      ["Husk læsebogen.", "Dansk"],
      ["Medbring en blyant.", "Dansk"],
      ["Husk indendørssko.", "Idræt"],
    ]);
  });
});
