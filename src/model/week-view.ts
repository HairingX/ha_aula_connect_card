/**
 * The week card's view: each child's weeks day by day, with the days before today folded, the
 * focus day open, and a week whose school days are over collapsed.
 *
 * @packageDocumentation
 */

import type { ViewContext } from "../core/context.ts";
import { addDays, isWeekend, startOfWeek, weekNumber } from "../core/dates.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { CalendarEvent, Child, Day } from "../core/types.ts";
import {
  dayContent,
  planBlocks,
  visibleChips,
  type BlockPlan,
  type Chip,
  type DayContent,
} from "./blocks.ts";
import { childBases, dayIn, type ChildBasis, type ChildState, type Hold } from "./child.ts";
import type { DayViewOptions } from "./day-view.ts";
import { holidayOf, type DayView } from "./days.ts";
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
  /** Its chips. */
  readonly chips: readonly Chip[];
  /** "I dag" or "I morgen" on its row. */
  readonly relation: "today" | "tomorrow" | undefined;
  /** Whether the day is over. */
  readonly past: boolean;
}

/** A row of a week. */
export type WeekRow =
  | {
      /** The days before today, folded into one row. */
      readonly kind: "earlier";
      readonly days: readonly DayRowView[];
      /** Whether they are every weekday of the week. */
      readonly weekdays: boolean;
    }
  | {
      /** Today, once the focus has moved on, while school or an event is still to come. */
      readonly kind: "today";
      readonly row: DayRowView;
      readonly ends: string | undefined;
    }
  | { readonly kind: "focus"; readonly row: DayRowView; readonly focus: Focus }
  | { readonly kind: "day"; readonly row: DayRowView }
  | {
      /** Saturday and Sunday, when either has something on. */
      readonly kind: "weekend";
      readonly days: readonly DayRowView[];
    }
  | {
      /** The days one holiday covers without lessons. */
      readonly kind: "holiday";
      readonly event: CalendarEvent;
      readonly first: Day;
      readonly last: Day;
    };

/** A week of a child. */
export interface WeekSection {
  /** Its Monday. */
  readonly start: Day;
  /** Its ISO 8601 number. */
  readonly number: number;
  /** This week or next. */
  readonly relation: "this" | "next";
  /** Its rows, in date order after the folded days. */
  readonly rows: readonly WeekRow[];
  /** Whether nothing of it is to come but its weekend: the week is collapsed. */
  readonly collapsed: boolean;
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

function holidayDates(event: CalendarEvent, fallback: Day): { first: Day; last: Day } {
  const first = /^\d{4}-\d{2}-\d{2}$/.test(event.start) ? event.start : fallback;
  const end = /^\d{4}-\d{2}-\d{2}$/.test(event.end) ? addDays(event.end, -1) : first;
  return { first, last: end < first ? first : end };
}

function week(
  basis: ChildBasis,
  start: Day,
  options: WeekViewOptions,
  ctx: ViewContext,
): WeekSection {
  const { focus } = basis;
  const today = ctx.today;
  const views = basis.days.filter((view) => startOfWeek(view.day) === start);
  const row = (view: DayView): DayRowView => {
    const content = dayContent(view, basis.rules, ctx.now, view.day === today);
    return {
      day: view.day,
      content,
      plan: planBlocks(content, options.blocks),
      chips: visibleChips(content, options.blocks),
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
  const todayView = dayIn(basis, today);
  const left =
    focus.day !== today && todayView?.known && !isWeekend(today) && !holidays.has(today)
      ? todayRest(todayView, ctx.now)
      : undefined;
  const earlier: DayRowView[] = [];
  const rows: WeekRow[] = [];
  const weekend: DayRowView[] = [];
  let lastHoliday: CalendarEvent | undefined;
  for (const view of views) {
    const holiday = holidays.get(view.day);
    if (holiday && !over(holiday)) {
      if (lastHoliday?.id !== holiday.id) {
        rows.push({ kind: "holiday", event: holiday, ...holidayDates(holiday, view.day) });
      }
      lastHoliday = holiday;
      continue;
    }
    lastHoliday = undefined;
    if (isWeekend(view.day)) {
      if (view.events.length > 0 || (basis.rules.weekPlan && view.birthdays.length > 0)) {
        weekend.push(row(view));
      }
    } else if (view.day === focus.day) rows.push({ kind: "focus", row: row(view), focus });
    else if (view.day === today && left)
      rows.push({ kind: "today", row: row(view), ends: left.ends });
    else if (view.day <= today) earlier.push(row(view));
    else rows.push({ kind: "day", row: row(view) });
  }
  if (weekend.length > 0) rows.push({ kind: "weekend", days: weekend });
  const weekdays = views.filter((view) => !isWeekend(view.day)).length;
  const result: WeekRow[] =
    earlier.length > 0
      ? [{ kind: "earlier", days: earlier, weekdays: earlier.length === weekdays }, ...rows]
      : rows;
  return {
    start,
    number: weekNumber(start),
    relation: start === startOfWeek(today) ? "this" : "next",
    rows: result,
    collapsed: !rows.some(
      (item) => item.kind === "focus" || item.kind === "today" || item.kind === "day",
    ),
  };
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
      basis.state.kind === "ready" ? starts.map((start) => week(basis, start, options, ctx)) : [];
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
