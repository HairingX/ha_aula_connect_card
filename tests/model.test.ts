import { describe, expect, it } from "vitest";

import {
  buildWeeks,
  eventDays,
  focusDay,
  hasContent,
  isShown,
  mergeLessons,
  sameLesson,
  timeline,
  type DayView,
} from "../src/model";
import type { CalendarEvent, Lesson, WeekData } from "../src/core/types.ts";
import { weekData } from "./fixtures/week";

const ZONE = "Europe/Copenhagen";
const ALL = { timetable: true, tasks: true, events: true, birthdays: true };

function lesson(id: number, start: string, end: string, fields: Partial<Lesson> = {}): Lesson {
  return {
    id,
    start: `2026-10-29T${start}:00+01:00`,
    end: `2026-10-29T${end}:00+01:00`,
    title: "IDR",
    teachers: ["Signe Vang"],
    location: "Hal",
    status: null,
    ...fields,
  };
}

function view(day: string, fields: Partial<DayView> = {}): DayView {
  return { day, lessons: [], tasks: [], events: [], birthdays: [], ...fields };
}

function calendarEvent(fields: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "e",
    start: "2026-10-29",
    end: "2026-10-30",
    all_day: true,
    title: "Begivenhed",
    type: "event",
    location: null,
    ...fields,
  };
}

function empty(fields: Partial<WeekData> = {}): WeekData {
  return {
    week_plan: true,
    start: "2026-10-26",
    end: "2026-11-09",
    lessons: [],
    events: [],
    tasks: [],
    birthdays: [],
    ...fields,
  };
}

describe("eventDays", () => {
  it("gives an all-day event's days up to, not including, its end", () => {
    expect(eventDays(calendarEvent({ start: "2026-10-29", end: "2026-10-31" }), ZONE)).toEqual([
      "2026-10-29",
      "2026-10-30",
    ]);
  });

  it("gives an all-day event with no readable end its first day only", () => {
    expect(eventDays(calendarEvent({ end: "" }), ZONE)).toEqual(["2026-10-29"]);
    expect(eventDays(calendarEvent({ end: "2026-10-29" }), ZONE)).toEqual(["2026-10-29"]);
  });

  it("gives no days for an all-day event whose start is not a day", () => {
    expect(
      eventDays(
        calendarEvent({ start: "2026-10-29T00:00:00+01:00", end: "2026-10-30T00:00:00+01:00" }),
        ZONE,
      ),
    ).toEqual([]);
  });

  it("gives no days for an event without a readable start", () => {
    expect(eventDays(calendarEvent({ start: "soon" }), ZONE)).toEqual([]);
    expect(eventDays(calendarEvent({ all_day: false, start: "soon" }), ZONE)).toEqual([]);
  });

  it("gives a timed event the days of its time zone", () => {
    const late = calendarEvent({
      all_day: false,
      start: "2026-10-29T23:30:00Z",
      end: "2026-10-30T00:30:00Z",
    });
    expect(eventDays(late, ZONE)).toEqual(["2026-10-30"]);
    expect(eventDays(late, "UTC")).toEqual(["2026-10-29", "2026-10-30"]);
  });

  it("ends a timed event ending at midnight on the day before", () => {
    expect(
      eventDays(
        calendarEvent({
          all_day: false,
          start: "2026-10-29T20:00:00+01:00",
          end: "2026-10-30T00:00:00+01:00",
        }),
        ZONE,
      ),
    ).toEqual(["2026-10-29"]);
  });

  it("gives a timed event with no readable or no later end its first day", () => {
    const start = "2026-10-29T10:00:00+01:00";
    expect(eventDays(calendarEvent({ all_day: false, start, end: "" }), ZONE)).toEqual([
      "2026-10-29",
    ]);
    expect(eventDays(calendarEvent({ all_day: false, start, end: start }), ZONE)).toEqual([
      "2026-10-29",
    ]);
  });

  it("cuts a runaway event at a year", () => {
    expect(eventDays(calendarEvent({ start: "2026-01-01", end: "2030-01-01" }), ZONE)).toHaveLength(
      366,
    );
  });
});

describe("buildWeeks", () => {
  it("gives the weeks and days of the range with their week numbers", () => {
    const weeks = buildWeeks(undefined, "2026-10-26", 2, ZONE);
    expect(weeks.map((week) => [week.start, week.number, week.days.length])).toEqual([
      ["2026-10-26", 44, 7],
      ["2026-11-02", 45, 7],
    ]);
    expect(weeks[1]?.days[6]?.day).toBe("2026-11-08");
  });

  it("puts everything on its day", () => {
    const [week] = buildWeeks(weekData("2026-10-26"), "2026-10-26", 1, ZONE);
    const thursday = week?.days[3];
    expect(thursday?.lessons.map((lesson) => lesson.start.slice(11, 16))).toEqual([
      "08:00",
      "08:45",
      "10:05",
      "10:50",
      "12:10",
    ]);
    expect(thursday?.tasks.map((task) => task.id)).toEqual([1, 2, 3]);
    expect(week?.days[4]?.events.map((event) => event.title)).toEqual(["Skolefoto"]);
    expect(week?.days[4]?.birthdays).toEqual([{ date: "2026-10-30", name: "Alma" }]);
    expect(week?.days[5]?.lessons).toEqual([]);
  });

  it("orders lessons by their start, and all-day events first", () => {
    const data = empty({
      lessons: [
        {
          id: 2,
          start: "2026-10-26T10:00:00+01:00",
          end: "",
          title: "B",
          teachers: [],
          location: null,
          status: null,
        },
        {
          id: 1,
          start: "2026-10-26T08:00:00+01:00",
          end: "",
          title: "A",
          teachers: [],
          location: null,
          status: null,
        },
        { id: 3, start: "never", end: "", title: "C", teachers: [], location: null, status: null },
      ],
      events: [
        calendarEvent({
          id: "t2",
          all_day: false,
          start: "2026-10-26T15:00:00+01:00",
          end: "2026-10-26T16:00:00+01:00",
        }),
        calendarEvent({
          id: "t1",
          all_day: false,
          start: "2026-10-26T09:00:00+01:00",
          end: "2026-10-26T10:00:00+01:00",
        }),
        calendarEvent({ id: "a", start: "2026-10-26", end: "2026-10-27" }),
      ],
    });
    const monday = buildWeeks(data, "2026-10-26", 1, ZONE)[0]?.days[0];
    expect(monday?.lessons.map((lesson) => lesson.id)).toEqual([1, 2]);
    expect(monday?.events.map((event) => event.id)).toEqual(["a", "t1", "t2"]);
  });

  it("leaves out what falls outside the range", () => {
    const data = empty({
      tasks: [
        {
          id: 9,
          date: "2026-12-01",
          type: "task",
          title: null,
          content: "",
          subject: "",
          group: "",
          author: "",
        },
      ],
      birthdays: [{ date: "2026-10-01", name: "Ingen" }],
      events: [calendarEvent({ start: "2026-11-08", end: "2026-11-10" })],
    });
    const weeks = buildWeeks(data, "2026-10-26", 2, ZONE);
    const all = weeks.flatMap((week) => week.days);
    expect(all.flatMap((day) => day.tasks)).toEqual([]);
    expect(all.flatMap((day) => day.birthdays)).toEqual([]);
    expect(all.filter((day) => day.events.length > 0).map((day) => day.day)).toEqual([
      "2026-11-08",
    ]);
  });

  it("puts a lesson given in UTC on the day of the time zone", () => {
    const data = empty({
      lessons: [
        {
          id: 1,
          start: "2026-10-26T23:30:00Z",
          end: "2026-10-27T00:15:00Z",
          title: "Nat",
          teachers: [],
          location: null,
          status: null,
        },
      ],
    });
    const days = buildWeeks(data, "2026-10-26", 1, ZONE)[0]?.days;
    expect(days?.[1]?.lessons).toHaveLength(1);
    expect(days?.[0]?.lessons).toHaveLength(0);
  });
});

describe("sameLesson", () => {
  const first = lesson(1, "08:00", "08:45");

  it("is the same for another lesson but for its times and id", () => {
    expect(sameLesson(first, lesson(2, "08:45", "09:30"))).toBe(true);
  });

  it("is the same for two lessons without a room", () => {
    expect(
      sameLesson(
        lesson(1, "08:00", "08:45", { location: null }),
        lesson(2, "08:45", "09:30", { location: null }),
      ),
    ).toBe(true);
  });

  it("takes the teachers in any order, and null and normal as the same status", () => {
    expect(
      sameLesson(
        lesson(1, "08:00", "08:45", { teachers: ["A B", "C D"], status: null }),
        lesson(2, "08:45", "09:30", { teachers: ["C D ", "A B", " "], status: "normal" }),
      ),
    ).toBe(true);
  });

  it.each([
    ["subject", { title: "DAN" }],
    ["teachers", { teachers: ["Other Teacher"] }],
    ["room", { location: null }],
    ["status", { status: "substitute" }],
  ])("is not the same for another %s", (_, fields: Partial<Lesson>) => {
    expect(sameLesson(first, lesson(2, "08:45", "09:30", fields))).toBe(false);
  });
});

describe("mergeLessons", () => {
  it("shows a double lesson as one block", () => {
    expect(
      mergeLessons([lesson(1, "08:00", "08:45"), lesson(2, "08:45", "09:30")]).map((block) => [
        block.lesson.id,
        block.start.slice(11, 16),
        block.end.slice(11, 16),
        block.count,
      ]),
    ).toEqual([[1, "08:00", "09:30", 2]]);
  });

  it("joins a lesson beginning up to ten minutes after the one before", () => {
    expect(
      mergeLessons([
        lesson(1, "08:00", "08:45"),
        lesson(2, "08:55", "09:40"),
        lesson(3, "09:51", "10:30"),
      ]).map((block) => block.count),
    ).toEqual([2, 1]);
  });

  it("keeps apart lessons that differ, overlap, or have times that cannot be read", () => {
    expect(
      mergeLessons([
        lesson(1, "08:00", "08:45"),
        lesson(2, "08:45", "09:30", { title: "DAN" }),
        lesson(3, "09:00", "09:45", { title: "DAN" }),
      ]).map((block) => block.count),
    ).toEqual([1, 1, 1]);
    expect(
      mergeLessons([
        { ...lesson(1, "08:00", "08:45"), end: "later" },
        lesson(2, "08:45", "09:30"),
      ]).map((block) => block.count),
    ).toEqual([1, 1]);
  });

  it("keeps the lessons as received", () => {
    const lessons = [lesson(1, "08:00", "08:45"), lesson(2, "08:45", "09:30")];
    const copy = structuredClone(lessons);
    mergeLessons(lessons);
    expect(lessons).toEqual(copy);
  });
});

describe("timeline", () => {
  function rows(lessons: Lesson[]): string[] {
    return timeline(mergeLessons(lessons)).map((entry) =>
      entry.kind === "break"
        ? `break ${entry.start.slice(11, 16)}-${entry.end.slice(11, 16)}`
        : String(entry.block.lesson.id),
    );
  }

  it("shows a break of twenty minutes or more between lessons", () => {
    expect(
      rows([
        lesson(1, "08:00", "08:45"),
        lesson(2, "08:45", "09:30"),
        lesson(3, "09:50", "10:35", { title: "DAN" }),
        lesson(4, "10:54", "11:35", { title: "ENG" }),
      ]),
    ).toEqual(["1", "break 09:30-09:50", "3", "4"]);
  });

  it("shows no break before the first lesson or after the last", () => {
    expect(rows([lesson(1, "10:00", "10:45")])).toEqual(["1"]);
  });

  it("shows no break while a longer lesson beside the others lasts", () => {
    expect(
      rows([
        lesson(1, "08:00", "12:00", { title: "Tur" }),
        lesson(2, "09:00", "09:45", { title: "DAN" }),
        lesson(3, "10:30", "11:15", { title: "ENG" }),
        lesson(4, "12:30", "13:15", { title: "MAT" }),
      ]),
    ).toEqual(["1", "2", "3", "break 12:00-12:30", "4"]);
  });

  it("makes no break from a time that cannot be read", () => {
    expect(
      rows([
        { ...lesson(1, "08:00", "08:45"), end: "later" },
        lesson(2, "10:00", "10:45", { title: "DAN" }),
        { ...lesson(3, "11:00", "11:45", { title: "ENG" }), start: "soon" },
      ]),
    ).toEqual(["1", "2", "3"]);
  });
});

describe("days shown", () => {
  const busy = view("2026-10-31", { events: [calendarEvent({ start: "2026-10-31" })] });

  it("tells whether a day has anything of the parts shown", () => {
    expect(hasContent(view("2026-10-31"), ALL)).toBe(false);
    expect(hasContent(busy, ALL)).toBe(true);
    expect(hasContent(busy, { ...ALL, events: false })).toBe(false);
    expect(
      [
        view("d", { lessons: [lesson(1, "08:00", "08:45")] }),
        view("d", { tasks: weekData("2026-10-26").tasks }),
        view("d", { birthdays: [{ date: "d", name: "Alma" }] }),
      ].map((item) => [
        hasContent(item, ALL),
        hasContent(item, {
          timetable: false,
          tasks: false,
          events: false,
          birthdays: false,
        }),
      ]),
    ).toEqual([
      [true, false],
      [true, false],
      [true, false],
    ]);
  });

  it("shows every weekday, and a Saturday or Sunday only with something on it", () => {
    expect(isShown(view("2026-10-30"), ALL)).toBe(true);
    expect(isShown(view("2026-10-31"), ALL)).toBe(false);
    expect(isShown(view("2026-11-01"), ALL)).toBe(false);
    expect(isShown(busy, ALL)).toBe(true);
  });

  it("opens today, unless it is a Saturday or Sunday with nothing on it", () => {
    expect(focusDay("2026-10-29", [], ALL)).toBe("2026-10-29");
    expect(focusDay("2026-10-31", [busy], ALL)).toBe("2026-10-31");
    expect(focusDay("2026-10-31", [view("2026-10-31")], ALL)).toBe("2026-11-02");
    expect(focusDay("2026-11-01", [], ALL)).toBe("2026-11-02");
  });
});
