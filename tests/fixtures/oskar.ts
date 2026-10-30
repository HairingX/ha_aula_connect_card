/**
 * A second made-up child: Oskar, in 6th grade at the same school as Ida, with longer days, other
 * subjects, a cancelled lesson and fewer notes. Made up, like everything in the fixtures.
 *
 * @packageDocumentation
 */

import type { Task, WeekData } from "../../src/core/types.ts";
import { events, plusDays, timetable, type Subjects } from "./week.ts";

const SUBJECTS: Subjects = {
  DAN: [["Henrik Bach"], "C21"],
  MAT: [["Lene Friis"], "C21"],
  ENG: [["Tina Rask"], "C23"],
  TYS: [["Maria Holt"], "C23"],
  HIS: [["Henrik Bach"], "C21"],
  SAM: [["Henrik Bach"], "C21"],
  GEO: [["Ole Dam"], "Lab 1"],
  FYS: [["Ole Dam"], "Lab 1"],
  SVØ: [["Jonas Berg Vestergaard"], "Svømmehallen"],
  MUS: [["Sofie Nørgaard"], "Musiklokalet"],
  KLT: [["Henrik Bach"], "C21"],
};

const SLOTS: readonly (readonly [string, string])[] = [
  ["08:00", "08:45"],
  ["08:45", "09:30"],
  ["10:00", "10:45"],
  ["10:45", "11:30"],
  ["12:00", "12:45"],
  ["12:45", "13:30"],
  ["13:45", "14:30"],
];

const WEEK: readonly (readonly string[])[] = [
  ["DAN", "DAN", "MAT", "MAT", "SAM", "SAM", "KLT"],
  ["ENG", "ENG", "MAT", "MAT", "FYS", "FYS"],
  ["SVØ", "SVØ", "DAN", "DAN", "HIS", "HIS"],
  ["MAT", "MAT", "TYS", "TYS", "GEO", "GEO", "KLT"],
  ["MAT", "MAT", "SVØ", "SVØ", "HIS", "HIS", "KLT"],
];

function note(
  monday: string,
  offset: number,
  id: number,
  type: string,
  subject: string,
  content: string,
): Task {
  return {
    id,
    date: plusDays(monday, offset),
    type,
    title: null,
    content,
    subject,
    group: "6.A",
    author: "Henrik Bach",
  };
}

/** Returns Oskar's fortnight from Monday `monday`; his last lesson on the first Friday is cancelled. */
export function oskarData(monday: string): WeekData {
  return {
    week_plan: true,
    start: monday,
    end: plusDays(monday, 14),
    lessons: timetable(monday, 14, WEEK, SLOTS, SUBJECTS, (day, slot) =>
      day === plusDays(monday, 4) && slot === 6 ? "Aflyst" : null,
    ),
    events: events(monday).filter((event) => event.type !== "parental_meeting"),
    tasks: [
      note(monday, 1, 101, "task", "Matematik", "Regn opgave 1–8 på side 54."),
      note(monday, 3, 102, "comment", "Tysk", "Vi øver præsens af sein og haben."),
      note(monday, 4, 103, "comment", "Historie", "Vi ser første del af filmen om enevælden."),
      note(monday, 7, 104, "task", "Matematik", "Færdiggør opgave 4–6 i kapitel 3."),
      note(monday, 9, 105, "task", "Historie", "Læs side 40–43 om enevælden."),
    ],
    birthdays: [{ date: plusDays(monday, 9), name: "Karla" }],
  };
}
