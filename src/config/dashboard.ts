/**
 * The Aula Connect dashboard's configuration: which parts it has, and the settings it gives every
 * card that has them, so that they are set once for the whole dashboard.
 *
 * @packageDocumentation
 */

import { configRecord, resolveCommon } from "./common.ts";
import { configForm, type ConfigForm } from "./form.ts";
import {
  CHILDREN_CARD,
  IMPORTANT_CARD,
  OVERVIEW_CARD,
  parseFlag,
  parseClock,
  parseImportant,
  parsePackIcons,
  parsePeople,
  parseSickThreads,
  parseText,
  SICK_CARD,
  VACATION_CARD,
} from "./family.ts";
import { WEEK_CARD } from "./week.ts";
import { WEEKPLAN_CARD } from "./weekplan.ts";

/** A key the dashboard gives the cards, as written in its configuration. */
export type SharedKey =
  | "switch_time"
  | "packing"
  | "pack_icons"
  | "subject_names"
  | "expand_abbreviations"
  | "people"
  | "sick_write"
  | "sick_message"
  | "sick_threads"
  | "sender"
  | "important"
  | "clock";

/** The keys each card of the dashboard takes from the dashboard's configuration. */
export const SHARED: Readonly<Record<string, readonly SharedKey[]>> = {
  [CHILDREN_CARD]: ["people"],
  [OVERVIEW_CARD]: [
    "switch_time",
    "packing",
    "pack_icons",
    "subject_names",
    "expand_abbreviations",
    "sick_write",
    "sick_message",
    "sick_threads",
    "sender",
    "important",
    "clock",
  ],
  [IMPORTANT_CARD]: ["switch_time", "subject_names", "expand_abbreviations"],
  [WEEKPLAN_CARD]: ["switch_time", "subject_names", "expand_abbreviations"],
  [WEEK_CARD]: ["switch_time", "packing", "subject_names", "expand_abbreviations"],
  [SICK_CARD]: ["sick_write", "sick_message", "sick_threads", "sender"],
  [VACATION_CARD]: ["sender"],
};

/** Returns the keys of `config` that `card` takes from the dashboard, as they are written. */
export function sharedWith(card: string, config: unknown): Record<string, unknown> {
  const raw = configRecord(config);
  return Object.fromEntries(
    (SHARED[card] ?? []).filter((key) => raw[key] !== undefined).map((key) => [key, raw[key]]),
  );
}

/**
 * Checks the dashboard's configuration as each card would.
 *
 * @throws Error naming the first invalid key.
 */
export function assertDashboardConfig(config: unknown, lenient = false): void {
  const raw = configRecord(config);
  resolveCommon(raw, lenient);
  parseFlag(raw.sick, "sick");
  parseFlag(raw.vacation, "vacation");
  parsePeople(raw.people, lenient);
  parsePackIcons(raw.pack_icons);
  parseText(raw.sick_message, "sick_message");
  parseSickThreads(raw.sick_threads, lenient);
  parseFlag(raw.sick_write, "sick_write");
  parseText(raw.sender, "sender");
  parseImportant(raw.important);
  parseClock(raw.clock);
}

/** Returns the dashboard's form for the visual editor: the parts it has, then the cards' settings. */
export function dashboardForm(): ConfigForm {
  return configForm(
    [
      "children",
      "sick",
      "vacation",
      "important",
      "clock",
      "packing_group",
      "subject_names_group",
      "switch_time",
      "people",
      "sick_write",
      "sick_message",
      "sick_threads",
      "sender",
    ],
    assertDashboardConfig,
  );
}
