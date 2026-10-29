/**
 * Calendar arithmetic on days written `YYYY-MM-DD`, and formatting in the user's language, time
 * format and time zone. A day is a calendar date, not an instant, so it is computed in UTC, where
 * no day is shorter or longer than another.
 *
 * @packageDocumentation
 */

import type { HassLocale, HomeAssistant } from "./types";

const DAY_MS = 86_400_000;

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const formats = new Map<string, Intl.DateTimeFormat>();

function format(language: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${language}|${JSON.stringify(options)}`;
  let result = formats.get(key);
  if (!result) {
    result = new Intl.DateTimeFormat(language, options);
    formats.set(key, result);
  }
  return result;
}

function utc(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

/** Tells whether a text is a real day written `YYYY-MM-DD`. */
export function isDay(text: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(utc(text).getTime());
}

/** Returns the time zone the user wants times in: the browser's, or Home Assistant's. */
export function timeZone(hass: HomeAssistant): string {
  return hass.locale.time_zone === "server"
    ? hass.config.time_zone
    : Intl.DateTimeFormat().resolvedOptions().timeZone;
}

interface WeekInfoLocale {
  getWeekInfo?: () => { firstDay: number };
  weekInfo?: { firstDay: number };
}

/** Returns the first day of the week, 0 for Sunday to 6 for Saturday; Monday when unknown. */
export function firstWeekday(locale: HassLocale): number {
  const named = WEEKDAYS.indexOf(locale.first_weekday);
  if (named >= 0) return named;
  try {
    const intl = new Intl.Locale(locale.language) as WeekInfoLocale;
    const info = intl.getWeekInfo?.() ?? intl.weekInfo;
    return info ? info.firstDay % 7 : 1;
  } catch {
    return 1;
  }
}

/** Tells whether times are shown with AM and PM. */
export function useAmPm(locale: HassLocale): boolean {
  if (locale.time_format === "12") return true;
  if (locale.time_format === "24") return false;
  const language = locale.time_format === "system" ? undefined : locale.language;
  return new Intl.DateTimeFormat(language, { hour: "numeric" })
    .formatToParts(new Date(Date.UTC(2020, 0, 1, 13)))
    .some((part) => part.type === "dayPeriod");
}

/** Returns the day an instant falls on in a time zone. */
export function dayOf(instant: Date, zone: string): string {
  const parts = format("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${String(value.year)}-${String(value.month)}-${String(value.day)}`;
}

/** Returns the day `days` days after `day`; before it for a negative number. */
export function addDays(day: string, days: number): string {
  return new Date(utc(day).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** Returns the weekday of a day, 0 for Sunday to 6 for Saturday. */
export function weekday(day: string): number {
  return utc(day).getUTCDay();
}

/** Returns the first day of the week `day` is in. */
export function startOfWeek(day: string, first: number): string {
  return addDays(day, -((weekday(day) - first + 7) % 7));
}

/** Returns the ISO 8601 number of the week whose first day is `start`, counting from Monday. */
export function weekNumber(start: string): number {
  // The Thursday on or after the first day decides the week for a week starting Monday, and for
  // one starting Saturday or Sunday it is in the Monday-week the most of its days are in.
  const thursday = utc(addDays(start, (4 - weekday(start) + 7) % 7));
  const firstThursday = utc(`${String(thursday.getUTCFullYear())}-01-01`);
  firstThursday.setUTCDate(1 + ((4 - firstThursday.getUTCDay() + 7) % 7));
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
}

/** Returns the number of whole days from `from` to `to`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to).getTime() - utc(from).getTime()) / DAY_MS);
}

/** Formats a day as its weekday, day of month and month, such as "torsdag 29. oktober". */
export function formatDay(day: string, language: string): string {
  return format(language, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(utc(day));
}

/** Formats the time of day of an instant in a time zone, such as "08.15" or "8:15 AM". */
export function formatTime(instant: Date, language: string, zone: string, amPm: boolean): string {
  return format(language, {
    timeZone: zone,
    hour: amPm ? "numeric" : "2-digit",
    minute: "2-digit",
    hourCycle: amPm ? "h12" : "h23",
  }).format(instant);
}
