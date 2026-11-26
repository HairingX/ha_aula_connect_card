/**
 * The overview: for each child the day that matters now in a glance, the child's presence today,
 * and the important notes from that day on; and what is coming the next seven days, once for the
 * children it concerns.
 *
 * @packageDocumentation
 */

import type { ViewContext } from "../core/context.ts";
import { addDays, instant, localTime } from "../core/dates.ts";
import type { TextKey } from "../core/i18n.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { CalendarEvent, Child, Day, TodayData } from "../core/types.ts";
import { dayContent, type DayContent } from "./blocks.ts";
import { entriesOf } from "./family.ts";
import {
  childBases,
  dayIn,
  type ChildBasis,
  type ChildState,
  type Hold,
  type ViewOptions,
} from "./child.ts";
import type { Focus } from "./focus.ts";
import { schoolHours } from "./lessons.ts";
import { isImportant, noteView, type NoteView } from "./notes.ts";

/** How a child's presence is shown. */
/** `ask` is a child sick the school day before, not yet checked in: perhaps still sick. */
export type PresenceKind = "sick" | "ask" | "school" | "here" | "coming" | "home" | "away";

/** A child's presence today, in a word or two. */
export interface PresenceView {
  /** What kind of presence it is, which its look follows. */
  readonly kind: PresenceKind;
  /** The text saying it. */
  readonly key: TextKey;
  /** The time the text names, "HH:MM", where it names one. */
  readonly time: string | undefined;
  /** The child's day it is read from. */
  readonly data: TodayData;
}

/** An important note, and the day it is for. */
export interface ImportantDue {
  /** The note. */
  readonly note: NoteView;
  /** The day it is due. */
  readonly day: Day;
}

/** A child's part of the overview. */
export interface OverviewChild {
  /** The child, its days and focus. */
  readonly basis: ChildBasis;
  /** The child. */
  readonly child: Child;
  /** Whether the child can be shown. */
  readonly state: ChildState;
  /** The day that matters now. */
  readonly focus: Focus;
  /** What the focus day holds; undefined until the child can be shown, or without one. */
  readonly content: DayContent | undefined;
  /** The important notes from the focus day on, in the order of their days. */
  readonly important: readonly ImportantDue[];
  /** The day the important notes are from: the focus day, else today. */
  readonly importantFrom: Day;
  /** The child's day as it is now, once it has come. */
  readonly today: TodayData | undefined;
  /** The child's presence today, where the institution registers one. */
  readonly presence: PresenceView | undefined;
  /** Today's school hours, as ISO 8601 times. */
  readonly hoursToday: { readonly start: string; readonly end: string } | undefined;
  /** The child as each entry has it: one per guardian. */
  readonly entries: readonly Child[];
  /** Whether the institution is named beside the child: only where the children shown are at more than one. */
  readonly showsInstitution: boolean;
}

/** Something coming: an event, or a classmate's birthday. */
export type ComingItem =
  | {
      /** An event. */
      readonly kind: "event";
      /** The first day it is on within the week. */
      readonly day: Day;
      /** The event. */
      readonly event: CalendarEvent;
      /** The children it is for. */
      readonly children: readonly Child[];
    }
  | {
      /** A birthday. */
      readonly kind: "birthday";
      /** The day. */
      readonly day: Day;
      /** Whose birthday it is. */
      readonly name: string;
      /** The children in whose group it is. */
      readonly children: readonly Child[];
    };

/** The overview. */
export interface OverviewView {
  /** The children. */
  readonly children: readonly OverviewChild[];
  /** The configured child ids no child has. */
  readonly missing: readonly number[];
  /** The focus day every child shares; undefined when they differ or have none. */
  readonly sameDay: Day | undefined;
  /** What is coming the next seven days, from today. */
  readonly coming: readonly ComingItem[];
  /** How many important notes are for the next seven days. */
  readonly importantSoon: number;
  /** The card's height in units of 50 pixels, roughly. */
  readonly size: number;
}

/** How far ahead "Det sker" and the count of important notes look, in days from today. */
export const AHEAD_DAYS = 7;

/** Returns "HH:MM" of an ISO 8601 time in a time zone. */
export function clockOf(text: string, zone: string): string {
  const at = instant(text);
  const minute = at ? localTime(at, zone).minute : 0;
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function minutes(clock: string): number {
  return Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
}

/**
 * Returns a child's presence in a word or two. A child reported sick is sick; one sick the school
 * day before is asked about until it is checked in or the day switches at `switchAt`; while the
 * school day goes on a child present is at school; otherwise the institution's own status says.
 */
export function presenceOf(
  data: TodayData | undefined,
  hours: { readonly start: string; readonly end: string } | undefined,
  ctx: ViewContext,
  switchAt: number | null = null,
): PresenceView | undefined {
  if (data === undefined) return undefined;
  const view = (kind: PresenceKind, key: TextKey, time?: string | null): PresenceView => ({
    kind,
    key,
    time: time ?? undefined,
    data,
  });
  if (data.sick.today) return view("sick", "presenceSick");
  const presence = data.presence;
  if (
    data.sick.since !== null &&
    !presence?.check_in &&
    (presence?.status ?? 0) === 0 &&
    (switchAt === null || ctx.minute < switchAt)
  )
    return view("ask", "presenceSickYesterday");
  const status = presence?.status ?? null;
  if (presence === null || status === null) return undefined;
  const span = hours && {
    start: clockOf(hours.start, ctx.zone),
    end: clockOf(hours.end, ctx.zone),
  };
  switch (status) {
    case 0:
      if (presence.check_out) return view("home", "presenceGone", presence.check_out);
      return presence.planned_in
        ? view("coming", "presenceComing", presence.planned_in)
        : view("coming", "presenceNotArrived");
    case 1:
      return view("sick", "presenceSick");
    case 2:
      return view("away", "presenceAbsent");
    case 3:
      if (span && ctx.minute >= minutes(span.start) && ctx.minute < minutes(span.end))
        return view("school", "presenceSchool");
      if (span && ctx.minute >= minutes(span.end) && presence.planned_out)
        return view("here", "presenceUntil", presence.planned_out);
      return presence.check_in
        ? view("here", "presenceSince", presence.check_in)
        : view("here", "presenceHere");
    case 4:
      return view("away", "presenceTrip");
    case 5:
      return view("here", "presenceSleeping");
    case 6:
      return view("away", "presenceActivity");
    case 8:
      return view("home", "presenceGone", presence.check_out);
    default:
      return view("here", "presenceHere");
  }
}

function importantFrom(basis: ChildBasis, from: Day): ImportantDue[] {
  if (!basis.rules.weekPlan) return [];
  return basis.days
    .filter((view) => view.day >= from)
    .flatMap((view) =>
      view.notes
        .filter(isImportant)
        .map((note) => ({ note: noteView(note, basis.rules.namer), day: view.day })),
    );
}

function childOf(
  basis: ChildBasis,
  snapshot: StoreSnapshot,
  list: readonly Child[],
  ctx: ViewContext,
  showsInstitution: boolean,
  switchAt: number | null,
): OverviewChild {
  const view = dayIn(basis, basis.focus.day);
  const content =
    basis.state.kind === "ready" && view
      ? dayContent(view, basis.rules, ctx.now, basis.focus.reason === "today")
      : undefined;
  const today = snapshot.today.get(basis.key)?.data;
  const from = basis.focus.day ?? ctx.today;
  const hoursToday = schoolHours(dayIn(basis, ctx.today)?.lessons ?? []);
  return {
    basis,
    child: basis.child,
    state: basis.state,
    focus: basis.focus,
    content,
    important: importantFrom(basis, from),
    importantFrom: from,
    today,
    presence: presenceOf(today, hoursToday, ctx, switchAt),
    hoursToday,
    entries: entriesOf(list, basis.child.child_id),
    showsInstitution,
  };
}

function coming(children: readonly OverviewChild[], ctx: ViewContext): ComingItem[] {
  const last = addDays(ctx.today, AHEAD_DAYS - 1);
  const items = new Map<string, ComingItem>();
  for (const { basis } of children) {
    for (const view of basis.days) {
      if (view.day < ctx.today || view.day > last) continue;
      const add = (key: string, item: ComingItem): void => {
        const known = items.get(key);
        if (!known) items.set(key, item);
        else if (!known.children.includes(basis.child))
          items.set(key, { ...known, children: [...known.children, basis.child] });
      };
      for (const event of view.events) {
        add(`e${String(event.id)}`, {
          kind: "event",
          day: view.day,
          event,
          children: [basis.child],
        });
      }
      if (!basis.rules.weekPlan) continue;
      for (const birthday of view.birthdays) {
        add(`b${birthday.name}|${view.day}`, {
          kind: "birthday",
          day: view.day,
          name: birthday.name,
          children: [basis.child],
        });
      }
    }
  }
  return [...items.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** Builds the overview. */
export function overviewView(
  snapshot: StoreSnapshot,
  options: ViewOptions,
  ctx: ViewContext,
  hold: Hold,
): OverviewView {
  const { bases, missing } = childBases(snapshot, options, ctx, hold);
  const list = snapshot.children.list ?? [];
  const several = new Set(bases.map((basis) => basis.child.institution_name)).size > 1;
  const children = bases.map((basis) =>
    childOf(basis, snapshot, list, ctx, several, options.switchAt),
  );
  const days = new Set(children.map((item) => item.focus.day));
  const [shared] = days;
  const last = addDays(ctx.today, AHEAD_DAYS - 1);
  const importantSoon = children.reduce(
    (sum, item) => sum + item.important.filter((due) => due.day <= last).length,
    0,
  );
  const items = coming(children, ctx);
  return {
    children,
    missing,
    sameDay: days.size === 1 ? shared : undefined,
    coming: items,
    importantSoon,
    size: 4 + 4 * children.length + Math.min(items.length, 6),
  };
}
