/**
 * Bridge rows: one line for each stretch of days passed over between today and the focus day,
 * so that a jump to Monday, or past a holiday, explains itself.
 *
 * @packageDocumentation
 */

import { addDays, isWeekend } from "../core/dates.ts";
import type { Birthday, CalendarEvent, Day } from "../core/types.ts";
import { holidayOf, holidaySpan, type DayView } from "./days.ts";
import type { Focus } from "./focus.ts";

/** Something on a weekend day. */
export type BridgeItem =
  | {
      /** An event. */
      readonly kind: "event";
      /** The event. */
      readonly event: CalendarEvent;
      /** The day it is on. */
      readonly day: Day;
    }
  | {
      /** A birthday. */
      readonly kind: "birthday";
      /** The birthday. */
      readonly birthday: Birthday;
      /** The day it is on. */
      readonly day: Day;
    };

/** A line for days passed over. */
export type BridgeRow =
  | {
      /** Days one holiday covers. */
      readonly kind: "holiday";
      /** The holiday. */
      readonly event: CalendarEvent;
      /** Its own first day, even before the range. */
      readonly first: Day;
      /** Its own last day, even beyond the range. */
      readonly last: Day;
      /** The days passed over that it covers. */
      readonly days: readonly Day[];
    }
  | {
      /** A Saturday, a Sunday, or both, with something on. */
      readonly kind: "weekend";
      /** The days. */
      readonly days: readonly Day[];
      /** What is on them. */
      readonly items: readonly BridgeItem[];
    }
  | {
      /** Weekdays in a row without school. */
      readonly kind: "empty";
      /** The days. */
      readonly days: readonly Day[];
    };

/**
 * Returns the bridge rows for the days the focus passed over, in date order. Today counts only
 * when a holiday covers it: the rest of today has its own row, and an event `named` there gets
 * no later row. A weekend with nothing on it gets no row; everyone knows what a weekend is.
 */
export function bridgeRows(
  days: readonly DayView[],
  focus: Focus,
  named: ReadonlySet<CalendarEvent["id"]> = new Set(),
): BridgeRow[] {
  const byDay = new Map(days.map((view) => [view.day, view]));
  const rows: BridgeRow[] = [];
  for (const day of focus.skipped) {
    const view = byDay.get(day);
    if (!view) continue;
    const last = rows[rows.length - 1];
    const follows = last?.days[last.days.length - 1] === addDays(day, -1);
    const holiday = holidayOf(view);
    if (holiday) {
      if (last?.kind === "holiday" && last.event.id === holiday.id) {
        rows[rows.length - 1] = { ...last, days: [...last.days, day] };
      } else
        rows.push({ kind: "holiday", event: holiday, ...holidaySpan(holiday, day), days: [day] });
    } else if (day === focus.today) {
      continue;
    } else if (isWeekend(day)) {
      const joined = last?.kind === "weekend" && follows ? last : undefined;
      // An event over both days of a weekend is one item.
      const seen = new Set(joined?.items.map((item) => item.kind === "event" && item.event.id));
      const items: BridgeItem[] = [
        ...view.events
          .filter((event) => !named.has(event.id) && !seen.has(event.id))
          .map((event) => ({ kind: "event" as const, event, day })),
        ...view.birthdays.map((birthday) => ({ kind: "birthday" as const, birthday, day })),
      ];
      const continues = view.events.some((event) => seen.has(event.id));
      if (items.length === 0 && !continues) continue;
      if (joined) {
        rows[rows.length - 1] = {
          ...joined,
          days: [...joined.days, day],
          items: [...joined.items, ...items],
        };
      } else rows.push({ kind: "weekend", days: [day], items });
    } else if (last?.kind === "empty" && follows) {
      rows[rows.length - 1] = { ...last, days: [...last.days, day] };
    } else rows.push({ kind: "empty", days: [day] });
  }
  return rows;
}

/** The most rows above a day's header, the rest-of-today row included. */
export const MAX_ROWS_ABOVE = 3;

/**
 * Cuts bridge rows to fit `MAX_ROWS_ABOVE` beside the rest-of-today row: when they do not fit,
 * the last kept row gives way to a count of the days left out.
 */
export function fitRows(
  rows: readonly BridgeRow[],
  todayRow: boolean,
): { rows: readonly BridgeRow[]; moreDays: number } {
  const room = MAX_ROWS_ABOVE - (todayRow ? 1 : 0);
  if (rows.length <= room) return { rows, moreDays: 0 };
  const kept = rows.slice(0, room - 1);
  const moreDays = rows.slice(room - 1).reduce((sum, row) => sum + row.days.length, 0);
  return { rows: kept, moreDays };
}
