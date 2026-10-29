/**
 * Bridge rows: one line for each stretch of days passed over between today and the focus day,
 * so that a jump to Monday, or past a holiday, explains itself.
 *
 * @packageDocumentation
 */

import { addDays, isDay, isWeekend } from "../core/dates.ts";
import type { Birthday, CalendarEvent, Day } from "../core/types.ts";
import { holidayOf, type DayView } from "./days.ts";
import type { Focus } from "./focus.ts";

/** Something on a weekend day. */
export type BridgeItem =
  | { readonly kind: "event"; readonly event: CalendarEvent; readonly day: Day }
  | { readonly kind: "birthday"; readonly birthday: Birthday; readonly day: Day };

/** A line for days passed over. */
export type BridgeRow =
  | {
      /** Days one holiday covers; its own first and last day, even beyond the range. */
      readonly kind: "holiday";
      readonly event: CalendarEvent;
      readonly first: Day;
      readonly last: Day;
      readonly days: readonly Day[];
    }
  | {
      /** A Saturday, a Sunday, or both, with something on. */
      readonly kind: "weekend";
      readonly days: readonly Day[];
      readonly items: readonly BridgeItem[];
    }
  | {
      /** Weekdays in a row without school. */
      readonly kind: "empty";
      readonly days: readonly Day[];
    };

function holidayDates(event: CalendarEvent, day: Day): { first: Day; last: Day } {
  const first = isDay(event.start) ? event.start : day;
  const last = isDay(event.end) && event.end > first ? addDays(event.end, -1) : first;
  return { first, last };
}

/**
 * Returns the bridge rows for the days the focus passed over, in date order. Today counts only
 * when a holiday covers it: the rest of today has its own row. A weekend with nothing on it gets
 * no row; everyone knows what a weekend is.
 */
export function bridgeRows(days: readonly DayView[], focus: Focus): BridgeRow[] {
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
        rows.push({ kind: "holiday", event: holiday, ...holidayDates(holiday, day), days: [day] });
    } else if (day === focus.today) {
      continue;
    } else if (isWeekend(day)) {
      const items: BridgeItem[] = [
        ...view.events.map((event) => ({ kind: "event" as const, event, day })),
        ...view.birthdays.map((birthday) => ({ kind: "birthday" as const, birthday, day })),
      ];
      if (items.length === 0) continue;
      if (last?.kind === "weekend" && follows) {
        rows[rows.length - 1] = {
          ...last,
          days: [...last.days, day],
          items: [...last.items, ...items],
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
