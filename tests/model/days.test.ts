import { describe, expect, it } from "vitest";

import type { CalendarEvent, Task } from "../../src/core/types.ts";
import {
  buildDays,
  eventDays,
  holidaySpan,
  isSchoolDay,
  type DayView,
} from "../../src/model/days.ts";
import { present } from "../fake-hass.ts";
import { allDay, local, weekData, ZONE } from "../fixtures/week.ts";

const RANGE = { start: "2026-10-26", end: "2026-11-09" };

function day(fields: Partial<DayView>): DayView {
  return {
    day: "2026-10-27",
    known: true,
    lessons: [],
    notes: [],
    events: [],
    birthdays: [],
    ...fields,
  };
}

const note: Task = {
  id: 1,
  date: "2026-10-27",
  type: "comment",
  title: null,
  content: "Tur",
  subject: "",
  group: "",
  author: "",
};

function event(type: string): CalendarEvent {
  return allDay("e", "Begivenhed", type, "2026-10-27", "2026-10-27");
}

describe("the days of the range", () => {
  it("are known where the data covers them, and loading elsewhere", () => {
    const days = buildDays({ ...weekData("2026-10-26"), end: "2026-11-02" }, RANGE, ZONE);
    expect(days).toHaveLength(14);
    expect(days.filter((view) => view.known).map((view) => view.day)).toHaveLength(7);
    expect(buildDays(undefined, RANGE, ZONE).every((view) => !view.known)).toBe(true);
  });

  it("put all-day events first, holidays first among them, then the rest by start", () => {
    const data = weekData("2026-10-26");
    const events: CalendarEvent[] = [
      {
        id: "t",
        start: local("2026-10-27", "17:00"),
        end: local("2026-10-27", "18:00"),
        all_day: false,
        title: "Møde",
        type: "event",
        location: null,
      },
      {
        id: "s",
        start: local("2026-10-27", "08:00"),
        end: local("2026-10-27", "09:00"),
        all_day: false,
        title: "Tidlig",
        type: "event",
        location: null,
      },
      allDay("a", "Motionsdag", "event", "2026-10-27", "2026-10-27"),
      allDay("h", "Fridag", "holiday", "2026-10-27", "2026-10-27"),
    ];
    const tuesday = buildDays({ ...data, events }, RANGE, ZONE)[1];
    expect(tuesday?.events.map((item) => item.id)).toEqual(["h", "a", "s", "t"]);
  });

  it("put an event that ends at midnight on its own day only, and leave out what cannot be read", () => {
    const late: CalendarEvent = {
      id: "l",
      start: local("2026-10-27", "20:00"),
      end: local("2026-10-28", "00:00"),
      all_day: false,
      title: "Fest",
      type: "event",
      location: null,
    };
    expect(eventDays(late, ZONE)).toEqual(["2026-10-27"]);
    expect(eventDays({ ...late, start: "soon" }, ZONE)).toEqual([]);
    expect(
      eventDays({ ...late, all_day: true, start: "2026-10-27", end: "2026-10-27" }, ZONE),
    ).toEqual(["2026-10-27"]);
    expect(eventDays({ ...late, all_day: true, start: "tuesday" }, ZONE)).toEqual([]);
    expect(eventDays({ ...late, end: "later" }, ZONE)).toEqual(["2026-10-27"]);
  });

  it("leave out a lesson whose start cannot be read", () => {
    const data = weekData("2026-10-26");
    const [lesson] = data.lessons;
    const days = buildDays(
      { ...data, lessons: [...data.lessons, { ...present(lesson), id: "x", start: "soon" }] },
      RANGE,
      ZONE,
    );
    expect(days.flatMap((view) => view.lessons).length).toBe(data.lessons.length);
  });

  it("give a holiday whose dates cannot be read the day it covers", () => {
    expect(
      holidaySpan({ ...event("holiday"), start: "autumn", end: "spring" }, "2026-10-27"),
    ).toEqual({ first: "2026-10-27", last: "2026-10-27" });
  });
});

describe("school days", () => {
  it("are days with lessons, whatever else is on", () => {
    const [first] = weekData("2026-10-26").lessons;
    if (!first) throw new Error("no lesson");
    expect(isSchoolDay(day({ day: "2026-10-31", lessons: [first] }), true)).toBe(true);
    expect(isSchoolDay(day({ lessons: [first], events: [event("holiday")] }), true)).toBe(true);
  });

  it("are not holidays, weekends or registered vacations without lessons", () => {
    expect(isSchoolDay(day({ events: [event("holiday")], notes: [note] }), true)).toBe(false);
    expect(isSchoolDay(day({ events: [event("presence_holiday")] }), false)).toBe(false);
    expect(isSchoolDay(day({ day: "2026-10-31", notes: [note] }), true)).toBe(false);
    expect(isSchoolDay(day({ events: [event("vacation_registration")] }), true)).toBe(false);
  });

  it("are weekdays with a note or a school event, where the school keeps its timetable in Aula", () => {
    expect(isSchoolDay(day({ notes: [note] }), true)).toBe(true);
    expect(isSchoolDay(day({ events: [event("excursion")] }), true)).toBe(true);
    expect(isSchoolDay(day({ birthdays: [{ date: "2026-10-27", name: "Alma" }] }), true)).toBe(
      false,
    );
    expect(isSchoolDay(day({}), true)).toBe(false);
  });

  it("are not weekdays whose every lesson is cancelled, unless the school has an event", () => {
    const [first] = weekData("2026-10-26").lessons;
    if (!first) throw new Error("no lesson");
    const cancelled = { ...first, status: "Aflyst" };
    expect(isSchoolDay(day({ lessons: [cancelled], notes: [note] }), true)).toBe(false);
    expect(isSchoolDay(day({ lessons: [cancelled], events: [event("excursion")] }), true)).toBe(
      true,
    );
    expect(isSchoolDay(day({ lessons: [cancelled, first] }), true)).toBe(true);
  });

  it("are every weekday where the school keeps no timetable in Aula", () => {
    expect(isSchoolDay(day({}), false)).toBe(true);
  });
});
