/**
 * Husk: what to bring on a day. Two sources, kept apart: the items configured for a subject,
 * applied to the day's lessons, and the week plan's own sentences with a reminder word, quoted
 * word for word. Nothing is inferred from free text.
 *
 * @packageDocumentation
 */

import type { Lesson } from "../core/types.ts";
import { inTimetableOrder, type NoteView } from "./notes.ts";
import type { SubjectLabel, SubjectNamer } from "./subjects.ts";

/** The things to bring when a subject is on the timetable. */
export interface PackRule {
  /** The subject, by any of its names: "Idræt" and "IDR" alike. */
  readonly subject: string;
  /** The things, as written. */
  readonly items: readonly string[];
}

/** The things to bring for one of the day's subjects. */
export interface PackRow {
  /** The subject, as the timetable names it. */
  readonly subject: SubjectLabel;
  /** The things, as written, each once a day. */
  readonly items: readonly string[];
}

/**
 * Returns the configured things to bring for a day's lessons: one row per subject with a rule, in
 * the order of the timetable. A thing already listed for an earlier subject that day, ignoring
 * case, is left out.
 */
export function packRows(
  lessons: readonly Lesson[],
  rules: readonly PackRule[],
  namer: SubjectNamer,
): PackRow[] {
  const rows: PackRow[] = [];
  const subjects = new Set<string>();
  const listed = new Set<string>();
  for (const lesson of lessons) {
    const subject = namer(lesson.title);
    if (subjects.has(subject.key)) continue;
    subjects.add(subject.key);
    const items: string[] = [];
    for (const rule of rules) {
      if (namer(rule.subject).key !== subject.key) continue;
      for (const item of rule.items) {
        const key = item.trim().toLocaleLowerCase("da");
        if (key === "" || listed.has(key)) continue;
        listed.add(key);
        items.push(item.trim());
      }
    }
    if (items.length > 0) rows.push({ subject, items });
  }
  return rows;
}

/** A sentence from the week plan with a reminder word in it. */
export interface Quote {
  /** The sentence, word for word. */
  readonly text: string;
  /** The subject of the note it is from. */
  readonly subject: SubjectLabel | undefined;
}

/** The most quotes shown for a day. */
export const MAX_QUOTES = 3;

// Whole words, ignoring case, in any alphabet. A lookbehind would be simpler, but older Safari
// on wall tablets cannot parse one, and the whole bundle would fail to load.
const START = "(?:^|[^\\p{L}\\p{N}])";
const END = "(?=[^\\p{L}\\p{N}]|$)";
const word = (pattern: string): string => `${START}(?:${pattern})${END}`;
const REMINDERS = [
  word("husk"),
  word("medbringe?"),
  `${word("tage?")}.*${word("med")}`,
  `${word("skal\\s+have")}.*${word("med")}`,
  word("remember"),
  word("bring"),
].map((pattern) => new RegExp(pattern, "iu"));

/** Returns a text's sentences: split at line breaks, and after ".", "!" or "?" and a space. */
export function sentences(text: string): string[] {
  return text
    .replace(/([.!?])\s+/gu, "$1\n")
    .split("\n")
    .map((sentence) => sentence.replace(/^•\s*/u, "").trim())
    .filter((sentence) => sentence !== "");
}

/** Tells whether a sentence asks to remember or bring something. */
export function isReminder(sentence: string): boolean {
  return REMINDERS.some((pattern) => pattern.test(sentence));
}

/**
 * Returns the sentences of a day's notes, of any type, that ask to remember or bring something:
 * each once, in the order of their subject's first lesson, at most `MAX_QUOTES`.
 */
export function quotes(notes: readonly NoteView[], lessonKeys: readonly string[]): Quote[] {
  const found: Quote[] = [];
  const seen = new Set<string>();
  for (const note of notes) {
    for (const sentence of sentences(note.text)) {
      const key = sentence.toLocaleLowerCase("da");
      if (seen.has(key) || !isReminder(sentence)) continue;
      seen.add(key);
      found.push({ text: sentence, subject: note.subject });
    }
  }
  return inTimetableOrder(found, (quote) => quote.subject?.key, lessonKeys).slice(0, MAX_QUOTES);
}
