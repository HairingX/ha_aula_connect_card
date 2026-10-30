/**
 * The week card's template: each child's weeks as one-line day rows with a day column, the days
 * that are over folded, the focus day open, weekends and holidays one row each. A closed row
 * renders its content only once it is opened.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit";

import type { ViewContext } from "../core/context.ts";
import {
  addDays,
  capitalize,
  daysBetween,
  formatDay,
  formatDayNumber,
  formatDayRange,
  formatDaysAhead,
  formatWeekdayShort,
  formatWeekdayShortDate,
} from "../core/dates.ts";
import { glue } from "../core/text.ts";
import { childKey, type Child, type Day } from "../core/types.ts";
import type { BlockId } from "../model/blocks.ts";
import type { Focus } from "../model/focus.ts";
import type {
  DayRowView,
  WeekCardView,
  WeekChildView,
  WeekRow,
  WeekSection,
} from "../model/week-view.ts";
import { renderBlock } from "./blocks.ts";
import type { CardState } from "./card.ts";
import {
  aula,
  childState,
  counted,
  dayTitle,
  eventIcon,
  eventWhen,
  fact,
  factStack,
  heading,
  hours,
  icon,
  label,
  loading,
  names,
  segments,
  timeText,
  weekdayWord,
  who,
} from "./primitives.ts";

function dayColumn(day: string, ctx: ViewContext): TemplateResult {
  return html`<span class="daycol" aria-hidden="true">
    <span class="weekday">${formatWeekdayShort(day, ctx.language)}</span>
    <span class="number">${formatDayNumber(day, ctx.language)}</span>
  </span>`;
}

/** A day opened: its whole-day events and birthdays, a line each, then its blocks. */
function blocks(row: DayRowView, child: Child, ctx: ViewContext, state: CardState): unknown {
  const { content, plan } = row;
  const shown = factStack(row.facts, `${childKey(child)}|facts|${row.day}`, ctx, state);
  if (plan.nothing) {
    return row.facts.length > 0 ? shown : html`<p class="empty">${ctx.t("nothingThisDay")}</p>`;
  }
  return html`${shown}
    <div class="blocks">
      ${plan.blocks.map((block) =>
        renderBlock(
          block.id,
          [
            {
              content,
              quotes: plan.quotes,
              subjects: plan.subjects,
              empty: block.empty,
              child: undefined,
              key: childKey(child),
              col: 1,
            },
          ],
          ctx,
          { day: row.day, detailed: true, level: 5, state },
        ),
      )}
    </div>`;
}

// A closed row names an event or a birthday when it is the only one of its kind, else counts
// them, as "2 begivenheder": the row is one line to glance at, and opens for the rest.
function line2(row: DayRowView, ctx: ViewContext): TemplateResult | typeof nothing {
  const timed = row.plan.blocks.some((block) => block.id === "events") ? row.content.timed : [];
  const events = row.facts.filter((item) => item.kind === "event");
  const born = row.facts.filter((item) => item.kind === "birthday");
  const count = events.length + timed.length;
  const items = [
    ...(count > 1
      ? [counted("mdi:calendar-outline", ctx.t("eventCount", { n: count }))]
      : [
          ...events.map((item) => fact(item, ctx)),
          ...timed.map(
            (item) =>
              html`<span class="fact"
                >${icon(eventIcon(item.event.type))}<span
                  >${aula(item.event.title, ctx)} ${eventWhen(item, ctx, true)}</span
                ></span
              >`,
          ),
        ]),
    ...(born.length > 1
      ? [counted("mdi:cake-variant-outline", ctx.t("birthdayCount", { n: born.length }))]
      : born.map((item) => fact(item, ctx))),
  ];
  return items.length > 0 ? html`<span class="line-2">${items}</span>` : nothing;
}

function summary(
  row: DayRowView,
  ctx: ViewContext,
  relation: unknown,
  extra: readonly unknown[],
): TemplateResult {
  const { content } = row;
  // A closed row sums up only the blocks shown; today's row says only when school ends, as the
  // rest of today is what it is there for.
  const shown = (id: BlockId): boolean =>
    row.plan.blocks.some((block) => block.id === id && block.empty === undefined);
  const facts: unknown[] = [...extra];
  if (extra.length === 0) {
    if (shown("timetable"))
      facts.push(content.hours ? hours(content.hours, ctx) : ctx.t("allCancelled"));
    if (shown("homework")) facts.push(ctx.t("homeworkCount", { n: content.homework.length }));
    if (facts.length === 0 && content.view.lessons.length === 0)
      facts.push(ctx.t("noTimetableInAula"));
  }
  return html`<span class="row-text">
    <span class="line-1">${segments(facts)}${relation}</span>
    ${line2(row, ctx)}
  </span>`;
}

function relationLabel(row: DayRowView, ctx: ViewContext): unknown {
  return row.relation === undefined
    ? nothing
    : label(ctx.t(row.relation === "today" ? "today" : "tomorrow"), "relation");
}

function closedRow(
  row: DayRowView,
  child: Child,
  ctx: ViewContext,
  state: CardState,
  cls: string,
  extra: readonly unknown[] = [],
): TemplateResult {
  const key = `${childKey(child)}|day|${row.day}`;
  const open = state.isOpen(key, false);
  return html`<details
    class="day-row ${cls} ${row.past ? "past" : ""}"
    ?open=${open}
    @toggle=${state.toggled(key, false)}
  >
    <summary>
      ${dayColumn(row.day, ctx)}
      <h4 class="sr">${heading(row.day, undefined, ctx)}</h4>
      ${summary(row, ctx, relationLabel(row, ctx), extra)} ${icon("mdi:chevron-down", "chevron")}
    </summary>
    ${open ? html`<div class="day-body">${blocks(row, child, ctx, state)}</div>` : nothing}
  </details>`;
}

function openHeading(row: DayRowView, focus: Focus, ctx: ViewContext): TemplateResult {
  // The day column and the week's header give the date; the line says only how far ahead.
  const ahead =
    focus.reason === "next_school_day"
      ? [formatDaysAhead(daysBetween(ctx.today, row.day), ctx.language), ctx.t("nextSchoolDay")]
      : [];
  return html`<span class="heading">
    <span class="open-title"
      >${dayTitle(row.day, ctx)}<span class="sr">, ${formatDay(row.day, ctx.language)}</span></span
    >
    ${ahead.length > 0 ? segments(ahead, "date-line") : nothing}
  </span>`;
}

function weekendRow(
  item: Extract<WeekRow, { kind: "weekend" }>,
  child: Child,
  ctx: ViewContext,
  state: CardState,
): TemplateResult {
  const first = item.days[0].day;
  const key = `${childKey(child)}|weekend|${first}`;
  const open = state.isOpen(key, false);
  // One item per event, with the days it is on, or its time when it is on today: in the run of
  // its title's text, so that both share a line and its baseline.
  type Shown = (after: unknown) => TemplateResult;
  const entries = new Map<string, { show: Shown; days: Day[]; when: unknown }>();
  for (const row of item.days) {
    const add = (id: string, show: Shown, when: unknown = nothing): void => {
      const entry = entries.get(id) ?? { show, days: [], when };
      entry.days.push(row.day);
      entries.set(id, entry);
    };
    const facts = (): void => {
      for (const entry of row.facts) {
        add(
          entry.kind === "event" ? `e${String(entry.event.id)}` : `b${entry.birthday.name}`,
          (after) => fact(entry, ctx, after),
        );
      }
    };
    const today = row.day === ctx.today;
    // What is on now or later today comes first, as it is what the row is read for today.
    if (!today) facts();
    for (const timed of row.content.timed) {
      add(
        `e${String(timed.event.id)}`,
        (after) =>
          html`<span class="fact"
            >${icon(eventIcon(timed.event.type))}<span
              >${aula(timed.event.title, ctx)}${after}</span
            ></span
          >`,
        today ? eventWhen(timed, ctx) : nothing,
      );
    }
    if (today) facts();
  }
  const items = [...entries.values()].map(({ show, days, when }) => {
    // A weekend's two days at most: "lør.–søn.".
    const where =
      when === nothing ? glue(days.map((day) => weekdayWord(day, ctx)).join("–")) : when;
    return html`<span class="weekend-item"
      >${show(html`<span class="quiet">${when === nothing ? "," : ""} ${where}</span>`)}</span
    >`;
  });
  return html`<details
    class="day-row weekend-row ${item.today ? "today-row" : ""}"
    ?open=${open}
    @toggle=${state.toggled(key, false)}
  >
    <summary>
      ${dayColumn(first, ctx)}
      <span class="row-text">
        <span class="line-1"
          ><h4 class="weekend-name">${ctx.t("weekend")}</h4>
          ${item.today ? label(ctx.t("today"), "relation") : nothing}</span
        >
        <span class="line-2">${items}</span>
      </span>
      ${icon("mdi:chevron-down", "chevron")}
    </summary>
    ${
      open
        ? html`<div class="day-body">
            ${item.days.map(
              (row) =>
                html`<div class="weekend-day">
                  <h5 class="weekend-title">
                    ${capitalize(formatWeekdayShortDate(row.day, ctx.language), ctx.language)}
                  </h5>
                  ${blocks(row, child, ctx, state)}
                </div>`,
            )}
          </div>`
        : nothing
    }
  </details>`;
}

function weekRow(item: WeekRow, child: Child, ctx: ViewContext, state: CardState): TemplateResult {
  const { t } = ctx;
  switch (item.kind) {
    case "earlier": {
      const key = `${childKey(child)}|earlier|${item.days[0].day}`;
      const open = state.isOpen(key, false);
      const n = item.days.length;
      return html`<details class="fold" ?open=${open} @toggle=${state.toggled(key, false)}>
        <summary>
          ${
            item.span === "weekdays"
              ? t("weekdaysFolded", { n })
              : item.span === "toSaturday"
                ? t("toSaturdayFolded", { n })
                : item.span === "week"
                  ? t("weekFolded", { n })
                  : t("earlierDays", { n })
          }
          ${icon("mdi:chevron-down", "chevron")}
        </summary>
        ${
          open
            ? html`<ol class="rows">
                ${item.days.map((row) => html`<li>${closedRow(row, child, ctx, state, "")}</li>`)}
              </ol>`
            : nothing
        }
      </details>`;
    }
    case "today":
      return closedRow(
        item.row,
        child,
        ctx,
        state,
        "today-row",
        item.ends === undefined ? [] : [t("endsAt", { time: timeText(item.ends, ctx) })],
      );
    case "focus": {
      const { row } = item;
      const key = `${childKey(child)}|day|${row.day}`;
      const open = state.isOpen(key, true);
      const span = row.content.hours;
      return html`<details
        class="day-row focus-day ${row.relation === "today" && item.focus.reason === "today" ? "today" : ""}"
        ?open=${open}
        @toggle=${state.toggled(key, true)}
      >
        <summary>
          ${dayColumn(row.day, ctx)}
          <span class="hero-text">
            <h4>${openHeading(row, item.focus, ctx)}</h4>
            ${span ? hours(span, ctx) : nothing} ${open ? nothing : line2(row, ctx)}
          </span>
          ${icon("mdi:chevron-down", "chevron")}
        </summary>
        ${open ? html`<div class="day-body">${blocks(row, child, ctx, state)}</div>` : nothing}
      </details>`;
    }
    case "day":
      return closedRow(item.row, child, ctx, state, "");
    case "weekend":
      return weekendRow(item, child, ctx, state);
    case "holiday":
      return html`<div class="holiday-row ${item.today ? "today-row" : ""}">
        <span class="daycol" aria-hidden="true">${icon(eventIcon(item.event.type))}</span>
        <span class="row-text">
          <span class="line-1"
            ><h4 class="holiday-name">${aula(item.event.title, ctx)}</h4>
            ${item.today ? label(ctx.t("today"), "relation") : nothing}</span
          >
          <span class="line-2"
            >${item.whole ? t("wholeWeek") : formatDayRange(item.first, item.last, ctx.language, "short")}</span
          >
        </span>
      </div>`;
  }
}

function week(
  section: WeekSection,
  child: Child,
  ctx: ViewContext,
  state: CardState,
): TemplateResult {
  const { t } = ctx;
  return html`<section class="week-section">
    <h3 class="week-head">
      <span
        >${t("weekNumber", { n: section.number })} ·
        ${section.relation === "this" ? t("thisWeek") : t("nextWeek")}</span
      >
      <span class="week-dates"
        >${formatDayRange(section.start, addDays(section.start, 6), ctx.language, "short")}</span
      >
    </h3>
    ${
      section.notYet === undefined
        ? nothing
        : html`<p class="not-yet">${t("weekPlanNotYet", { n: section.notYet })}</p>`
    }
    ${
      section.loading
        ? loading(t)
        : html`<ol class="rows">
            ${section.rows.map((item) => html`<li>${weekRow(item, child, ctx, state)}</li>`)}
          </ol>`
    }
  </section>`;
}

function childWeeks(
  child: WeekChildView,
  view: WeekCardView,
  ctx: ViewContext,
  state: CardState,
): TemplateResult {
  const { t } = ctx;
  const school = view.differentSchools ? [child.child.institution_name] : [];
  return html`<div class="child">
    <h2>${who(child.child, school)}</h2>
    ${childState(child.state, t)}
    ${
      child.state.kind === "ready"
        ? html`<div class="weeks">
            ${child.weeks.map((section) => week(section, child.child, ctx, state))}
          </div>`
        : nothing
    }
  </div>`;
}

/** Renders the week card. */
export function renderWeek(view: WeekCardView, ctx: ViewContext, state: CardState): TemplateResult {
  const label = ctx.t("regionWeek", {
    names: names(
      view.children.map((child) => child.child),
      ctx,
    ),
  });
  return html`<section class="week stack" aria-label=${label}>
    <div class="kids">
      <div class="children wide-${String(Math.min(view.children.length, 3))}">
        ${view.children.map((child) => childWeeks(child, view, ctx, state))}
      </div>
    </div>
  </section>`;
}
