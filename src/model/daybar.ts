/**
 * The compact timetable: the day as a bar from its first lesson to its last, a lane of lessons
 * and a lane for each lesson at the time of another that is not merged into it, then a lane for
 * the events with a time and one for each event of the whole day.
 *
 * @packageDocumentation
 */

import { instant, localTime } from "../core/dates.ts";
import type { CalendarEvent } from "../core/types.ts";
import type { LessonRow, TimedEvent, TimetableRow } from "./blocks.ts";
import { BREAK_MS } from "./lessons.ts";

/** Something on the bar, from one minute of the day to another. */
export type BarItem =
  | {
      /** Lessons of one subject in a row, with the subjects merged into them. */
      readonly kind: "lesson";
      /** The lessons. */
      readonly row: LessonRow;
      /** When they begin, in minutes since midnight. */
      readonly from: number;
      /** When they end. */
      readonly to: number;
    }
  | {
      /** An event with a time. */
      readonly kind: "event";
      /** The event. */
      readonly event: CalendarEvent;
      /** When it begins on the day, in minutes since midnight. */
      readonly from: number;
      /** When it ends on the day. */
      readonly to: number;
    };

/** The day as a bar. */
export interface DayBar {
  /** Where the bar begins, in minutes since midnight. */
  readonly start: number;
  /** Where it ends. */
  readonly end: number;
  /** When it begins, as the ISO 8601 time of what begins it; undefined with no time of day. */
  readonly from: string | undefined;
  /** When it ends, likewise. */
  readonly until: string | undefined;
  /** The lanes, the lessons' first, then the events'. */
  readonly lanes: readonly (readonly BarItem[])[];
  /** The events of the whole day, a lane each under the others. */
  readonly allDay: readonly CalendarEvent[];
  /** The full hours between the bar's ends. */
  readonly hours: readonly number[];
  /** The minute it is now, while it is within the bar on its day. */
  readonly now: number | undefined;
}

const DAY = 24 * 60;

function minuteOf(text: string, zone: string): number {
  const at = instant(text);
  return at ? localTime(at, zone).minute : 0;
}

function alike(a: LessonRow, b: LessonRow): boolean {
  return a.cancelled === b.cancelled && JSON.stringify(a.status) === JSON.stringify(b.status);
}

type Lesson = Extract<BarItem, { kind: "lesson" }>;

function join(host: Lesson, guest: LessonRow): Lesson {
  const keys = new Set([host.row.subject, ...host.row.also].map((subject) => subject.key));
  const added = [guest.subject, ...guest.also].filter((subject) => !keys.has(subject.key));
  return { ...host, row: { ...host.row, also: [...host.row.also, ...added] } };
}

/**
 * Returns the lessons as the bar has them: each lesson at the time of another goes into it as
 * its subject says, where they overlap, at the very same time or never; then a subject's lessons
 * with no break between them are one.
 */
export function barLessons(rows: readonly TimetableRow[], zone: string): Lesson[] {
  const kept: Lesson[] = [];
  const guests: Lesson[] = [];
  for (const row of rows) {
    if (row.kind !== "lesson") continue;
    const item: Lesson = {
      kind: "lesson",
      row,
      from: minuteOf(row.block.start, zone),
      to: minuteOf(row.block.end, zone),
    };
    if (row.subject.merge === "overlap") {
      guests.push(item);
      continue;
    }
    const index =
      row.subject.merge === "equal"
        ? kept.findIndex(
            (host) => host.from === item.from && host.to === item.to && alike(host.row, row),
          )
        : -1;
    const host = kept[index];
    if (host) kept[index] = join(host, row);
    else kept.push(item);
  }
  // A lesson that joins where it overlaps goes into every lesson it overlaps, once they are known.
  for (const guest of guests) {
    const hosts = kept.filter(
      (host) => host.from < guest.to && guest.from < host.to && alike(host.row, guest.row),
    );
    if (hosts.length === 0) kept.push(guest);
    for (const host of hosts) kept[kept.indexOf(host)] = join(host, guest.row);
  }
  const joined: Lesson[] = [];
  for (const item of kept.sort((a, b) => a.from - b.from)) {
    const index = joined.findLastIndex(
      (before) =>
        before.row.subject.key === item.row.subject.key &&
        alike(before.row, item.row) &&
        item.from >= before.to &&
        (item.from - before.to) * 60_000 < BREAK_MS,
    );
    const before = joined[index];
    if (before) {
      const block = { ...before.row.block, end: item.row.block.end };
      joined[index] = join({ ...before, to: item.to, row: { ...before.row, block } }, item.row);
    } else joined.push(item);
  }
  return joined;
}

// Each item in the first lane where the one before it has ended.
function lanes<Item extends BarItem>(items: readonly Item[]): Item[][] {
  const result: Item[][] = [];
  const ends: number[] = [];
  for (const item of [...items].sort((a, b) => a.from - b.from)) {
    const index = ends.findIndex((end) => end <= item.from);
    const lane = result[index];
    if (lane) lane.push(item);
    else result.push([item]);
    ends[index < 0 ? result.length - 1 : index] = item.to;
  }
  return result;
}

/**
 * Builds a day's bar from its lessons and events; one with no time of day, its ends undefined,
 * when it has only events lasting the whole day.
 */
export function dayBar(
  rows: readonly TimetableRow[],
  timed: readonly TimedEvent[],
  allDay: readonly CalendarEvent[],
  zone: string,
  now: Date | undefined,
): DayBar {
  const lessons = barLessons(rows, zone);
  const events = timed.map(({ event, span }): Extract<BarItem, { kind: "event" }> => ({
    kind: "event",
    event,
    from: span === "until" ? 0 : minuteOf(event.start, zone),
    to: span === "from" ? DAY : minuteOf(event.end, zone),
  }));
  // An event running on from another day, or into the next, says nothing of the day's ends.
  const marks = [
    ...lessons.flatMap((item): [number, string][] => [
      [item.from, item.row.block.start],
      [item.to, item.row.block.end],
    ]),
    ...events.flatMap((item): [number, string][] => [
      [item.from, item.event.start],
      [item.to, item.event.end],
    ]),
  ]
    .filter(([minute]) => minute > 0 && minute < DAY)
    .sort((a, b) => a[0] - b[0]);
  // A day of events lasting the whole of it only has their lanes.
  const first = marks[0];
  const last = marks.at(-1);
  const start = first?.[0] ?? 0;
  const end = last?.[0] ?? DAY;
  const clamp = (item: BarItem): BarItem => ({
    ...item,
    from: Math.max(start, item.from),
    to: Math.min(end, item.to),
  });
  const minute = now && localTime(now, zone).minute;
  const hours: number[] = [];
  if (first)
    for (let hour = Math.floor(start / 60) + 1; hour * 60 < end; hour++) hours.push(hour * 60);
  return {
    start,
    end,
    from: first?.[1],
    until: last?.[1],
    lanes: [...lanes(lessons), ...lanes(events.map(clamp))],
    allDay,
    hours,
    now: minute !== undefined && minute >= start && minute <= end ? minute : undefined,
  };
}
