/**
 * The school day card's view: the day that matters now, for each child, under one header when
 * the children share it.
 *
 * @packageDocumentation
 */

import type { ViewContext } from "../core/context.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { CalendarEvent, Child, Day } from "../core/types.ts";
import {
  dayContent,
  planBlocks,
  visibleChips,
  type BlockId,
  type BlockPlan,
  type Chip,
  type DayContent,
} from "./blocks.ts";
import { bridgeRows, fitRows, type BridgeRow } from "./bridges.ts";
import {
  childBases,
  dayIn,
  type ChildBasis,
  type ChildState,
  type Hold,
  type ViewOptions,
} from "./child.ts";
import type { Focus } from "./focus.ts";
import type { SubjectLabel } from "./subjects.ts";
import { todayRest, type TodayRest } from "./today.ts";

/** What the school day card's view takes from its configuration. */
export interface DayViewOptions extends ViewOptions {
  /** The blocks shown, in order. */
  readonly blocks: readonly BlockId[];
}

/** A child's rest of today. */
export interface TodayEntry {
  /** The child. */
  readonly child: Child;
  /** What is left of the child's today. */
  readonly rest: TodayRest;
  /** The subject of the lesson going on, named. */
  readonly running: SubjectLabel | undefined;
}

/** A bridge row, and the children it is for when not every child has it. */
export interface BridgeLine {
  /** The row. */
  readonly row: BridgeRow;
  /** The children who have it; empty when every child does. */
  readonly only: readonly Child[];
}

/** The rows above a day's header: the rest of today, and the days passed over. */
export interface AboveRows {
  /** What is left of today, per child; empty when the focus day is today. */
  readonly today: readonly TodayEntry[];
  /** Today's timed events still to come, each once. */
  readonly events: readonly CalendarEvent[];
  /** The bridge rows that fit. */
  readonly bridges: readonly BridgeLine[];
  /** The days passed over in the rows that did not fit. */
  readonly moreDays: number;
  /** The last day looked at, when no day ahead is a school day. */
  readonly none: Day | undefined;
}

/** A child's school day. */
export interface DayChildView {
  /** The child. */
  readonly child: Child;
  /** Whether the child can be shown. */
  readonly state: ChildState;
  /** The child's focus day. */
  readonly focus: Focus;
  /** The rows above the child's header; undefined under a shared header, which has them. */
  readonly above: AboveRows | undefined;
  /** The focus day's content. */
  readonly content: DayContent | undefined;
  /** The focus day's blocks. */
  readonly plan: BlockPlan | undefined;
  /** The chips of the child's header: under a shared header, those not every child has. */
  readonly chips: readonly Chip[];
}

/** The school day card's view. */
export interface DayCardView {
  /** One child; children under one header; or children each with their own. */
  readonly layout: "single" | "shared" | "separate";
  /** The children shown, in order. */
  readonly children: readonly DayChildView[];
  /** The shared header, when the children have the same focus day. */
  readonly shared:
    | { readonly focus: Focus; readonly above: AboveRows; readonly chips: readonly Chip[] }
    | undefined;
  /** The configured child ids no child has. */
  readonly missing: readonly number[];
  /** Whether the children go to different schools, so that each child's names its own. */
  readonly differentSchools: boolean;
  /** The card's height in units of 50 pixels, roughly, for the masonry view. */
  readonly size: number;
}

function rest(basis: ChildBasis, ctx: ViewContext): TodayRest | undefined {
  if (basis.focus.day === basis.focus.today || basis.focus.horizon === undefined) return undefined;
  const today = dayIn(basis, basis.focus.today);
  return today?.known ? todayRest(today, ctx.now) : undefined;
}

function rowKey(row: BridgeRow): string {
  switch (row.kind) {
    case "holiday":
      return `holiday:${String(row.event.id)}`;
    case "weekend":
      return `weekend:${row.days.join()}:${row.items
        .map((item) => (item.kind === "event" ? String(item.event.id) : item.birthday.name))
        .join()}`;
    case "empty":
      return `empty:${row.days.join()}`;
  }
}

function above(bases: readonly ChildBasis[], ctx: ViewContext): AboveRows {
  const today: TodayEntry[] = [];
  const events = new Map<string, CalendarEvent>();
  for (const basis of bases) {
    const left = rest(basis, ctx);
    if (!left) continue;
    const running = left.running && basis.rules.namer(left.running.lesson.title);
    today.push({ child: basis.child, rest: left, running });
    for (const event of left.events) events.set(String(event.id), event);
  }
  const lines = new Map<string, { row: BridgeRow; children: Child[] }>();
  for (const basis of bases) {
    for (const row of bridgeRows(basis.days, basis.focus)) {
      const key = rowKey(row);
      const line = lines.get(key);
      if (line) line.children.push(basis.child);
      else lines.set(key, { row, children: [basis.child] });
    }
  }
  const sorted = [...lines.values()].sort((a, b) =>
    (a.row.days[0] ?? "").localeCompare(b.row.days[0] ?? ""),
  );
  const { rows, moreDays } = fitRows(
    sorted.map((line) => line.row),
    today.length > 0,
  );
  const first = bases[0];
  return {
    today,
    events: [...events.values()],
    bridges: rows.map((row) => {
      const children = lines.get(rowKey(row))?.children ?? [];
      return { row, only: children.length === bases.length ? [] : children };
    }),
    moreDays,
    none: first?.focus.reason === "none" ? first.focus.horizon : undefined,
  };
}

function chipKey(chip: Chip): string {
  return chip.kind === "event"
    ? `event:${String(chip.event.id)}`
    : `birthday:${chip.birthday.name}`;
}

function size(children: readonly DayChildView[]): number {
  let total = 3;
  for (const view of children) {
    if (!view.content) continue;
    const { timetable, homework, plan, pack, events, birthdays } = view.content;
    const lessons = timetable.filter((row) => row.kind === "lesson").length;
    const breaks = timetable.length - lessons;
    const items = pack.reduce((sum, row) => sum + row.items.length, 0);
    total +=
      lessons +
      breaks / 2 +
      2 * (homework.length + plan.length) +
      Math.ceil(items / 3) +
      events.length +
      birthdays.length;
  }
  return Math.min(30, Math.round(total));
}

/** Builds the school day card's view. */
export function dayCardView(
  snapshot: StoreSnapshot,
  options: DayViewOptions,
  ctx: ViewContext,
  hold: Hold,
): DayCardView {
  const { bases, missing } = childBases(snapshot, options, ctx, hold);
  const ready = bases.filter((basis) => basis.state.kind === "ready");
  const lead = ready[0]?.focus;
  const shared =
    bases.length > 1 &&
    lead?.day !== undefined &&
    ready.every((basis) => basis.focus.day === lead.day && basis.focus.reason === lead.reason);
  const children = bases.map((basis): DayChildView => {
    const view = dayIn(basis, basis.focus.day);
    const content =
      basis.state.kind === "ready" && view
        ? dayContent(view, basis.rules, ctx.now, basis.focus.reason === "today")
        : undefined;
    return {
      child: basis.child,
      state: basis.state,
      focus: basis.focus,
      above: shared || basis.state.kind !== "ready" ? undefined : above([basis], ctx),
      content,
      plan: content && planBlocks(content, options.blocks),
      chips: content ? visibleChips(content, options.blocks) : [],
    };
  });
  let header: DayCardView["shared"];
  let shown = children;
  if (shared) {
    const withContent = children.filter((view) => view.content !== undefined);
    const common = (withContent[0]?.chips ?? []).filter((chip) =>
      withContent.every((view) => view.chips.some((other) => chipKey(other) === chipKey(chip))),
    );
    const commonKeys = new Set(common.map(chipKey));
    header = { focus: lead, above: above(ready, ctx), chips: common };
    shown = children.map((view) => ({
      ...view,
      chips: view.chips.filter((chip) => !commonKeys.has(chipKey(chip))),
    }));
  }
  return {
    layout: bases.length <= 1 ? "single" : shared ? "shared" : "separate",
    children: shown,
    shared: header,
    missing,
    differentSchools: new Set(bases.map((basis) => basis.child.institution_name)).size > 1,
    size: bases.some((basis) => basis.state.kind === "ready") ? size(shown) : 9,
  };
}
