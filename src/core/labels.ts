/**
 * The names and icons of the week plan's two kinds of notes, as the configuration chooses them.
 *
 * @packageDocumentation
 */

import type { CommentLabel, TaskLabel, ViewContext } from "./context.ts";
import type { TextKey } from "./i18n.ts";

/** The text of each name of the marked notes. */
export const TASK_NAMES: Readonly<Record<TaskLabel, TextKey>> = {
  important: "taskImportant",
  tasks: "taskTasks",
  homework: "taskHomework",
};

const TASK_COUNTS: Readonly<Record<TaskLabel, TextKey>> = {
  important: "countImportant",
  tasks: "countTasks",
  homework: "countHomework",
};

const TASK_ICONS: Readonly<Record<TaskLabel, string>> = {
  important: "mdi:flag-outline",
  tasks: "mdi:format-list-checks",
  homework: "mdi:book-open-page-variant-outline",
};

/** The text of each name of the other notes. */
export const COMMENT_NAMES: Readonly<Record<CommentLabel, TextKey>> = {
  plan: "commentPlan",
  comments: "commentComments",
  info: "commentInfo",
  notes: "commentNotes",
};

const COMMENT_ICONS: Readonly<Record<CommentLabel, string>> = {
  plan: "mdi:clipboard-text-outline",
  comments: "mdi:comment-text-outline",
  info: "mdi:information-outline",
  notes: "mdi:note-text-outline",
};

/** Returns the marked notes' name, such as "Vigtigt". */
export function taskName(ctx: ViewContext): string {
  return ctx.t(TASK_NAMES[ctx.labels.task]);
}

/** Returns how many marked notes there are, such as "2 vigtige". */
export function taskCount(ctx: ViewContext, n: number): string {
  return ctx.t(TASK_COUNTS[ctx.labels.task], { n });
}

/** Returns the marked notes' icon. */
export function taskIcon(ctx: ViewContext): string {
  return TASK_ICONS[ctx.labels.task];
}

/** Returns the other notes' name, such as "Dagens plan". */
export function commentName(ctx: ViewContext): string {
  return ctx.t(COMMENT_NAMES[ctx.labels.comment]);
}

/** Returns the other notes' icon. */
export function commentIcon(ctx: ViewContext): string {
  return COMMENT_ICONS[ctx.labels.comment];
}
