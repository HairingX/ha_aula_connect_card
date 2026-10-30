/**
 * The week card's configuration.
 *
 * @packageDocumentation
 */

import {
  configRecord,
  parseWeeks,
  resolveBlocks,
  resolveCommon,
  type BlocksConfig,
  type CommonConfig,
} from "./common.ts";
import { configForm, type ConfigForm } from "./form.ts";

/** The week card's element. */
export const WEEK_CARD = "aula-connect-week-card";

/** The week card's configuration, with its defaults filled in. */
export interface WeekCardConfig extends CommonConfig, BlocksConfig {
  /** 1: the week of the focus day, after this week when it is next week; 2: this week and next. */
  readonly weeks: 1 | 2;
}

/**
 * Checks a week card's configuration and fills in its defaults; `lenient` leaves out the
 * rows the editor is still filling in.
 *
 * @throws Error naming the first invalid key.
 */
export function resolveWeekConfig(config: unknown, lenient = false): WeekCardConfig {
  const raw = configRecord(config);
  const common = resolveCommon(raw, lenient);
  return {
    ...common,
    ...resolveBlocks(raw, common.size === "large"),
    weeks: parseWeeks(raw.weeks),
  };
}

/** Returns the week card's form. */
export function weekConfigForm(): ConfigForm {
  return configForm(
    [
      "children",
      "weeks",
      "order",
      "show",
      "timetable",
      "info_lines",
      "task_label",
      "comment_label",
      "switch_time",
      "size",
      "packing_group",
      "subject_names_group",
    ],
    resolveWeekConfig,
  );
}
