/**
 * The blocks a day is shown in, their order, and what each holds on a day.
 *
 * @packageDocumentation
 */

import { isWeekend, startOfWeek, weekNumber } from "../core/dates.ts";
import type { Birthday, CalendarEvent, Day } from "../core/types.ts";
import {
  isHolidayEvent,
  isSchoolDay,
  isWholeDay,
  spanOn,
  type DayView,
  type EventSpan,
} from "./days.ts";
import {
  isCancelled,
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
export const BLOCKS = ["task", "pack", "timetable", "comment", "events", "birthdays"] as const;

/** A block of a day. */
export type BlockId = (typeof BLOCKS)[number];

/** The default order of the blocks: what to do and bring first. */
export const DEFAULT_ORDER: readonly BlockId[] = BLOCKS;

/** Which blocks are shown. */
export type ShowConfig = Readonly<Partial<Record<BlockId, boolean>>>;

/** Tells whether a block is shown: its own switch, else yes. */
export function isShown(id: BlockId, show: ShowConfig): boolean {
  return show[id] ?? true;
}

/**
 * Returns the blocks to show, in order: those `order` names first, in its order, then the rest in
 * the default order, without the hidden ones. An empty `order` is the default order. On a wall
 * screen the default order starts with Husk, which is read from across the room.
 */
export function orderBlocks(order: readonly BlockId[], show: ShowConfig, wall = false): BlockId[] {
  return [...new Set([...order, ...(wall ? (["pack"] as const) : []), ...DEFAULT_ORDER])].filter(
    (id) => isShown(id, show),
  );
}

/** A lesson's status as shown: a substitute, or another change in Aula's own words. */
export type LessonStatus =
  | {
      /** A substitute teacher. */
      readonly kind: "substitute";
    }
  | {
      /** Another change. */
      readonly kind: "other";
      /** Aula's own words for it. */
      readonly text: string;
    };

/** A row of a day's timetable with lessons: one, or back-to-back ones that are the same. */
export interface LessonRow {
  /** A block of lessons. */
  readonly kind: "lesson";
  /** The lessons. */
  readonly block: LessonBlock;
  /** Their subject, named. */
  readonly subject: SubjectLabel;
  /** Where the lessons are in time; undefined on a day that is not today. */
  readonly time: LessonTime | undefined;
  /** A change Aula reports, such as a substitute. */
  readonly status: LessonStatus | undefined;
  /** Whether they are cancelled: they count for no school hours. */
  readonly cancelled: boolean;
}

/** A row of a day's timetable: a block of lessons, or a break. */
export type TimetableRow =
  | LessonRow
  | {
      /** A break between lessons. */
      readonly kind: "break";
      /** When it begins. */
      readonly start: string;
      /** When it ends. */
      readonly end: string;
      /** How long it is. */
      readonly minutes: number;
    };

/** Something a day's header says in a word: an event lasting the whole day, or a birthday. */
export type Fact =
  | {
      /** An all-day event, or a day a longer event runs through. */
      readonly kind: "event";
      /** The event. */
      readonly event: CalendarEvent;
    }
  | {
      /** A classmate's birthday. */
      readonly kind: "birthday";
      /** The birthday. */
      readonly birthday: Birthday;
    };

/** An event at a time of a day, and how it is on that day. */
export interface TimedEvent {
  /** The event. */
  readonly event: CalendarEvent;
  /** Within the day, or from or until a time on the first or last of its days. */
  readonly span: EventSpan;
}

/** Everything a day's blocks show. */
export interface DayContent {
  /** The day. */
  readonly view: DayView;
  /** Whether the day is a school day. */
  readonly schoolDay: boolean;
  /** Whether the school has a week plan: without one, notes and birthdays are unknown. */
  readonly weekPlan: boolean;
  /** The number of the day's week, when its week plan is not in Aula yet. */
  readonly planMissing: number | undefined;
  /** The timetable. */
  readonly timetable: readonly TimetableRow[];
  /** The school hours of the lessons held. */
  readonly hours: { readonly start: string; readonly end: string } | undefined;
  /** The subjects of the lessons held, each once, in the order of the timetable. */
  readonly subjects: readonly SubjectLabel[];
  /** The homework, in the order of the timetable. */
  readonly homework: readonly NoteView[];
  /** The plan for the day: every other note, as Meebook sends them. */
  readonly plan: readonly NoteView[];
  /** The configured things to bring. */
  readonly pack: readonly PackRow[];
  /** The week plan's reminders, quoted. */
  readonly quotes: readonly Quote[];
  /** The events at a time of the day, in the order they begin. */
  readonly timed: readonly TimedEvent[];
  /** The events lasting the whole day, holidays first, then the birthdays. */
  readonly facts: readonly Fact[];
}

/** What a day's content is made with: a child's settings and what its range says. */
export interface ContentRules {
  /** Names subjects. */
  readonly namer: SubjectNamer;
  /** The configured things to bring. */
  readonly packing: readonly PackRule[];
  /** Whether the school has a week plan. */
  readonly weekPlan: boolean;
  /** Whether the school keeps its timetable in Aula. */
  readonly timetabled: boolean;
  /** The Mondays of the weeks whose week plan is not in Aula yet. */
  readonly planMissing: ReadonlySet<Day>;
  /** The time zone days are counted in. */
  readonly zone: string;
}

/** Returns a day's homework, in the order of its timetable. */
export function homeworkOf(view: DayView, rules: ContentRules): NoteView[] {
  if (!rules.weekPlan) return [];
  return inTimetableOrder(
    view.notes.filter(isHomework).map((note) => noteView(note, rules.namer)),
    (note) => note.subject?.key,
    view.lessons.map((lesson) => rules.namer(lesson.title).key),
  );
}

/** Returns a day's notes other than what the week plan marks. */
export function commentsOf(view: DayView, rules: ContentRules): NoteView[] {
  if (!rules.weekPlan) return [];
  return view.notes.filter((note) => !isHomework(note)).map((note) => noteView(note, rules.namer));
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
  const { namer, weekPlan, zone } = rules;
  const timetable = timeline(mergeLessons(view.lessons)).map((entry): TimetableRow =>
    entry.kind === "break"
      ? entry
      : {
          kind: "lesson",
          block: entry.block,
          subject: namer(entry.block.lesson.title),
          time: isToday ? lessonTime(entry.block, now) : undefined,
          status: status(entry.block.lesson.status),
          cancelled: isCancelled(entry.block.lesson),
        },
  );
  const lessonKeys = view.lessons.map((lesson) => namer(lesson.title).key);
  const subjects = new Map<string, SubjectLabel>();
  for (const lesson of view.lessons) {
    const subject = namer(lesson.title);
    if (!isCancelled(lesson) && !subjects.has(subject.key)) subjects.set(subject.key, subject);
  }
  const notes = weekPlan ? view.notes.map((note) => noteView(note, namer)) : [];
  const whole = view.events.filter((event) => isWholeDay(event, view.day, zone));
  return {
    view,
    schoolDay: isSchoolDay(view, rules.timetabled),
    weekPlan,
    planMissing:
      weekPlan && rules.planMissing.has(startOfWeek(view.day)) ? weekNumber(view.day) : undefined,
    timetable,
    hours: schoolHours(view.lessons),
    subjects: [...subjects.values()],
    homework: homeworkOf(view, rules),
    plan: commentsOf(view, rules),
    pack: packRows(view.lessons, rules.packing, namer),
    quotes: quotes(notes, lessonKeys),
    timed: view.events
      .filter((event) => !whole.includes(event))
      .map((event) => ({ event, span: spanOn(event, view.day, zone) })),
    facts: [
      ...[...whole.filter(isHolidayEvent), ...whole.filter((event) => !isHolidayEvent(event))].map(
        (event) => ({ kind: "event" as const, event }),
      ),
      ...(weekPlan ? view.birthdays : []).map((birthday) => ({
        kind: "birthday" as const,
        birthday,
      })),
    ],
  };
}

/** Why a block shows a sentence instead of content. */
export type EmptyKind = "noHomework" | "planMissing" | "noWeekPlan" | "noTimetable";

/** A block to show on a day. */
export interface PlannedBlock {
  /** The block. */
  readonly id: BlockId;
  /** Why it says it has nothing; undefined when it has content. */
  readonly empty: EmptyKind | undefined;
}

/** The blocks a day shows, and its quotes. */
export interface BlockPlan {
  /** The blocks, in the configured order, without those that have nothing to show. */
  readonly blocks: readonly PlannedBlock[];
  /** The quotes Husk shows: none while both homework and the plan are hidden. */
  readonly quotes: readonly Quote[];
  /** The subjects Husk names: none while the timetable, which lists them, is shown. */
  readonly subjects: readonly SubjectLabel[];
  /** Whether no block has anything: the day says "Intet i Aula for denne dag." */
  readonly nothing: boolean;
}

function homeworkEmpty(content: DayContent): EmptyKind | undefined {
  if (!content.schoolDay) return undefined;
  if (!content.weekPlan) return "noWeekPlan";
  return content.planMissing === undefined ? "noHomework" : "planMissing";
}

/**
 * Plans a day's blocks. A block without content is left out, except that homework on a school
 * day says why it has none, and the timetable says there is none on a weekday with other
 * content. Events lasting the whole day and birthdays are the header's, so the events block holds
 * the timed events only, and birthdays are no block.
 */
export function planBlocks(content: DayContent, blocks: readonly BlockId[]): BlockPlan {
  const quoted =
    blocks.includes("task") || blocks.includes("comment") ? content.quotes : ([] as const);
  const subjects = blocks.includes("timetable") ? [] : content.subjects;
  const has: Record<BlockId, boolean> = {
    task: content.homework.length > 0,
    pack: subjects.length > 0 || content.pack.length > 0 || quoted.length > 0,
    timetable: content.timetable.length > 0,
    comment: content.plan.length > 0,
    events: content.timed.length > 0,
    birthdays: false,
  };
  // A day with something else on it says it has no timetable, so the header's facts count.
  const other =
    visibleFacts(content, blocks).length > 0 || blocks.some((id) => id !== "timetable" && has[id]);
  const planned: PlannedBlock[] = [];
  for (const id of blocks) {
    const empty =
      id === "task"
        ? homeworkEmpty(content)
        : id === "timetable" && other && !isWeekend(content.view.day)
          ? "noTimetable"
          : undefined;
    if (has[id]) planned.push({ id, empty: undefined });
    else if (empty) planned.push({ id, empty });
  }
  return { blocks: planned, quotes: quoted, subjects, nothing: planned.length === 0 };
}

/**
 * Returns the folded timetable: a line for each subject as it comes, from the start of its first
 * lesson to the end of its last, joining only lessons with no break between them, so that the
 * breaks show as gaps between the times. A lesson whose status differs from the one before it
 * has a line of its own, as it is news.
 */
export function foldTimetable(rows: readonly TimetableRow[]): LessonRow[] {
  const lines: LessonRow[] = [];
  let before: TimetableRow | undefined;
  for (const row of rows) {
    const last = lines[lines.length - 1];
    if (row.kind === "lesson") {
      const joins =
        before?.kind === "lesson" &&
        last !== undefined &&
        last.subject.key === row.subject.key &&
        last.cancelled === row.cancelled &&
        JSON.stringify(last.status) === JSON.stringify(row.status);
      if (joins)
        lines[lines.length - 1] = { ...last, block: { ...last.block, end: row.block.end } };
      else lines.push(row);
    }
    before = row;
  }
  return lines;
}

/** Returns a day's facts, without those of a hidden block. */
export function visibleFacts(content: DayContent, blocks: readonly BlockId[]): Fact[] {
  return content.facts.filter((fact) =>
    blocks.includes(fact.kind === "event" ? "events" : "birthdays"),
  );
}
