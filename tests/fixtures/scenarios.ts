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
  holidayFortnight,
  local,
  plusDays,
  weekData,
  without,
  ZONE,
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
  scenario("thu-1000", "Thursday 10:00: today, Dansk going on", "2026-10-29", "10:00"),
  scenario("thu-1010", "Thursday 10:10: today, Dansk going on", "2026-10-29", "10:10"),
  scenario("thu-1200", "Thursday 12:00: tomorrow, school still on", "2026-10-29", "12:00"),
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
    fortnight("2026-10-26", (data) => ({
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
    })),
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
