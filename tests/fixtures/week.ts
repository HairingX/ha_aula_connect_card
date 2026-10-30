/**
 * Made-up children and a made-up fortnight at school, for the tests and the screenshots. No name,
 * school or text here is a real one. Lessons carry Aula's abbreviations ("IDR", "DAN"), notes
 * Meebook's full subject names ("Dansk"), as real data does.
 *
 * @packageDocumentation
 */

import type {
  Birthday,
  CalendarEvent,
  Child,
  Lesson,
  Task,
  WeekData,
} from "../../src/core/types.ts";

/** Two made-up children at a made-up school. */
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

/** The time zone the fixtures' times are in. */
export const ZONE = "Europe/Copenhagen";

/** Returns the day `offset` days after `day`. */
export function plusDays(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

/** Returns a time on a day in Copenhagen as ISO 8601 with its offset, summer or winter time. */
export function local(day: string, time: string): string {
  const noon = new Date(`${day}T12:00:00Z`);
  const offset =
    new Intl.DateTimeFormat("en-US", { timeZone: ZONE, timeZoneName: "longOffset" })
      .formatToParts(noon)
      .find((part) => part.type === "timeZoneName")
      ?.value.replace("GMT", "") ?? "+01:00";
  return `${day}T${time}:00${offset === "" ? "+00:00" : offset}`;
}

/** A subject's teachers and room, by Aula's lesson title. */
export type Subjects = Record<string, [teachers: string[], room: string]>;

/** Lessons from a weekly timetable, for `days` days from Monday `monday`. */
export function timetable(
  monday: string,
  days: number,
  week: readonly (readonly string[])[],
  slots: readonly (readonly [string, string])[],
  subjects: Subjects,
  status: (day: string, slot: number) => string | null = () => null,
): Lesson[] {
  const result: Lesson[] = [];
  for (let offset = 0; offset < days; offset++) {
    const titles = week[offset % 7] ?? [];
    const day = plusDays(monday, offset);
    titles.forEach((title, slot) => {
      const [start, end] = slots[slot] ?? ["", ""];
      const [teachers, room] = subjects[title] ?? [[], ""];
      result.push({
        id: `${day}-${String(slot)}`,
        start: local(day, start),
        end: local(day, end),
        title,
        teachers,
        location: room,
        status: status(day, slot),
      });
    });
  }
  return result;
}

const IDA_SUBJECTS: Subjects = {
  DAN: [["Karen Lund"], "B12"],
  MAT: [["Mette Juhl"], "B12"],
  ENG: [["Tina Rask"], "B14"],
  "N/T": [["Pia Sand", "Anders Holm"], "Lab 2"],
  IDR: [["Jonas Berg Vestergaard"], "HAL - Idrætshal"],
  MUS: [["Sofie Nørgaard"], "Musiklokalet"],
  BIL: [["Lars Krogh"], "Billedkunstlokalet"],
  HIS: [["Karen Lund"], "B12"],
};

// Double lessons, with breaks of 35 minutes after the second and the fourth.
const IDA_SLOTS: readonly (readonly [string, string])[] = [
  ["08:00", "08:45"],
  ["08:45", "09:30"],
  ["10:05", "10:50"],
  ["10:50", "11:35"],
  ["12:10", "12:55"],
  ["12:55", "13:40"],
];

// Monday to Friday; a day ends early where it has fewer lessons than slots.
const IDA_WEEK: readonly (readonly string[])[] = [
  ["DAN", "DAN", "MAT", "MAT", "ENG", "MUS"],
  ["MAT", "MAT", "N/T", "N/T", "DAN"],
  ["IDR", "IDR", "DAN", "DAN", "BIL", "BIL"],
  ["IDR", "IDR", "DAN", "DAN", "ENG"],
  ["MAT", "DAN", "DAN", "ENG", "HIS", "HIS"],
];

/**
 * Returns Ida's lessons for the fortnight from Monday `monday`. On the first Thursday the last
 * lesson has a substitute beside the teacher.
 */
export function lessons(monday: string): Lesson[] {
  return timetable(monday, 14, IDA_WEEK, IDA_SLOTS, IDA_SUBJECTS, (day, slot) =>
    day === plusDays(monday, 3) && slot === 4 ? "substitute" : null,
  ).map((lesson) =>
    lesson.status === "substitute"
      ? { ...lesson, teachers: [...lesson.teachers, "Bo Vang"] }
      : lesson,
  );
}

function note(
  monday: string,
  offset: number,
  id: number,
  type: "task" | "comment",
  subject: string,
  content: string,
  title: string | null = null,
): Task {
  return {
    id,
    date: plusDays(monday, offset),
    type,
    title,
    content,
    subject,
    group: "3.B",
    author: "Karen Lund",
  };
}

/** Returns Ida's notes from the week plan for the fortnight from Monday `monday`. */
export function tasks(monday: string): Task[] {
  return [
    note(monday, 1, 1, "task", "Matematik", "Side 28, opgave 1–4."),
    note(monday, 2, 2, "task", "Dansk", "Læs i læsebogen s. 34–37."),
    note(monday, 3, 3, "task", "Dansk", "Lektie til i dag: Læsebogen s. 38+39"),
    note(
      monday,
      3,
      4,
      "comment",
      "Dansk",
      "Vi læser lektien i læsebogen og får nye sider for. Vi arbejder i arbejdsbogen med s. 26+27.",
    ),
    note(monday, 3, 5, "comment", "Engelsk", "Vi arbejder med ugens gloser i makkerpar."),
    note(
      monday,
      4,
      6,
      "task",
      "Dansk",
      "<p>Læs <b>kapitel 4</b> i <i>Rejsen til Saturn</i>.</p><p>Skriv tre spørgsmål til teksten.</p>",
    ),
    note(monday, 4, 7, "task", "Matematik", "Side 32–33, opgave 1–6."),
    note(
      monday,
      4,
      8,
      "comment",
      "Dansk",
      "Vi læser kapitel 4 højt og taler om jeres spørgsmål. Bagefter arbejder vi i arbejdsbogen s. 20&ndash;21.",
    ),
    note(
      monday,
      4,
      9,
      "comment",
      "Historie",
      "Vi ser første del af filmen om vikingerne. Husk madpakke – vi spiser i klassen.",
    ),
    note(monday, 7, 10, "task", "Engelsk", "Øv ugens gloser.", "Glosetest"),
    note(monday, 7, 11, "comment", "Dansk", "Vi begynder på et nyt forløb om eventyr."),
    note(monday, 7, 12, "comment", "Musik", "Vi øver sange til juleafslutningen. Husk blokfløjte."),
    note(
      monday,
      8,
      13,
      "task",
      "Natur/teknologi",
      "Tag tre forskellige blade med i en pose. Vi skal bruge dem til vores herbarium.",
    ),
    note(
      monday,
      8,
      14,
      "comment",
      "Natur/teknologi",
      "<ul><li>Madpakke</li><li>Regntøj</li><li>Gummistøvler</li></ul>",
      "Tur til skoven",
    ),
    note(monday, 9, 15, "task", "Dansk", "Skriv en side om dit yndlingseventyr."),
  ];
}

/** Returns the events of the fortnight from Monday `monday`: shared by the school's children. */
export function events(monday: string): CalendarEvent[] {
  const day = (offset: number): string => plusDays(monday, offset);
  return [
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
      start: local(day(5), "10:00"),
      end: local(day(5), "13:00"),
      all_day: false,
      title: "Loppemarked i skolegården",
      type: "event",
      location: "Skolegården",
    },
    {
      id: "e2",
      start: local(day(8), "17:00"),
      end: local(day(8), "18:30"),
      all_day: false,
      title: "Forældremøde 3.B",
      type: "parental_meeting",
      location: "Kantinen",
    },
  ];
}

/** Returns Ida's classmates' birthdays in the fortnight from Monday `monday`. */
export function birthdays(monday: string): Birthday[] {
  return [
    { date: plusDays(monday, 4), name: "Alma" },
    { date: plusDays(monday, 13), name: "Viggo" },
  ];
}

/**
 * Returns Ida's made-up fortnight at school from Monday `monday`: a school photo and Alma's
 * birthday on the first Friday, a flea market on the first Saturday, a parents' meeting on the
 * second Tuesday, and Viggo's birthday on the second Sunday.
 */
export function weekData(monday: string): WeekData {
  return {
    week_plan: true,
    start: monday,
    end: plusDays(monday, 14),
    lessons: lessons(monday),
    events: events(monday),
    tasks: tasks(monday),
    birthdays: birthdays(monday),
  };
}

/** Returns data without anything on the days from `first` to `last`, both included. */
export function without(data: WeekData, first: string, last: string): WeekData {
  const outside = (day: string): boolean => day < first || day > last;
  return {
    ...data,
    lessons: data.lessons.filter((lesson) => outside(lesson.start.slice(0, 10))),
    events: data.events.filter((event) => outside(event.start.slice(0, 10))),
    tasks: data.tasks.filter((task) => outside(task.date)),
    birthdays: data.birthdays.filter((birthday) => outside(birthday.date)),
  };
}

/** Returns an all-day event of a type from `first` to `last`, both included. */
export function allDay(
  id: string,
  title: string,
  type: string,
  first: string,
  last: string,
): CalendarEvent {
  return { id, start: first, end: plusDays(last, 1), all_day: true, title, type, location: null };
}

/**
 * Returns Ida's fortnight from Monday `monday` with the autumn holiday, Saturday 10 to Sunday 18
 * October 2026, and nothing at school on its days.
 */
export function holidayFortnight(monday: string): WeekData {
  const data = without(weekData(monday), "2026-10-10", "2026-10-18");
  return {
    ...data,
    events: [...data.events, allDay("h42", "Efterårsferie", "holiday", "2026-10-10", "2026-10-18")],
  };
}
