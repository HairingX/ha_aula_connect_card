/**
 * The homework card's configuration. `packing` is accepted and unused, so that one configuration
 * can be copied between the cards.
 *
 * @packageDocumentation
 */

import { configRecord, resolveCommon, type CommonConfig } from "./common.ts";
import { configForm, type ConfigForm } from "./form.ts";

/** The homework card's element. */
export const HOMEWORK_CARD = "aula-connect-homework-card";

/** The homework card's configuration, with its defaults filled in. */
export type HomeworkCardConfig = CommonConfig;

/**
 * Checks a homework card's configuration and fills in its defaults.
 *
 * @throws Error naming the first invalid key.
 */
export function resolveHomeworkConfig(config: unknown): HomeworkCardConfig {
  return resolveCommon(configRecord(config));
}

/** Returns the homework card's form. */
export function homeworkConfigForm(): ConfigForm {
  return configForm(
    ["children", "switch_time", "size", "subject_names_group"],
    resolveHomeworkConfig,
  );
}
