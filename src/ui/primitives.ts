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
import type { Child, Day } from "../core/types.ts";
import type { Fact, TimedEvent } from "../model/blocks.ts";
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

/**
 * Shows a fact of a day's header in words, with its icon: a whole-day event, with its place,
 * or a birthday, spoken in full. Text, not a chip: nothing on the card can be tapped.
 */
export function fact(item: Fact, ctx: ViewContext): TemplateResult {
  if (item.kind === "event") {
    const { event } = item;
    return html`<span class="fact"
      >${icon(eventIcon(event.type))}<span
        >${aula(event.title, ctx)}${
          event.location
            ? html`<span class="quiet"> · ${aula(event.location, ctx)}</span>`
            : nothing
        }</span
      ></span
    >`;
  }
  const name = item.birthday.name;
  return html`<span class="fact"
    >${icon("mdi:cake-variant-outline")}<span aria-hidden="true">${aula(name, ctx)}</span
    ><span class="sr">${ctx.t("birthdayOf", { name })}</span></span
  >`;
}

/** Shows facts side by side, heard with a pause between them. */
export function facts(items: readonly unknown[], tag: "div" | "span" = "div"): unknown {
  if (items.length === 0) return nothing;
  const shown = items.map(
    (item, index) => html`${index > 0 ? html`<span class="sr">, </span>` : nothing}${item}`,
  );
  return tag === "div"
    ? html`<div class="facts">${shown}</div>`
    : html`<span class="facts">${shown}</span>`;
}

/**
 * Shows parts of a line with a dot between them. Each dot belongs to the part after it, and one
 * that would begin a line is cut off, so that no line ends or begins with a dot.
 */
export function segments(parts: readonly unknown[], cls = ""): TemplateResult {
  return html`<span class="segs ${cls}"
    ><span class="segs-in"
      >${parts.map(
        (part, index) =>
          html`<span class="seg"
            >${index > 0 ? html`<span class="sr">, </span>` : nothing}${part}</span
          >`,
      )}</span
    ></span
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
  return titled(
    dayTitle(day, ctx),
    [...dateLine(day, ctx), ...(next ? [ctx.t("nextSchoolDay")] : [])],
    titleClass,
  );
}

/** Shows a title over its date line, read as one. */
export function titled(
  title: unknown,
  line: readonly unknown[],
  titleClass = "title",
): TemplateResult {
  return html`<span class="heading">
    <span class=${titleClass}>${title}<span class="sr">,</span></span>
    ${segments(line, "date-line")}
  </span>`;
}

/** Shows a day's school hours with a clock. */
export function hours(span: { start: string; end: string }, ctx: ViewContext): TemplateResult {
  return html`<span class="hours"
    >${icon("mdi:clock-outline")}${timeSpan(span.start, span.end, ctx)}</span
  >`;
}

/** Shows a heading of a level from 2 to 5; lit cannot bind a tag's name. */
export function headingOf(level: number, content: unknown, cls = ""): TemplateResult {
  switch (level) {
    case 2:
      return html`<h2 class=${cls}>${content}</h2>`;
    case 3:
      return html`<h3 class=${cls}>${content}</h3>`;
    case 4:
      return html`<h4 class=${cls}>${content}</h4>`;
    default:
      return html`<h5 class=${cls}>${content}</h5>`;
  }
}

/**
 * Shows when an event is on a day: its span within the day, or only its start with `startOnly`;
 * "08.00 →" on the first of several days, "→ 14.00" on the last, and "Hele dagen" between.
 */
export function eventWhen(item: TimedEvent, ctx: ViewContext, startOnly = false): unknown {
  const { event } = item;
  switch (item.span) {
    case "within":
      return startOnly ? time(event.start, ctx) : timeSpan(event.start, event.end, ctx);
    case "from":
      return html`<span class="tabular">${time(event.start, ctx)} →</span>`;
    case "until":
      return html`<span class="tabular">→ ${time(event.end, ctx)}</span>`;
    default:
      return ctx.t("allDay");
  }
}

/** Shows the who line: a child's initial and name, and what the card is about. */
export function who(child: Child, meta: readonly string[]): TemplateResult {
  return html`<span class="who"
    >${avatar(child)}${segments([
      html`<span class="who-name">${child.first_name}</span>`,
      ...meta.map((part) => html`<span class="who-meta">${part}</span>`),
    ])}</span
  >`;
}

const lists = new Map<string, Intl.ListFormat>();

/** Returns names joined as a sentence: "Ida og Oskar", "Ida and Oskar". */
export function names(children: readonly Child[], ctx: ViewContext): string {
  let list = lists.get(ctx.lang);
  if (!list) {
    list = new Intl.ListFormat(ctx.lang, { type: "conjunction" });
    lists.set(ctx.lang, list);
  }
  return list.format(children.map((child) => child.first_name));
}

/** Returns a weekday's abbreviation as a word in a sentence: "lør." in Danish, "Sat" in English. */
export function weekdayWord(day: Day, ctx: ViewContext): string {
  const short = formatWeekdayShort(day, ctx.language);
  return ctx.lang === "da" ? `${short.toLocaleLowerCase(ctx.language)}.` : short;
}
