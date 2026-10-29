/**
 * The small pieces every card's templates are made of.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit";

import { errorText } from "../core/api.ts";
import type { ViewContext } from "../core/context.ts";
import {
  capitalize,
  formatDay,
  formatDayMonth,
  formatDayNumber,
  formatDaysAhead,
  formatTime,
  formatTimeParts,
  formatWeekday,
  formatWeekdayShort,
  daysBetween,
  instant,
} from "../core/dates.ts";
import type { Translate } from "../core/i18n.ts";
import type { CalendarEvent, Child, Day } from "../core/types.ts";
import type { Chip } from "../model/blocks.ts";
import type { FocusReason } from "../model/focus.ts";

/** Shows an mdi icon, hidden from screen readers. */
export function icon(name: string, cls = ""): TemplateResult {
  return html`<ha-icon class=${cls} icon=${name} aria-hidden="true"></ha-icon>`;
}

/** Shows a message in the look of Home Assistant's alerts; an error or warning is announced. */
export function alert(kind: "error" | "warning" | "info", message: string): TemplateResult {
  const name = kind === "info" ? "mdi:information-outline" : "mdi:alert-circle-outline";
  return html`<div class="alert ${kind}" role=${kind === "info" ? "status" : "alert"}>
    ${icon(name)}<span>${message}</span>
  </div>`;
}

/** Shows an error from the API. */
export function apiError(error: unknown, t: Translate): TemplateResult {
  return alert("error", errorText(error, t));
}

/** Shows that data is on its way. */
export function loading(t: Translate): TemplateResult {
  return html`<p class="status" role="status" aria-busy="true">
    <span class="pulse" aria-hidden="true"></span>${t("loading")}
  </p>`;
}

/** Shows, quietly, that data is being renewed. */
export function refreshing(t: Translate): TemplateResult {
  return html`<p class="status" role="status">${t("updating")}</p>`;
}

/** Marks Aula's own text as Danish when the cards are in English, for screen readers. */
export function aula(text: string, ctx: ViewContext): TemplateResult | string {
  return ctx.lang === "da" ? text : html`<span lang="da">${text}</span>`;
}

/** Shows a time of day, with AM and PM set smaller, so a 12-hour time stays narrow. */
export function time(text: string, ctx: ViewContext, cls = ""): TemplateResult | typeof nothing {
  const at = instant(text);
  if (!at) return nothing;
  return html`<time class=${cls} datetime=${text}
    >${formatTimeParts(at, ctx.language, ctx.zone, ctx.amPm).map((part) =>
      part.type === "dayPeriod" ? html`<span class="period">${part.value}</span>` : part.value,
    )}</time
  >`;
}

/** Shows a time span, such as "08.00–12.55" or "8:00 AM – 12:55 PM". */
export function timeSpan(start: string, end: string, ctx: ViewContext): TemplateResult {
  // Thin spaces set the dash off from AM and PM, which would otherwise run into it.
  return html`<span class="tabular"
    >${time(start, ctx)}${ctx.amPm ? " – " : "–"}${time(end, ctx)}</span
  >`;
}

/** Returns a time of day as text. */
export function timeText(text: string, ctx: ViewContext): string {
  const at = instant(text);
  return at ? formatTime(at, ctx.language, ctx.zone, ctx.amPm) : "";
}

/** Shows a label: Home Assistant's dense, non-interactive `ha-label`. */
export function label(content: unknown, cls = ""): TemplateResult {
  return html`<span class="label ${cls}">${content}</span>`;
}

/** Shows the "Nu" label of the lesson going on, with its dot in the theme's colour. */
export function nowLabel(t: Translate): TemplateResult {
  return label(html`<span class="dot" aria-hidden="true"></span>${t("now")}`, "now");
}

/** Shows a child's initial in a circle. */
export function avatar(child: Child): TemplateResult {
  return html`<span class="avatar" aria-hidden="true"
    >${child.first_name.charAt(0).toUpperCase()}</span
  >`;
}

/** The icon of an event, by Aula's type. */
export function eventIcon(type: string): string {
  switch (type) {
    case "event":
      return "mdi:calendar-star-outline";
    case "excursion":
      return "mdi:bus";
    case "school_home_meeting":
    case "parental_meeting":
    case "performance_meeting":
      return "mdi:account-group-outline";
    case "holiday":
    case "presence_holiday":
      return "mdi:beach";
    case "vacation_registration":
      return "mdi:calendar-check-outline";
    default:
      return "mdi:calendar-blank-outline";
  }
}

/** Shows a chip of a day's header: an all-day event, or a birthday spoken in full. */
export function chip(item: Chip, ctx: ViewContext): TemplateResult {
  if (item.kind === "event") {
    return html`<span class="chip"
      >${icon(eventIcon(item.event.type))}${aula(item.event.title, ctx)}</span
    >`;
  }
  const name = item.birthday.name;
  return html`<span class="chip"
    >${icon("mdi:cake-variant-outline")}<span aria-hidden="true">${aula(name, ctx)}</span
    ><span class="sr">${ctx.t("birthdayOf", { name })}</span></span
  >`;
}

/** Returns a day's title: "I dag", "I morgen", or its weekday. */
export function dayTitle(day: Day, ctx: ViewContext): string {
  const ahead = daysBetween(ctx.today, day);
  if (ahead === 0) return ctx.t("today");
  if (ahead === 1) return ctx.t("tomorrow");
  return capitalize(formatWeekday(day, ctx.language), ctx.language);
}

/**
 * Returns a day's date line, in parts: "torsdag 29. oktober" for today and tomorrow, else
 * "2. november" and its distance, "om 3 dage". A relative word never stands without its date.
 */
export function dateLine(day: Day, ctx: ViewContext): string[] {
  const ahead = daysBetween(ctx.today, day);
  if (ahead <= 1) return [formatDay(day, ctx.language)];
  return [formatDayMonth(day, ctx.language), formatDaysAhead(ahead, ctx.language)];
}

/** Shows the date tile: the weekday over the day of the month, with a bar for today. */
export function tile(day: Day, ctx: ViewContext, isToday: boolean): TemplateResult {
  return html`<span class="tile ${isToday ? "today" : ""}" aria-hidden="true">
    <span class="weekday">${formatWeekdayShort(day, ctx.language)}</span>
    <span class="number">${formatDayNumber(day, ctx.language)}</span>
  </span>`;
}

/**
 * Shows a day's heading: its title, then its date line, read as one ("I morgen, fredag 30.
 * oktober, næste skoledag"). The next school day is named in the date line.
 */
export function heading(
  day: Day,
  reason: FocusReason | undefined,
  ctx: ViewContext,
  titleClass = "title",
): TemplateResult {
  const next = reason === "tomorrow" || reason === "next_school_day";
  const parts: unknown[] = [
    ...dateLine(day, ctx),
    ...(next
      ? [
          html`<span class="next"
            >${icon("mdi:calendar-arrow-right")}${ctx.t("nextSchoolDay")}</span
          >`,
        ]
      : []),
  ];
  return html`<span class="heading">
    <span class=${titleClass}>${dayTitle(day, ctx)}<span class="sr">,</span></span>
    <span class="date-line"
      >${parts.map((part, index) => html`${index > 0 ? separator : nothing}<span>${part}</span>`)}</span
    >
  </span>`;
}

// Seen as a dot, heard as a pause.
const separator = html`<span class="sr">, </span><span aria-hidden="true">·</span>`;

/** Shows a day's school hours with a clock. */
export function hours(span: { start: string; end: string }, ctx: ViewContext): TemplateResult {
  return html`<span class="hours"
    >${icon("mdi:clock-outline")}${timeSpan(span.start, span.end, ctx)}</span
  >`;
}

/** Returns an event's time as text: "Hele dagen", or its span. */
export function eventTime(event: CalendarEvent, ctx: ViewContext): TemplateResult | string {
  return event.all_day ? ctx.t("allDay") : timeSpan(event.start, event.end, ctx);
}

/** Shows the who line: a child's initial and name, and what the card is about. */
export function who(child: Child, meta: readonly string[], end: unknown = nothing): TemplateResult {
  return html`<div class="who">
    ${avatar(child)}<span class="who-name">${child.first_name}</span>${meta.map(
      (part) =>
        html`<span class="who-meta" aria-hidden="true">·</span
          ><span class="who-meta">${part}</span>`,
    )}${end === nothing ? nothing : html`<span class="who-end">${end}</span>`}
  </div>`;
}

/** Returns names joined as a sentence: "Ida og Oskar", "Ida and Oskar". */
export function names(children: readonly Child[], ctx: ViewContext): string {
  return new Intl.ListFormat(ctx.lang, { type: "conjunction" }).format(
    children.map((child) => child.first_name),
  );
}
