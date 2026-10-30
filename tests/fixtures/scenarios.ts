/**
 * Named moments, each a clock, children and their data, shared by the tests and the screenshots,
 * so that a screenshot shows a tested case. All made up.
 *
 * @packageDocumentation
 */

import type { Child, DayRange, Task, WeekData } from "../../src/core/types.ts";
import { oskarData } from "./oskar.ts";
import {
  allDay,
  CHILDREN,
  events,
  holidayFortnight,
  local,
  plusDays,
  timetable,
  weekData,
  without,
  ZONE,
  type Subjects,
} from "./week.ts";

/** A moment to show. */
export interface Scenario {
  /** Its name. */
  readonly id: string;
  /** What it shows. */
  readonly title: string;
  /** The time, as ISO 8601 with offset. */
  readonly clock: string;
  /** The time zone times are shown in. */
  readonly zone: string;
  /** The children Aula Connect lists. */
  readonly children: readonly Child[];
  /** The Monday the data starts on: the range the store asks for. */
  readonly monday: string;
  /** Returns a child's data for the scenario's range. */
  readonly data: (child: Child) => WeekData;
}

const [IDA, OSKAR] = CHILDREN as [Child, Child];
/** Oskar at another school, for children with different holidays. */
export const OSKAR_ELSEWHERE: Child = { ...OSKAR, institution_name: "Lindegårdens Skole" };
/** A third child, Emma in 1st grade at Ida's school, for a family of three. */
export const EMMA: Child = {
  entry_id: "entry-a",
  child_id: 1003,
  first_name: "Emma",
  name: "Emma Testesen",
  institution_name: "Bakkedal Skole",
};

const EMMA_SUBJECTS: Subjects = {
  DAN: [["Karen Lund"], "A3"],
  MAT: [["Mette Juhl"], "A3"],
  IDR: [["Jonas Berg Vestergaard"], "HAL - Idrætshal"],
  MUS: [["Sofie Nørgaard"], "Musiklokalet"],
  BIL: [["Lars Krogh"], "Billedkunstlokalet"],
};

/** Returns Emma's fortnight from Monday `monday`: short days, with sports on Thursday. */
export function emmaData(monday: string): WeekData {
  return {
    week_plan: true,
    start: monday,
    end: plusDays(monday, 14),
    lessons: timetable(
      monday,
      14,
      [
        ["DAN", "DAN", "MAT", "MAT"],
        ["MAT", "MAT", "MUS", "DAN"],
        ["DAN", "DAN", "BIL", "BIL"],
        ["IDR", "IDR", "DAN", "MAT"],
        ["DAN", "MAT", "MUS", "MUS"],
      ],
      [
        ["08:00", "08:45"],
        ["08:45", "09:30"],
        ["10:00", "10:45"],
        ["10:45", "11:30"],
      ],
      EMMA_SUBJECTS,
    ),
    events: events(monday).filter((event) => event.type !== "parental_meeting"),
    tasks: [
      {
        id: 301,
        date: plusDays(monday, 4),
        type: "comment",
        title: null,
        content: "Vi synger for de andre klasser. Husk blokfløjte.",
        subject: "Musik",
        group: "1.A",
        author: "Sofie Nørgaard",
      },
    ],
    birthdays: [],
  };
}

function fortnight(
  monday: string,
  ida: (data: WeekData) => WeekData = (data) => data,
  oskar: (data: WeekData) => WeekData = (data) => data,
): (child: Child) => WeekData {
  return (child) =>
    child.child_id === IDA.child_id ? ida(weekData(monday)) : oskar(oskarData(monday));
}

function scenario(
  id: string,
  title: string,
  day: string,
  time: string,
  data: (child: Child) => WeekData = fortnight("2026-10-26"),
  monday = "2026-10-26",
  children: readonly Child[] = CHILDREN,
): Scenario {
  return { id, title, clock: local(day, time), zone: ZONE, children, monday, data };
}

/** The scenarios, by name. */
export const SCENARIOS: readonly Scenario[] = [
  scenario("thu-0715", "Thursday 07:15: today", "2026-10-29", "07:15"),
  scenario("thu-1000", "Thursday 10:00: today, the break before Dansk", "2026-10-29", "10:00"),
  scenario("thu-1010", "Thursday 10:10: today, Dansk going on", "2026-10-29", "10:10"),
  scenario("thu-1200", "Thursday 12:00: tomorrow, school still on", "2026-10-29", "12:00"),
  scenario("thu-1300", "Thursday 13:00: tomorrow, Oskar still at school", "2026-10-29", "13:00"),
  scenario("thu-1530", "Thursday 15:30: tomorrow", "2026-10-29", "15:30"),
  scenario("thu-1930", "Thursday 19:30: tomorrow", "2026-10-29", "19:30"),
  scenario("fri-1240", "Friday 12:40: Monday, school still on", "2026-10-30", "12:40"),
  scenario("fri-1400", "Friday 14:00: Monday, the weekend bridged", "2026-10-30", "14:00"),
  scenario("sat-1000", "Saturday 10:00: Monday, the flea market on", "2026-10-31", "10:00"),
  scenario("sun-1800", "Sunday 18:00: Monday is tomorrow", "2026-11-01", "18:00"),
  scenario(
    "empty-tue",
    "Monday 19:30: Tuesday has nothing in Aula",
    "2026-10-26",
    "19:30",
    fortnight("2026-10-26", (data) => without(data, "2026-10-27", "2026-10-27")),
  ),
  scenario(
    "motionsdag",
    "Monday 19:30: Tuesday is a sports day without lessons",
    "2026-10-26",
    "19:30",
    fortnight("2026-10-26", (data) => {
      const empty = without(data, "2026-10-27", "2026-10-27");
      return {
        ...empty,
        events: [...empty.events, allDay("m1", "Motionsdag", "event", "2026-10-27", "2026-10-27")],
      };
    }),
  ),
  scenario(
    "holiday",
    "Wednesday 14 October: the autumn holiday",
    "2026-10-14",
    "10:00",
    (child) =>
      child.child_id === IDA.child_id ? holidayFortnight("2026-10-12") : holidayOskar("2026-10-12"),
    "2026-10-12",
  ),
  scenario(
    "before-holiday",
    "Friday 9 October 14:00: the autumn holiday ahead",
    "2026-10-09",
    "14:00",
    (child) =>
      child.child_id === IDA.child_id ? holidayFortnight("2026-10-05") : holidayOskar("2026-10-05"),
    "2026-10-05",
  ),
  scenario(
    "no-week-plan",
    "Thursday 19:30, at a school without a week plan",
    "2026-10-29",
    "19:30",
    fortnight(
      "2026-10-26",
      (data) => ({ ...data, week_plan: false, tasks: [], birthdays: [] }),
      (data) => ({ ...data, week_plan: false, tasks: [], birthdays: [] }),
    ),
  ),
  scenario(
    "two-schools",
    "Sunday 18:00: Oskar's school is closed on Monday",
    "2026-11-01",
    "18:00",
    fortnight("2026-10-26", undefined, (data) => {
      const closed = without(data, "2026-11-02", "2026-11-02");
      return {
        ...closed,
        events: [...closed.events, allDay("f1", "Fridag", "holiday", "2026-11-02", "2026-11-02")],
      };
    }),
    "2026-10-26",
    [IDA, OSKAR_ELSEWHERE],
  ),
  scenario(
    "fri-1400-noplan",
    "Friday 14:00: next week's plan is not in Aula yet",
    "2026-10-30",
    "14:00",
    fortnight("2026-10-26", noPlanFrom("2026-11-02"), noPlanFrom("2026-11-02")),
  ),
  scenario(
    "sun-1800-noplan",
    "Sunday 18:00: Monday's week plan is not in Aula yet",
    "2026-11-01",
    "18:00",
    fortnight("2026-10-26", noPlanFrom("2026-11-02"), noPlanFrom("2026-11-02")),
  ),
  scenario(
    "thu-1930-stress",
    "Thursday 19:30: long names, many notes, abbreviations",
    "2026-10-29",
    "19:30",
    fortnight("2026-10-26", stress),
  ),
  scenario(
    "fri-1400-longholiday",
    "Friday 14:00: a holiday with a long name next week",
    "2026-10-30",
    "14:00",
    fortnight("2026-10-26", (data) => {
      const closed = without(data, "2026-11-02", "2026-11-04");
      return {
        ...closed,
        events: [
          ...closed.events,
          allDay(
            "lh",
            "Kristi himmelfartsferie og planlægningsdage",
            "holiday",
            "2026-11-02",
            "2026-11-04",
          ),
        ],
      };
    }),
  ),
  scenario(
    "sat-1000-lesson",
    "Saturday 10:00, with a lesson that Saturday",
    "2026-10-31",
    "10:00",
    fortnight("2026-10-26", saturdayLesson),
  ),
  scenario(
    "thu-1930-satlesson",
    "Thursday 19:30, with a lesson on Saturday",
    "2026-10-29",
    "19:30",
    fortnight("2026-10-26", saturdayLesson),
  ),
  scenario(
    "thu-1930-allcancelled",
    "Thursday 19:30: every one of Ida's lessons on Friday is cancelled",
    "2026-10-29",
    "19:30",
    fortnight("2026-10-26", (data) => ({
      ...data,
      lessons: data.lessons.map((lesson) =>
        lesson.start.startsWith("2026-10-30") ? { ...lesson, status: "Aflyst" } : lesson,
      ),
    })),
  ),
  scenario(
    "thu-1930-reminders",
    "Thursday 19:30: the week plan's reminders, one of them long",
    "2026-10-29",
    "19:30",
    fortnight("2026-10-26", reminders),
  ),
  ...[1, 3, 5].map((count) =>
    scenario(
      `thu-1930-events${String(count)}`,
      `Thursday 19:30: ${String(count)} whole-day events and three birthdays on Friday`,
      "2026-10-29",
      "19:30",
      fortnight(
        "2026-10-26",
        (data) => crowded(data, count, ["Alma", "Bo", "Carl"]),
        (data) => crowded(data, count, ["Freja", "Malte", "Sigrid"]),
      ),
    ),
  ),
  scenario(
    "thu-1930-timed4",
    "Thursday 19:30: four events at a time on Friday",
    "2026-10-29",
    "19:30",
    fortnight("2026-10-26", (data) => ({
      ...data,
      events: [
        ...data.events,
        timed("t1", "Morgensang i salen", "08:00", "08:20", "event"),
        timed("t2", "Tandlæge", "09:30", "10:00", "event"),
        timed("t3", "Bibliotek med 3.B", "11:00", "11:45", "excursion"),
        timed("t4", "Fodbold i SFO", "14:00", "15:30", "event"),
      ],
    })),
  ),
  scenario(
    "thu-1930-longplan",
    "Thursday 19:30: a plan for Friday of fifty lines",
    "2026-10-29",
    "19:30",
    fortnight("2026-10-26", (data) => ({
      ...data,
      tasks: [
        ...data.tasks,
        {
          ...note("2026-10-30", 221, "comment", "Historie", LONG_PLAN),
          title: "Tur til skoven",
        },
      ],
    })),
  ),
  scenario(
    "before-weekday-holiday",
    "Friday 9 October 14:00: a holiday entered Monday to Friday",
    "2026-10-09",
    "14:00",
    (child) => holiday(child.child_id === IDA.child_id ? weekData : oskarData, "2026-10-12"),
    "2026-10-05",
  ),
  scenario(
    "two-holidays",
    "Friday 9 October 14:00: two schools, their holidays ending on different days",
    "2026-10-09",
    "14:00",
    (child) =>
      child.child_id === IDA.child_id
        ? holidayFortnight("2026-10-05")
        : holiday(oskarData, "2026-10-10", "2026-10-20", "2026-10-05"),
    "2026-10-05",
    [IDA, OSKAR_ELSEWHERE],
  ),
  scenario(
    "juleferie",
    "Wednesday 30 December: the Christmas holiday, over New Year",
    "2026-12-30",
    "10:00",
    (child) => {
      const away = without(
        child.child_id === IDA.child_id ? weekData("2026-12-28") : oskarData("2026-12-28"),
        "2026-12-28",
        "2027-01-03",
      );
      return {
        ...away,
        events: [...away.events, allDay("jul", "Juleferie", "holiday", "2026-12-19", "2027-01-03")],
      };
    },
    "2026-12-28",
  ),
  scenario(
    "thu-0715-3child",
    "Thursday 07:15: today, three children",
    "2026-10-29",
    "07:15",
    (child) =>
      child.child_id === EMMA.child_id
        ? emmaData("2026-10-26")
        : child.child_id === IDA.child_id
          ? weekData("2026-10-26")
          : oskarData("2026-10-26"),
    "2026-10-26",
    [IDA, OSKAR, EMMA],
  ),
  scenario(
    "sat-1000-birthday",
    "Saturday 10:00: a birthday and a scout trip over the weekend",
    "2026-10-31",
    "10:00",
    fortnight("2026-10-26", (data) => ({
      ...data,
      birthdays: [...data.birthdays, { date: "2026-10-31", name: "Karl" }],
      events: [...data.events, allDay("we", "Spejdertur", "event", "2026-10-31", "2026-11-01")],
    })),
  ),
  scenario(
    "tue-1930-camp",
    "Tuesday 19:30: a camp from Tuesday 08:00 to Thursday 14:00",
    "2026-11-03",
    "19:30",
    fortnight("2026-11-02", (data) => {
      const away = without(data, "2026-11-03", "2026-11-05");
      return {
        ...away,
        events: [
          ...away.events,
          {
            id: "camp",
            start: local("2026-11-03", "08:00"),
            end: local("2026-11-05", "14:00"),
            all_day: false,
            title: "Lejrskole i Thy",
            type: "excursion",
            location: "Thy Lejren",
          },
        ],
      };
    }),
    "2026-11-02",
  ),
];

// A teacher's letter of fifty lines, as some write for a day out.
const LONG_PLAN = Array.from(
  { length: 50 },
  (_, index) =>
    `${String(index + 1)}. ${
      [
        "Vi mødes i klassen kl. 8.00 og går samlet til bussen.",
        "Turen går til skoven ved søen, hvor vi arbejder med vikingetiden.",
        "Eleverne arbejder i grupper på fire og skifter post hver halve time.",
        "Vi spiser frokost sammen ved shelterne.",
        "Der er tre voksne med hele dagen.",
        "Vi er tilbage ved skolen kl. 14.00.",
        "Skriv til mig i Aula, hvis jeres barn ikke kan deltage.",
      ][index % 7] ?? ""
    }`,
).join("\n");

function saturdayLesson(data: WeekData): WeekData {
  return {
    ...data,
    lessons: [
      ...data.lessons,
      {
        id: "sat",
        start: local("2026-10-31", "09:00"),
        end: local("2026-10-31", "12:00"),
        title: "IDR",
        teachers: ["Jonas Berg Vestergaard"],
        location: "HAL - Idrætshal",
        status: null,
      },
    ],
  };
}

/** Returns a fortnight with the autumn holiday from `first` to `last`, and no school then. */
function holiday(
  data: (monday: string) => WeekData,
  first: string,
  last = "2026-10-16",
  monday = "2026-10-05",
): WeekData {
  const away = without(data(monday), first, last);
  return {
    ...away,
    events: [...away.events, allDay(`h-${last}`, "Efterårsferie", "holiday", first, last)],
  };
}

// Friday's notes with reminders in the plural, a number of things, and a long sentence.
function reminders(data: WeekData): WeekData {
  const fri = "2026-10-30";
  return {
    ...data,
    tasks: data.tasks
      .filter((task) => task.date !== fri)
      .concat([
        note(
          fri,
          211,
          "task",
          "Matematik",
          "Side 32–33, opgave 1–6. Husk lommeregner og to blyanter.",
        ),
        note(
          fri,
          212,
          "comment",
          "Historie",
          "Vi tager i skoven. Husk, at eleverne skal have gummistøvler, regntøj og en ekstra trøje med, og at de selv skal kunne bære deres rygsæk hele dagen.",
        ),
        note(fri, 213, "comment", "Engelsk", "Vi læser højt. Husk briller."),
      ]),
  };
}

// Whole-day events every child's school has on Friday, after the school photo, and birthdays.
const WHOLE_DAY: readonly [title: string, type: string][] = [
  ["Motionsdag", "event"],
  ["Tur til Naturcenter Vestskoven", "excursion"],
  ["Halloween-fest", "event"],
  ["Trafikdag med cykelprøve", "event"],
];

function crowded(data: WeekData, count: number, names: readonly string[]): WeekData {
  const extra = WHOLE_DAY.slice(0, count - 1).map(([title, type], index) =>
    allDay(`w${String(index)}`, title, type, "2026-10-30", "2026-10-30"),
  );
  return {
    ...data,
    events: [...data.events, ...extra],
    birthdays: [
      ...data.birthdays.filter((birthday) => birthday.date !== "2026-10-30"),
      ...names.map((name) => ({ date: "2026-10-30", name })),
    ],
  };
}

function timed(id: string, title: string, start: string, end: string, type: string) {
  return {
    id,
    start: local("2026-10-30", start),
    end: local("2026-10-30", end),
    all_day: false,
    title,
    type,
    location: null,
  };
}

function note(date: string, id: number, type: string, subject: string, content: string): Task {
  return { id, date, type, title: null, content, subject, group: "3.B", author: "Karen Lund" };
}

/** Removes the notes from `first` on: a week plan not yet in Aula. */
function noPlanFrom(first: string): (data: WeekData) => WeekData {
  return (data) => ({ ...data, tasks: data.tasks.filter((task) => task.date < first) });
}

// Friday 30 October with long names, many notes, a long link and abbreviations in the notes.
function stress(data: WeekData): WeekData {
  const fri = "2026-10-30";
  return {
    ...data,
    lessons: data.lessons
      .filter((lesson) => !lesson.start.startsWith(fri))
      .concat([
        {
          id: "s1",
          start: local(fri, "08:00"),
          end: local(fri, "09:30"),
          title: "UUV",
          teachers: ["Karen Lund"],
          location: "Fællesrummet ved indskolingen (bygning C, 1. sal)",
          status: "substitute",
        },
        {
          id: "s2",
          start: local(fri, "10:05"),
          end: local(fri, "11:35"),
          title: "HÅN",
          teachers: ["Lars Krogh"],
          location: "Sløjd",
          status: "Flyttet til lokale 117 pga. vandskade",
        },
        {
          id: "s3",
          start: local(fri, "12:10"),
          end: local(fri, "13:40"),
          title: "3.B Kristendomskundskab og filosofi",
          teachers: ["Pia Sand"],
          location: "B12",
          status: null,
        },
      ]),
    tasks: data.tasks
      .filter((task) => task.date !== fri)
      .concat([
        note(
          fri,
          201,
          "task",
          "Understøttende undervisning",
          "Læs s. 38+39 i læsebogen. Husk at læse 20 min hver dag – skriv det i læselogbogen.",
        ),
        note(
          fri,
          202,
          "task",
          "Håndværk og design",
          "Se videoen før timen: https://www.example.com/meebook/forloeb/haandvaerk-og-design/uge-44/video-om-sikkerhed-ved-hobbykniven-og-stiksaven",
        ),
        note(
          fri,
          203,
          "task",
          "Matematik",
          "Opgave 1–4 s. 12. Medbring lommeregner kl. 8.15 til prøven.",
        ),
        note(fri, 204, "task", "Engelsk", "Learn the words for the test. Remember your PE kit."),
        note(
          fri,
          207,
          "task",
          "Understøttende undervisning og lektiecafé for 3.B",
          "Læs i din frilæsningsbog.",
        ),
        note(
          fri,
          205,
          "comment",
          "Dansk",
          "Vi læser højt, f.eks. fra kapitel 5, og taler om bl.a. personerne. Vi skal have besøg med forfatteren kl. 10.",
        ),
        note(
          fri,
          206,
          "comment",
          "Historie",
          "Vi ser filmen. Husk madpakke – vi spiser i klassen. Tag gerne en pude med.",
        ),
      ]),
    events: data.events.concat([
      {
        id: "x1",
        start: fri,
        end: "2026-10-31",
        all_day: true,
        title: "Halloween-fest for hele indskolingen i multisalen (udklædning valgfri)",
        type: "event",
        location: "Multisalen",
      },
    ]),
  };
}

function holidayOskar(monday: string): WeekData {
  const data = without(oskarData(monday), "2026-10-10", "2026-10-18");
  return {
    ...data,
    events: [...data.events, allDay("h42", "Efterårsferie", "holiday", "2026-10-10", "2026-10-18")],
  };
}

/** Returns a scenario by name. */
export function scenarioNamed(id: string): Scenario {
  const found = SCENARIOS.find((item) => item.id === id);
  if (!found) throw new Error(`no scenario ${id}`);
  return found;
}

/** Returns the range a scenario's data covers. */
export function scenarioRange(item: Scenario): DayRange {
  return { start: item.monday, end: plusDays(item.monday, 14) };
}
