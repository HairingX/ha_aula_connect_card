/**
 * Store snapshots and view contexts made from the scenarios, for testing views without a store.
 *
 * @packageDocumentation
 */

import { viewContext, type ViewContext } from "../../src/core/context.ts";
import { localTime } from "../../src/core/dates.ts";
import { rangeFor, type StoreSnapshot } from "../../src/core/store.ts";
import { childKey, type Child } from "../../src/core/types.ts";
import type { Focus } from "../../src/model/focus.ts";
import { fakeHass } from "../fake-hass.ts";
import type { Scenario } from "./scenarios.ts";

/** Returns the snapshot a store holds once a scenario's data has come. */
export function snapshotOf(
  item: Scenario,
  children: readonly Child[] = item.children,
): StoreSnapshot {
  const range = rangeFor(localTime(new Date(item.clock), item.zone).day);
  return {
    range,
    children: { list: item.children, error: undefined, refreshing: false },
    data: new Map(
      children.map((child) => [
        childKey(child),
        { range, data: item.data(child), error: undefined, stale: false },
      ]),
    ),
  };
}

/** Returns the view context at a scenario's time, in a language. */
export function contextOf(item: Scenario, language = "da", timeFormat = "language"): ViewContext {
  const hass = fakeHass({ language, locale: { time_format: timeFormat }, timeZone: item.zone });
  return viewContext(hass, new Date(item.clock));
}

/** Holds nothing: the focus chosen is the one shown. */
export function noHold(_key: string, chosen: Focus): Focus {
  return chosen;
}
