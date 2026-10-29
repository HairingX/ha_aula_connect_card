/**
 * What every view needs to know besides the data: the user's language, time format and time
 * zone, and the time now in that zone.
 *
 * @packageDocumentation
 */

import { localTime, timeZone, useAmPm } from "./dates.ts";
import { cardLanguage, translator, type Translate } from "./i18n.ts";
import type { Day, HassLocale, HomeAssistant } from "./types.ts";

/** The user's settings and the time now. */
export interface ViewContext {
  /** The cards' texts in the user's language. */
  readonly t: Translate;
  /** The language of the cards' texts. */
  readonly lang: "da" | "en";
  /** The language dates and times are formatted in. */
  readonly language: string;
  /** The time zone times are shown in. */
  readonly zone: string;
  /** Whether times are shown with AM and PM. */
  readonly amPm: boolean;
  /** The time now. */
  readonly now: Date;
  /** The day it is now in `zone`. */
  readonly today: Day;
  /** The minutes since `today`'s midnight on the clock. */
  readonly minute: number;
}

// Home Assistant leaves the locale's language empty until the user's profile has loaded.
function locale(hass: HomeAssistant): HassLocale {
  return { ...hass.locale, language: hass.locale.language || hass.language };
}

/** Returns the view context of `hass` at `now`. */
export function viewContext(hass: HomeAssistant, now: Date): ViewContext {
  const zone = timeZone(hass);
  const { day, minute } = localTime(now, zone);
  const settings = locale(hass);
  return {
    t: translator(hass.language),
    lang: cardLanguage(hass.language),
    language: settings.language,
    zone,
    amPm: useAmPm(settings),
    now,
    today: day,
    minute,
  };
}

/**
 * Returns a key that changes when anything `viewContext` reads from `hass` changes. Home
 * Assistant sets a new `hass` on every change of an entity's state, which the cards ignore.
 */
export function settingsKey(hass: HomeAssistant | undefined): string {
  return JSON.stringify([
    hass?.language,
    hass?.locale.language,
    hass?.locale.time_format,
    hass?.locale.time_zone,
    hass?.config.time_zone,
  ]);
}
