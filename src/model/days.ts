/**
 * A child's data as days: what is on each day of the range, which days are holidays, and which
 * are school days.
 *
 * @packageDocumentation
 */

import { addDays, dayOf, daysBetween, instant, isDay, isWeekend } from "../core/dates.ts";
import type {
  Birthday,
  CalendarEvent,
  Day,
  DayRange,
  Lesson,
  Task,
  WeekData,
} from "../core/types.ts";

/** Everything on one day. */
export interface DayView {
  /** The day. */
  readonly day: Day;
  /** Whether the data covers the day; an unknown day is not yet loaded, not empty. */
  readonly known: boolean;
  /** The lessons, in the order they begin. */
  readonly lessons: readonly Lesson[];
  /** The week plan's notes for the day, as Meebook sends them. */
  readonly notes: readonly Task[];
  /** The events on the day: all-day ones first, holidays first among them, then by start. */
  readonly events: readonly CalendarEvent[];
  /** The birthdays on the day. */
  readonly birthdays: readonly Birthday[];
}

/** The event types that make a day a holiday when they cover it all day. */
export const HOLIDAY_TYPES: readonly string[] = ["holiday", "presence_holiday"];

/** The event types that are not school: holidays, and the registration of a child's vacation. */
export const NOT_SCHOOL_TYPES: readonly string[] = [...HOLIDAY_TYPES, "vacation_registration"];

/** Tells whether an event makes the days it covers holidays. */
export function isHolidayEvent(event: CalendarEvent): boolean {
  return event.all_day && HOLIDAY_TYPES.includes(event.type);
}

/** Tells whether an event is something at school, which makes a weekday a school day. */
export function isSchoolEvent(event: CalendarEvent): boolean {
  return !NOT_SCHOOL_TYPES.includes(event.type);
}

/** Returns the holiday event covering a day, if any. */
export function holidayOf(view: DayView): CalendarEvent | undefined {
  return view.events.find(isHolidayEvent);
}

/** Returns the days an event is on, from its first to its last, in a time zone. */
export function eventDays(event: CalendarEvent, zone: string): Day[] {
  let first: Day;
  let last: Day;
  if (event.all_day) {
    // An all-day event's end is the day after its last, as in Home Assistant's calendars.
    if (!isDay(event.start)) return [];
    first = event.start;
    last = isDay(event.end) && event.end > first ? addDays(event.end, -1) : first;
  } else {
    const start = instant(event.start);
    if (!start) return [];
    const end = instant(event.end);
    first = dayOf(start, zone);
    // A timed event ending at midnight ends on the day before.
    last = end && end > start ? dayOf(new Date(end.getTime() - 1), zone) : first;
  }
  // A runaway range is cut at a year: no card shows more than the store's range.
  const count = Math.min(daysBetween(first, last) + 1, 366);
  return Array.from({ length: count }, (_, index) => addDays(first, index));
}

/**
 * How an event is on a day: all day; within the day; from a time on its first of several days;
 * through the whole of a day between; until a time on its last day.
 */
export type EventSpan = "allDay" | "within" | "from" | "through" | "until";

/** Returns how an event is on one of its days, in a time zone. */
export function spanOn(event: CalendarEvent, day: Day, zone: string): EventSpan {
  if (event.all_day) return "allDay";
  const days = eventDays(event, zone);
  if (days.length <= 1) return "within";
  if (day === days[0]) return "from";
  return day === days[days.length - 1] ? "until" : "through";
}

/** Tells whether an event lasts the whole of a day: all day, or a day it runs through. */
export function isWholeDay(event: CalendarEvent, day: Day, zone: string): boolean {
  const span = spanOn(event, day, zone);
  return span === "allDay" || span === "through";
}

/**
 * Returns a holiday's own first and last day, even beyond the range; `day`, a day it covers,
 * where its dates cannot be read.
 */
export function holidaySpan(event: CalendarEvent, day: Day): { first: Day; last: Day } {
  const first = isDay(event.start) ? event.start : day;
  const last = isDay(event.end) && event.end > first ? addDays(event.end, -1) : first;
  return { first, last };
}

function startTime(item: { start: string }): number {
  return instant(item.start)?.getTime() ?? 0;
}

function eventOrder(a: CalendarEvent, b: CalendarEvent): number {
  return (
    Number(b.all_day) - Number(a.all_day) ||
    Number(isHolidayEvent(b)) - Number(isHolidayEvent(a)) ||
    startTime(a) - startTime(b)
  );
}

/**
 * Returns the days of a range with what the data has on each. What falls outside the range, or
 * has a time that cannot be read, is left out.
 */
export function buildDays(data: WeekData | undefined, range: DayRange, zone: string): DayView[] {
  const count = Math.max(0, daysBetween(range.start, range.end));
  const days = Array.from({ length: count }, (_, index) => {
    const day = addDays(range.start, index);
    return {
      day,
      known: data !== undefined && data.start <= day && day < data.end,
      lessons: [] as Lesson[],
      notes: [] as Task[],
      events: [] as CalendarEvent[],
      birthdays: [] as Birthday[],
    };
  });
  if (!data) return days;
  const byDay = new Map(days.map((view) => [view.day, view]));
  for (const lesson of [...data.lessons].sort((a, b) => startTime(a) - startTime(b))) {
    const begins = instant(lesson.start);
    if (begins) byDay.get(dayOf(begins, zone))?.lessons.push(lesson);
  }
  for (const event of [...data.events].sort(eventOrder)) {
    for (const day of eventDays(event, zone)) byDay.get(day)?.events.push(event);
  }
  for (const note of data.tasks) byDay.get(note.date)?.notes.push(note);
  for (const birthday of data.birthdays) byDay.get(birthday.date)?.birthdays.push(birthday);
  return days;
}

/** Tells whether any known day of the range has a lesson: whether the school keeps its timetable in Aula. */
export function isTimetabled(days: readonly DayView[]): boolean {
  return days.some((view) => view.known && view.lessons.length > 0);
}

/**
 * Tells whether a day is a school day. Lessons decide; a holiday, a Saturday or a Sunday without
 * lessons is not one. Where the school keeps its timetable in Aula, a weekday without lessons is
 * one when it has a week-plan note or a school event, as a camp, trip or sports day has; where
 * it does not, every weekday is.
 */
export function isSchoolDay(view: DayView, timetabled: boolean): boolean {
  if (view.lessons.length > 0) return true;
  if (holidayOf(view) !== undefined || isWeekend(view.day)) return false;
  return !timetabled || view.notes.length > 0 || view.events.some(isSchoolEvent);
}
