/**
 * What every card works out for each child it shows: the child's state, its days, and its focus
 * day.
 *
 * @packageDocumentation
 */

import { selectChildren } from "../core/children.ts";
import type { ViewContext } from "../core/context.ts";
import { startOfWeek } from "../core/dates.ts";
import type { StoreSnapshot } from "../core/store.ts";
import {
  childKey,
  type Child,
  type ChildKey,
  type Day,
  type DayRange,
  type WeekData,
} from "../core/types.ts";
import type { ContentRules } from "./blocks.ts";
import { buildDays, isSchoolDay, isTimetabled, type DayView } from "./days.ts";
import { chooseFocus, type Focus } from "./focus.ts";
import type { PackRule } from "./pack.ts";
import { subjectNamer, type SubjectName, type SubjectNamer } from "./subjects.ts";

/** What every card's view takes from its configuration. */
export interface ViewOptions {
  /** The child ids to show; every child when empty. */
  readonly children: readonly number[];
  /** The switch time in minutes since midnight; null to keep today in focus all day. */
  readonly switchAt: number | null;
  /** The configured things to bring. */
  readonly packing: readonly PackRule[];
  /** The configured subject names. */
  readonly subjectNames: readonly SubjectName[];
}

/** Returns the focus to show for a child, given the one chosen now: the card holds it a while. */
export type Hold = (key: ChildKey, chosen: Focus) => Focus;

/** Whether a child can be shown yet. */
export type ChildState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly error: unknown }
  | {
      readonly kind: "ready";
      /** Whether the data is being renewed. */
      readonly stale: boolean;
      /** Why the data could not be renewed, when it could not. */
      readonly error: unknown;
    };

/** A child, its data as days, and its focus day. */
export interface ChildBasis {
  /** The child. */
  readonly child: Child;
  /** The child's key. */
  readonly key: ChildKey;
  /** Whether the child can be shown. */
  readonly state: ChildState;
  /** The days of the store's range. */
  readonly days: readonly DayView[];
  /** The focus day, as held. */
  readonly focus: Focus;
  /** What the days' content is made with. */
  readonly rules: ContentRules;
}

const namers = new WeakMap<readonly SubjectName[], SubjectNamer>();

function namerOf(names: readonly SubjectName[]): SubjectNamer {
  let namer = namers.get(names);
  if (!namer) {
    namer = subjectNamer(names);
    namers.set(names, namer);
  }
  return namer;
}

const built = new WeakMap<WeekData, { key: string; days: DayView[] }>();

// Data is replaced, never changed, so one child's days are built once for every card and tick.
function daysOf(data: WeekData | undefined, range: DayRange, zone: string): DayView[] {
  if (!data) return buildDays(data, range, zone);
  const key = `${range.start}|${range.end}|${zone}`;
  const cached = built.get(data);
  if (cached?.key === key) return cached.days;
  const days = buildDays(data, range, zone);
  built.set(data, { key, days });
  return days;
}

/**
 * Returns the Mondays of the weeks whose week plan is not in Aula yet: a week the data covers,
 * with a school day, and no note on any of its days. A week without school expects no plan.
 */
export function missingPlans(days: readonly DayView[], weekPlan: boolean): Set<Day> {
  const missing = new Set<Day>();
  if (!weekPlan) return missing;
  const timetabled = isTimetabled(days);
  const weeks = new Map<Day, DayView[]>();
  for (const view of days) {
    if (!view.known) continue;
    const week = startOfWeek(view.day);
    weeks.set(week, [...(weeks.get(week) ?? []), view]);
  }
  for (const [week, views] of weeks) {
    if (
      views.some((view) => isSchoolDay(view, timetabled)) &&
      views.every((view) => view.notes.length === 0)
    )
      missing.add(week);
  }
  return missing;
}

/** Returns the children a card shows, each with its days and focus, and the ids not found. */
export function childBases(
  snapshot: StoreSnapshot,
  options: ViewOptions,
  ctx: ViewContext,
  hold: Hold,
): { bases: ChildBasis[]; missing: number[] } {
  const { shown, missing } = selectChildren(snapshot.children.list ?? [], options.children);
  const namer = namerOf(options.subjectNames);
  const bases = shown.map((child): ChildBasis => {
    const key = childKey(child);
    const entry = snapshot.data.get(key);
    const days = daysOf(entry?.data, snapshot.range, ctx.zone);
    const focus = hold(
      key,
      chooseFocus({ today: ctx.today, minute: ctx.minute, switchAt: options.switchAt, days }),
    );
    const weekPlan = entry?.data?.week_plan ?? true;
    let state: ChildState;
    if (entry?.data === undefined) {
      state =
        entry?.error === undefined ? { kind: "loading" } : { kind: "error", error: entry.error };
    } else if (focus.horizon === undefined) state = { kind: "loading" };
    else state = { kind: "ready", stale: entry.stale, error: entry.error };
    return {
      child,
      key,
      state,
      days,
      focus,
      rules: {
        namer,
        packing: options.packing,
        weekPlan,
        timetabled: isTimetabled(days),
        planMissing: missingPlans(days, weekPlan),
        zone: ctx.zone,
      },
    };
  });
  return { bases, missing };
}

/** Returns a day of a child's range. */
export function dayIn(basis: ChildBasis, day: string | undefined): DayView | undefined {
  return day === undefined ? undefined : basis.days.find((view) => view.day === day);
}
