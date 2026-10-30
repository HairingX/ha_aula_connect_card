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
  apiError,
  aula,
  dayTitle,
  eventIcon,
  eventWhen,
  fact,
  facts,
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

function blocks(row: DayRowView, child: Child, ctx: ViewContext, state: CardState): unknown {
  const { content, plan } = row;
  if (plan.nothing) {
    return row.facts.length > 0
      ? facts(row.facts.map((item) => fact(item, ctx)))
      : html`<p class="empty">${ctx.t("nothingThisDay")}</p>`;
  }
  return html`<div class="blocks">
    ${plan.blocks.map((block) =>
      renderBlock(
        block.id,
        [
          {
            content,
            quotes: plan.quotes,
            empty: block.empty,
            child: undefined,
            key: childKey(child),
            col: 1,
          },
        ],
        ctx,
        { detailed: true, level: 5, state },
      ),
    )}
  </div>`;
}

function line2(row: DayRowView, ctx: ViewContext): TemplateResult | typeof nothing {
  const shown = (id: BlockId): boolean => row.plan.blocks.some((block) => block.id === id);
  const items = [
    ...row.facts.map((item) => fact(item, ctx)),
    ...(shown("events") ? row.content.timed : []).map(
      (item) =>
        html`<span class="fact"
          >${icon(eventIcon(item.event.type))}<span
            >${aula(item.event.title, ctx)} ${eventWhen(item, ctx, true)}</span
          ></span
        >`,
    ),
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
    if (content.hours && shown("timetable")) facts.push(hours(content.hours, ctx));
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
  const first = item.days[0]?.day ?? ctx.today;
  const key = `${childKey(child)}|weekend|${first}`;
  const open = state.isOpen(key, false);
  // One item per event, with the days it is on, or its time when it is on today.
  const entries = new Map<string, { item: TemplateResult; days: Day[]; when: unknown }>();
  for (const row of item.days) {
    const add = (id: string, shown: TemplateResult, when: unknown = nothing): void => {
      const entry = entries.get(id) ?? { item: shown, days: [], when };
      entry.days.push(row.day);
      entries.set(id, entry);
    };
    for (const entry of row.facts) {
      add(
        entry.kind === "event" ? `e${String(entry.event.id)}` : `b${entry.birthday.name}`,
        fact(entry, ctx),
      );
    }
    for (const timed of row.content.timed) {
      add(
        `e${String(timed.event.id)}`,
        html`<span class="fact"
          >${icon(eventIcon(timed.event.type))}<span>${aula(timed.event.title, ctx)}</span></span
        >`,
        row.day === ctx.today ? eventWhen(timed, ctx) : nothing,
      );
    }
  }
  const items = [...entries.values()].map(({ item: shown, days, when }) => {
    const words = days.map((day) => weekdayWord(day, ctx));
    const where =
      when === nothing
        ? words.length > 1
          ? `${words[0] ?? ""}–${words[words.length - 1] ?? ""}`
          : words[0]
        : when;
    return html`<span class="weekend-item"
      >${shown}<span class="quiet">${when === nothing ? "," : ""} ${where}</span></span
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
      const key = `${childKey(child)}|earlier|${item.days[0]?.day ?? ""}`;
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
            ${facts(
              [...(span ? [hours(span, ctx)] : []), ...row.facts.map((entry) => fact(entry, ctx))],
              "span",
            )}
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
      return html`<div class="holiday-row">
        <span class="daycol" aria-hidden="true">${icon(eventIcon(item.event.type))}</span>
        <span class="row-text">
          <h4 class="holiday-name">${aula(item.event.title, ctx)}</h4>
          <span class="line-2"
            >${formatDayRange(item.first, item.last, ctx.language, "short")}</span
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
  let content: unknown;
  if (child.state.kind === "loading") content = loading(t);
  else if (child.state.kind === "error") content = apiError(child.state.error, t);
  else {
    content = html`${child.state.error === undefined ? nothing : apiError(child.state.error, t)}
      <div class="weeks">
        ${child.weeks.map((section) => week(section, child.child, ctx, state))}
      </div>`;
  }
  return html`<div class="child">
    <h2>${who(child.child, school)}</h2>
    ${content}
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
