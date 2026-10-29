/**
 * What the cards on the page have seen, for the visual editor: Home Assistant builds the editor's
 * form without `hass` or the configuration, so its choices come from here. Memory only: nothing
 * is kept in the browser's storage, as a shared screen must not keep a child's data.
 *
 * @packageDocumentation
 */

import type { Child } from "./types.ts";

let children: readonly Child[] = [];
let language: string | undefined;
const lessonTitles = new Set<string>();
const noteSubjects = new Set<string>();

/** Remembers the children Aula Connect last listed. */
export function rememberChildren(list: readonly Child[]): void {
  children = [...list];
}

/** Returns the children Aula Connect last listed. */
export function knownChildren(): readonly Child[] {
  return children;
}

/** Remembers the language a card was last shown in. */
export function rememberLanguage(value: string): void {
  language = value;
}

/** Returns the language a card was last shown in. */
export function rememberedLanguage(): string | undefined {
  return language;
}

/** Remembers lessons' titles and notes' subjects as Aula sends them. */
export function rememberSubjects(titles: Iterable<string>, subjects: Iterable<string>): void {
  for (const title of titles) if (title.trim() !== "") lessonTitles.add(title.trim());
  for (const subject of subjects) if (subject.trim() !== "") noteSubjects.add(subject.trim());
}

/** Returns the lesson titles seen, sorted. */
export function knownLessonTitles(): string[] {
  return [...lessonTitles].sort((a, b) => a.localeCompare(b, "da"));
}

/** Returns the notes' subjects seen, sorted. */
export function knownNoteSubjects(): string[] {
  return [...noteSubjects].sort((a, b) => a.localeCompare(b, "da"));
}

/** Forgets everything; for tests. */
export function forget(): void {
  children = [];
  language = undefined;
  lessonTitles.clear();
  noteSubjects.clear();
}
