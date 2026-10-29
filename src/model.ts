/**
 * Arranging a child's data from Aula into weeks and days.
 *
 * @packageDocumentation
 */

import { addDays, dayOf, daysBetween, isDay, weekNumber } from "./dates";
import type { Birthday, CalendarEvent, Lesson, Task, WeekData } from "./types";

/** Everything on one day. */
export interface DayView {
  /** The day, `YYYY-MM-DD`. */
  day: string;
  /** The lessons, in the order they begin. */
  lessons: Lesson[];
  /** The week plan's notes for the day. */
  tasks: Task[];
  /** The events on the day, all-day ones first, then in the order they begin. */
  events: CalendarEvent[];
  /** The birthdays on the day. */
  birthdays: Birthday[];
}

/** The days of one week, from its first day. */
export interface WeekView {
  /** The first day of the week. */
  start: string;
  /** The week's ISO 8601 number. */
  number: number;
  /** The seven days of the week. */
  days: DayView[];
}

function instant(text: string): Date | undefined {
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Returns the days an event is on, from its first to its last, in a time zone. */
export function eventDays(event: CalendarEvent, zone: string): string[] {
  let first: string;
  let last: string;
  if (event.all_day) {
    // An all-day event's end is the day after its last, as in Home Assistant's calendars.
    first = event.start.slice(0, 10);
    if (!isDay(first)) return [];
    const end = event.end.slice(0, 10);
    last = isDay(end) && end > first ? addDays(end, -1) : first;
  } else {
    const start = instant(event.start);
    if (!start) return [];
    const end = instant(event.end);
    first = dayOf(start, zone);
    // A timed event ending at midnight ends on the day before.
    last = end && end > start ? dayOf(new Date(end.getTime() - 1), zone) : first;
  }
  // A runaway range is cut at a year: the card never shows more than three weeks.
  const count = Math.min(daysBetween(first, last) + 1, 366);
  return Array.from({ length: count }, (_, index) => addDays(first, index));
}

function startTime(item: { start: string }): number {
  return instant(item.start)?.getTime() ?? 0;
}

function byStart(a: { start: string }, b: { start: string }): number {
  return startTime(a) - startTime(b);
}

/**
 * Arranges the data of a range into `weeks` weeks of seven days from `start`, each day's lessons
 * and events in the order they begin and all-day events first. What falls outside the range, or
 * has a time that cannot be read, is left out.
 */
export function buildWeeks(
  data: WeekData | undefined,
  start: string,
  weeks: number,
  zone: string,
): WeekView[] {
  const result: WeekView[] = Array.from({ length: weeks }, (_, week) => {
    const first = addDays(start, week * 7);
    return {
      start: first,
      number: weekNumber(first),
      days: Array.from({ length: 7 }, (_, index) => ({
        day: addDays(first, index),
        lessons: [],
        tasks: [],
        events: [],
        birthdays: [],
      })),
    };
  });
  const days = new Map(result.flatMap((week) => week.days).map((view) => [view.day, view]));
  if (!data) return result;
  for (const lesson of [...data.lessons].sort(byStart)) {
    const begins = instant(lesson.start);
    if (begins) days.get(dayOf(begins, zone))?.lessons.push(lesson);
  }
  const events = [...data.events].sort(
    (a, b) => Number(b.all_day) - Number(a.all_day) || byStart(a, b),
  );
  for (const event of events) {
    for (const day of eventDays(event, zone)) days.get(day)?.events.push(event);
  }
  for (const task of data.tasks) days.get(task.date)?.tasks.push(task);
  for (const birthday of data.birthdays) days.get(birthday.date)?.birthdays.push(birthday);
  return result;
}
