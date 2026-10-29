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

const SUBJECTS: [string, string[], string][] = [
  ["Dansk", ["KL"], "B12"],
  ["Matematik", ["Mette Juhl"], "B12"],
  ["Engelsk", ["TR"], "B14"],
  ["Natur/teknologi", ["PS", "AH"], "Lab 2"],
  ["Idræt", ["JB"], "Gymnastiksal"],
  ["Musik", ["SN"], "Musiklokale"],
];

const SLOTS: [string, string][] = [
  ["08:00", "08:45"],
  ["08:45", "09:30"],
  ["09:50", "10:35"],
  ["10:35", "11:20"],
  ["12:00", "12:45"],
  ["12:45", "13:30"],
];

/** Returns lessons for the weekdays of the fortnight from Monday `monday`, in Danish winter time. */
export function lessons(monday: string): Lesson[] {
  const result: Lesson[] = [];
  for (let day = 0; day < 12; day++) {
    if (day % 7 >= 5) continue;
    const date = new Date(`${monday}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + day);
    const key = date.toISOString().slice(0, 10);
    SLOTS.forEach(([start, end], slot) => {
      const subject = SUBJECTS[(slot + day) % SUBJECTS.length];
      if (!subject) return;
      const [title, teachers, location] = subject;
      result.push({
        id: `${key}-${String(slot)}`,
        start: `${key}T${start}:00+01:00`,
        end: `${key}T${end}:00+01:00`,
        title,
        teachers,
        location,
        status: day === 3 && slot === 5 ? "cancelled" : null,
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
      title: "Læs kapitel 4",
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
      title: "Idrætstøj",
      content: "Husk idrætstøj og håndklæde &mdash; vi bader efter idræt.",
      subject: "Idræt",
      group: "3.B",
      author: "Jonas Berg",
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

/** Returns a made-up fortnight at school from Monday `monday`. */
export function weekData(monday: string): WeekData {
  const day = (offset: number): string => {
    const date = new Date(`${monday}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  return {
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
    birthdays: [{ date: day(4), name: "Alma" }],
  };
}
