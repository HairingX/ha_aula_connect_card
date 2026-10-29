/**
 * The week card's template: each child's weeks as one-line day rows with a day column, the days
 * before today folded, the focus day open, weekends and holidays one row each.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit";

import type { ViewContext } from "../core/context.ts";
import { addDays, formatDayNumber, formatDayRange, formatWeekdayShort } from "../core/dates.ts";
import { childKey, type Child } from "../core/types.ts";
import type {
  DayRowView,
  WeekCardView,
  WeekChildView,
  WeekRow,
  WeekSection,
} from "../model/week-view.ts";
import { renderBlocks } from "./blocks.ts";
import type { CardState } from "./card.ts";
import {
  apiError,
  aula,
  chip,
  eventIcon,
  heading,
  hours,
  icon,
  label,
  loading,
  names,
  timeSpan,
  timeText,
  who,
} from "./primitives.ts";

function dayColumn(day: string, ctx: ViewContext): TemplateResult {
  return html`<span class="daycol" aria-hidden="true">
    <span class="weekday">${formatWeekdayShort(day, ctx.language)}</span>
    <span class="number">${formatDayNumber(day, ctx.language)}</span>
  </span>`;
}

function body(row: DayRowView, child: Child, ctx: ViewContext, state: CardState): TemplateResult {
  const { content, plan } = row;
  const key = `${childKey(child)}|plan|${row.day}`;
  const planState = state.plan(key);
  return html`<div class="day-body">
    ${
      plan.nothing
        ? html`<p class="empty">${ctx.t("nothingThisDay")}</p>`
        : html`<div class="blocks">
            ${renderBlocks(plan, content, ctx, {
              detailed: true,
              level: 5,
              planKey: key,
              planOpen: planState.open,
              planCut: planState.cut,
              togglePlan: (planKey) => {
                state.togglePlan(planKey);
              },
            })}
          </div>`
    }
  </div>`;
}

function summaryLines(
  row: DayRowView,
  ctx: ViewContext,
  labels: unknown[],
  extra: unknown[],
): TemplateResult {
  const { content } = row;
  // Today's row says only when school ends: the rest of today is what it is there for.
  const facts: unknown[] = [...extra];
  if (extra.length === 0) {
    if (content.hours) facts.push(timeSpan(content.hours.start, content.hours.end, ctx));
    if (content.homework.length > 0)
      facts.push(ctx.t("homeworkCount", { n: content.homework.length }));
    if (facts.length === 0 && content.view.lessons.length === 0)
      facts.push(ctx.t("noTimetableInAula"));
  }
  const line2 = [
    ...content.events.map(
      (event) =>
        html`<span
          >${icon(eventIcon(event.type))}${aula(event.title, ctx)}${
            event.all_day ? nothing : html`&nbsp;${timeText(event.start, ctx)}`
          }</span
        >`,
    ),
    ...content.birthdays.map(
      (birthday) => html`<span>${icon("mdi:cake-variant-outline")}${birthday.name}</span>`,
    ),
  ];
  return html`<span class="row-text">
    <span class="line-1"
      >${labels}${facts.map(
        (part, index) =>
          html`${index > 0 ? html`<span aria-hidden="true">·</span>` : nothing}<span
              >${part}</span
            >`,
      )}</span
    >
    ${line2.length > 0 ? html`<span class="line-2">${line2}</span>` : nothing}
  </span>`;
}

function closedRow(
  row: DayRowView,
  child: Child,
  ctx: ViewContext,
  state: CardState,
  cls: string,
  labels: unknown[],
  extra: unknown[] = [],
): TemplateResult {
  const key = `${childKey(child)}|day|${row.day}`;
  return html`<details
    class="day-row ${cls} ${row.past ? "past" : ""}"
    ?open=${state.isOpen(key, false)}
    @toggle=${state.toggled(key, false)}
  >
    <summary>
      ${dayColumn(row.day, ctx)}
      <h4 class="sr">${heading(row.day, undefined, ctx)}</h4>
      ${summaryLines(row, ctx, labels, extra)} ${icon("mdi:chevron-down", "chevron")}
    </summary>
    ${body(row, child, ctx, state)}
  </details>`;
}

function weekRow(item: WeekRow, child: Child, ctx: ViewContext, state: CardState): TemplateResult {
  const { t } = ctx;
  switch (item.kind) {
    case "earlier": {
      const key = `${childKey(child)}|earlier|${item.days[0]?.day ?? ""}`;
      return html`<details
        class="fold"
        ?open=${state.isOpen(key, false)}
        @toggle=${state.toggled(key, false)}
      >
        <summary>
          ${item.weekdays ? t("weekdaysFolded", { n: item.days.length }) : t("earlierDays", { n: item.days.length })}
          ${icon("mdi:chevron-down", "chevron")}
        </summary>
        <ol class="rows">
          ${item.days.map((row) => html`<li>${closedRow(row, child, ctx, state, "", relation(row, ctx))}</li>`)}
        </ol>
      </details>`;
    }
    case "today":
      return closedRow(
        item.row,
        child,
        ctx,
        state,
        "today-row",
        [label(t("today"))],
        item.ends === undefined ? [] : [t("endsAt", { time: timeText(item.ends, ctx) })],
      );
    case "focus": {
      const { row } = item;
      const key = `${childKey(child)}|day|${row.day}`;
      const span = row.content.hours;
      const facts = [
        ...(span ? [hours(span, ctx)] : []),
        ...row.chips.map((entry) => chip(entry, ctx)),
      ];
      return html`<details
        class="day-row focus-day ${row.relation === "today" && item.focus.reason === "today" ? "today" : ""}"
        ?open=${state.isOpen(key, true)}
        @toggle=${state.toggled(key, true)}
      >
        <summary>
          ${dayColumn(row.day, ctx)}
          <span class="hero-text">
            <h4>${heading(row.day, item.focus.reason, ctx, "open-title")}</h4>
            ${facts.length > 0 ? html`<span class="facts">${facts}</span>` : nothing}
          </span>
          ${icon("mdi:chevron-down", "chevron")}
        </summary>
        ${body(row, child, ctx, state)}
      </details>`;
    }
    case "day":
      return closedRow(item.row, child, ctx, state, "", relation(item.row, ctx));
    case "weekend": {
      const first = item.days[0]?.day ?? "";
      const key = `${childKey(child)}|weekend|${first}`;
      const items = item.days.flatMap((row) => [
        ...row.content.events.map(
          (event) =>
            html`<span
              >${icon(eventIcon(event.type))}${aula(event.title, ctx)},
              ${formatWeekdayShort(row.day, ctx.language).toLocaleLowerCase(ctx.language)}.</span
            >`,
        ),
        ...row.content.birthdays.map(
          (birthday) =>
            html`<span
              >${icon("mdi:cake-variant-outline")}${birthday.name},
              ${formatWeekdayShort(row.day, ctx.language).toLocaleLowerCase(ctx.language)}.</span
            >`,
        ),
      ]);
      return html`<details
        class="day-row weekend-row"
        ?open=${state.isOpen(key, false)}
        @toggle=${state.toggled(key, false)}
      >
        <summary>
          <span class="daycol" aria-hidden="true">${icon("mdi:calendar-weekend-outline")}</span>
          <span class="row-text">
            <h4 class="line-1">${t("weekend")}</h4>
            <span class="line-2">${items}</span>
          </span>
          ${icon("mdi:chevron-down", "chevron")}
        </summary>
        <div class="day-body">
          ${item.days.map(
            (row) =>
              html`<div class="weekend-day">
                <h5 class="sr">${heading(row.day, undefined, ctx)}</h5>
                ${renderBlocks(row.plan, row.content, ctx, {
                  detailed: true,
                  level: 5,
                  planKey: `${childKey(child)}|plan|${row.day}`,
                  planOpen: false,
                  planCut: false,
                  togglePlan: () => undefined,
                })}
              </div>`,
          )}
        </div>
      </details>`;
    }
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

function relation(row: DayRowView, ctx: ViewContext): unknown[] {
  return row.relation === "tomorrow"
    ? [label(ctx.t("tomorrow"))]
    : row.relation === "today"
      ? [label(ctx.t("today"))]
      : [];
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
    <ol class="rows">
      ${section.rows.map((item) => html`<li>${weekRow(item, child, ctx, state)}</li>`)}
    </ol>
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
    const side = child.weeks.length > 1 && child.weeks[0]?.collapsed === false;
    content = html`${child.state.error === undefined ? nothing : apiError(child.state.error, t)}
      <div class="weeks ${side ? "side" : ""}">
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
      <div class="children kids-${String(Math.min(view.children.length, 3))}">
        ${view.children.map((child) => childWeeks(child, view, ctx, state))}
      </div>
    </div>
  </section>`;
}
