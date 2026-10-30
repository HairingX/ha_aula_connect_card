/**
 * The week card's view: each child's weeks day by day, with the days that are over folded, the
 * focus day open, and the weekend one row.
 *
 * @packageDocumentation
 */

import type { ViewContext } from "../core/context.ts";
import { addDays, isWeekend, startOfWeek, weekday, weekNumber } from "../core/dates.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { CalendarEvent, Child, Day } from "../core/types.ts";
import {
  dayContent,
  planBlocks,
  visibleFacts,
  type BlockPlan,
  type DayContent,
  type Fact,
} from "./blocks.ts";
import { childBases, dayIn, type ChildBasis, type ChildState, type Hold } from "./child.ts";
import type { DayViewOptions } from "./day-view.ts";
import { heldLessons, holidayOf, holidaySpan, type DayView } from "./days.ts";
import type { Focus } from "./focus.ts";
import { todayRest } from "./today.ts";

/** What the week card's view takes from its configuration. */
export interface WeekViewOptions extends DayViewOptions {
  /** 1: the week of the focus day, after this week when it is next week; 2: this week and next. */
  readonly weeks: 1 | 2;
}

/** A day of a week, closed or open. */
export interface DayRowView {
  /** The day. */
  readonly day: Day;
  /** What its blocks show. */
  readonly content: DayContent;
  /** Its blocks, when opened. */
  readonly plan: BlockPlan;
  /** Its events lasting the whole day, and birthdays. */
  readonly facts: readonly Fact[];
  /** "I dag" or "I morgen" on its row. */
  readonly relation: "today" | "tomorrow" | undefined;
  /** Whether the day is over. */
  readonly past: boolean;
}

/** Which days a fold of the days that are over holds, when they make a whole. */
export type FoldSpan = "weekdays" | "toSaturday" | "week";

/** A row of a week. */
export type WeekRow =
  | {
      /** The days that are over, folded into one row. */
      readonly kind: "earlier";
      /** The days. */
      readonly days: readonly [DayRowView, ...DayRowView[]];
      /** Whether they are Monday to Friday, to Saturday, or the whole week. */
      readonly span: FoldSpan | undefined;
    }
  | {
      /** Today, once the focus has moved on, while school or an event is still to come. */
      readonly kind: "today";
      /** The day. */
      readonly row: DayRowView;
      /** When school ends, while it has not. */
      readonly ends: string | undefined;
    }
  | {
      /** The focus day, open. */
      readonly kind: "focus";
      /** The day. */
      readonly row: DayRowView;
      /** The focus. */
      readonly focus: Focus;
    }
  | {
      /** A day still to come, closed. */
      readonly kind: "day";
      /** The day. */
      readonly row: DayRowView;
    }
  | {
      /** Saturday and Sunday still to come, when either has something on. */
      readonly kind: "weekend";
      /** The days with something on. */
      readonly days: readonly [DayRowView, ...DayRowView[]];
      /** Whether one of them is today, with something still on. */
      readonly today: boolean;
    }
  | {
      /** The days one holiday covers without lessons. */
      readonly kind: "holiday";
      /** The holiday. */
      readonly event: CalendarEvent;
      /** Its own first day; on the week after its first row, the first of that week's days. */
      readonly first: Day;
      /** Its own last day; on the week after its first row, the last of that week's days. */
      readonly last: Day;
      /** Whether it covers today. */
      readonly today: boolean;
      /** Whether it goes on from the week before and covers the whole of this one. */
      readonly whole: boolean;
    };

/** A week of a child. */
export interface WeekSection {
  /** Its Monday. */
  readonly start: Day;
  /** Its ISO 8601 number. */
  readonly number: number;
  /** This week or next. */
  readonly relation: "this" | "next";
  /** Whether the data does not cover it yet: it is loading, not empty. */
  readonly loading: boolean;
  /** Its rows, in date order after the folded days. */
  readonly rows: readonly WeekRow[];
  /** Its number, when its week plan is not in Aula yet and no open day says so. */
  readonly notYet: number | undefined;
}

/** A child's weeks. */
export interface WeekChildView {
  /** The child. */
  readonly child: Child;
  /** Whether the child can be shown. */
  readonly state: ChildState;
  /** The child's focus day. */
  readonly focus: Focus;
  /** The weeks shown. */
  readonly weeks: readonly WeekSection[];
}

/** The week card's view. */
export interface WeekCardView {
  /** The children shown, in order. */
  readonly children: readonly WeekChildView[];
  /** The configured child ids no child has. */
  readonly missing: readonly number[];
  /** Whether the children go to different schools. */
  readonly differentSchools: boolean;
  /** The card's height in units of 50 pixels, roughly, for the masonry view. */
  readonly size: number;
}

function span(days: readonly DayRowView[], weekdays: number): FoldSpan | undefined {
  const weekend = days.filter((row) => isWeekend(row.day));
  if (days.length - weekend.length < weekdays) return undefined;
  if (weekend.length === 0) return "weekdays";
  if (weekend.length === 2) return "week";
  return weekend.some((row) => weekday(row.day) === 6) ? "toSaturday" : undefined;
}

function week(
  basis: ChildBasis,
  start: Day,
  options: WeekViewOptions,
  ctx: ViewContext,
): WeekSection {
  const { focus, rules } = basis;
  const today = ctx.today;
  const views = basis.days.filter((view) => startOfWeek(view.day) === start);
  const section = {
    start,
    number: weekNumber(start),
    relation: start === startOfWeek(today) ? ("this" as const) : ("next" as const),
  };
  if (views.some((view) => !view.known)) {
    return { ...section, loading: true, rows: [], notYet: undefined };
  }
  const row = (view: DayView): DayRowView => {
    const content = dayContent(view, rules, ctx.now, view.day === today);
    return {
      day: view.day,
      content,
      plan: planBlocks(content, options.blocks),
      facts: visibleFacts(content, options.blocks),
      relation:
        view.day === today ? "today" : view.day === addDays(today, 1) ? "tomorrow" : undefined,
      past: view.day < today,
    };
  };
  // A holiday's days without lessons are one row, unless the holiday is over.
  const holidays = new Map<Day, CalendarEvent>();
  for (const view of views) {
    const holiday = holidayOf(view);
    if (holiday && view.lessons.length === 0) holidays.set(view.day, holiday);
  }
  const over = (event: CalendarEvent): boolean =>
    [...holidays].filter(([, item]) => item.id === event.id).every(([day]) => day < today);
  const events = options.blocks.includes("events");
  const todayView = dayIn(basis, today);
  const left =
    focus.day !== today &&
    todayView?.known &&
    (!isWeekend(today) || heldLessons(todayView)) &&
    !holidays.has(today)
      ? todayRest(todayView, ctx.now, ctx.zone, [], events)
      : undefined;
  const earlier: DayRowView[] = [];
  const rows: WeekRow[] = [];
  const weekend: DayRowView[] = [];
  let weekendToday = false;
  let lastHoliday: CalendarEvent | undefined;
  for (const view of views) {
    const holiday = holidays.get(view.day);
    if (holiday && !over(holiday)) {
      if (lastHoliday?.id !== holiday.id) {
        rows.push({
          kind: "holiday",
          event: holiday,
          ...holidaySpan(holiday, view.day),
          today: holidays.get(today)?.id === holiday.id,
          whole: false,
        });
      }
      lastHoliday = holiday;
      continue;
    }
    lastHoliday = undefined;
    if (view.day === focus.day) {
      rows.push({ kind: "focus", row: row(view), focus });
    } else if (isWeekend(view.day) && !heldLessons(view)) {
      // A weekend day with nothing on it is left out; one that is over joins the fold.
      const item = row(view);
      const timed = item.plan.blocks.some((block) => block.id === "events");
      if (item.facts.length === 0 && !timed) continue;
      const current =
        view.day === today && todayRest(view, ctx.now, ctx.zone, item.facts, events) !== undefined;
      if (view.day < today || (view.day === today && !current)) earlier.push(item);
      else {
        weekend.push(item);
        weekendToday ||= current;
      }
    } else if (view.day === today && left) {
      rows.push({ kind: "today", row: row(view), ends: left.ends });
    } else if (view.day <= today) earlier.push(row(view));
    else rows.push({ kind: "day", row: row(view) });
  }
  const [saturday, ...sunday] = weekend;
  if (saturday) rows.push({ kind: "weekend", days: [saturday, ...sunday], today: weekendToday });
  const weekdays = views.filter((view) => !isWeekend(view.day)).length;
  const focused = focus.day !== undefined && startOfWeek(focus.day) === start;
  const [first, ...later] = earlier;
  return {
    ...section,
    loading: false,
    rows: first
      ? [{ kind: "earlier", days: [first, ...later], span: span(earlier, weekdays) }, ...rows]
      : rows,
    notYet: rules.planMissing.has(start) && !focused ? section.number : undefined,
  };
}

/**
 * Returns a child's weeks with a holiday that goes on from one shown week into the next: its
 * first row keeps its own dates, and the next week's row the days of that week it covers.
 */
function continued(weeks: readonly WeekSection[]): WeekSection[] {
  const shown = new Set(
    weeks
      .slice(0, 1)
      .flatMap((section) => section.rows)
      .flatMap((row) => (row.kind === "holiday" ? [row.event.id] : [])),
  );
  return weeks.map((section, index) => {
    if (index === 0) return section;
    const end = addDays(section.start, 6);
    return {
      ...section,
      // A holiday shown the week before began before this week's Monday.
      rows: section.rows.map((row): WeekRow => {
        if (row.kind !== "holiday" || !shown.has(row.event.id)) return row;
        const to = row.last < end ? row.last : end;
        return { ...row, first: section.start, last: to, whole: to === end };
      }),
    };
  });
}

/** Builds the week card's view. */
export function weekCardView(
  snapshot: StoreSnapshot,
  options: WeekViewOptions,
  ctx: ViewContext,
  hold: Hold,
): WeekCardView {
  const { bases, missing } = childBases(snapshot, options, ctx, hold);
  const thisWeek = startOfWeek(ctx.today);
  const nextWeek = addDays(thisWeek, 7);
  let rows = 0;
  const children = bases.map((basis): WeekChildView => {
    const focusWeek = basis.focus.day === undefined ? thisWeek : startOfWeek(basis.focus.day);
    const starts =
      options.weeks === 2 || focusWeek === nextWeek ? [thisWeek, nextWeek] : [thisWeek];
    const weeks =
      basis.state.kind === "ready"
        ? continued(starts.map((start) => week(basis, start, options, ctx)))
        : [];
    for (const section of weeks) {
      for (const item of section.rows) {
        rows++;
        if (item.kind === "focus") {
          const { timetable, homework, plan } = item.row.content;
          rows +=
            timetable.filter((entry) => entry.kind === "lesson").length +
            2 * (homework.length + plan.length);
        }
      }
    }
    return { child: basis.child, state: basis.state, focus: basis.focus, weeks };
  });
  return {
    children,
    missing,
    differentSchools: new Set(bases.map((basis) => basis.child.institution_name)).size > 1,
    size: bases.some((basis) => basis.state.kind === "ready") ? 3 + rows : 3 + 7 * options.weeks,
  };
}
