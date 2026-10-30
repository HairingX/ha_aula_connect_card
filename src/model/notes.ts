/**
 * The week plan's notes as the cards show them: homework apart from the plan for the day, each
 * with its subject named, as plain text.
 *
 * @packageDocumentation
 */

import { htmlToText } from "../core/text.ts";
import type { Task } from "../core/types.ts";
import type { SubjectLabel, SubjectNamer } from "./subjects.ts";

/** A note as shown. */
export interface NoteView {
  /** The note. */
  readonly note: Task;
  /** Its subject, named; undefined when the note has none. */
  readonly subject: SubjectLabel | undefined;
  /** Meebook's title, when the note has one. */
  readonly title: string | undefined;
  /** The note's text, without its HTML. */
  readonly text: string;
}

/** Tells whether a note is homework: Meebook's type `task`. Every other type is the plan. */
export function isHomework(note: Task): boolean {
  return note.type === "task";
}

/** Returns a note as shown. */
export function noteView(note: Task, namer: SubjectNamer): NoteView {
  const subject = note.subject.trim();
  const title = note.title?.trim();
  return {
    note,
    subject: subject === "" ? undefined : namer(subject),
    title: title === undefined || title === "" ? undefined : title,
    text: htmlToText(note.content),
  };
}

/**
 * Returns items in the order of the day's timetable: by the first lesson of their subject, then
 * those whose subject has no lesson, in the order given.
 */
export function inTimetableOrder<T>(
  items: readonly T[],
  keyOf: (item: T) => string | undefined,
  lessonKeys: readonly string[],
): T[] {
  const position = (item: T): number => {
    const key = keyOf(item);
    const index = key === undefined ? -1 : lessonKeys.indexOf(key);
    return index < 0 ? lessonKeys.length : index;
  };
  return items
    .map((item, index) => ({ item, index, position: position(item) }))
    .sort((a, b) => a.position - b.position || a.index - b.index)
    .map((entry) => entry.item);
}
