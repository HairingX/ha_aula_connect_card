/**
 * The rest of today: once the focus has moved on, what is still to come today stays in one row,
 * as the time school ends is what a parent asks for around noon.
 *
 * @packageDocumentation
 */

import { instant } from "../core/dates.ts";
import type { CalendarEvent } from "../core/types.ts";
import type { DayView } from "./days.ts";
import { mergeLessons, schoolHours, type LessonBlock } from "./lessons.ts";

/** What is left of today. */
export interface TodayRest {
  /** The lessons going on now. */
  readonly running: LessonBlock | undefined;
  /** When the last lesson ends, while it has not. */
  readonly ends: string | undefined;
  /** Today's timed events that have not ended, in the order they begin. */
  readonly events: readonly CalendarEvent[];
}

function ended(end: string, start: string, now: Date): boolean {
  const at = instant(end) ?? instant(start);
  return at === undefined || at <= now;
}

/** Returns what is left of today at `now`; undefined when nothing is. All-day events are not in it. */
export function todayRest(view: DayView, now: Date): TodayRest | undefined {
  const running = mergeLessons(view.lessons).find(
    (block) => !ended(block.end, block.start, now) && (instant(block.start) ?? now) <= now,
  );
  const hours = schoolHours(view.lessons);
  const ends = hours && !ended(hours.end, hours.start, now) ? hours.end : undefined;
  const events = view.events.filter(
    (event) => !event.all_day && !ended(event.end, event.start, now),
  );
  if (!running && ends === undefined && events.length === 0) return undefined;
  return { running, ends, events };
}

/** Tells whether an event is going on at `now`, rather than still to come. */
export function isRunning(event: CalendarEvent, now: Date): boolean {
  const start = instant(event.start);
  return start !== undefined && start <= now && !ended(event.end, event.start, now);
}
