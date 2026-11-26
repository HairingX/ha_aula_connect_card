/**
 * The overview's three looks: a row per child, a column per child, and a board of large tiles for
 * the children themselves. Each shows the day that matters now, the child's presence today, what
 * to bring, and the important notes; under them the pages, and what is coming the next week.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit/html.js";

import type { ViewContext } from "../core/context.ts";
import {
  capitalize,
  daysBetween,
  formatDay,
  formatShortDate,
  formatTime,
  formatWeekday,
  formatWeekdayShort,
} from "../core/dates.ts";
import type { Look } from "../core/selection.ts";
import type { Child, Day, Vacation } from "../core/types.ts";
import { ABSENCE_ICON, type Paths } from "../config/family.ts";
import type { RequestGroup, VacationGroup } from "../model/absence.ts";
import { isHolidayEvent } from "../model/days.ts";
import type { LessonRow, TimetableRow } from "../model/blocks.ts";
import { allowing } from "../model/family.ts";
import { dayBar, type DayBar } from "../model/daybar.ts";
import type {
  ComingItem,
  ImportantDue,
  OverviewChild,
  OverviewView,
  PresenceView,
} from "../model/overview.ts";
import { subjectKey, type SubjectLabel } from "../model/subjects.ts";
import { renderDayBar, subjectColor, type BarAxis } from "./blocks.ts";
import type { CardState } from "./card.ts";
import { schoolClock } from "./clock.ts";
import {
  aula,
  childState,
  eventIcon,
  faceImage,
  factStack,
  icon,
  label,
  minis,
  names,
  segments,
  timeSpan,
  timeText,
  turnedOff,
  weekdayWord,
} from "./primitives.ts";
import { openSick, sickLabel, type SickOptions } from "./sick.ts";
import { requestRow } from "./vacation-requests.ts";
import { head, modal, row, section, ticket } from "./window.ts";

/** What the overview knows of Fravær, besides each child's day. */
export interface AbsenceView {
  /** The requests awaiting an answer, once for every child they are asked of. */
  readonly requests: readonly RequestGroup[];
  /** Whether a child has requests awaiting an answer that could not be read. */
  readonly unread: boolean;
  /** The vacation each child is on today, by child id; none for a child on none. */
  readonly ongoing: ReadonlyMap<number, Vacation>;
  /** The vacations starting within the overview's week, once for every child they are for. */
  readonly coming: readonly VacationGroup[];
  /** Called once a request is answered, so that the requests are read again. */
  readonly answered: () => void;
}

/** The request rows the overview shows before it sends to Fravær for the rest. */
export const BAND_ROWS = 2;

/** How the overview is shown. */
export interface OverviewOptions {
  /** The look. */
  readonly look: Look;
  /** The views its tiles go to. */
  readonly paths: Paths;
  /** Icons for things to bring, by the thing in lower case, over the built-in ones. */
  readonly packIcons: Readonly<Record<string, string>>;
  /** How a child is reported sick and written about. */
  readonly sick: SickOptions;
  /** What it knows of Fravær. */
  readonly absence: AbsenceView;
  /** Whether what is important is said in a line that opens it, or shown for its first day in full. */
  readonly important: "compact" | "full";
  /** Whether the board shows a child's school hours only as times, or also on a clock. */
  readonly clock: "digital" | "analog";
}

/** A subject's icon on the board, by its key; a book for a subject not in it. */
export const SUBJECT_ICONS: Readonly<Record<string, string>> = {
  dansk: "mdi:book-open-variant",
  matematik: "mdi:calculator-variant-outline",
  engelsk: "mdi:alphabetical-variant",
  tysk: "mdi:translate",
  fransk: "mdi:translate",
  spansk: "mdi:translate",
  idræt: "mdi:run",
  svømning: "mdi:swim",
  naturteknologi: "mdi:leaf",
  historie: "mdi:castle",
  kristendomskundskab: "mdi:church-outline",
  samfundsfag: "mdi:bank-outline",
  geografi: "mdi:earth",
  biologi: "mdi:sprout-outline",
  fysikkemi: "mdi:flask-outline",
  musik: "mdi:music",
  billedkunst: "mdi:palette-outline",
  madkundskab: "mdi:silverware-fork-knife",
  håndværkogdesign: "mdi:hammer-screwdriver",
  klassenstid: "mdi:account-group-outline",
  understøttendeundervisning: "mdi:school-outline",
  valgfag: "mdi:star-outline",
  lektiecafé: "mdi:coffee-outline",
  teknologiforståelse: "mdi:laptop",
};

/** A thing to bring's icon, by a word in it; the first that matches is taken. */
export const PACK_ICONS: readonly (readonly [RegExp, string])[] = [
  [/badetøj|svøm|swim/, "mdi:swim"],
  [/håndklæde|towel/, "mdi:shower"],
  [/sko|støvle|shoe|boot/, "mdi:shoe-sneaker"],
  [/tøj|t-shirt|shirt|clothes|kit/, "mdi:tshirt-crew-outline"],
  [/madpakke|frugt|lunch|food|mad/, "mdi:food-apple-outline"],
  [/fløjte|instrument|guitar|music|musik/, "mdi:music"],
  [/bog|hæfte|atlas|book/, "mdi:book-open-variant"],
  [/regn|rain|paraply|umbrella/, "mdi:umbrella-outline"],
  [/computer|ipad|tablet|laptop|pc/, "mdi:laptop"],
  [/penalhus|blyant|pen/, "mdi:pencil-outline"],
  [/drikkedunk|vand|water|bottle/, "mdi:cup-water"],
  [/cykel|hjelm|bike|helmet/, "mdi:bike"],
];

/** Returns a thing to bring's icon: the configured one, else by a word in it, else a bag. */
export function packIcon(item: string, configured: Readonly<Record<string, string>>): string {
  const lower = item.toLowerCase();
  return (
    configured[lower] ??
    PACK_ICONS.find(([words]) => words.test(lower))?.[1] ??
    "mdi:bag-personal-outline"
  );
}

/** Returns a subject's icon on the board. */
export function subjectIcon(subject: SubjectLabel): string {
  return SUBJECT_ICONS[subjectKey(subject.name)] ?? "mdi:book-outline";
}

/** Returns a time of day written "HH:MM" as the user reads times, such as "07.05" or "7:05 AM". */
export function clockText(clock: string, ctx: ViewContext): string {
  const at = new Date(Date.UTC(2000, 0, 1, Number(clock.slice(0, 2)), Number(clock.slice(3, 5))));
  return formatTime(at, ctx.language, "UTC", ctx.amPm);
}

/** Returns when a day is, from today: "i dag", "i morgen", a weekday, or a date further on. */
export function whenText(day: Day, ctx: ViewContext): string {
  const ahead = daysBetween(ctx.today, day);
  if (ahead <= 0) return ctx.t("whenToday");
  if (ahead === 1) return ctx.t("whenTomorrow");
  return ahead < 7 ? formatWeekday(day, ctx.language) : formatShortDate(day, ctx.language);
}

/**
 * Returns the important button's words: the first day's important notes, and the next day's within three
 * days; `first` is the first of `important`.
 */
export function importantLine(
  first: ImportantDue,
  important: readonly ImportantDue[],
  ctx: ViewContext,
): string {
  const on = (day: Day): number => important.filter((item) => item.day === day).length;
  const text = ctx.t("importantFor", { n: on(first.day), when: whenText(first.day, ctx) });
  const next = important.find((item) => item.day !== first.day);
  return next && daysBetween(ctx.today, next.day) <= 3
    ? `${text} · ${ctx.t("importantThen", { n: on(next.day), when: whenText(next.day, ctx) })}`
    : text;
}

/** Returns the axis every child's bar shares: from the earliest start to the latest end. */
export function sharedAxis(bars: readonly (DayBar | undefined)[]): BarAxis | undefined {
  const known = bars.filter((bar): bar is DayBar => bar?.from !== undefined);
  if (known.length === 0) return undefined;
  return {
    start: Math.min(...known.map((bar) => bar.start)),
    end: Math.max(...known.map((bar) => bar.end)),
  };
}

function barOf(item: OverviewChild, ctx: ViewContext): DayBar | undefined {
  const { content } = item;
  if (!content || content.timetable.length === 0) return undefined;
  const allDay = content.facts.flatMap((fact) =>
    fact.kind === "event" && !isHolidayEvent(fact.event) ? [fact.event] : [],
  );
  return dayBar(
    content.timetable,
    content.timed,
    allDay,
    ctx.zone,
    item.focus.reason === "today" ? ctx.now : undefined,
  );
}

// Shown beside another day than today, the presence says it is today's.
function presenceText(
  presence: PresenceView,
  item: OverviewChild,
  ctx: ViewContext,
  own = false,
): string {
  const text = ctx.t(presence.key, { time: presence.time ? clockText(presence.time, ctx) : "" });
  return own || item.focus.day === ctx.today ? text : ctx.t("presenceToday", { state: text });
}

function presencePill(
  item: OverviewChild,
  ctx: ViewContext,
  state: CardState,
  options: OverviewOptions,
): unknown {
  const { presence } = item;
  // A child on a vacation is on it, unless it is reported sick.
  const vacation =
    presence?.key === "presenceSick" ? undefined : options.absence.ongoing.get(item.child.child_id);
  if (vacation) {
    const text =
      vacation.end === ctx.today
        ? ctx.t("vacationToday")
        : ctx.t("vacationUntil", {
            day: `${weekdayWord(vacation.end, ctx)} ${formatShortDate(vacation.end, ctx.language)}`,
          });
    return html`<span class="presence away">${icon("mdi:beach")}<span>${text}</span></span>`;
  }
  if (!presence) return nothing;
  const text = presenceText(presence, item, ctx);
  const key = `presence|${String(item.child.child_id)}`;
  const marks = {
    sick: "mdi:thermometer",
    ask: "mdi:thermometer-alert",
    school: "mdi:school-outline",
    here: "mdi:account-check-outline",
    coming: "mdi:clock-outline",
    home: "mdi:home-outline",
    away: "mdi:map-marker-outline",
  } as const;
  return html`<button
    class="presence ${presence.kind}"
    type="button"
    aria-haspopup="dialog"
    data-detail=${key}
    @click=${() => {
      openPresence(item, presence, state, options, key);
    }}
  >
    ${icon(marks[presence.kind])}<span>${text}</span>
  </button>`;
}

function packChips(
  item: OverviewChild,
  ctx: ViewContext,
  icons: boolean,
  options: OverviewOptions,
): unknown {
  const pack = item.content?.pack ?? [];
  if (pack.length === 0) return nothing;
  return html`<p class="ov-pack">
    <span class="pack-label">${ctx.t("remember")}</span>
    ${pack.flatMap((packed) =>
      packed.items.map(
        (thing) =>
          html`<span class="label pack-item" style=${subjectColor(packed.subject)}
            >${icons ? icon(packIcon(thing, options.packIcons)) : nothing}${aula(thing, ctx)}</span
          > `,
      ),
    )}
  </p>`;
}

function dueItem(due: ImportantDue, ctx: ViewContext): TemplateResult {
  return html`<li>
    <span class="note-head"
      >${due.note.subject ? label(aula(due.note.subject.name, ctx), "subject") : nothing}
      ${due.note.title ? html`<span class="note-title">${aula(due.note.title, ctx)}</span>` : nothing}</span
    >
    ${due.note.text ? html`<p class="note-text">${aula(due.note.text, ctx)}</p>` : nothing}
  </li>`;
}

/**
 * Shows what is important for the first day that has some, in full, and a way to the rest; or
 * that nothing is important.
 */
function importantFull(
  item: OverviewChild,
  ctx: ViewContext,
  state: CardState,
  options: OverviewOptions,
): TemplateResult {
  const key = `important|${String(item.child.child_id)}`;
  const [first] = item.important;
  if (!first)
    return html`<p class="ov-important none">
      ${icon("mdi:flag-outline")}<span>${ctx.t("importantNone")}</span>
    </p>`;
  const later = item.important.filter((due) => due.day !== first.day).length;
  return html`<section class="ov-important-full">
    <h4 class="ov-important-head">
      ${icon("mdi:flag-outline")}<span
        >${ctx.t("importantOn", { when: whenText(first.day, ctx) })}</span
      >
    </h4>
    <ul class="note-due">
      ${item.important.filter((due) => due.day === first.day).map((due) => dueItem(due, ctx))}
    </ul>
    ${
      later > 0
        ? html`<button
            class="text-button ov-important-more"
            type="button"
            aria-haspopup="dialog"
            data-detail=${key}
            @click=${() => {
              openImportant(item, ctx, state, options, key);
            }}
          >
            ${ctx.t("importantLater", { n: later })}${icon("mdi:chevron-right")}
          </button>`
        : nothing
    }
  </section>`;
}

function importantButton(
  item: OverviewChild,
  ctx: ViewContext,
  state: CardState,
  options: OverviewOptions,
): TemplateResult {
  if (options.important === "full") return importantFull(item, ctx, state, options);
  const key = `important|${String(item.child.child_id)}`;
  const [first] = item.important;
  if (!first)
    return html`<p class="ov-important none">
      ${icon("mdi:flag-outline")}<span>${ctx.t("importantNone")}</span>
    </p>`;
  return html`<button
    class="ov-important"
    type="button"
    aria-haspopup="dialog"
    data-detail=${key}
    @click=${() => {
      openImportant(item, ctx, state, options, key);
    }}
  >
    ${icon("mdi:flag-outline")}<span>${importantLine(first, item.important, ctx)}</span>${icon("mdi:chevron-right", "chevron-end")}
  </button>`;
}

function hoursOf(item: OverviewChild, ctx: ViewContext): unknown {
  const span = item.content?.hours;
  if (span) return timeSpan(span.start, span.end, ctx);
  return item.content
    ? ctx.t(item.content.view.lessons.length > 0 ? "allCancelled" : "noTimetable")
    : nothing;
}

function dayLine(item: OverviewChild, ctx: ViewContext, shared: boolean): unknown {
  const day = item.focus.day;
  if (shared || day === undefined) return nothing;
  return html`<span class="ov-day"
    >${capitalize(formatDay(day, ctx.language), ctx.language)}</span
  > `;
}

function who(item: OverviewChild, state: CardState): TemplateResult {
  const face = state.face(item.child);
  return html`<span class="ov-who"
    >${faceImage(face)}<span class="ov-name">${face.name}</span></span
  >`;
}

function waiting(item: OverviewChild, ctx: ViewContext): unknown {
  if (item.state.kind !== "ready") return childState(item.state, ctx.t);
  return item.focus.day === undefined
    ? html`<p class="empty">${ctx.t("noSchoolDays")}</p>`
    : childState(item.state, ctx.t);
}

// From when to when, in large: what a child reads first.
function hoursBig(item: OverviewChild, ctx: ViewContext): unknown {
  const span = item.content?.hours;
  return span ? html`<span class="ov-free">${timeSpan(span.start, span.end, ctx)}</span>` : nothing;
}

// A clock of the school hours stands in for the presence where the child has school and is not
// away from it; it opens the presence as the presence does.
function boardClock(
  item: OverviewChild,
  ctx: ViewContext,
  state: CardState,
  options: OverviewOptions,
): unknown {
  const span = item.content?.hours;
  const { presence } = item;
  const away =
    options.absence.ongoing.has(item.child.child_id) ||
    presence?.kind === "sick" ||
    presence?.kind === "ask";
  if (options.clock !== "analog" || !span || away) return presencePill(item, ctx, state, options);
  const label = ctx.t("clockLabel", {
    span: `${timeText(span.start, ctx)}–${timeText(span.end, ctx)}`,
    now: formatTime(ctx.now, ctx.language, ctx.zone, ctx.amPm),
  });
  const face = schoolClock(span.start, span.end, ctx);
  if (!presence) return html`<span class="ov-clock" role="img" aria-label=${label}>${face}</span>`;
  const key = `presence|${String(item.child.child_id)}`;
  return html`<button
    class="ov-clock"
    type="button"
    aria-haspopup="dialog"
    aria-label=${label}
    data-detail=${key}
    @click=${() => {
      openPresence(item, presence, state, options, key);
    }}
  >
    ${face}
  </button>`;
}

// The lessons held, a subject once, in the order of the timetable: each tile opens its first.
function firstLessons(timetable: readonly TimetableRow[]): LessonRow[] {
  const seen = new Set<string>();
  return timetable.filter((row): row is LessonRow => {
    if (row.kind !== "lesson" || row.cancelled || seen.has(row.subject.key)) return false;
    seen.add(row.subject.key);
    return true;
  });
}

function subjectTile(
  item: OverviewChild,
  lesson: LessonRow,
  ctx: ViewContext,
  state: CardState,
): TemplateResult {
  const { subject } = lesson;
  const name = subject.name.length > 10 ? subject.short : subject.name;
  const key = `tile|${String(item.child.child_id)}|${subject.key}`;
  return html`<li>
    <button
      class="board-subject"
      style=${subjectColor(subject)}
      type="button"
      aria-haspopup="dialog"
      data-detail=${key}
      @click=${() => {
        state.showDetail({ kind: "lesson", row: lesson }, key);
      }}
    >
      ${icon(subjectIcon(subject))}<span class=${name.length > 8 ? "long" : ""}
        >${aula(name, ctx)}</span
      >
    </button>
  </li>`;
}

function rows(
  view: OverviewView,
  ctx: ViewContext,
  state: CardState,
  options: OverviewOptions,
  axis: BarAxis | undefined,
  bars: readonly (DayBar | undefined)[],
): TemplateResult {
  return html`<div class="ov-rows">
    ${view.children.map(
      (item, index) =>
        html`<section class="ov-row">
          <div class="ov-top">
            ${who(item, state)}
            <span class="ov-hours"
              >${dayLine(item, ctx, view.sameDay !== undefined)}${hoursOf(item, ctx)}</span
            >
            ${hoursBig(item, ctx)} ${sickLabel(item, ctx)}
            ${presencePill(item, ctx, state, options)}
          </div>
          ${waiting(item, ctx)}
          ${bars[index] ? html`<div class="ov-bar">${renderDayBar(bars[index], ctx, axis, { state, child: item.child, key: `bar|${String(item.child.child_id)}` })}</div>` : nothing}
          ${packChips(item, ctx, true, options)}
          ${item.content ? factStack(item.content.facts, ctx) : nothing}
          ${item.state.kind === "ready" ? importantButton(item, ctx, state, options) : nothing}
        </section>`,
    )}
  </div>`;
}

function soonList(
  item: OverviewChild,
  ctx: ViewContext,
  state: CardState,
  options: OverviewOptions,
): unknown {
  const shown = item.important.slice(0, 4);
  if (shown.length === 0)
    return html`<p class="ov-important none">
      ${icon("mdi:flag-outline")}<span>${ctx.t("importantNone")}</span>
    </p>`;
  const key = `important|${String(item.child.child_id)}`;
  return html`<button
    class="ov-soon"
    type="button"
    aria-haspopup="dialog"
    data-detail=${key}
    @click=${() => {
      openImportant(item, ctx, state, options, key);
    }}
  >
    <span class="ov-soon-head">${ctx.t("importantSoon")}</span>
    ${shown.map(
      (due) =>
        html`<span
          class="ov-soon-item"
          style=${due.note.subject ? subjectColor(due.note.subject) : ""}
          ><span class="ov-dot" aria-hidden="true"></span
          ><span class="ov-soon-text"
            ><b>${due.note.subject ? aula(due.note.subject.name, ctx) : nothing}</b>
            ${aula(due.note.title ?? due.note.text.replace(/\n[\s\S]*$/, ""), ctx)}</span
          >
          <span class="ov-when">${whenText(due.day, ctx)}</span></span
        >`,
    )}
    ${item.important.length > shown.length ? html`<span class="ov-more">${ctx.t("moreCount", { n: item.important.length - shown.length })}</span>` : nothing}
  </button>`;
}

function columns(
  view: OverviewView,
  ctx: ViewContext,
  state: CardState,
  options: OverviewOptions,
  axis: BarAxis | undefined,
  bars: readonly (DayBar | undefined)[],
): TemplateResult {
  return html`<div class="ov-cols n-${String(Math.min(view.children.length, 3))}">
    ${view.children.map(
      (item, index) =>
        html`<section class="ov-col">
          <div class="ov-col-head">
            ${who(item, state)} ${sickLabel(item, ctx)} ${presencePill(item, ctx, state, options)}
          </div>
          <span class="ov-hours"
            >${dayLine(item, ctx, view.sameDay !== undefined)}${hoursOf(item, ctx)}</span
          >
          ${waiting(item, ctx)}
          ${bars[index] ? html`<div class="ov-bar">${renderDayBar(bars[index], ctx, axis, { state, child: item.child, key: `bar|${String(item.child.child_id)}` })}</div>` : nothing}
          ${packChips(item, ctx, false, options)}
          ${item.content ? factStack(item.content.facts, ctx) : nothing}
          ${item.state.kind === "ready" ? soonList(item, ctx, state, options) : nothing}
        </section>`,
    )}
  </div>`;
}

function panel(
  item: OverviewChild,
  ctx: ViewContext,
  state: CardState,
  options: OverviewOptions,
): TemplateResult {
  const { content } = item;
  const lessons = firstLessons(content?.timetable ?? []);
  const things = (content?.pack ?? []).flatMap((packed) => packed.items);
  const today = item.focus.day === ctx.today;
  const key = `important|${String(item.child.child_id)}`;
  const [first] = item.important;
  return html`<section class="ov-panel">
    <div class="ov-col-head">${who(item, state)} ${boardClock(item, ctx, state, options)}</div>
    ${hoursBig(item, ctx)} ${sickLabel(item, ctx)} ${waiting(item, ctx)}
    ${
      content
        ? html`<span class="board-head"
              >${today ? ctx.t("boardToday") : ctx.t("boardTomorrow", { day: capitalize(formatWeekday(content.view.day, ctx.language), ctx.language) })}</span
            >
            <ul class="board-tiles">
              ${lessons.map((lesson) => subjectTile(item, lesson, ctx, state))}
            </ul>
            <span class="board-head">${ctx.t("boardPack")}</span>
            ${
              things.length === 0
                ? html`<p class="board-none">${ctx.t("nothingToPack")}</p>`
                : html`<ul class="board-tiles">
                    ${things.map((thing) => html`<li class="board-thing">${icon(packIcon(thing, options.packIcons))}<span class=${thing.length > 8 ? "long" : ""}>${aula(thing, ctx)}</span></li>`)}
                  </ul>`
            }`
        : nothing
    }
    ${
      options.important === "full"
        ? importantFull(item, ctx, state, options)
        : first
          ? html`<button
              class="board-important"
              type="button"
              aria-haspopup="dialog"
              data-detail=${key}
              @click=${() => {
                openImportant(item, ctx, state, options, key);
              }}
            >
              ${icon("mdi:flag-outline")}<span class="board-count"
                >${item.important.filter((due) => due.day === first.day).length}</span
              >
              <span>${importantLine(first, item.important, ctx).replace(/^\d+ /, "")}</span>
            </button>`
          : nothing
    }
  </section>`;
}

function nav(
  view: OverviewView,
  ctx: ViewContext,
  state: CardState,
  options: OverviewOptions,
): unknown {
  const tiles: readonly [string | null, string, string, number][] = [
    [options.paths.important, "mdi:flag-outline", ctx.t("navImportant"), view.importantSoon],
    [options.paths.weekplan, "mdi:calendar-text-outline", ctx.t("navWeekPlan"), 0],
    [options.paths.week, "mdi:calendar-week", ctx.t("navWeek"), 0],
    [options.paths.absence, ABSENCE_ICON, ctx.t("navAbsence"), options.absence.requests.length],
  ];
  const shown = tiles.flatMap(([path, ...rest]) =>
    path === null ? [] : [[path, ...rest] as const],
  );
  if (shown.length === 0) return nothing;
  return html`<nav class="ov-nav n-${String(shown.length)}" aria-label=${ctx.t("pages")}>
    ${shown.map(
      ([path, mark, text, count]) =>
        html`<button
          class="ov-tile"
          type="button"
          @click=${() => {
            state.navigate(path);
          }}
        >
          <span class="ov-tile-icon"
            >${icon(mark)}${count > 0 ? html`<span class="ov-badge">${count}</span>` : nothing}</span
          >
          <span>${text}</span>
        </button>`,
    )}
  </nav>`;
}

function comingDay(day: Day, ctx: ViewContext): TemplateResult {
  const ahead = daysBetween(ctx.today, day);
  const name =
    ahead === 0
      ? ctx.t("today")
      : ahead === 1
        ? ctx.t("tomorrow")
        : capitalize(formatWeekdayShort(day, ctx.language), ctx.language);
  return html`<span class="ov-coming-day"
    >${name} <span>${formatShortDate(day, ctx.language)}</span></span
  >`;
}

function facesOf(children: readonly Child[], state: CardState, ctx: ViewContext): TemplateResult {
  return minis(
    children.map((child) => state.face(child)),
    ctx,
  );
}

function comingRow(item: ComingItem, ctx: ViewContext, state: CardState): TemplateResult {
  if (item.kind === "birthday") {
    return html`<li class="ov-coming-row">
      ${comingDay(item.day, ctx)} ${icon("mdi:cake-variant-outline")}<span class="ov-coming-text"
        >${ctx.t("birthdayOf", { n: 1, names: item.name })}</span
      >${facesOf(item.children, state, ctx)}
    </li>`;
  }
  const { event } = item;
  const key = `coming|${String(event.id)}`;
  const [child] = item.children as [Child];
  return html`<li class="ov-coming-row">
    <button
      class="opens"
      type="button"
      aria-haspopup="dialog"
      data-detail=${key}
      @click=${() => {
        state.showDetail({ kind: "event", event, child }, key);
      }}
    >
      ${comingDay(item.day, ctx)} ${icon(eventIcon(event.type))}<span class="ov-coming-text"
        >${aula(event.title, ctx)}</span
      >${facesOf(item.children, state, ctx)}
    </button>
  </li>`;
}

function vacationRow(group: VacationGroup, ctx: ViewContext, state: CardState): TemplateResult {
  const until = `${weekdayWord(group.end, ctx)} ${formatShortDate(group.end, ctx.language)}`;
  return html`<li class="ov-coming-row">
    ${comingDay(group.start, ctx)} ${icon("mdi:beach")}<span class="ov-coming-text"
      >${group.start === group.end ? ctx.t("vacationDay") : ctx.t("vacationUntilDay", { day: until })}</span
    >${facesOf(
      group.items.map((item) => item.child),
      state,
      ctx,
    )}
  </li>`;
}

function comingList(
  view: OverviewView,
  ctx: ViewContext,
  state: CardState,
  options: OverviewOptions,
): TemplateResult {
  const rows = [
    ...view.coming.map((item) => ({ day: item.day, row: comingRow(item, ctx, state) })),
    ...options.absence.coming.map((group) => ({
      day: group.start,
      row: vacationRow(group, ctx, state),
    })),
  ].sort((a, b) => a.day.localeCompare(b.day));
  return html`<section class="ov-coming">
    <h3 class="block-head">
      ${icon("mdi:calendar-star-outline")}<span>${ctx.t("coming")}</span>
      <span class="quiet">${ctx.t("comingRange")}</span>
    </h3>
    ${
      rows.length === 0
        ? html`<p class="empty">${ctx.t("comingNone")}</p>`
        : html`<ul class="ov-coming-list">
            ${rows.map((item) => item.row)}
          </ul>`
    }
  </section>`;
}

/**
 * Shows the vacation requests awaiting an answer, once for every child they are asked of, the
 * first few and a way to Fravær for the rest; nothing where none awaits one.
 */
function requestBand(ctx: ViewContext, state: CardState, options: OverviewOptions): unknown {
  const { requests, unread, answered } = options.absence;
  const { t } = ctx;
  if (requests.length === 0)
    return unread
      ? html`<p class="ov-band-note">
          ${icon("mdi:alert-circle-outline")}<span>${t("requestsUnread")}</span>
        </p>`
      : nothing;
  const rest = requests.length - BAND_ROWS;
  const path = options.paths.absence;
  return html`<section class="ov-band" aria-label=${t("vacationRequests")}>
    <ul class="family-rows">
      ${requests.slice(0, BAND_ROWS).map((group) => requestRow(group, ctx, state, answered))}
    </ul>
    ${
      rest > 0 && path !== null
        ? html`<button
            class="text-button ov-band-more"
            type="button"
            @click=${() => {
              state.navigate(path);
            }}
          >
            ${t("moreCount", { n: rest })}${icon("mdi:chevron-right")}
          </button>`
        : nothing
    }
  </section>`;
}

// Today and tomorrow are named, with the date beside; another day is its weekday and date.
function sharedTitle(day: Day, ctx: ViewContext): unknown {
  const ahead = daysBetween(ctx.today, day);
  const date = formatDay(day, ctx.language);
  if (ahead > 1) return capitalize(date, ctx.language);
  return html`${ahead === 0 ? ctx.t("today") : ctx.t("tomorrow")}
    <span class="quiet">${date}</span>`;
}

/** Renders the overview. */
export function renderOverview(
  view: OverviewView,
  ctx: ViewContext,
  state: CardState,
  options: OverviewOptions,
): TemplateResult {
  const bars = view.children.map((item) => barOf(item, ctx));
  const axis = sharedAxis(bars);
  const label = ctx.t("regionOverview", {
    names: names(
      view.children.map((item) => item.child),
      ctx,
    ),
  });
  const shared = view.sameDay;
  // The children's day, and what needs the family, are the overview's own; the pages and what
  // is coming lead elsewhere, beside it where the card is wide.
  return html`<section class="overview look-${options.look}" aria-label=${label}>
    <div class="ov-main">
      ${shared ? html`<h2 class="ov-title">${sharedTitle(shared, ctx)}</h2>` : nothing}
      ${
        options.look === "rows"
          ? rows(view, ctx, state, options, axis, bars)
          : options.look === "columns"
            ? columns(view, ctx, state, options, axis, bars)
            : html`<div class="ov-board n-${String(Math.min(view.children.length, 3))}">
                ${view.children.map((item) => panel(item, ctx, state, options))}
              </div>`
      }
      ${requestBand(ctx, state, options)}
    </div>
    <div class="ov-aside">
      ${nav(view, ctx, state, options)} ${comingList(view, ctx, state, options)}
    </div>
  </section>`;
}

/** Opens the window of a child's important notes, from the overview's day on. */
export function openImportant(
  item: OverviewChild,
  _ctx: ViewContext,
  state: CardState,
  options: OverviewOptions,
  key: string,
): void {
  const important = options.paths.important;
  state.openModal(key, (ctx, close) => {
    const face = state.face(item.child);
    const days = [...new Set(item.important.map((due) => due.day))];
    const from = item.importantFrom;
    return modal(
      html`${head(ctx.t("importantTitle", { name: face.name }), [ctx.t("importantFrom", { day: whenText(from, ctx) })], [], ctx, close, faceImage(face, "window-face"))}
      ${days.map((day) =>
        section(
          `${capitalize(daysBetween(ctx.today, day) < 7 ? whenText(day, ctx) : formatWeekday(day, ctx.language), ctx.language)} · ${formatShortDate(day, ctx.language)}`,
          [],
          html`<ul class="note-due">
            ${item.important.filter((due) => due.day === day).map((due) => dueItem(due, ctx))}
          </ul>`,
        ),
      )}
      ${
        important === null
          ? nothing
          : html`<div class="window-actions">
              <button
                class="filled-button"
                type="button"
                @click=${() => {
                  close();
                  state.navigate(important);
                }}
              >
                ${ctx.t("importantAll")}
              </button>
            </div>`
      }`,
      close,
    );
  });
}

/** Opens the window of a child's presence today, with reporting it sick. */
export function openPresence(
  item: OverviewChild,
  shown: PresenceView,
  state: CardState,
  options: OverviewOptions,
  key: string,
): void {
  state.openModal(key, (ctx, close) => {
    const { t } = ctx;
    const face = state.face(item.child);
    const today = shown.data;
    const presence = today.presence;
    const now = presenceText(shown, item, ctx, true);
    const clock = (value: string | null): string => (value ? clockText(value, ctx) : "");
    const family = {
      child: item.child,
      entries: item.entries,
      today,
      error: undefined,
      showsInstitution: item.showsInstitution,
    };
    const route = today.sick.route;
    const rows = [
      ...(presence?.planned_in || presence?.planned_out
        ? [
            row(
              t("presencePlanned"),
              [clock(presence.planned_in), clock(presence.planned_out)].filter(Boolean).join("–"),
            ),
          ]
        : []),
      ...(presence?.check_in || presence?.check_out
        ? [
            row(
              t("presenceActual"),
              segments([
                ...(presence.check_in
                  ? [t("presenceCame", { time: clock(presence.check_in) })]
                  : []),
                ...(presence.check_out
                  ? [t("presenceLeft", { time: clock(presence.check_out) })]
                  : []),
              ]),
            ),
          ]
        : []),
      ...(presence?.exit_with ? [row(t("presenceCollects"), presence.exit_with)] : []),
      ...(item.hoursToday
        ? [row(t("presenceSchoolHours"), timeSpan(item.hoursToday.start, item.hoursToday.end, ctx))]
        : []),
    ];
    const sick = () => {
      openSick(state, { family, ...options.sick }, key);
    };
    return modal(
      html`${head(t("presenceTitle", { name: face.name }), [t("presenceMeta", { day: formatDay(ctx.today, ctx.language) })], [], ctx, close, faceImage(face, "window-face"))}
        ${ticket(ctx.today, t("presenceNow"), now, [], ctx)} ${section(t("presenceTimes"), rows)}
        <p class="window-note">
          ${icon("mdi:information-outline")}<span>${t("presenceNote")}</span>
        </p>
        <div class="window-actions">
          ${
            today.sick.today
              ? allowing(family, "messages").length === 0
                ? turnedOff("messages", t)
                : html`<button
                    class="filled-button"
                    type="button"
                    @click=${() => {
                      openSick(state, { family, ...options.sick }, key, true);
                    }}
                  >
                    ${t("writeMessage")}
                  </button>`
              : allowing(family, "sick_reports").length === 0
                ? turnedOff("sick_reports", t)
                : route === "none"
                  ? html`<p class="window-note">
                      ${icon("mdi:thermometer")}<span
                        >${t("sickRouteNone", { name: face.name })}</span
                      >
                    </p>`
                  : html`<button class="filled-button" type="button" @click=${sick}>
                      ${t("reportSick", { name: face.name })}
                    </button>`
          }
        </div>`,
      close,
    );
  });
}
