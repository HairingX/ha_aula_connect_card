/**
 * What every card works out for each child it shows: the child's state, its days, and its focus
 * day.
 *
 * @packageDocumentation
 */

import { selectChildren } from "../core/children.ts";
import type { ViewContext } from "../core/context.ts";
import type { StoreSnapshot } from "../core/store.ts";
import { childKey, type Child, type ChildKey } from "../core/types.ts";
import type { ContentRules } from "./blocks.ts";
import { buildDays, type DayView } from "./days.ts";
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
    const days = buildDays(entry?.data, snapshot.range, ctx.zone);
    const focus = hold(
      key,
      chooseFocus({ today: ctx.today, minute: ctx.minute, switchAt: options.switchAt, days }),
    );
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
      rules: { namer, packing: options.packing, weekPlan: entry?.data?.week_plan ?? true },
    };
  });
  return { bases, missing };
}

/** Returns a day of a child's range. */
export function dayIn(basis: ChildBasis, day: string | undefined): DayView | undefined {
  return day === undefined ? undefined : basis.days.find((view) => view.day === day);
}
