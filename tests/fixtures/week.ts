/**
 * Made-up children and a made-up fortnight at school, for the tests and the screenshots. No name,
 * school or text here is a real one.
 *
 * @packageDocumentation
 */

import type { Child, Lesson, Task, WeekData } from "../../src/types.ts";

/** Two made-up children at made-up schools. */
export const CHILDREN: Child[] = [
  {
    entry_id: "entry-a",
    child_id: 1001,
    first_name: "Ida",
    name: "Ida Testesen",
    institution_name: "Bakkedal Skole",
  },
  {
    entry_id: "entry-a",
    child_id: 1002,
    first_name: "Oskar",
    name: "Oskar Testesen",
    institution_name: "Bakkedal Skole",
  },
];

const SUBJECTS: Record<string, [string[], string]> = {
  Dansk: [["Karen Lund"], "B12"],
  Matematik: [["Mette Juhl"], "B12"],
  Engelsk: [["Tina Rask"], "B14"],
  "Natur/teknologi": [["Pia Sand", "Anders Holm"], "Lab 2"],
  Idræt: [["Jonas Berg Vestergaard"], "HAL - Idrætshal"],
  Musik: [["Sofie Nørgaard"], "Musiklokalet"],
  Billedkunst: [["Lars Krogh"], "Billedkunstlokalet"],
  Historie: [["Karen Lund"], "B12"],
};

// The school day: double lessons, with breaks of 35 minutes after the second and the fourth.
const SLOTS: [string, string][] = [
  ["08:00", "08:45"],
  ["08:45", "09:30"],
  ["10:05", "10:50"],
  ["10:50", "11:35"],
  ["12:10", "12:55"],
  ["12:55", "13:40"],
];

// Monday to Friday; a day ends early where it has fewer subjects than slots.
const DAYS: string[][] = [
  ["Dansk", "Dansk", "Matematik", "Matematik", "Engelsk", "Musik"],
  ["Matematik", "Matematik", "Natur/teknologi", "Natur/teknologi", "Dansk"],
  ["Idræt", "Idræt", "Dansk", "Dansk", "Billedkunst", "Billedkunst"],
  ["Idræt", "Idræt", "Dansk", "Dansk", "Engelsk"],
  ["Matematik", "Dansk", "Dansk", "Engelsk", "Historie", "Historie"],
];

/**
 * Returns lessons for the weekdays of the fortnight from Monday `monday`, in Danish winter time.
 * On the first Thursday the last lesson has a substitute beside the teacher.
 */
export function lessons(monday: string): Lesson[] {
  const result: Lesson[] = [];
  for (let day = 0; day < 12; day++) {
    const subjects = DAYS[day % 7];
    if (!subjects) continue;
    const date = new Date(`${monday}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + day);
    const key = date.toISOString().slice(0, 10);
    subjects.forEach((title, slot) => {
      const [start, end] = SLOTS[slot] ?? ["", ""];
      const [teachers, location] = SUBJECTS[title] ?? [[], null];
      const substitute = day === 3 && slot === 4;
      result.push({
        id: `${key}-${String(slot)}`,
        start: `${key}T${start}:00+01:00`,
        end: `${key}T${end}:00+01:00`,
        title,
        teachers: substitute ? [...teachers, "Bo Vang"] : teachers,
        location,
        status: substitute ? "substitute" : null,
      });
    });
  }
  return result;
}

/** Returns notes from the week plan for the fortnight from Monday `monday`. */
export function tasks(monday: string): Task[] {
  const day = (offset: number): string => {
    const date = new Date(`${monday}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  return [
    {
      id: 1,
      date: day(3),
      type: "task",
      title: null,
      content: "<p>Læs <b>kapitel 4</b> i <i>Rejsen til Saturn</i>.</p><p>Skriv tre spørgsmål.</p>",
      subject: "Dansk",
      group: "3.B",
      author: "Karen Lund",
    },
    {
      id: 2,
      date: day(3),
      type: "task",
      title: null,
      content: "Side 32–33, opgave 1–6",
      subject: "Matematik",
      group: "3.B",
      author: "Mette Juhl",
    },
    {
      id: 3,
      date: day(3),
      type: "comment",
      title: null,
      content:
        "Vi læser kapitel 4 højt og taler om spørgsmålene. Bagefter arbejder vi i arbejdsbogen s. 20&ndash;21.",
      subject: "Dansk",
      group: "3.B",
      author: "Karen Lund",
    },
    {
      id: 4,
      date: day(4),
      type: "comment",
      title: "Tur til skoven",
      content: "<ul><li>Madpakke</li><li>Regntøj</li><li>Gummistøvler</li></ul>",
      subject: "Natur/teknologi",
      group: "3.B",
      author: "Pia Sand",
    },
    {
      id: 5,
      date: day(7),
      type: "task",
      title: "Glosetest",
      content: "Øv gloserne fra uge 44.",
      subject: "Engelsk",
      group: "3.B",
      author: "Tina Rask",
    },
  ];
}

/**
 * Returns a made-up fortnight at school from Monday `monday`: a flea market on the first
 * Saturday, nothing on the first Sunday or the second Saturday, and a birthday on the second
 * Sunday.
 */
export function weekData(monday: string): WeekData {
  const day = (offset: number): string => {
    const date = new Date(`${monday}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  return {
    week_plan: true,
    start: monday,
    end: day(14),
    lessons: lessons(monday),
    events: [
      {
        id: "e1",
        start: day(4),
        end: day(5),
        all_day: true,
        title: "Skolefoto",
        type: "event",
        location: null,
      },
      {
        id: "e3",
        start: `${day(5)}T10:00:00+01:00`,
        end: `${day(5)}T13:00:00+01:00`,
        all_day: false,
        title: "Loppemarked i skolegården",
        type: "event",
        location: "Skolegården",
      },
      {
        id: "e2",
        start: `${day(8)}T17:00:00+01:00`,
        end: `${day(8)}T18:30:00+01:00`,
        all_day: false,
        title: "Forældremøde 3.B",
        type: "event",
        location: "Kantinen",
      },
    ],
    tasks: tasks(monday),
    birthdays: [
      { date: day(4), name: "Alma" },
      { date: day(13), name: "Viggo" },
    ],
  };
}
