/**
 * The Important page: a week's important notes for the children shown, by the day it is due, the days
 * before today folded, browsed a week at a time.
 *
 * @packageDocumentation
 */

import type { ViewContext } from "../core/context.ts";
import { addDays, startOfWeek, weekNumber } from "../core/dates.ts";
import { extraKey, type StoreSnapshot } from "../core/store.ts";
import type { Child, Day } from "../core/types.ts";
import { basisFor, childBases, type ChildBasis, type Hold, type ViewOptions } from "./child.ts";
import { isImportant, noteView, type NoteView } from "./notes.ts";
import { extraWeeks } from "./week-view.ts";

/** A child's important note, and the day it is for. */
export interface ImportantItem {
  /** The child. */
  readonly child: Child;
  /** The note. */
  readonly note: NoteView;
  /** The day it is due. */
  readonly day: Day;
}

/** The Important page. */
export interface ImportantPageView {
  /** The week's Monday. */
  readonly week: Day;
  /** The week's number. */
  readonly number: number;
  /** How many weeks from this week the page shows. */
  readonly offset: number;
  /** Whether a child's data for the week is on its way. */
  readonly loading: boolean;
  /** Why a child's data for the week could not be had. */
  readonly error: unknown;
  /** The important notes for the days before today, in the week of today. */
  readonly earlier: readonly ImportantItem[];
  /** The days with important notes, from today in the week of today, each with its notes. */
  readonly days: readonly { readonly day: Day; readonly items: readonly ImportantItem[] }[];
  /** The children with no important note on those days. */
  readonly none: readonly Child[];
  /** The configured child ids no child has. */
  readonly missing: readonly number[];
  /** The card's height in units of 50 pixels, roughly. */
  readonly size: number;
}

function itemsOf(basis: ChildBasis, from: Day, to: Day): ImportantItem[] {
  if (!basis.rules.weekPlan) return [];
  return basis.days
    .filter((view) => view.day >= from && view.day < to)
    .flatMap((view) =>
      view.notes.filter(isImportant).map((note) => ({
        child: basis.child,
        note: noteView(note, basis.rules.namer),
        day: view.day,
      })),
    );
}

/** Builds the Important page, `offset` weeks from this week. */
export function importantPageView(
  snapshot: StoreSnapshot,
  options: ViewOptions,
  ctx: ViewContext,
  hold: Hold,
  offset: number,
): ImportantPageView {
  const { bases, missing } = childBases(snapshot, options, ctx, hold);
  const week = addDays(startOfWeek(ctx.today), 7 * offset);
  const end = addDays(week, 7);
  const extra = extraWeeks(snapshot.range, 1, offset);
  let loading = false;
  let error: unknown = undefined;
  const all = bases.flatMap((basis) => {
    let source = basis;
    if (extra) {
      const entry = snapshot.data.get(extraKey(basis.key, extra));
      if (entry?.data === undefined) {
        loading ||= entry?.error === undefined;
        error ??= entry?.error;
        return [];
      }
      source = basisFor(basis, entry, extra, ctx.zone);
    } else if (basis.state.kind !== "ready") {
      loading ||= basis.state.kind === "loading";
      if (basis.state.kind === "error") error ??= basis.state.error;
      return [];
    }
    return itemsOf(source, week, end);
  });
  // Only the week of today folds the days before it: another week shows every day it has.
  const from = offset === 0 ? ctx.today : week;
  const earlier = all.filter((item) => item.day < from);
  const coming = all.filter((item) => item.day >= from);
  const days = [...new Set(coming.map((item) => item.day))]
    .sort()
    .map((day) => ({ day, items: coming.filter((item) => item.day === day) }));
  return {
    week,
    number: weekNumber(week),
    offset,
    loading,
    error,
    earlier,
    days,
    none: bases
      .map((basis) => basis.child)
      .filter((child) => !coming.some((item) => item.child === child)),
    missing,
    size: 3 + days.length + 2 * coming.length,
  };
}
