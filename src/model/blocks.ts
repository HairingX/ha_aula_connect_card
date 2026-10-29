/**
 * The blocks a day is shown in, their order, and what each holds on a day.
 *
 * @packageDocumentation
 */

import type { Birthday, CalendarEvent } from "../core/types.ts";
import { isHolidayEvent, type DayView } from "./days.ts";
import {
  lessonTime,
  mergeLessons,
  schoolHours,
  timeline,
  type LessonBlock,
  type LessonTime,
} from "./lessons.ts";
import { inTimetableOrder, isHomework, noteView, type NoteView } from "./notes.ts";
import { packRows, quotes, type PackRow, type PackRule, type Quote } from "./pack.ts";
import type { SubjectLabel, SubjectNamer } from "./subjects.ts";

/** The blocks, in their default order. */
export const BLOCKS = ["homework", "pack", "timetable", "plan", "events", "birthdays"] as const;

/** A block of a day. */
export type BlockId = (typeof BLOCKS)[number];

/** The default order of the blocks: what to do and bring first. */
export const DEFAULT_ORDER: readonly BlockId[] = BLOCKS;

/** Which blocks are shown; `tasks` is 0.0.2's switch for homework and the plan together. */
export type ShowConfig = Readonly<Partial<Record<BlockId | "tasks", boolean>>>;

/** Tells whether a block is shown: its own switch, else 0.0.2's `tasks` for the notes, else yes. */
export function isShown(id: BlockId, show: ShowConfig): boolean {
  return show[id] ?? !(show.tasks === false && (id === "homework" || id === "plan"));
}

/**
 * Returns the blocks to show, in order: those `order` names first, in its order, then the rest in
 * the default order, without the hidden ones. An empty `order` is the default order.
 */
export function orderBlocks(order: readonly BlockId[], show: ShowConfig): BlockId[] {
  return [...order, ...DEFAULT_ORDER.filter((id) => !order.includes(id))].filter((id) =>
    isShown(id, show),
  );
}

/** A lesson's status as shown: a substitute, or another change in Aula's own words. */
export type LessonStatus =
  { readonly kind: "substitute" } | { readonly kind: "other"; readonly text: string };

/** A row of a day's timetable. */
export type TimetableRow =
  | {
      readonly kind: "lesson";
      readonly block: LessonBlock;
      readonly subject: SubjectLabel;
      /** Where the lesson is in time; undefined on a day that is not today. */
      readonly time: LessonTime | undefined;
      readonly status: LessonStatus | undefined;
    }
  | {
      readonly kind: "break";
      readonly start: string;
      readonly end: string;
      readonly minutes: number;
    };

/** Something shown as a chip in a day's header: an all-day event, or a birthday. */
export type Chip =
  | { readonly kind: "event"; readonly event: CalendarEvent }
  | { readonly kind: "birthday"; readonly birthday: Birthday };

/** Everything a day's blocks show. */
export interface DayContent {
  /** The day. */
  readonly view: DayView;
  /** Whether the school has a week plan: without one, notes and birthdays are unknown. */
  readonly weekPlan: boolean;
  /** The timetable. */
  readonly timetable: readonly TimetableRow[];
  /** The school hours. */
  readonly hours: { readonly start: string; readonly end: string } | undefined;
  /** The homework, in the order of the timetable. */
  readonly homework: readonly NoteView[];
  /** The plan for the day: every other note, as Meebook sends them. */
  readonly plan: readonly NoteView[];
  /** The configured things to bring. */
  readonly pack: readonly PackRow[];
  /** The week plan's reminders, quoted. */
  readonly quotes: readonly Quote[];
  /** The events: all-day first, then by start. */
  readonly events: readonly CalendarEvent[];
  /** The birthdays. */
  readonly birthdays: readonly Birthday[];
  /** The all-day events, holidays first, then the birthdays: the header's chips. */
  readonly chips: readonly Chip[];
}

/** What a day's content is made with. */
export interface ContentRules {
  /** Names subjects. */
  readonly namer: SubjectNamer;
  /** The configured things to bring. */
  readonly packing: readonly PackRule[];
  /** Whether the school has a week plan. */
  readonly weekPlan: boolean;
}

function status(value: string | null): LessonStatus | undefined {
  if (value === null || value.trim() === "" || value === "normal") return undefined;
  return value === "substitute" ? { kind: "substitute" } : { kind: "other", text: value };
}

/**
 * Returns what a day's blocks show. `now` marks the lessons over and going on, on today only:
 * a day that has not begun has no "now".
 */
export function dayContent(
  view: DayView,
  rules: ContentRules,
  now: Date,
  isToday: boolean,
): DayContent {
  const { namer, weekPlan } = rules;
  const timetable = timeline(mergeLessons(view.lessons)).map((entry): TimetableRow =>
    entry.kind === "break"
      ? entry
      : {
          kind: "lesson",
          block: entry.block,
          subject: namer(entry.block.lesson.title),
          time: isToday ? lessonTime(entry.block, now) : undefined,
          status: status(entry.block.lesson.status),
        },
  );
  const lessonKeys = view.lessons.map((lesson) => namer(lesson.title).key);
  const notes = weekPlan ? view.notes.map((note) => noteView(note, namer)) : [];
  const homework = inTimetableOrder(
    notes.filter((note) => isHomework(note.note)),
    (note) => note.subject?.key,
    lessonKeys,
  );
  const birthdays = weekPlan ? view.birthdays : [];
  const allDay = view.events.filter((event) => event.all_day);
  return {
    view,
    weekPlan,
    timetable,
    hours: schoolHours(view.lessons),
    homework,
    plan: notes.filter((note) => !isHomework(note.note)),
    pack: packRows(view.lessons, rules.packing, namer),
    quotes: quotes(notes, lessonKeys),
    events: view.events,
    birthdays,
    chips: [
      ...allDay.filter(isHolidayEvent).map((event) => ({ kind: "event" as const, event })),
      ...allDay
        .filter((event) => !isHolidayEvent(event))
        .map((event) => ({ kind: "event" as const, event })),
      ...birthdays.map((birthday) => ({ kind: "birthday" as const, birthday })),
    ],
  };
}

/** A block to show on a day; `empty` when it shows its empty text. */
export interface PlannedBlock {
  /** The block. */
  readonly id: BlockId;
  /** Whether it says it has nothing: no homework, or no timetable beside other content. */
  readonly empty: boolean;
}

/** The blocks a day shows, and its quotes. */
export interface BlockPlan {
  /** The blocks, in the configured order, without those that have nothing to show. */
  readonly blocks: readonly PlannedBlock[];
  /** The quotes Husk shows: none while both homework and the plan are hidden. */
  readonly quotes: readonly Quote[];
  /** Whether no block has anything: the day says "Intet i Aula for denne dag." */
  readonly nothing: boolean;
}

/**
 * Plans a day's blocks. A block without content is left out, except that homework says there is
 * none on a day with lessons where the school has a week plan, and the timetable says there is
 * none on a day with other content.
 */
export function planBlocks(content: DayContent, blocks: readonly BlockId[]): BlockPlan {
  const quoted =
    blocks.includes("homework") || blocks.includes("plan") ? content.quotes : ([] as const);
  const has: Record<BlockId, boolean> = {
    homework: content.homework.length > 0,
    pack: content.pack.length > 0 || quoted.length > 0,
    timetable: content.timetable.length > 0,
    plan: content.plan.length > 0,
    events: content.events.length > 0,
    birthdays: content.birthdays.length > 0,
  };
  const other = blocks.some((id) => id !== "timetable" && has[id]);
  const planned: PlannedBlock[] = [];
  for (const id of blocks) {
    if (has[id]) planned.push({ id, empty: false });
    else if (id === "homework" && content.weekPlan && content.view.lessons.length > 0)
      planned.push({ id, empty: true });
    else if (id === "timetable" && other) planned.push({ id, empty: true });
  }
  return { blocks: planned, quotes: quoted, nothing: planned.length === 0 };
}

/** Returns a day's chips, without those of a hidden block. */
export function visibleChips(content: DayContent, blocks: readonly BlockId[]): Chip[] {
  return content.chips.filter((chip) =>
    blocks.includes(chip.kind === "event" ? "events" : "birthdays"),
  );
}
