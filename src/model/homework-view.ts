/**
 * The week plan card's view: the notes it shows by the day they are for, each day with a part
 * for each child, from the focus day on, with the earlier days folded away.
 *
 * @packageDocumentation
 */

import type { ViewContext } from "../core/context.ts";
import { addDays, startOfWeek, weekNumber } from "../core/dates.ts";
import type { StoreSnapshot } from "../core/store.ts";
import { childKey, type Child, type ChildKey, type Day } from "../core/types.ts";
import { commentsOf, homeworkOf } from "./blocks.ts";
import { childBases, type ChildState, type Hold, type ViewOptions } from "./child.ts";
import { heroKey, noSchoolHero, type NoSchoolHero } from "./day-view.ts";
import type { Focus } from "./focus.ts";
import type { NoteView } from "./notes.ts";

/** Which of the week plan's notes the card shows: what is marked, the others, or both. */
export type NotesShown = "tasks" | "comments" | "all";

/** A child's notes for one day. */
export interface HomeworkPart {
  /** The child. */
  readonly child: Child;
  /** What the week plan marks, in the order of the day's timetable. */
  readonly items: readonly NoteView[];
  /** The week plan's other notes. */
  readonly comments: readonly NoteView[];
  /** Why there is none: none in the week plan, the week plan not in Aula yet, or no week plan. */
  readonly empty: "noHomework" | "planMissing" | "noWeekPlan" | undefined;
}

/** The homework for one day, a part for each child that has some, or whose focus day it is. */
export interface HomeworkDay {
  /** The day the homework is for. */
  readonly day: Day;
  /** How the day is titled: "I dag", "I morgen", or its weekday. */
  readonly relation: "today" | "tomorrow" | "weekday";
  /** The week's number, on the first day of a week other than this one. */
  readonly week: number | undefined;
  /** Whether it is a child's focus day: the day the homework is for next. */
  readonly focus: boolean;
  /** The children's parts, in the children's order. */
  readonly parts: readonly HomeworkPart[];
}

/** A child of the homework card. */
export interface HomeworkChildView {
  /** The child. */
  readonly child: Child;
  /** Whether the child can be shown. */
  readonly state: ChildState;
  /** The child's focus day. */
  readonly focus: Focus;
  /** Whether the school has a week plan, without which there is no homework to show. */
  readonly weekPlan: boolean;
}

/** A header for children with no school day ahead. */
export interface HomeworkHero {
  /** What it says. */
  readonly hero: NoSchoolHero;
  /** The children it is for; empty when it is for every child. */
  readonly only: readonly Child[];
}

/** A week whose plan is not in Aula yet, beyond what a day already says. */
export interface NotYet {
  /** The week's number. */
  readonly week: number;
  /** The children whose plan it is; empty when it is every child's. */
  readonly only: readonly Child[];
}

/** The homework card's view. */
export interface HomeworkCardView {
  /** The numbers of the first and the last week the card covers. */
  readonly weeks: readonly [number, number];
  /** The children shown, in order. */
  readonly children: readonly HomeworkChildView[];
  /** The headers of children with no school day ahead. */
  readonly heroes: readonly HomeworkHero[];
  /** The focus days, then every later day with homework, in date order. */
  readonly days: readonly HomeworkDay[];
  /** The days before the focus days with homework. */
  readonly earlier: readonly HomeworkDay[];
  /** The number of homework notes on the earlier days. */
  readonly earlierCount: number;
  /** The weeks whose plan is not in Aula yet, where no day says so. */
  readonly notYet: readonly NotYet[];
  /** The configured child ids no child has. */
  readonly missing: readonly number[];
  /** Whether the children go to different schools. */
  readonly differentSchools: boolean;
  /** The card's height in units of 50 pixels, roughly, for the masonry view. */
  readonly size: number;
}

type Parts = Map<Day, Map<ChildKey, HomeworkPart>>;

function add(parts: Parts, day: Day, part: HomeworkPart): void {
  const byChild = parts.get(day) ?? new Map<ChildKey, HomeworkPart>();
  byChild.set(childKey(part.child), part);
  parts.set(day, byChild);
}

function only(children: readonly Child[], all: number): readonly Child[] {
  return children.length === all ? [] : children;
}

/** Builds the week plan card's view, of the notes `options.notes` chooses. */
export function homeworkCardView(
  snapshot: StoreSnapshot,
  options: ViewOptions & { readonly notes: NotesShown },
  ctx: ViewContext,
  hold: Hold,
): HomeworkCardView {
  const { bases, missing } = childBases(snapshot, options, ctx, hold);
  const thisWeek = startOfWeek(ctx.today);
  const later: Parts = new Map();
  const before: Parts = new Map();
  const focusDays = new Set<Day>();
  const notYet = new Map<Day, Child[]>();
  const heroes = new Map<string, { hero: NoSchoolHero; children: Child[] }>();
  const ready = bases.filter((basis) => basis.state.kind === "ready");
  for (const basis of ready) {
    const { child, focus, rules } = basis;
    if (focus.day === undefined) {
      const hero = noSchoolHero(basis, focus.horizon);
      const key = heroKey(hero);
      const entry = heroes.get(key) ?? { hero, children: [] };
      entry.children.push(child);
      heroes.set(key, entry);
    } else focusDays.add(focus.day);
    if (!rules.weekPlan) {
      if (focus.day !== undefined)
        add(later, focus.day, { child, items: [], comments: [], empty: "noWeekPlan" });
      continue;
    }
    const cutoff = focus.day ?? addDays(focus.horizon, 1);
    for (const view of basis.days) {
      if (!view.known) continue;
      const items = options.notes === "comments" ? [] : homeworkOf(view, rules);
      const comments = options.notes === "tasks" ? [] : commentsOf(view, rules);
      const has = items.length + comments.length > 0;
      const week = startOfWeek(view.day);
      if (view.day === focus.day) {
        const empty = rules.planMissing.has(week) ? "planMissing" : "noHomework";
        add(later, view.day, { child, items, comments, empty: has ? undefined : empty });
      } else if (has) {
        add(view.day > cutoff ? later : before, view.day, {
          child,
          items,
          comments,
          empty: undefined,
        });
      }
    }
    // A week whose plan is missing is said once: by its focus day, else on a line of its own.
    for (const week of rules.planMissing) {
      const said = focus.day !== undefined && startOfWeek(focus.day) === week;
      if (!said && addDays(week, 6) >= cutoff)
        notYet.set(week, [...(notYet.get(week) ?? []), child]);
    }
  }
  // A day's parts are in the children's order, as each child's days are gone through in turn.
  const days = (parts: Parts): HomeworkDay[] => {
    const shown = new Set<Day>();
    return [...parts]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, byChild]) => {
        const week = startOfWeek(day);
        const first = week !== thisWeek && !shown.has(week);
        shown.add(week);
        return {
          day,
          relation:
            day === ctx.today ? "today" : day === addDays(ctx.today, 1) ? "tomorrow" : "weekday",
          week: first ? weekNumber(day) : undefined,
          focus: focusDays.has(day),
          parts: [...byChild.values()],
        };
      });
  };
  const shown = days(later);
  const earlier = days(before);
  const count = (list: readonly HomeworkDay[]): number =>
    list.reduce(
      (sum, day) =>
        sum + day.parts.reduce((n, part) => n + part.items.length + part.comments.length, 0),
      0,
    );
  return {
    weeks: [weekNumber(snapshot.range.start), weekNumber(addDays(snapshot.range.end, -1))],
    children: bases.map((basis) => ({
      child: basis.child,
      state: basis.state,
      focus: basis.focus,
      weekPlan: basis.rules.weekPlan,
    })),
    heroes: [...heroes.values()].map(({ hero, children }) => ({
      hero,
      only: only(children, ready.length),
    })),
    days: shown,
    earlier,
    earlierCount: count(earlier),
    notYet: [...notYet].map(([week, children]) => ({
      week: weekNumber(week),
      only: only(children, ready.filter((basis) => basis.rules.weekPlan).length),
    })),
    missing,
    differentSchools: new Set(bases.map((basis) => basis.child.institution_name)).size > 1,
    size:
      ready.length > 0
        ? Math.min(30, 2 + shown.reduce((sum, day) => sum + day.parts.length, 0) + 2 * count(shown))
        : 6,
  };
}
