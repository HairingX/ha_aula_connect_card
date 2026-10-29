/**
 * Named moments, each a clock, children and their data, shared by the tests and the screenshots,
 * so that a screenshot shows a tested case. All made up.
 *
 * @packageDocumentation
 */

import type { Child, DayRange, WeekData } from "../../src/core/types.ts";
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
];

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
