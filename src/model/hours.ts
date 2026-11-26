/**
 * The institutions' hours: for each school or institution the children go to, its hours this
 * week and next, the days alike told once, and the days it is closed ahead.
 *
 * @packageDocumentation
 */

import { addDays, isWeekend, startOfWeek } from "../core/dates.ts";
import type { Child, ClosedDays, Day, OpeningDay, OpeningHours } from "../core/types.ts";

/** The days asked for: this week and next. */
export const HOURS_DAYS = 14;

/** Days alike in a week: open the same hours, or closed for the same reason. */
export interface HoursSpan {
  /** The first day. */
  readonly first: Day;
  /** The last day, included. */
  readonly last: Day;
  /** Whether it is closed on these days. */
  readonly closed: boolean;
  /** Why it is closed, as the institution names it; empty when it names nothing. */
  readonly name: string;
  /** When it opens, "HH:MM"; null when closed or not said. */
  readonly open: string | null;
  /** When it closes, "HH:MM"; null when closed or not said. */
  readonly close: string | null;
  /** Whether today is one of the days. */
  readonly today: boolean;
}

/** One institution's hours, as the card shows them. */
export interface Place {
  /** The institution's name. */
  readonly institution: string;
  /** The children who go there. */
  readonly children: readonly Child[];
  /** Today's hours; undefined when Aula told none. */
  readonly today: HoursSpan | undefined;
  /** This week's days, the days alike together. */
  readonly thisWeek: readonly HoursSpan[];
  /** Next week's days, the days alike together. */
  readonly nextWeek: readonly HoursSpan[];
  /** The periods it is closed from today on, the soonest first. */
  readonly closed: readonly ClosedDays[];
}

/** The institutions' hours. */
export interface HoursView {
  /** Each institution once. */
  readonly places: readonly Place[];
  /** Whether a child's hours are still on their way, and none has come. */
  readonly loading: boolean;
  /** Why a child's hours could not be read. */
  readonly errors: readonly unknown[];
  /** Whether more than one child is shown, so that each institution says whose it is. */
  readonly several: boolean;
}

/** What came of one child's hours. */
export interface ChildHours {
  /** The child. */
  readonly child: Child;
  /** The hours that came; undefined until they have. */
  readonly data: OpeningHours | undefined;
  /** Why the last request failed. */
  readonly error: unknown;
  /** Whether a request is on its way. */
  readonly loading: boolean;
}

/** Returns the first and last day to ask for: Monday this week to Sunday next week. */
export function hoursPeriod(today: Day): { start: Day; end: Day } {
  const start = startOfWeek(today);
  return { start, end: addDays(start, HOURS_DAYS - 1) };
}

function closedName(day: Day, closed: readonly ClosedDays[]): string {
  return closed.find((period) => period.start <= day && day <= period.end)?.name ?? "";
}

function spans(
  days: readonly OpeningDay[],
  closed: readonly ClosedDays[],
  first: Day,
  today: Day,
): HoursSpan[] {
  const byDay = new Map(days.map((day) => [day.date, day]));
  const found: HoursSpan[] = [];
  for (let n = 0; n < 7; n += 1) {
    const date = addDays(first, n);
    const day = byDay.get(date);
    const name = closedName(date, closed);
    // A weekend the institution is closed, as most are, is no news; a weekday Aula tells nothing
    // of is left out rather than guessed.
    if (!day || (isWeekend(date) && day.closed && !name)) continue;
    const span: HoursSpan = {
      first: date,
      last: date,
      closed: day.closed,
      name: day.closed ? name : "",
      open: day.open,
      close: day.close,
      today: date === today,
    };
    const last = found.at(-1);
    if (
      last &&
      addDays(last.last, 1) === date &&
      last.closed === span.closed &&
      last.name === span.name &&
      last.open === span.open &&
      last.close === span.close
    ) {
      found[found.length - 1] = { ...last, last: date, today: last.today || span.today };
    } else {
      found.push(span);
    }
  }
  return found;
}

function same(a: OpeningHours, b: OpeningHours): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Returns the institutions' hours: children at the same institution, told the same hours,
 * share it.
 */
export function hoursView(loads: readonly ChildHours[], today: Day): HoursView {
  const groups: { institution: string; data: OpeningHours; children: Child[] }[] = [];
  for (const load of loads) {
    if (!load.data) continue;
    const institution = load.child.institution_name;
    const data = load.data;
    const known = groups.find(
      (group) => group.institution === institution && same(group.data, data),
    );
    if (known) {
      known.children.push(load.child);
    } else {
      groups.push({ institution, data, children: [load.child] });
    }
  }
  const monday = startOfWeek(today);
  const told = groups.map(({ institution, data, children }): Place => {
    const closed = data.closed_days
      .filter((period) => period.end >= today)
      .sort((a, b) => a.start.localeCompare(b.start));
    const thisWeek = spans(data.days, closed, monday, today);
    return {
      institution,
      children,
      today: thisWeek.find((span) => span.today),
      thisWeek,
      nextWeek: spans(data.days, closed, addDays(monday, 7), today),
      closed,
    };
  });
  // An institution Aula tells nothing of, for these two weeks or ahead, is left out.
  const places = told.filter(
    (place) => place.thisWeek.length + place.nextWeek.length + place.closed.length > 0,
  );
  return {
    places,
    loading: places.length === 0 && loads.some((load) => load.loading),
    errors: loads.flatMap((load) =>
      load.error !== undefined && load.data === undefined ? [load.error] : [],
    ),
    several: loads.length > 1,
  };
}
