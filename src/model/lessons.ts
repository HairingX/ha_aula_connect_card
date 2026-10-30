/**
 * A day's lessons as a timetable: back-to-back lessons that are the same as one, and the breaks
 * between them.
 *
 * @packageDocumentation
 */

import { instant } from "../core/dates.ts";
import type { Lesson } from "../core/types.ts";

/** The most time between two lessons that are shown as one, as between a double lesson's halves. */
export const MERGE_GAP_MS = 10 * 60_000;

/** The least time between two lessons that is shown as a break. */
export const BREAK_MS = 20 * 60_000;

/** One lesson, or back-to-back lessons that are the same, shown as one. */
export interface LessonBlock {
  /** The first lesson; the others differ only in their times and ids. */
  readonly lesson: Lesson;
  /** When the first lesson begins. */
  readonly start: string;
  /** When the last lesson ends. */
  readonly end: string;
}

/** A row of a day's timetable: lessons, or a break between them. */
export type TimelineEntry =
  | {
      /** Lessons. */
      readonly kind: "lessons";
      /** The block of lessons. */
      readonly block: LessonBlock;
    }
  | {
      /** A break. */
      readonly kind: "break";
      /** When it begins. */
      readonly start: string;
      /** When it ends. */
      readonly end: string;
      /** How long it is. */
      readonly minutes: number;
    };

function normal(status: string | null): string {
  return status === null || status === "normal" ? "" : status;
}

/** Tells whether a lesson is cancelled, by Aula's status in Danish or English. */
export function isCancelled(lesson: Lesson): boolean {
  return /\b(?:aflyst|cancell?ed)\b/i.test(lesson.status ?? "");
}

function people(teachers: readonly string[]): string {
  return JSON.stringify(
    teachers
      .map((name) => name.trim())
      .filter((name) => name !== "")
      .sort(),
  );
}

/** Tells whether two lessons are the same but for their times: subject, teachers, room, status. */
export function sameLesson(a: Lesson, b: Lesson): boolean {
  return (
    a.title.trim() === b.title.trim() &&
    people(a.teachers) === people(b.teachers) &&
    (a.location ?? "").trim() === (b.location ?? "").trim() &&
    normal(a.status) === normal(b.status)
  );
}

function millis(text: string): number {
  return instant(text)?.getTime() ?? Number.NaN;
}

/**
 * Joins back-to-back lessons that are the same into blocks: a lesson joins the block before it
 * when it is the same and begins at most `MERGE_GAP_MS` after the block ends. The lessons are
 * taken in the order given, which should be the order they begin.
 */
export function mergeLessons(lessons: readonly Lesson[]): LessonBlock[] {
  const blocks: { lesson: Lesson; start: string; end: string }[] = [];
  for (const lesson of lessons) {
    const last = blocks[blocks.length - 1];
    const gap = millis(lesson.start) - millis(last?.end ?? "");
    if (last && sameLesson(last.lesson, lesson) && gap >= 0 && gap <= MERGE_GAP_MS) {
      last.end = lesson.end;
    } else {
      blocks.push({ lesson, start: lesson.start, end: lesson.end });
    }
  }
  return blocks;
}

/**
 * Returns a day's timetable rows: the blocks, with a break between two where nothing is on for
 * `BREAK_MS` or more. Times that cannot be read make no break.
 */
export function timeline(blocks: readonly LessonBlock[]): TimelineEntry[] {
  const result: TimelineEntry[] = [];
  // The latest end so far: a long lesson beside shorter ones leaves no break while it lasts.
  let latest: { end: string; time: number } | undefined;
  for (const block of blocks) {
    const gap = latest ? millis(block.start) - latest.time : Number.NaN;
    if (latest && gap >= BREAK_MS) {
      result.push({
        kind: "break",
        start: latest.end,
        end: block.start,
        minutes: Math.round(gap / 60_000),
      });
    }
    result.push({ kind: "lessons", block });
    const ends = millis(block.end);
    if (!Number.isNaN(ends) && (!latest || ends > latest.time)) {
      latest = { end: block.end, time: ends };
    }
  }
  return result;
}

/**
 * Returns a day's school hours: from its first lesson's start to its last lesson's end, leaving
 * out cancelled lessons.
 */
export function schoolHours(
  lessons: readonly Lesson[],
): { start: string; end: string } | undefined {
  const held = lessons.filter((lesson) => !isCancelled(lesson));
  const first = held[0];
  if (!first) return undefined;
  let end = first.end;
  for (const lesson of held) if (millis(lesson.end) > millis(end)) end = lesson.end;
  return { start: first.start, end };
}

/** Where a lesson is in time: over, going on, or to come. */
export type LessonTime = "past" | "now" | "future";

/** Returns where a block of lessons is in time at `now`. */
export function lessonTime(block: LessonBlock, now: Date): LessonTime {
  const time = now.getTime();
  if (millis(block.end) <= time) return "past";
  return millis(block.start) <= time ? "now" : "future";
}
