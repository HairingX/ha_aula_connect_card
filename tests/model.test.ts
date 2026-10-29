import { describe, expect, it } from "vitest";

import { buildWeeks, eventDays } from "../src/model";
import type { CalendarEvent, WeekData } from "../src/types";
import { weekData } from "./fixtures/week";

const ZONE = "Europe/Copenhagen";

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

  it("takes the day of an all-day event given with a time", () => {
    expect(
      eventDays(
        calendarEvent({ start: "2026-10-29T00:00:00+01:00", end: "2026-10-30T00:00:00+01:00" }),
        ZONE,
      ),
    ).toEqual(["2026-10-29"]);
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
      "09:50",
      "10:35",
      "12:00",
      "12:45",
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
