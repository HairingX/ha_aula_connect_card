/**
 * What the vacation cards decide before anything is sent: which requests still want an answer,
 * whether an answer is whole, and whether a vacation's days can be registered.
 *
 * @packageDocumentation
 */

import { addDays, isDay } from "../core/dates.ts";
import type { Day, Vacation, VacationDay, VacationRequest } from "../core/types.ts";

/** How far ahead a vacation can be registered, in days from today. */
export const VACATION_AHEAD_DAYS = 365;

/** The longest comment a vacation or an answer can have. */
export const COMMENT_MAX = 250;

/** Tells whether the last day to answer a request has passed. */
export function deadlinePassed(request: VacationRequest, today: Day): boolean {
  return request.deadline !== null && request.deadline < today;
}

/**
 * Returns the requests that can still be answered, those awaiting an answer first, each group by
 * its first day: a request whose holiday is over, or whose deadline has passed with an answer
 * given, is left out.
 */
export function openRequests(requests: readonly VacationRequest[], today: Day): VacationRequest[] {
  return requests
    .filter(
      (request) =>
        request.end >= today && (request.missing_answer || !deadlinePassed(request, today)),
    )
    .sort(
      (a, b) =>
        Number(b.missing_answer) - Number(a.missing_answer) || a.start.localeCompare(b.start),
    );
}

function minutes(clock: string | null): number | undefined {
  const match = clock === null ? null : /^(\d{2}):(\d{2})$/.exec(clock);
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
}

/** Returns the days of a request that can be answered: today and later, as Aula takes no other. */
export function answerableDays(days: readonly VacationDay[], today: Day): VacationDay[] {
  return days.filter((day) => day.date >= today);
}

/**
 * Tells whether an answer is whole: every day from today said to come or not, and where times
 * are asked for, a day the child comes has a time it comes before the time it goes.
 */
export function answerReady(
  days: readonly VacationDay[],
  timesRequired: boolean,
  today: Day,
): boolean {
  const open = answerableDays(days, today);
  return (
    open.length > 0 &&
    open.every((day) => {
      if (day.is_coming === null) return false;
      if (!day.is_coming || !timesRequired) return true;
      const entry = minutes(day.entry_time);
      const exit = minutes(day.exit_time);
      return entry !== undefined && exit !== undefined && entry < exit;
    })
  );
}

/** Tells whether a vacation from `start` to `end` can be registered: from today, within a year. */
export function vacationValid(start: string, end: string, today: Day): boolean {
  return (
    isDay(start) &&
    isDay(end) &&
    start >= today &&
    end >= start &&
    end <= addDays(today, VACATION_AHEAD_DAYS)
  );
}

/** Returns the vacations not over yet, by their first day. */
export function comingVacations(vacations: readonly Vacation[], today: Day): Vacation[] {
  return vacations
    .filter((vacation) => vacation.end >= today)
    .sort((a, b) => a.start.localeCompare(b.start));
}
