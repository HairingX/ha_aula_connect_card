/**
 * Arranging a child's data from Aula into weeks and days.
 *
 * @packageDocumentation
 */

import type { ShowKey } from "./config";
import { addDays, dayOf, daysBetween, isDay, isWeekend, weekday, weekNumber } from "./dates";
import type { Birthday, CalendarEvent, Lesson, Task, WeekData } from "./types";

/** The most time between two lessons that are shown as one, as between a double lesson's halves. */
export const MERGE_GAP_MS = 10 * 60_000;

/** The least time between two lessons that is shown as a break. */
export const BREAK_MS = 20 * 60_000;

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

/** One lesson, or back-to-back lessons that are the same, shown as one. */
export interface LessonBlock {
  /** The first lesson; the others differ only in their times and ids. */
  lesson: Lesson;
  /** When the first lesson begins. */
  start: string;
  /** When the last lesson ends. */
  end: string;
  /** The number of lessons. */
  count: number;
}

/** A row of a day's timetable: lessons, or a break between them. */
export type TimelineEntry =
  { kind: "lessons"; block: LessonBlock } | { kind: "break"; start: string; end: string };

function normal(status: string | null): string {
  return status === null || status === "normal" ? "" : status;
}

function people(teachers: readonly string[]): string {
  return JSON.stringify(
    teachers
      .map((name) => name.trim())
      .filter((name) => name !== "")
      .sort(),
  );
}

/** Tells whether two lessons are the same but for their times: subject, teachers, room, status. */
export function sameLesson(a: Lesson, b: Lesson): boolean {
  return (
    a.title.trim() === b.title.trim() &&
    people(a.teachers) === people(b.teachers) &&
    (a.location ?? "").trim() === (b.location ?? "").trim() &&
    normal(a.status) === normal(b.status)
  );
}

function millis(text: string): number {
  return new Date(text).getTime();
}

/**
 * Joins back-to-back lessons that are the same into blocks: a lesson joins the block before it
 * when it is the same and begins at most `MERGE_GAP_MS` after the block ends. The lessons are
 * taken in the order given, which should be the order they begin.
 */
export function mergeLessons(lessons: readonly Lesson[]): LessonBlock[] {
  const blocks: LessonBlock[] = [];
  for (const lesson of lessons) {
    const last = blocks[blocks.length - 1];
    const gap = millis(lesson.start) - millis(last?.end ?? "");
    if (last && sameLesson(last.lesson, lesson) && gap >= 0 && gap <= MERGE_GAP_MS) {
      last.end = lesson.end;
      last.count++;
    } else {
      blocks.push({ lesson, start: lesson.start, end: lesson.end, count: 1 });
    }
  }
  return blocks;
}

/**
 * Returns a day's timetable rows: the blocks, with a break between two where nothing is on for
 * `BREAK_MS` or more. Times that cannot be read make no break.
 */
export function timeline(blocks: readonly LessonBlock[]): TimelineEntry[] {
  const result: TimelineEntry[] = [];
  // The latest end so far: a long lesson beside shorter ones leaves no break while it lasts.
  let latest: { end: string; time: number } | undefined;
  for (const block of blocks) {
    if (latest && millis(block.start) - latest.time >= BREAK_MS) {
      result.push({ kind: "break", start: latest.end, end: block.start });
    }
    result.push({ kind: "lessons", block });
    const ends = millis(block.end);
    if (!Number.isNaN(ends) && (!latest || ends > latest.time)) {
      latest = { end: block.end, time: ends };
    }
  }
  return result;
}

/** Tells whether a day has anything of the parts shown. */
export function hasContent(view: DayView, show: Record<ShowKey, boolean>): boolean {
  return (
    (show.timetable && view.lessons.length > 0) ||
    (show.tasks && view.tasks.length > 0) ||
    (show.events && view.events.length > 0) ||
    (show.birthdays && view.birthdays.length > 0)
  );
}

/** Tells whether a day is shown: every weekday, and a Saturday or Sunday with something on it. */
export function isShown(view: DayView, show: Record<ShowKey, boolean>): boolean {
  return !isWeekend(view.day) || hasContent(view, show);
}

/**
 * Returns the day the card opens: today, unless today is a Saturday or Sunday with nothing on it
 * among `days`, then the Monday after.
 */
export function focusDay(
  today: string,
  days: readonly DayView[],
  show: Record<ShowKey, boolean>,
): string {
  const view = days.find((item) => item.day === today);
  if (!isWeekend(today) || (view !== undefined && hasContent(view, show))) return today;
  return addDays(today, weekday(today) === 6 ? 2 : 1);
}
