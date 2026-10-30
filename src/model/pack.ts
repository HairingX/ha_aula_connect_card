/**
 * Husk: what to bring on a day. Two sources, kept apart: the items configured for a subject,
 * applied to the day's lessons, and the week plan's own sentences with a reminder word, quoted
 * word for word. Nothing is inferred from free text.
 *
 * @packageDocumentation
 */

import type { Lesson } from "../core/types.ts";
import { isCancelled } from "./lessons.ts";
import { inTimetableOrder, isHomework, type NoteView } from "./notes.ts";
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
// "med" closing the phrase, as in "tag blade med i en pose", not "med hele klassen".
const CLOSING_MED = `${START}med(?=\\s*(?:[.,;:!?)–-]|$)|\\s+(?:i|til|hjem|hjemmefra|tilbage)${END})`;
// Things a class brings, as the last part of a word, in the singular, the plural or the definite
// form: "idrætstøj", "gummistøvler", "madpakken", "poserne". Each language's own words, so that
// the English "book" is no thing in "book en tid".
const things = (words: string, endings: string): string =>
  word(`\\p{L}*(?:${words})(?:${endings})?`);
const DANISH_THINGS = things(
  "madpakke|tøj|sko|støvle|håndklæde|taske|pose|bog|bøger|penalhus|blyant|lommeregner|computer|ipad|oplader|fløjte|instrument|dunk|flaske|frugt|seddel|sedl|kostume|hjelm|cykel|cykl|brille|trøje|jakke|hue|vante|handske|hætte|penge",
  "e|en|et|er|erne|ene|ne|n|t|r|rne|s",
);
const ENGLISH_THINGS = things("kit|towel|lunch|book|clothes|shoe|bag|bottle|coat|jacket", "s");
// A number of something: "husk to poser", "husk tre blade", but not "husk to gange om ugen".
const COUNTED =
  "\\s+(?:to|tre|fire|fem|seks|syv|otte|ni|ti)\\s+(?!(?:gange|dage|uger|timer|minutter|sider)\\b)\\p{L}";
const REMINDERS = [
  word("medbring(?:e|es)?|bring"),
  `${word("tag|tage")}.*${CLOSING_MED}`,
  `${word("skal\\s+have")}.*${CLOSING_MED}`,
  // "Husk madpakke", but not "husk at læse": that is homework, not something to bring.
  `${word("husk")}(?!\\s*,?\\s*at${END})(?:.*${DANISH_THINGS}|${COUNTED})`,
  `${word("remember")}(?!\\s+to${END}).*${ENGLISH_THINGS}`,
].map((pattern) => new RegExp(pattern, "iu"));

// Words a full stop shortens, after which a sentence goes on.
const ABBREVIATIONS = new Set([
  "kl",
  "s",
  "ss",
  "f.eks",
  "fx",
  "d",
  "ca",
  "nr",
  "bl.a",
  "evt",
  "inkl",
  "osv",
  "ang",
  "pga",
  "dvs",
  "jf",
  "vedr",
  "mht",
  "ift",
  "m.m",
  "o.l",
  "stk",
  "kap",
  "opg",
  "min",
  "ex",
  "tlf",
]);
const MONTH = /^(?:jan|feb|mar|apr|maj|may|jun|jul|aug|sep|okt|oct|nov|dec)/iu;

// A sentence ends at ".", "!" or "?" before a capital, but not after an abbreviation, nor in a
// date such as "3. November".
function ends(mark: string, before: string, after: string): boolean {
  if (!/^[\p{Lu}"“»(•]/u.test(after)) return false;
  if (mark !== ".") return true;
  const last = (/[\p{L}\p{N}.]+$/u.exec(before)?.[0] ?? "").toLocaleLowerCase("da");
  return !ABBREVIATIONS.has(last) && !(/^\d+$/.test(last) && MONTH.test(after));
}

/**
 * Returns a text's sentences: split at line breaks, and after ".", "!" or "?" where the next
 * sentence begins, but not after an abbreviation such as "kl." or "f.eks." or in a date.
 */
export function sentences(text: string): string[] {
  const result: string[] = [];
  for (const line of text.split("\n")) {
    let from = 0;
    for (const match of line.matchAll(/([.!?])\s+/gu)) {
      const at = match.index;
      const next = at + match[0].length;
      if (!ends(match[1] ?? "", line.slice(from, at), line.slice(next))) continue;
      result.push(line.slice(from, at + 1));
      from = next;
    }
    result.push(line.slice(from));
  }
  return result
    .map((sentence) => sentence.replace(/^•\s*/u, "").trim())
    .filter((sentence) => sentence !== "");
}

/**
 * Tells whether a sentence asks to bring something: "medbring", "tag ... med", "skal have ...
 * med", or "husk" with a thing a class brings, such as "Husk madpakke"; never "husk at læse".
 */
export function isReminder(sentence: string): boolean {
  return REMINDERS.some((pattern) => pattern.test(sentence));
}

/**
 * Returns the sentences of a day's notes, of any type, that ask to bring something: each once,
 * at most `MAX_QUOTES`, in the order of their subject's first lesson. When there are more, the
 * plan's are kept before the homework's, which is shown in full.
 */
export function quotes(notes: readonly NoteView[], lessonKeys: readonly string[]): Quote[] {
  const found: (Quote & { homework: boolean })[] = [];
  const seen = new Set<string>();
  for (const note of notes) {
    for (const sentence of sentences(note.text)) {
      const key = sentence.toLocaleLowerCase("da");
      if (seen.has(key) || !isReminder(sentence)) continue;
      seen.add(key);
      found.push({ text: sentence, subject: note.subject, homework: isHomework(note.note) });
    }
  }
  const kept = new Set(
    [...found].sort((a, b) => Number(a.homework) - Number(b.homework)).slice(0, MAX_QUOTES),
  );
  return inTimetableOrder(
    found.filter((quote) => kept.has(quote)),
    (quote) => quote.subject?.key,
    lessonKeys,
  ).map(({ text, subject }) => ({ text, subject }));
}
