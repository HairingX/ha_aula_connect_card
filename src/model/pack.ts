/**
 * Husk: what to bring on a day, as the configured items of the subjects on the day's timetable.
 * Nothing is read from the week plan's text, so it does not depend on its language.
 *
 * @packageDocumentation
 */

import type { Lesson } from "../core/types.ts";
import { isCancelled } from "./lessons.ts";
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
 * Returns the configured things to bring for a day's lessons that are held: one row per subject
 * with a rule, in the order of the timetable. A thing already listed for an earlier subject that
 * day, ignoring case, is left out.
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
    if (isCancelled(lesson)) continue;
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
