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
export interface DayCardConfig extends CommonConfig, BlocksConfig {}

/**
 * Checks a school day card's configuration and fills in its defaults.
 *
 * @throws Error naming the first invalid key.
 */
export function resolveDayConfig(config: unknown): DayCardConfig {
  const raw = configRecord(config);
  return { ...resolveCommon(raw), ...resolveBlocks(raw) };
}

/** Returns the school day card's form. */
export function dayConfigForm(): ConfigForm {
  return configForm(
    ["children", "order", "show", "switch_time", "size", "packing_group", "subject_names_group"],
    resolveDayConfig,
  );
}
