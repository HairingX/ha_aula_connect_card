/**
 * The focus day: the school day that matters now. Until the switch time it is today, when today
 * is a school day; from then, and on days without school, it is the next school day. One rule
 * serves every card, per child, as two children's schools can have different holidays.
 *
 * @packageDocumentation
 */

import { addDays, localTime } from "../core/dates.ts";
import type { Day } from "../core/types.ts";
import { isSchoolDay, isTimetabled, type DayView } from "./days.ts";

/** Why a day is in focus, as its title says: "I dag", "I morgen", or its weekday. */
export type FocusReason = "today" | "tomorrow" | "next_school_day" | "none";

/** The focus day of a child at one moment. */
export interface Focus {
  /** The day it is now. */
  readonly today: Day;
  /** The focus day; undefined when no known day is a school day. */
  readonly day: Day | undefined;
  /** Why the day is in focus; "none" without one. */
  readonly reason: FocusReason;
  /** Whether the switch time has passed today. */
  readonly afterSwitch: boolean;
  /** Whether the data has today, as it has not before it has come. */
  readonly known: boolean;
  /** The last day looked at: today while today is not known. */
  readonly horizon: Day;
  /** The days from today passed over to reach the focus day, or up to the horizon. */
  readonly skipped: readonly Day[];
}

/** What the focus is chosen from. */
export interface FocusInput {
  /** The day it is now. */
  readonly today: Day;
  /** The minutes since today's midnight on the clock. */
  readonly minute: number;
  /** The switch time in minutes since midnight; null to keep today in focus all day. */
  readonly switchAt: number | null;
  /** The days of the range, in order. */
  readonly days: readonly DayView[];
}

/**
 * Chooses the focus day: the first known school day from today, passing over today once the
 * switch time has passed. Friday from the switch time, Saturday and Sunday therefore focus the
 * Monday after.
 */
export function chooseFocus({ today, minute, switchAt, days }: FocusInput): Focus {
  const afterSwitch = switchAt !== null && minute >= switchAt;
  const first = days.findIndex((view) => view.day === today);
  if (first < 0 || days[first]?.known !== true) {
    return {
      today,
      day: undefined,
      reason: "none",
      afterSwitch,
      known: false,
      horizon: today,
      skipped: [],
    };
  }
  const timetabled = isTimetabled(days);
  const skipped: Day[] = [];
  let horizon = today;
  for (const view of days.slice(first)) {
    if (!view.known) break;
    horizon = view.day;
    if (isSchoolDay(view, timetabled) && !(view.day === today && afterSwitch)) {
      const reason =
        view.day === today
          ? "today"
          : view.day === addDays(today, 1)
            ? "tomorrow"
            : "next_school_day";
      return { today, day: view.day, reason, afterSwitch, known: true, horizon, skipped };
    }
    skipped.push(view.day);
  }
  return { today, day: undefined, reason: "none", afterSwitch, known: true, horizon, skipped };
}

/** Chooses the focus day at an instant, in the time zone times are shown in. */
export function focusAt(
  now: Date,
  zone: string,
  switchAt: number | null,
  days: readonly DayView[],
): Focus {
  const { day, minute } = localTime(now, zone);
  return chooseFocus({ today: day, minute, switchAt, days });
}

/** How long after a touch the focus day stays as it was, so it never changes under a finger. */
export const HOLD_MS = 60_000;

/** How long without a touch before what was opened closes again, on a shared screen. */
export const IDLE_RESET_MS = 600_000;

/**
 * Returns the focus to show: the one shown, while the card was touched less than `HOLD_MS` ago
 * and the focus day has changed since; else the one chosen now.
 */
export function heldFocus(
  shown: Focus | undefined,
  chosen: Focus,
  lastInteraction: number,
  now: number,
): Focus {
  if (shown?.day === undefined || shown.day === chosen.day) return chosen;
  return now - lastInteraction < HOLD_MS ? shown : chosen;
}
