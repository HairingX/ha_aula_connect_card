/**
 * The homework card's view: each child's homework by the day it is for, from the focus day on,
 * with the earlier days folded away.
 *
 * @packageDocumentation
 */

import type { ViewContext } from "../core/context.ts";
import { addDays, startOfWeek, weekNumber } from "../core/dates.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { Child, Day } from "../core/types.ts";
import { dayContent } from "./blocks.ts";
import { childBases, type ChildState, type Hold, type ViewOptions } from "./child.ts";
import type { Focus } from "./focus.ts";
import type { NoteView } from "./notes.ts";

/** The homework for one day. */
export interface HomeworkGroup {
  /** The day the homework is for. */
  readonly day: Day;
  /** How the day is titled: "I dag", "I morgen", or its weekday. */
  readonly relation: "today" | "tomorrow" | "weekday";
  /** The week's number, on the first group of a week after this one. */
  readonly week: number | undefined;
  /** The homework, in the order of the day's timetable. */
  readonly items: readonly NoteView[];
}

/** A child's homework. */
export interface HomeworkChildView {
  /** The child. */
  readonly child: Child;
  /** Whether the child can be shown. */
  readonly state: ChildState;
  /** The child's focus day. */
  readonly focus: Focus;
  /** Whether the school has a week plan, without which there is no homework to show. */
  readonly weekPlan: boolean;
  /** The focus day, always, then each later day with homework. */
  readonly groups: readonly HomeworkGroup[];
  /** The weeks after this one in the range with nothing in the week plan yet. */
  readonly notYet: readonly number[];
  /** The days before the focus day with homework. */
  readonly earlier: readonly HomeworkGroup[];
  /** The number of homework notes on the earlier days. */
  readonly earlierCount: number;
}

/** The homework card's view. */
export interface HomeworkCardView {
  /** The children shown, in order. */
  readonly children: readonly HomeworkChildView[];
  /** The configured child ids no child has. */
  readonly missing: readonly number[];
  /** Whether the children go to different schools. */
  readonly differentSchools: boolean;
  /** The card's height in units of 50 pixels, roughly, for the masonry view. */
  readonly size: number;
}

/** Builds the homework card's view. */
export function homeworkCardView(
  snapshot: StoreSnapshot,
  options: ViewOptions,
  ctx: ViewContext,
  hold: Hold,
): HomeworkCardView {
  const { bases, missing } = childBases(snapshot, options, ctx, hold);
  const thisWeek = startOfWeek(ctx.today);
  const children = bases.map((basis): HomeworkChildView => {
    const { focus } = basis;
    const empty = {
      child: basis.child,
      state: basis.state,
      focus,
      weekPlan: basis.rules.weekPlan,
      groups: [],
      notYet: [],
      earlier: [],
      earlierCount: 0,
    };
    if (basis.state.kind !== "ready" || !basis.rules.weekPlan) return empty;
    const weeksShown = new Set<Day>();
    const group = (day: Day, items: readonly NoteView[]): HomeworkGroup => {
      const week = startOfWeek(day);
      const first = week !== thisWeek && !weeksShown.has(week);
      weeksShown.add(week);
      return {
        day,
        relation:
          day === ctx.today ? "today" : day === addDays(ctx.today, 1) ? "tomorrow" : "weekday",
        week: first ? weekNumber(day) : undefined,
        items,
      };
    };
    const homework = (day: Day): readonly NoteView[] => {
      const view = basis.days.find((item) => item.day === day);
      return view ? dayContent(view, basis.rules, ctx.now, false).homework : [];
    };
    const known = basis.days.filter((view) => view.known);
    const groups: HomeworkGroup[] = [];
    const earlier: HomeworkGroup[] = [];
    const cutoff = focus.day ?? addDays(focus.horizon ?? ctx.today, 1);
    for (const view of known) {
      const items = homework(view.day);
      if (view.day === focus.day) groups.push(group(view.day, items));
      else if (view.day > cutoff && items.length > 0) groups.push(group(view.day, items));
    }
    for (const view of known) {
      const items = homework(view.day);
      if (view.day < cutoff && items.length > 0) earlier.push(group(view.day, items));
    }
    const notYet = [...new Set(known.map((view) => startOfWeek(view.day)))]
      .filter(
        (week) =>
          week > thisWeek &&
          !known.some((view) => startOfWeek(view.day) === week && view.notes.length > 0),
      )
      .map((week) => weekNumber(week));
    return {
      ...empty,
      groups,
      notYet,
      earlier,
      earlierCount: earlier.reduce((sum, item) => sum + item.items.length, 0),
    };
  });
  const items = children.reduce(
    (sum, child) => sum + child.groups.reduce((count, item) => count + item.items.length, 0),
    0,
  );
  const days = children.reduce((sum, child) => sum + child.groups.length, 0);
  return {
    children,
    missing,
    differentSchools: new Set(bases.map((basis) => basis.child.institution_name)).size > 1,
    size: bases.some((basis) => basis.state.kind === "ready")
      ? Math.min(30, 2 + days + 2 * items)
      : 6,
  };
}
