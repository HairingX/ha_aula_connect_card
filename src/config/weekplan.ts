/**
 * The week plan card's configuration. `packing` is accepted and unused, so that one
 * configuration can be copied between the cards.
 *
 * @packageDocumentation
 */

import { configRecord, resolveCommon, type CommonConfig } from "./common.ts";
import type { NotesShown } from "../model/homework-view.ts";
import { configForm, type ConfigForm } from "./form.ts";

/** The week plan card's element. */
export const WEEKPLAN_CARD = "aula-connect-weekplan-card";

/** The week plan card's configuration, with its defaults filled in. */
export interface WeekplanCardConfig extends CommonConfig {
  /** Which of the week plan's notes the card shows. */
  readonly notes: NotesShown;
}

/** Reads `notes`: tasks, comments or all. */
export function parseNotes(value: unknown): NotesShown {
  if (value === undefined || value === null || value === "") return "tasks";
  if (value !== "tasks" && value !== "comments" && value !== "all") {
    throw new Error("notes: must be tasks, comments or all");
  }
  return value;
}

/**
 * Checks a week plan card's configuration and fills in its defaults; `lenient` leaves out the
 * rows the editor is still filling in.
 *
 * @throws Error naming the first invalid key.
 */
export function resolveWeekplanConfig(config: unknown, lenient = false): WeekplanCardConfig {
  const raw = configRecord(config);
  return { ...resolveCommon(raw, lenient), notes: parseNotes(raw.notes) };
}

/** Returns the week plan card's form. */
export function weekplanConfigForm(): ConfigForm {
  return configForm(
    [
      "children",
      "notes",
      "task_label",
      "comment_label",
      "info_lines",
      "switch_time",
      "size",
      "subject_names_group",
    ],
    resolveWeekplanConfig,
  );
}
