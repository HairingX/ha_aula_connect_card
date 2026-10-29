/**
 * Calendar arithmetic on days written `YYYY-MM-DD`, and formatting in the user's language, time
 * format and time zone. A day is a calendar date, not an instant, so it is computed in UTC, where
 * no day is shorter or longer than another.
 *
 * @packageDocumentation
 */

import type { Day, HassLocale, HomeAssistant } from "./types.ts";

const DAY_MS = 86_400_000;

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

function utc(day: Day): Date {
  return new Date(`${day}T00:00:00Z`);
}

/** Tells whether a text is a real day written `YYYY-MM-DD`. */
export function isDay(text: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(utc(text).getTime());
}

/** Returns the instant an ISO 8601 text names, or undefined when it names none. */
export function instant(text: string): Date | undefined {
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Returns the time zone the user wants times in: the browser's, or Home Assistant's. */
export function timeZone(hass: HomeAssistant): string {
  return hass.locale.time_zone === "server"
    ? hass.config.time_zone
    : Intl.DateTimeFormat().resolvedOptions().timeZone;
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

/**
 * Returns the day an instant falls on in a time zone, and the minutes since that day's midnight
 * on the clock. Both come from the zone's own calendar, so days of 23 or 25 hours count right.
 */
export function localTime(at: Date, zone: string): { day: Day; minute: number } {
  const parts = format("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    day: `${String(value.year)}-${String(value.month)}-${String(value.day)}`,
    minute: Number(value.hour) * 60 + Number(value.minute),
  };
}

/** Returns the day an instant falls on in a time zone. */
export function dayOf(at: Date, zone: string): Day {
  return localTime(at, zone).day;
}

/** Returns the day `days` days after `day`; before it for a negative number. */
export function addDays(day: Day, days: number): Day {
  return new Date(utc(day).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** Returns the weekday of a day, 0 for Sunday to 6 for Saturday. */
export function weekday(day: Day): number {
  return utc(day).getUTCDay();
}

/** Tells whether a day is a Saturday or a Sunday. */
export function isWeekend(day: Day): boolean {
  return weekday(day) % 6 === 0;
}

/**
 * Returns the Monday of the week `day` is in. Aula's weeks are ISO 8601 weeks, Monday to Sunday,
 * whatever the user's own first weekday.
 */
export function startOfWeek(day: Day): Day {
  return addDays(day, -((weekday(day) + 6) % 7));
}

/** Returns the ISO 8601 number of the week `day` is in. */
export function weekNumber(day: Day): number {
  // The Thursday of a week decides the year it is numbered in.
  const thursday = utc(addDays(startOfWeek(day), 3));
  const firstThursday = utc(`${String(thursday.getUTCFullYear())}-01-01`);
  firstThursday.setUTCDate(1 + ((4 - firstThursday.getUTCDay() + 7) % 7));
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
}

/** Returns the number of whole days from `from` to `to`. */
export function daysBetween(from: Day, to: Day): number {
  return Math.round((utc(to).getTime() - utc(from).getTime()) / DAY_MS);
}

/** Returns a text with its first letter in upper case, as a title or the start of a line. */
export function capitalize(text: string, language: string): string {
  return text.charAt(0).toLocaleUpperCase(language) + text.slice(1);
}

/** Formats a day as its weekday, day of month and month, such as "torsdag 29. oktober". */
export function formatDay(day: Day, language: string): string {
  return format(language, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(utc(day));
}

/** Formats a day's weekday, such as "mandag" or "Monday". */
export function formatWeekday(day: Day, language: string): string {
  return format(language, { timeZone: "UTC", weekday: "long" }).format(utc(day));
}

/** Formats a day's weekday as Intl abbreviates it, without a dot: "tors", "Thu". */
export function formatWeekdayShort(day: Day, language: string): string {
  return format(language, { timeZone: "UTC", weekday: "short" })
    .format(utc(day))
    .replace(/\.$/, "");
}

/** Formats a day as its day of month and month, such as "2. november" or "November 2". */
export function formatDayMonth(day: Day, language: string): string {
  return format(language, { timeZone: "UTC", day: "numeric", month: "long" }).format(utc(day));
}

/** Formats a day with the month abbreviated, such as "30. okt." or "Oct 30". */
export function formatShortDate(day: Day, language: string): string {
  return format(language, { timeZone: "UTC", day: "numeric", month: "short" }).format(utc(day));
}

/** Formats a day as its weekday and short date, such as "fredag 30. okt." or "Friday, Oct 30". */
export function formatWeekdayShortDate(day: Day, language: string): string {
  return format(language, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(utc(day));
}

/** Formats a day's day of month alone, such as "29", without the dot Danish dates put after it. */
export function formatDayNumber(day: Day, language: string): string {
  return format(language, { timeZone: "UTC", day: "numeric" }).format(utc(day)).replace(/\.$/, "");
}

/**
 * Formats the days from `first` to `last`, both included, such as "10.–18. oktober" or
 * "26. okt.–1. nov.".
 */
export function formatDayRange(
  first: Day,
  last: Day,
  language: string,
  month: "long" | "short",
): string {
  const days = format(language, { timeZone: "UTC", day: "numeric", month });
  return first === last ? days.format(utc(first)) : days.formatRange(utc(first), utc(last));
}

/** Formats a number of days ahead in words, such as "i overmorgen", "om 3 dage" or "in 2 days". */
export function formatDaysAhead(days: number, language: string): string {
  return new Intl.RelativeTimeFormat(language, { numeric: "auto" }).format(days, "day");
}

/**
 * Formats the time of day of an instant in a time zone, such as "08.15" or "8:15 AM", in parts:
 * the day period, "AM" or "PM", is a part of its own of type `dayPeriod`.
 */
export function formatTimeParts(
  at: Date,
  language: string,
  zone: string,
  amPm: boolean,
): Intl.DateTimeFormatPart[] {
  return format(language, {
    timeZone: zone,
    hour: amPm ? "numeric" : "2-digit",
    minute: "2-digit",
    hourCycle: amPm ? "h12" : "h23",
  }).formatToParts(at);
}

/** Formats the time of day of an instant in a time zone as text, such as "08.15" or "8:15 AM". */
export function formatTime(at: Date, language: string, zone: string, amPm: boolean): string {
  return formatTimeParts(at, language, zone, amPm)
    .map((part) => part.value)
    .join("");
}
