/**
 * The school day card's view: the day that matters now. Children who share it share one header,
 * and each block holds a part for each of them, so that one question is answered for every child
 * before the next.
 *
 * @packageDocumentation
 */

import type { ViewContext } from "../core/context.ts";
import { addDays, isWeekend } from "../core/dates.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { CalendarEvent, Child, Day } from "../core/types.ts";
import {
  dayContent,
  planBlocks,
  visibleFacts,
  type BlockId,
  type BlockPlan,
  type DayContent,
  type EmptyKind,
  type Fact,
  type TimedEvent,
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
import { holidayOf, holidaySpan, isSchoolDay } from "./days.ts";
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

/** Something of today's, and the children who have it when not every child does. */
export interface Shared<T> {
  /** The thing. */
  readonly item: T;
  /** The children who have it; empty when every child does. */
  readonly only: readonly Child[];
}

/** The rows above a day's header: the rest of today, and the days passed over. */
export interface AboveRows {
  /** What is left of today, per child; empty when the focus day is today. */
  readonly today: readonly TodayEntry[];
  /** Today's events at a time still to come, each once, in the order they begin. */
  readonly events: readonly Shared<TimedEvent>[];
  /** Today's whole-day events and birthdays on a day without school, each once. */
  readonly facts: readonly Shared<Fact>[];
  /** The bridge rows that fit. */
  readonly bridges: readonly BridgeLine[];
  /** The days passed over in the rows that did not fit. */
  readonly moreDays: number;
}

/** What a group's header says: the day, or, when no school day is ahead, why. */
export type Hero =
  | {
      /** The focus day. */
      readonly kind: "day";
      /** The focus. */
      readonly focus: Focus;
      /** The day. */
      readonly day: Day;
    }
  | {
      /** A holiday up to the last day the data covers. */
      readonly kind: "holiday";
      /** The holiday. */
      readonly event: CalendarEvent;
      /** Its own first day, even before the range. */
      readonly first: Day;
      /** Its own last day, even beyond the range. */
      readonly last: Day;
      /** The weekday after it, when school starts again, if it is beyond the data. */
      readonly resumes: Day | undefined;
    }
  | {
      /** No school day in the data, and no holiday to say why. */
      readonly kind: "none";
      /** The last day the data covers. */
      readonly horizon: Day;
    };

/** A header for a child without a school day ahead. */
export type NoSchoolHero = Exclude<Hero, { kind: "day" }>;

/** A child's school day. */
export interface DayChildView {
  /** The child. */
  readonly child: Child;
  /** Whether the child can be shown. */
  readonly state: ChildState;
  /** The child's focus day. */
  readonly focus: Focus;
  /** The focus day's content. */
  readonly content: DayContent | undefined;
  /** The focus day's blocks. */
  readonly plan: BlockPlan | undefined;
  /** The child's own facts: under a shared header, those not every child has. */
  readonly facts: readonly Fact[];
}

/** A child's part of a block. */
export interface BlockPart {
  /** The child. */
  readonly child: DayChildView;
  /** What the child's day holds. */
  readonly content: DayContent;
  /** The child's day's blocks. */
  readonly plan: BlockPlan;
  /** Why the part says it has nothing; "none" for the block's own sentence, as for no events. */
  readonly empty: EmptyKind | "none" | undefined;
}

/** A block, with a part for each child of its group. */
export interface GroupBlock {
  /** The block. */
  readonly id: BlockId;
  /** The children's parts, in the children's order. */
  readonly parts: readonly BlockPart[];
}

/** Children who share a focus day, under one header; or one child not ready to be shown. */
export interface DayGroup {
  /** The children, in order. */
  readonly children: readonly DayChildView[];
  /** The header; undefined while the child is not ready. */
  readonly hero: Hero | undefined;
  /** The rows above the header. */
  readonly above: AboveRows | undefined;
  /** The header's facts: every child's, or the one child's. */
  readonly facts: readonly Fact[];
  /** The blocks, in the configured order, each with a part per child. */
  readonly blocks: readonly GroupBlock[];
}

/** The school day card's view. */
export interface DayCardView {
  /** The groups, in the order of their children. */
  readonly groups: readonly DayGroup[];
  /** The configured child ids no child has. */
  readonly missing: readonly number[];
  /** Whether the children go to different schools, so that each child's names its own. */
  readonly differentSchools: boolean;
  /** The card's height in units of 50 pixels, roughly, for the masonry view. */
  readonly size: number;
}

function factKey(fact: Fact): string {
  return fact.kind === "event"
    ? `event:${String(fact.event.id)}`
    : `birthday:${fact.birthday.name}:${fact.birthday.date}`;
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

// On a day without school, the rest of today also names its whole-day events and birthdays;
// after the switch on a school day they are over as far as the card is concerned. A holiday
// is left to its own row, which gives its dates.
function rest(basis: ChildBasis, ctx: ViewContext, blocks: readonly BlockId[]) {
  const { focus } = basis;
  if (focus.day === focus.today) return undefined;
  const view = dayIn(basis, focus.today);
  if (!view?.known) return undefined;
  const holiday = holidayOf(view);
  const facts = isSchoolDay(view, basis.rules.timetabled)
    ? []
    : visibleFacts(dayContent(view, basis.rules, ctx.now, true), blocks).filter(
        (fact) => fact.kind !== "event" || fact.event.id !== holiday?.id,
      );
  return todayRest(view, ctx.now, ctx.zone, facts, blocks.includes("events"));
}

function add<T>(
  map: Map<string, { item: T; children: Child[] }>,
  key: string,
  item: T,
  child: Child,
) {
  const entry = map.get(key) ?? { item, children: [] };
  entry.children.push(child);
  map.set(key, entry);
}

function above(
  bases: readonly ChildBasis[],
  ctx: ViewContext,
  blocks: readonly BlockId[],
  hero: Hero,
): AboveRows {
  const today: TodayEntry[] = [];
  const events = new Map<string, { item: TimedEvent; children: Child[] }>();
  const facts = new Map<string, { item: Fact; children: Child[] }>();
  for (const basis of bases) {
    const left = rest(basis, ctx, blocks);
    if (!left) continue;
    const running = left.running && basis.rules.namer(left.running.lesson.title);
    today.push({ child: basis.child, rest: left, running });
    for (const item of left.events) add(events, String(item.event.id), item, basis.child);
    for (const fact of left.facts) add(facts, factKey(fact), fact, basis.child);
  }
  const shared = <T>(entries: Iterable<{ item: T; children: Child[] }>): Shared<T>[] =>
    [...entries].map(({ item, children }) => ({
      item,
      only: children.length === bases.length ? [] : children,
    }));
  const named = new Set(
    [...facts.values()].flatMap(({ item }) => (item.kind === "event" ? [item.event.id] : [])),
  );
  const show = { events: blocks.includes("events"), birthdays: blocks.includes("birthdays") };
  const lines = new Map<string, { row: BridgeRow; children: Child[] }>();
  for (const basis of bases) {
    for (const row of bridgeRows(basis.days, basis.focus, named, show)) {
      // The header names the holiday that lasts to the end of the data.
      if (hero.kind === "holiday" && row.kind === "holiday" && row.event.id === hero.event.id)
        continue;
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
  return {
    today,
    events: shared(events.values()),
    facts: shared(facts.values()),
    bridges: rows.map((row) => {
      const children = lines.get(rowKey(row))?.children ?? [];
      return { row, only: children.length === bases.length ? [] : children };
    }),
    moreDays,
  };
}

/**
 * Returns the header of a child with no school day from today up to `horizon`, the last day the
 * data has: the last holiday of those days, and the weekday after its own last day when that is
 * beyond the data, as school starts again then; else that last day.
 */
export function noSchoolHero(basis: ChildBasis, horizon: Day): NoSchoolHero {
  let holiday: CalendarEvent | undefined;
  for (const view of basis.days) {
    if (view.day >= basis.focus.today && view.day <= horizon) holiday = holidayOf(view) ?? holiday;
  }
  if (!holiday) return { kind: "none", horizon };
  const { first, last } = holidaySpan(holiday, horizon);
  let resumes = addDays(last, 1);
  while (isWeekend(resumes)) resumes = addDays(resumes, 1);
  return {
    kind: "holiday",
    event: holiday,
    first,
    last,
    resumes: resumes > horizon ? resumes : undefined,
  };
}

/** Returns what makes two headers say the same. */
export function heroKey(hero: Hero): string {
  switch (hero.kind) {
    case "day":
      return `${hero.day}|${hero.focus.reason}`;
    case "holiday":
      return `holiday|${String(hero.event.id)}|${String(hero.resumes)}`;
    case "none":
      return `none|${hero.horizon}`;
  }
}

function heroOf(basis: ChildBasis): Hero {
  const { focus } = basis;
  return focus.day === undefined
    ? noSchoolHero(basis, focus.horizon ?? focus.today)
    : { kind: "day", focus, day: focus.day };
}

function childView(basis: ChildBasis, options: DayViewOptions, ctx: ViewContext): DayChildView {
  const view = dayIn(basis, basis.focus.day);
  const content =
    basis.state.kind === "ready" && view
      ? dayContent(view, basis.rules, ctx.now, basis.focus.reason === "today")
      : undefined;
  return {
    child: basis.child,
    state: basis.state,
    focus: basis.focus,
    content,
    plan: content && planBlocks(content, options.blocks),
    facts: content ? visibleFacts(content, options.blocks) : [],
  };
}

/** A child whose day's blocks are planned, as every child of a group with a school day is. */
type Planned = DayChildView & { readonly content: DayContent; readonly plan: BlockPlan };

function group(bases: readonly ChildBasis[], options: DayViewOptions, ctx: ViewContext): DayGroup {
  const children = bases.map((basis) => childView(basis, options, ctx));
  const [first] = bases;
  if (first?.state.kind !== "ready") {
    return { children, hero: undefined, above: undefined, facts: [], blocks: [] };
  }
  const hero = heroOf(first);
  // The facts every child has are the header's; each child's row keeps its own.
  const common = children
    .map((child) => child.facts)
    .reduce((all, facts) =>
      all.filter((fact) => facts.some((other) => factKey(other) === factKey(fact))),
    );
  const shared = new Set(common.map(factKey));
  const own = children.map((child): DayChildView => ({
    ...child,
    facts: child.facts.filter((fact) => !shared.has(factKey(fact))),
  }));
  const planned = own.filter(
    (child): child is Planned => child.content !== undefined && child.plan !== undefined,
  );
  const blocks = options.blocks
    .filter((id) => planned.some((child) => child.plan.blocks.some((block) => block.id === id)))
    .map((id) => ({
      id,
      parts: planned.map((child) => {
        const block = child.plan.blocks.find((item) => item.id === id);
        return {
          child,
          content: child.content,
          plan: child.plan,
          empty: block ? block.empty : ("none" as const),
        };
      }),
    }));
  return {
    children: own,
    hero,
    above: above(bases, ctx, options.blocks, hero),
    facts: common,
    blocks,
  };
}

function size(groups: readonly DayGroup[]): number {
  let total = 0;
  for (const item of groups) {
    total += 3;
    for (const child of item.children) {
      if (!child.content) continue;
      const { timetable, homework, plan, pack, timed } = child.content;
      const lessons = timetable.filter((row) => row.kind === "lesson").length;
      const breaks = timetable.length - lessons;
      const items = pack.reduce((sum, row) => sum + row.items.length, 0);
      total +=
        1 + lessons + breaks / 2 + 2 * (homework.length + plan.length) + items / 3 + timed.length;
    }
  }
  return Math.min(30, Math.round(total));
}

/**
 * Builds the school day card's view. Once every child can be shown, children with the same focus
 * day share a header; until then each child stands alone, so that a header never forms from
 * some of the children only.
 */
export function dayCardView(
  snapshot: StoreSnapshot,
  options: DayViewOptions,
  ctx: ViewContext,
  hold: Hold,
): DayCardView {
  const { bases, missing } = childBases(snapshot, options, ctx, hold);
  const ready = bases.every((basis) => basis.state.kind === "ready");
  const together = new Map<string, ChildBasis[]>();
  for (const basis of bases) {
    // Children without a school day ahead share a header only when it says the same for each.
    const key = ready ? heroKey(heroOf(basis)) : String(together.size);
    together.set(key, [...(together.get(key) ?? []), basis]);
  }
  const groups = [...together.values()].map((items) => group(items, options, ctx));
  return {
    groups,
    missing,
    differentSchools: new Set(bases.map((basis) => basis.child.institution_name)).size > 1,
    size: bases.some((basis) => basis.state.kind === "ready") ? size(groups) : 9,
  };
}
