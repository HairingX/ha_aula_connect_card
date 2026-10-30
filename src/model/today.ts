/**
 * The rest of today: once the focus has moved on, what is still to come today stays in one row,
 * as the time school ends is what a parent asks for around noon.
 *
 * @packageDocumentation
 */

import { instant } from "../core/dates.ts";
import type { CalendarEvent } from "../core/types.ts";
import type { Fact, TimedEvent } from "./blocks.ts";
import { isWholeDay, spanOn, type DayView } from "./days.ts";
import { isCancelled, mergeLessons, schoolHours, type LessonBlock } from "./lessons.ts";

/** What is left of today. */
export interface TodayRest {
  /** The lessons going on now. */
  readonly running: LessonBlock | undefined;
  /** When the last lesson held ends, while it has not. */
  readonly ends: string | undefined;
  /** Today's events at a time that have not ended, in the order they begin. */
  readonly events: readonly TimedEvent[];
  /** Today's events lasting the whole day and birthdays, on a day without school. */
  readonly facts: readonly Fact[];
}

function ended(end: string, start: string, now: Date): boolean {
  const at = instant(end) ?? instant(start);
  return at === undefined || at <= now;
}

/**
 * Returns what is left of today at `now`; undefined when nothing is. `facts` are the day's
 * whole-day events and birthdays to name, on a day without school; `timed` leaves out the
 * events at a time when false, as when the events are hidden.
 */
export function todayRest(
  view: DayView,
  now: Date,
  zone: string,
  facts: readonly Fact[] = [],
  timed = true,
): TodayRest | undefined {
  const running = mergeLessons(view.lessons.filter((lesson) => !isCancelled(lesson))).find(
    (block) => !ended(block.end, block.start, now) && (instant(block.start) ?? now) <= now,
  );
  const hours = schoolHours(view.lessons);
  const ends = hours && !ended(hours.end, hours.start, now) ? hours.end : undefined;
  const events = (timed ? view.events : [])
    .filter((event) => !isWholeDay(event, view.day, zone) && !ended(event.end, event.start, now))
    .map((event) => ({ event, span: spanOn(event, view.day, zone) }));
  if (!running && ends === undefined && events.length === 0 && facts.length === 0) return undefined;
  return { running, ends, events, facts };
}

/** Tells whether an event is going on at `now`, rather than still to come. */
export function isRunning(event: CalendarEvent, now: Date): boolean {
  const start = instant(event.start);
  return start !== undefined && start <= now && !ended(event.end, event.start, now);
}
