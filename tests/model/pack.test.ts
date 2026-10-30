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
    "Husk madpakke – vi spiser i klassen.",
    "Husk indendørssko.",
    "Medbring madpakke.",
    "Husk at medbringe lommeregner.",
    "Tag tre blade med i en pose.",
    "Husk at tage idrætstøj med.",
    "Husk f.eks. at tage idrætstøj med.",
    "Eleverne skal have idrætstøj med.",
    "Husk underskrift på sedlen (ca. 2 min).",
    "Remember your PE kit.",
    "Please bring a towel.",
    "Husk gummistøvler.",
    "Husk briller.",
    "Husk svømmebriller og badehætte.",
    "Husk tasker til turen.",
    "Husk madpakker til hele dagen.",
    "Husk flasker med vand.",
    "Husk poserne.",
    "Husk madpakken.",
    "Husk bøgerne til biblioteket.",
    "Husk to poser til vådt tøj.",
    "Husk tre blade til herbariet.",
    "Husk en varm trøje.",
    "Husk hue og vanter.",
    "Husk penge til bussen.",
    "(f.eks. Matematik) Husk lommeregner.",
    "Remember your books.",
  ])("quotes %j", (sentence) => {
    expect(isReminder(sentence)).toBe(true);
  });

  it.each([
    "Husk at læse 20 min hver dag.",
    "Husk at læse i læsebogen.",
    "Husk forældremødet i aften.",
    "Husk skolefoto i morgen.",
    "Vi tager med bussen.",
    "Tag med på tur til skoven.",
    "Vi skal have besøg med forfatteren kl. 10.",
    "Vi skal have fokus på brøker med hele klassen.",
    "Vi husker at øve.",
    "Remember to read chapter 4.",
    "Madpakke, regntøj, gummistøvler",
    "Husk forældresamtaler i uge 46 – book en tid i Aula.",
    "Husk to gange om ugen at læse højt.",
    "Husk, at vi holder fri på fredag.",
    "Husk tre sider hver dag.",
  ])("does not quote %j", (sentence) => {
    expect(isReminder(sentence)).toBe(false);
  });

  it("splits at line breaks and after a full stop, an exclamation or a question", () => {
    expect(sentences("Vi går i skoven. Husk tøj til vejret!\n• Madpakke\nKan du? Ja")).toEqual([
      "Vi går i skoven.",
      "Husk tøj til vejret!",
      "Madpakke",
      "Kan du?",
      "Ja",
    ]);
  });

  it.each([
    "Husk at læse s. 38+39 til i morgen.",
    "Husk f.eks. at tage idrætstøj med.",
    "Medbring madpakke d. 3. nov.",
    "Husk underskrift på sedlen (ca. 2 min).",
    "Medbring lommeregner kl. 10.",
    "Vi ses d. 3. November, bl.a. med kage.",
    "(f.eks. Matematik) Husk lommeregner.",
  ])("keeps %j one sentence", (sentence) => {
    expect(sentences(sentence)).toEqual([sentence]);
  });

  it("still ends a sentence after a number before the next one", () => {
    expect(sentences("Læs side 38. Husk madpakke.")).toEqual(["Læs side 38.", "Husk madpakke."]);
    expect(sentences("Vi ser filmen. Husk madpakke.")).toEqual([
      "Vi ser filmen.",
      "Husk madpakke.",
    ]);
  });

  it("quotes each sentence once, by the timetable's order, at most three", () => {
    const notes = [
      note("Musik", "Vi synger. Husk blokfløjte."),
      note("Dansk", "Husk læsebogen. Medbring en blyant. Husk blokfløjte."),
      note("", "Tag en pose med."),
    ].map((item) => noteView(item, namer));
    const keys = ["dansk", "idræt", "musik"];
    expect(quotes(notes, keys).map((quote) => [quote.text, quote.subject?.name])).toEqual([
      ["Husk læsebogen.", "Dansk"],
      ["Medbring en blyant.", "Dansk"],
      ["Husk blokfløjte.", "Musik"],
    ]);
  });

  it("keeps the plan's reminders before the homework's, which is shown in full", () => {
    const notes = [
      note("Dansk", "Husk at medbringe læsebogen. Medbring en blyant.", "task"),
      note("Idræt", "Husk indendørssko.", "task"),
      note("Musik", "Husk blokfløjte."),
      note("Historie", "Husk madpakke – vi spiser i klassen."),
    ].map((item) => noteView(item, namer));
    const keys = ["dansk", "idræt", "musik", "historie"];
    expect(quotes(notes, keys).map((quote) => quote.text)).toEqual([
      "Husk at medbringe læsebogen.",
      "Husk blokfløjte.",
      "Husk madpakke – vi spiser i klassen.",
    ]);
  });

  it("asks for nothing for a cancelled lesson", () => {
    const cancelled = { ...lesson("IDR"), status: "Aflyst" };
    expect(packRows([cancelled], [{ subject: "Idræt", items: ["Tøj"] }], namer)).toEqual([]);
  });
});
