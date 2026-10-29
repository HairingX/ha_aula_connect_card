/**
 * Sorting the week plan's notes into the configured sections.
 *
 * @packageDocumentation
 */

import type { SectionConfig } from "./config";
import type { Task } from "./types";

/** A section and the notes in it, in the order they came. */
export interface TaskGroup {
  /** The section. */
  section: SectionConfig;
  /** The notes in it. */
  tasks: Task[];
}

function same(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}

/**
 * Tells whether a note matches a section's rule: every criterion the section sets must hold, so a
 * section with none matches every note.
 */
export function matchesSection(task: Task, section: SectionConfig): boolean {
  return (
    (section.type === undefined || same(task.type, section.type)) &&
    (section.subject === undefined || same(task.subject, section.subject)) &&
    (section.text === undefined ||
      (task.title ?? "").toLocaleLowerCase().includes(section.text.trim().toLocaleLowerCase()))
  );
}

/**
 * Groups notes by the first section each matches, in the sections' order; notes no section
 * matches go in `other`, last. Sections without notes are left out.
 */
export function groupTasks(
  tasks: readonly Task[],
  sections: readonly SectionConfig[],
  other: SectionConfig,
): TaskGroup[] {
  const named: TaskGroup[] = sections.map((section) => ({ section, tasks: [] }));
  const rest: TaskGroup = { section: other, tasks: [] };
  for (const task of tasks) {
    (named.find((group) => matchesSection(task, group.section)) ?? rest).tasks.push(task);
  }
  return [...named, rest].filter((group) => group.tasks.length > 0);
}
