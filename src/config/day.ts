/**
 * The school day card's configuration.
 *
 * @packageDocumentation
 */

import {
  configRecord,
  resolveBlocks,
  resolveCommon,
  type BlocksConfig,
  type CommonConfig,
} from "./common.ts";
import { configForm, type ConfigForm } from "./form.ts";

/** The school day card's element. */
export const DAY_CARD = "aula-connect-day-card";

/** The school day card's configuration, with its defaults filled in. */
export interface DayCardConfig extends CommonConfig, BlocksConfig {
  /** Whether each child's blocks follow in a column of its own, or each block holds every child. */
  readonly groupBy: "block" | "child";
}

/** Reads `group_by`: block or child, child by default. */
export function parseGroupBy(value: unknown): "block" | "child" {
  if (value === undefined || value === null || value === "") return "child";
  if (value !== "block" && value !== "child") throw new Error("group_by: must be block or child");
  return value;
}

/**
 * Checks a school day card's configuration and fills in its defaults; `lenient` leaves out the
 * rows the editor is still filling in.
 *
 * @throws Error naming the first invalid key.
 */
export function resolveDayConfig(config: unknown, lenient = false): DayCardConfig {
  const raw = configRecord(config);
  const common = resolveCommon(raw, lenient);
  return {
    ...common,
    ...resolveBlocks(raw),
    groupBy: parseGroupBy(raw.group_by),
  };
}

/** Returns the school day card's form. */
export function dayConfigForm(): ConfigForm {
  return configForm(
    [
      "children",
      "group_by",
      "order",
      "show",
      "timetable",
      "info_lines",
      "switch_time",
      "size",
      "packing_group",
      "subject_names_group",
    ],
    resolveDayConfig,
  );
}
