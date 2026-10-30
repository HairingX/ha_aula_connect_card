import { describe, expect, it } from "vitest";

import { localTime } from "../../src/core/dates.ts";
import { rangeFor } from "../../src/core/store.ts";
import type { WeekData } from "../../src/core/types.ts";
import { buildDays } from "../../src/model/days.ts";
import {
  HOLD_MS,
  focusAt,
  heldFocus,
  type Focus,
  type FocusReason,
} from "../../src/model/focus.ts";
import { allDay, holidayFortnight, local, weekData, without, ZONE } from "../fixtures/week.ts";

const NOON = 12 * 60;
const fortnight = weekData("2026-10-26");
const tuesdayOnly = (add: Partial<WeekData>): WeekData => {
  const empty = without(fortnight, "2026-10-27", "2026-10-27");
  return {
    ...empty,
    events: [...empty.events, ...(add.events ?? [])],
    tasks: [...empty.tasks, ...(add.tasks ?? [])],
  };
};
const noLessons: WeekData = { ...fortnight, lessons: [] };
const saturdayLesson: WeekData = {
  ...fortnight,
  lessons: [
    ...fortnight.lessons,
    {
      id: "s",
      start: local("2026-10-31", "09:00"),
      end: local("2026-10-31", "10:30"),
      title: "IDR",
      teachers: [],
      location: null,
      status: null,
    },
  ],
};
const homeworkTuesday = tuesdayOnly({
  tasks: [
    {
      id: "t",
      date: "2026-10-27",
      type: "task",
      title: null,
      content: "Læs s. 12.",
      subject: "Dansk",
      group: "3.B",
      author: "",
    },
  ],
});

/** Returns the focus at `now` for data, in the store's range of that day. */
function focus(
  now: string,
  data: WeekData | undefined,
  switchAt: number | null = NOON,
  zone = ZONE,
): Focus {
  const at = new Date(now);
  return focusAt(at, zone, switchAt, buildDays(data, rangeFor(localTime(at, zone).day), zone));
}

type Row = [
  moment: string,
  now: string,
  data: WeekData | undefined,
  switchAt: number | null,
  zone: string,
  day: string | undefined,
  reason: FocusReason,
  afterSwitch: boolean,
];

const thu = (time: string): string => local("2026-10-29", time);
const ROWS: Row[] = [
  ["Thursday morning is today", thu("07:15"), fortnight, NOON, ZONE, "2026-10-29", "today", false],
  [
    "a minute before the switch is still today",
    thu("11:59"),
    fortnight,
    NOON,
    ZONE,
    "2026-10-29",
    "today",
    false,
  ],
  [
    "the switch moves to tomorrow",
    thu("12:00"),
    fortnight,
    NOON,
    ZONE,
    "2026-10-30",
    "tomorrow",
    true,
  ],
  ["the evening is tomorrow", thu("19:30"), fortnight, NOON, ZONE, "2026-10-30", "tomorrow", true],
  [
    "no switch keeps today all evening",
    thu("19:30"),
    fortnight,
    null,
    ZONE,
    "2026-10-29",
    "today",
    false,
  ],
  [
    "a later switch keeps today after noon",
    thu("13:00"),
    fortnight,
    15 * 60,
    ZONE,
    "2026-10-29",
    "today",
    false,
  ],
  [
    "Friday morning is today",
    local("2026-10-30", "07:15"),
    fortnight,
    NOON,
    ZONE,
    "2026-10-30",
    "today",
    false,
  ],
  [
    "Friday after the switch passes the weekend to Monday",
    local("2026-10-30", "12:40"),
    fortnight,
    NOON,
    ZONE,
    "2026-11-02",
    "next_school_day",
    true,
  ],
  [
    "Saturday looks to Monday",
    local("2026-10-31", "10:00"),
    fortnight,
    NOON,
    ZONE,
    "2026-11-02",
    "next_school_day",
    false,
  ],
  [
    "Sunday morning is Monday tomorrow",
    local("2026-11-01", "09:00"),
    fortnight,
    NOON,
    ZONE,
    "2026-11-02",
    "tomorrow",
    false,
  ],
  [
    "Sunday evening is Monday tomorrow",
    local("2026-11-01", "18:00"),
    fortnight,
    NOON,
    ZONE,
    "2026-11-02",
    "tomorrow",
    true,
  ],
  [
    "a Saturday with a lesson is a school day",
    local("2026-10-31", "10:00"),
    saturdayLesson,
    NOON,
    ZONE,
    "2026-10-31",
    "today",
    false,
  ],
  [
    "an empty Tuesday is passed over",
    local("2026-10-26", "19:30"),
    tuesdayOnly({}),
    NOON,
    ZONE,
    "2026-10-28",
    "next_school_day",
    true,
  ],
  [
    "a sports day without lessons is a school day",
    local("2026-10-26", "19:30"),
    tuesdayOnly({ events: [allDay("m", "Motionsdag", "event", "2026-10-27", "2026-10-27")] }),
    NOON,
    ZONE,
    "2026-10-27",
    "tomorrow",
    true,
  ],
  [
    "a day with only homework is a school day",
    local("2026-10-26", "19:30"),
    homeworkTuesday,
    NOON,
    ZONE,
    "2026-10-27",
    "tomorrow",
    true,
  ],
  [
    "a registered vacation is no school day",
    local("2026-10-26", "19:30"),
    tuesdayOnly({
      events: [allDay("v", "Ferie", "vacation_registration", "2026-10-27", "2026-10-27")],
    }),
    NOON,
    ZONE,
    "2026-10-28",
    "next_school_day",
    true,
  ],
  [
    "a school without a timetable has today",
    thu("07:15"),
    noLessons,
    NOON,
    ZONE,
    "2026-10-29",
    "today",
    false,
  ],
  [
    "a school without a timetable passes the weekend",
    local("2026-10-30", "14:00"),
    noLessons,
    NOON,
    ZONE,
    "2026-11-02",
    "next_school_day",
    true,
  ],
  [
    "a day off passes to Tuesday",
    local("2026-11-01", "18:00"),
    {
      ...noLessons,
      events: [...noLessons.events, allDay("f", "Fridag", "holiday", "2026-11-02", "2026-11-02")],
    },
    NOON,
    ZONE,
    "2026-11-03",
    "next_school_day",
    true,
  ],
  [
    "inside a holiday is the Monday after",
    local("2026-10-14", "10:00"),
    holidayFortnight("2026-10-12"),
    NOON,
    ZONE,
    "2026-10-19",
    "next_school_day",
    false,
  ],
  [
    "the last evening of a holiday is Monday tomorrow",
    local("2026-10-18", "18:00"),
    holidayFortnight("2026-10-12"),
    NOON,
    ZONE,
    "2026-10-19",
    "tomorrow",
    true,
  ],
  [
    "the morning before a holiday is today",
    local("2026-10-09", "07:15"),
    holidayFortnight("2026-10-05"),
    NOON,
    ZONE,
    "2026-10-09",
    "today",
    false,
  ],
  [
    "the afternoon before a holiday has no school day ahead",
    local("2026-10-09", "14:00"),
    holidayFortnight("2026-10-05"),
    NOON,
    ZONE,
    undefined,
    "none",
    true,
  ],
  [
    "no data for today has no focus yet",
    thu("07:15"),
    weekData("2026-10-12"),
    NOON,
    ZONE,
    undefined,
    "none",
    false,
  ],
  [
    "the day summer time ends counts its hours right",
    local("2026-10-25", "18:00"),
    weekData("2026-10-19"),
    NOON,
    ZONE,
    "2026-10-26",
    "tomorrow",
    true,
  ],
  [
    "after midnight in Copenhagen is the next day",
    "2026-10-29T23:30:00Z",
    fortnight,
    NOON,
    ZONE,
    "2026-10-30",
    "today",
    false,
  ],
  [
    "the same instant in New York is still the evening",
    "2026-10-29T23:30:00Z",
    fortnight,
    NOON,
    "America/New_York",
    "2026-10-30",
    "tomorrow",
    true,
  ],
];

describe("the focus day", () => {
  it.each(ROWS)("%s (%s)", (_moment, now, data, switchAt, zone, day, reason, afterSwitch) => {
    const chosen = focus(now, data, switchAt, zone);
    expect(chosen).toMatchObject({ day, reason, afterSwitch });
  });

  it("looks up to the range's last day when no day ahead is a school day", () => {
    expect(focus(local("2026-10-09", "14:00"), holidayFortnight("2026-10-05")).horizon).toBe(
      "2026-10-18",
    );
  });

  it("has no horizon while today is not known, as before the data has come", () => {
    expect(focus(thu("07:15"), weekData("2026-10-12")).horizon).toBeUndefined();
    expect(focus(thu("07:15"), undefined)).toMatchObject({ reason: "none", horizon: undefined });
  });

  it("names the days it passed over", () => {
    expect(focus(local("2026-10-30", "14:00"), fortnight).skipped).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });
});

describe("holding the focus while the card is touched", () => {
  // A tap at Thursday 11:59:40; the ticks at 12:00 and 12:01.
  const tap = new Date(local("2026-10-29", "11:59")).getTime() + 40_000;
  const before = focus(thu("11:59"), fortnight);
  const atNoon = focus(thu("12:00"), fortnight);
  const after = focus(thu("12:01"), fortnight);

  it("keeps Thursday at the 12:00 tick, 20 seconds after the tap", () => {
    expect(heldFocus(before, atNoon, tap, new Date(thu("12:00")).getTime() + 50).day).toBe(
      "2026-10-29",
    );
  });

  it("moves to Friday at the 12:01 tick, a minute after the tap", () => {
    expect(heldFocus(before, after, tap, new Date(thu("12:01")).getTime() + 50).day).toBe(
      "2026-10-30",
    );
  });

  it("takes the chosen focus when nothing was shown, or the day is the same", () => {
    expect(heldFocus(undefined, atNoon, tap, tap)).toBe(atNoon);
    const again = focus(thu("19:30"), fortnight);
    expect(heldFocus(atNoon, again, tap, tap)).toBe(again);
    expect(heldFocus(focus(thu("07:15"), undefined), atNoon, tap, tap)).toBe(atNoon);
    expect(HOLD_MS).toBe(60_000);
  });
});
