/**
 * The overview's three looks: a row per child, a column per child, and a board of large tiles for
 * the children themselves. Each shows the day that matters now, the child's presence today, what
 * to bring, and the homework due; under them the pages, and what is coming the next week.
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
import type { Child, Day } from "../core/types.ts";
import type { Paths } from "../config/family.ts";
import { isHolidayEvent } from "../model/days.ts";
import { allowing } from "../model/family.ts";
import { dayBar, type DayBar } from "../model/daybar.ts";
import type {
  ComingItem,
  HomeworkDue,
  OverviewChild,
  OverviewView,
  PresenceView,
} from "../model/overview.ts";
import { subjectKey, type SubjectLabel } from "../model/subjects.ts";
import { renderDayBar, subjectColor, type BarAxis } from "./blocks.ts";
import type { CardState } from "./card.ts";
import {
  aula,
  childState,
  eventIcon,
  faceImage,
  factStack,
  icon,
  label,
  listOf,
  names,
  segments,
  timeSpan,
  timeText,
  turnedOff,
} from "./primitives.ts";
import { openSick, sickLabel } from "./sick.ts";
import { head, modal, row, section, ticket } from "./window.ts";

/** How the overview is shown. */
export interface OverviewOptions {
  /** The look. */
  readonly look: Look;
  /** The views its tiles go to. */
  readonly paths: Paths;
  /** Icons for things to bring, by the thing in lower case, over the built-in ones. */
  readonly packIcons: Readonly<Record<string, string>>;
  /** The message to the teachers, `{name}` standing for the child's first name. */
  readonly message: string | undefined;
  /** The guardian to act as. */
  readonly sender: string | undefined;
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
 * Returns the homework button's words: the first day's homework, and the next day's within three
 * days; `first` is the first of `homework`.
 */
export function homeworkLine(
  first: HomeworkDue,
  homework: readonly HomeworkDue[],
  ctx: ViewContext,
): string {
  const on = (day: Day): number => homework.filter((item) => item.day === day).length;
  const text = ctx.t("homeworkFor", { n: on(first.day), when: whenText(first.day, ctx) });
  const next = homework.find((item) => item.day !== first.day);
  return next && daysBetween(ctx.today, next.day) <= 3
    ? `${text} · ${ctx.t("homeworkThen", { n: on(next.day), when: whenText(next.day, ctx) })}`
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
  if (!presence) return nothing;
  const text = presenceText(presence, item, ctx);
  const key = `presence|${String(item.child.child_id)}`;
  const marks = {
    sick: "mdi:thermometer",
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

function homeworkButton(
  item: OverviewChild,
  ctx: ViewContext,
  state: CardState,
  options: OverviewOptions,
): TemplateResult {
  const key = `homework|${String(item.child.child_id)}`;
  const [first] = item.homework;
  if (!first)
    return html`<p class="ov-homework none">
      ${icon("mdi:book-open-page-variant-outline")}<span>${ctx.t("homeworkNone")}</span>
    </p>`;
  return html`<button
    class="ov-homework"
    type="button"
    aria-haspopup="dialog"
    data-detail=${key}
    @click=${() => {
      openHomework(item, ctx, state, options, key);
    }}
  >
    ${icon("mdi:book-open-page-variant-outline")}<span>${homeworkLine(first, item.homework, ctx)}</span>${icon("mdi:chevron-right", "chevron-end")}
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

function endsBig(item: OverviewChild, ctx: ViewContext): unknown {
  const span = item.content?.hours;
  return span
    ? html`<span class="ov-free">${ctx.t("endsAtBig", { time: timeText(span.end, ctx) })}</span>`
    : nothing;
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
            ${endsBig(item, ctx)} ${sickLabel(item, ctx)} ${presencePill(item, ctx, state, options)}
          </div>
          ${waiting(item, ctx)}
          ${bars[index] ? html`<div class="ov-bar">${renderDayBar(bars[index], ctx, axis)}</div>` : nothing}
          ${packChips(item, ctx, true, options)}
          ${item.content ? factStack(item.content.facts, ctx) : nothing}
          ${item.state.kind === "ready" ? homeworkButton(item, ctx, state, options) : nothing}
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
  const shown = item.homework.slice(0, 4);
  if (shown.length === 0)
    return html`<p class="ov-homework none">
      ${icon("mdi:book-open-page-variant-outline")}<span>${ctx.t("homeworkNone")}</span>
    </p>`;
  const key = `homework|${String(item.child.child_id)}`;
  return html`<button
    class="ov-soon"
    type="button"
    aria-haspopup="dialog"
    data-detail=${key}
    @click=${() => {
      openHomework(item, ctx, state, options, key);
    }}
  >
    <span class="ov-soon-head">${ctx.t("homeworkSoon")}</span>
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
    ${item.homework.length > shown.length ? html`<span class="ov-more">${ctx.t("moreCount", { n: item.homework.length - shown.length })}</span>` : nothing}
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
          ${bars[index] ? html`<div class="ov-bar">${renderDayBar(bars[index], ctx, axis)}</div>` : nothing}
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
  const subjects = content?.subjects ?? [];
  const things = (content?.pack ?? []).flatMap((packed) => packed.items);
  const today = item.focus.day === ctx.today;
  const key = `homework|${String(item.child.child_id)}`;
  const [first] = item.homework;
  return html`<section class="ov-panel">
    <div class="ov-col-head">${who(item, state)} ${presencePill(item, ctx, state, options)}</div>
    ${endsBig(item, ctx)} ${sickLabel(item, ctx)} ${waiting(item, ctx)}
    ${
      content
        ? html`<span class="board-head"
              >${today ? ctx.t("boardToday") : ctx.t("boardTomorrow", { day: capitalize(formatWeekday(content.view.day, ctx.language), ctx.language) })}</span
            >
            <ul class="board-tiles">
              ${subjects.map(
                (subject) =>
                  html`<li class="board-subject" style=${subjectColor(subject)}>
                    ${icon(subjectIcon(subject))}<span
                      >${aula(subject.name.length > 10 ? subject.short : subject.name, ctx)}</span
                    >
                  </li>`,
              )}
            </ul>
            <span class="board-head">${ctx.t("boardPack")}</span>
            ${
              things.length === 0
                ? html`<p class="board-none">${ctx.t("nothingToPack")}</p>`
                : html`<ul class="board-tiles">
                    ${things.map((thing) => html`<li class="board-thing">${icon(packIcon(thing, options.packIcons))}<span>${aula(thing, ctx)}</span></li>`)}
                  </ul>`
            }`
        : nothing
    }
    ${
      first
        ? html`<button
            class="board-homework"
            type="button"
            aria-haspopup="dialog"
            data-detail=${key}
            @click=${() => {
              openHomework(item, ctx, state, options, key);
            }}
          >
            ${icon("mdi:book-open-page-variant-outline")}<span class="board-count"
              >${item.homework.filter((due) => due.day === first.day).length}</span
            >
            <span>${homeworkLine(first, item.homework, ctx).replace(/^\d+ /, "")}</span>
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
): TemplateResult {
  const tiles: readonly [string, string, string, number][] = [
    [
      options.paths.homework,
      "mdi:book-open-page-variant-outline",
      ctx.t("navHomework"),
      view.homeworkSoon,
    ],
    [options.paths.weekplan, "mdi:calendar-text-outline", ctx.t("navWeekPlan"), 0],
    [options.paths.week, "mdi:calendar-week", ctx.t("navWeek"), 0],
  ];
  return html`<nav class="ov-nav" aria-label=${ctx.t("pages")}>
    ${tiles.map(
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

function minis(children: readonly Child[], state: CardState, ctx: ViewContext): TemplateResult {
  const faces = children.map((child) => state.face(child));
  return html`<span class="ov-minis"
    >${faces.map((face) => faceImage(face, "mini"))}<span class="sr"
      >${listOf(
        faces.map((face) => face.name),
        ctx,
      )}</span
    ></span
  >`;
}

function comingRow(item: ComingItem, ctx: ViewContext, state: CardState): TemplateResult {
  if (item.kind === "birthday") {
    return html`<li class="ov-coming-row">
      ${comingDay(item.day, ctx)} ${icon("mdi:cake-variant-outline")}<span class="ov-coming-text"
        >${ctx.t("birthdayOf", { n: 1, names: item.name })}</span
      >${minis(item.children, state, ctx)}
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
      >${minis(item.children, state, ctx)}
    </button>
  </li>`;
}

function comingList(view: OverviewView, ctx: ViewContext, state: CardState): TemplateResult {
  return html`<section class="ov-coming">
    <h3 class="block-head">
      ${icon("mdi:calendar-star-outline")}<span>${ctx.t("coming")}</span>
      <span class="quiet">${ctx.t("comingRange")}</span>
    </h3>
    ${
      view.coming.length === 0
        ? html`<p class="empty">${ctx.t("comingNone")}</p>`
        : html`<ul class="ov-coming-list">
            ${view.coming.map((item) => comingRow(item, ctx, state))}
          </ul>`
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
  return html`<section class="overview look-${options.look}" aria-label=${label}>
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
    ${nav(view, ctx, state, options)} ${comingList(view, ctx, state)}
  </section>`;
}

/** Opens the window of a child's homework, from the overview's day on. */
export function openHomework(
  item: OverviewChild,
  _ctx: ViewContext,
  state: CardState,
  options: OverviewOptions,
  key: string,
): void {
  state.openModal(key, (ctx, close) => {
    const face = state.face(item.child);
    const days = [...new Set(item.homework.map((due) => due.day))];
    const from = item.homeworkFrom;
    return modal(
      html`${head(ctx.t("homeworkTitle", { name: face.name }), [ctx.t("homeworkFrom", { day: whenText(from, ctx) })], [], ctx, close, faceImage(face, "window-face"))}
        ${days.map((day) =>
          section(
            `${capitalize(daysBetween(ctx.today, day) < 7 ? whenText(day, ctx) : formatWeekday(day, ctx.language), ctx.language)} · ${formatShortDate(day, ctx.language)}`,
            [],
            html`<ul class="hw-due">
              ${item.homework
                .filter((due) => due.day === day)
                .map(
                  (due) =>
                    html`<li>
                      <span class="hw-head"
                        >${due.note.subject ? label(aula(due.note.subject.name, ctx), "subject") : nothing}
                        ${due.note.title ? html`<span class="hw-title">${aula(due.note.title, ctx)}</span>` : nothing}</span
                      >
                      ${due.note.text ? html`<p class="hw-text">${aula(due.note.text, ctx)}</p>` : nothing}
                    </li>`,
                )}
            </ul>`,
          ),
        )}
        <div class="window-actions">
          <button
            class="filled-button"
            type="button"
            @click=${() => {
              close();
              state.navigate(options.paths.homework);
            }}
          >
            ${ctx.t("homeworkAll")}
          </button>
        </div>`,
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
      openSick(state, { family, message: options.message, sender: options.sender }, key);
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
                      openSick(
                        state,
                        { family, message: options.message, sender: options.sender },
                        key,
                        true,
                      );
                    }}
                  >
                    ${t("writeTo")}
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
