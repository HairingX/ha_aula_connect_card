/**
 * The school day card's template: the day that matters now, its header the largest text on the
 * card, and above it what is left of today and the days passed over.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit";

import type { ViewContext } from "../core/context.ts";
import { capitalize, formatDay, formatDayRange, formatWeekday } from "../core/dates.ts";
import { childKey, type Child } from "../core/types.ts";
import type { BridgeRow } from "../model/bridges.ts";
import type { AboveRows, DayCardView, DayChildView, TodayEntry } from "../model/day-view.ts";
import type { Chip } from "../model/blocks.ts";
import type { Focus } from "../model/focus.ts";
import { isRunning } from "../model/today.ts";
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
  loading,
  names,
  tile,
  timeSpan,
  timeText,
  who,
} from "./primitives.ts";

/** The most parts of the rest-of-today row before the others become "+n". */
const TODAY_PARTS = 3;

function line(
  iconName: string | undefined,
  labelText: unknown,
  text: unknown,
  end: unknown = nothing,
): TemplateResult {
  return html`<li class="bridge">
    ${iconName === undefined ? html`<span class="sr"></span>` : icon(iconName)}
    <span class="bridge-label">${labelText}</span>
    ${text === nothing ? nothing : html`<span class="bridge-text">${text}</span>`}
    ${end === nothing ? nothing : html`<span class="bridge-end">${end}</span>`}
  </li>`;
}

function joined(parts: readonly unknown[], ctx: ViewContext): TemplateResult {
  const shown = parts.slice(0, TODAY_PARTS);
  const more = parts.length - shown.length;
  return html`${shown.map(
    (part, index) =>
      html`${index > 0 ? html`<span aria-hidden="true"> · </span>` : nothing}${part}`,
  )}${more > 0 ? html`<span aria-hidden="true"> · </span>${ctx.t("more", { n: more })}` : nothing}`;
}

function todayRow(above: AboveRows, ctx: ViewContext): TemplateResult | typeof nothing {
  const { t } = ctx;
  if (above.today.length === 0) return nothing;
  const parts: unknown[] = [];
  const one: TodayEntry | undefined = above.today.length === 1 ? above.today[0] : undefined;
  if (one) {
    if (one.running) parts.push(t("nowLesson", { subject: one.running.name }));
    if (one.rest.ends !== undefined)
      parts.push(t("schoolEnds", { time: timeText(one.rest.ends, ctx) }));
  } else {
    for (const entry of above.today) {
      if (entry.rest.ends !== undefined) {
        parts.push(
          t("childEnds", { name: entry.child.first_name, time: timeText(entry.rest.ends, ctx) }),
        );
      }
    }
  }
  for (const event of above.events) {
    parts.push(
      html`${aula(event.title, ctx)}
      ${isRunning(event, ctx.now) ? timeSpan(event.start, event.end, ctx) : timeText(event.start, ctx)}`,
    );
  }
  return line("mdi:clock-outline", t("today"), joined(parts, ctx));
}

function bridgeLabel(row: BridgeRow, ctx: ViewContext): string {
  const weekday = (day: string): string =>
    capitalize(formatWeekday(day, ctx.language), ctx.language);
  const first = row.days[0] ?? "";
  const last = row.days[row.days.length - 1] ?? first;
  switch (row.kind) {
    case "holiday":
      return row.event.title;
    case "weekend":
      return row.days.length > 1 ? ctx.t("weekend") : weekday(first);
    case "empty":
      return first === last
        ? weekday(first)
        : `${weekday(first)}–${formatWeekday(last, ctx.language)}`;
  }
}

function bridge(row: BridgeRow, only: readonly Child[], ctx: ViewContext): TemplateResult {
  const whose = only.length > 0 ? ` (${names(only, ctx)})` : "";
  switch (row.kind) {
    case "holiday":
      return line(
        eventIcon(row.event.type),
        html`${aula(bridgeLabel(row, ctx), ctx)}${whose}`,
        nothing,
        formatDayRange(row.first, row.last, ctx.language, "long"),
      );
    case "weekend": {
      const [first] = row.items;
      const titles = row.items.map((item) =>
        item.kind === "event"
          ? aula(item.event.title, ctx)
          : ctx.t("birthdayOf", { name: item.birthday.name }),
      );
      const timed = first?.kind === "event" && !first.event.all_day && row.items.length === 1;
      return line(
        first?.kind === "event" ? eventIcon(first.event.type) : "mdi:cake-variant-outline",
        bridgeLabel(row, ctx),
        html`${joined(titles, ctx)}${whose}`,
        timed ? timeText(first.event.start, ctx) : nothing,
      );
    }
    case "empty":
      return line(
        "mdi:calendar-remove-outline",
        bridgeLabel(row, ctx),
        `${ctx.t("noTimetableInAula")}${whose}`,
      );
  }
}

function aboveRows(
  above: AboveRows | undefined,
  ctx: ViewContext,
): TemplateResult | typeof nothing {
  if (!above) return nothing;
  const empty = above.today.length === 0 && above.bridges.length === 0 && above.moreDays === 0;
  return html`${
    empty
      ? nothing
      : html`<ul class="above">
          ${todayRow(above, ctx)}${above.bridges.map((item) => bridge(item.row, item.only, ctx))}
          ${
            above.moreDays > 0
              ? html`<li class="bridge-more">
                  ${ctx.t("daysWithoutSchool", { n: above.moreDays })}
                </li>`
              : nothing
          }
        </ul>`
  }${
    above.none === undefined
      ? nothing
      : html`<p class="none">
          ${ctx.t("noSchoolDays", { day: formatDay(above.none, ctx.language) })}
        </p>`
  }`;
}

function hero(
  focus: Focus,
  ctx: ViewContext,
  span: { start: string; end: string } | undefined,
  chips: readonly Chip[],
): TemplateResult | typeof nothing {
  const day = focus.day;
  if (day === undefined) return nothing;
  const facts = [...(span ? [hours(span, ctx)] : []), ...chips.map((item) => chip(item, ctx))];
  return html`<div class="hero">
    ${tile(day, ctx, focus.reason === "today")}
    <div class="hero-text">
      <h2>${heading(day, focus.reason, ctx)}</h2>
      ${facts.length > 0 ? html`<div class="facts">${facts}</div>` : nothing}
    </div>
  </div>`;
}

function blocks(
  child: DayChildView,
  ctx: ViewContext,
  state: CardState,
  level: number,
): TemplateResult | typeof nothing {
  const { content, plan } = child;
  if (!content || !plan) return nothing;
  if (plan.nothing) return html`<p class="empty">${ctx.t("nothingThisDay")}</p>`;
  const key = `${childKey(child.child)}|plan|${content.view.day}`;
  const planState = state.plan(key);
  return html`<div class="day-blocks">
    ${renderBlocks(plan, content, ctx, {
      detailed: false,
      level,
      planKey: key,
      planOpen: planState.open,
      planCut: planState.cut,
      togglePlan: (planKey) => {
        state.togglePlan(planKey);
      },
    })}
  </div>`;
}

function childState(child: DayChildView, ctx: ViewContext): TemplateResult | typeof nothing {
  if (child.state.kind === "loading") return loading(ctx.t);
  if (child.state.kind === "error") return apiError(child.state.error, ctx.t);
  return child.state.error === undefined ? nothing : apiError(child.state.error, ctx.t);
}

function single(
  child: DayChildView,
  view: DayCardView,
  ctx: ViewContext,
  state: CardState,
): TemplateResult {
  const school = view.differentSchools ? [child.child.institution_name] : [];
  return html`<div class="child">
    ${who(child.child, school)} ${childState(child, ctx)} ${aboveRows(child.above, ctx)}
    ${hero(child.focus, ctx, child.content?.hours, child.chips)} ${blocks(child, ctx, state, 3)}
  </div>`;
}

function sharedChild(
  child: DayChildView,
  view: DayCardView,
  ctx: ViewContext,
  state: CardState,
): TemplateResult {
  const school = view.differentSchools ? [child.child.institution_name] : [];
  const span = child.content?.hours;
  const end =
    child.state.kind !== "ready"
      ? nothing
      : span
        ? html`<span class="hours">${timeSpan(span.start, span.end, ctx)}</span>`
        : html`<span class="quiet">${ctx.t("noTimetable")}</span>`;
  return html`<div class="child">
    <div class="child-row">
      <h3>${who(child.child, school, end)}</h3>
      ${child.chips.length > 0 ? html`<div class="facts">${child.chips.map((item) => chip(item, ctx))}</div>` : nothing}
    </div>
    ${childState(child, ctx)} ${blocks(child, ctx, state, 4)}
  </div>`;
}

/** Renders the school day card. */
export function renderDay(view: DayCardView, ctx: ViewContext, state: CardState): TemplateResult {
  const label = ctx.t("regionDay", {
    names: names(
      view.children.map((child) => child.child),
      ctx,
    ),
  });
  const kids = `children kids-${String(Math.min(view.children.length, 3))}`;
  if (view.layout === "shared" && view.shared) {
    return html`<section class="day stack" aria-label=${label}>
      ${aboveRows(view.shared.above, ctx)}
      ${hero(view.shared.focus, ctx, undefined, view.shared.chips)}
      <div class="kids">
        <div class=${kids}>
          ${view.children.map((child) => sharedChild(child, view, ctx, state))}
        </div>
      </div>
    </section>`;
  }
  return html`<section class="day stack" aria-label=${label}>
    <div class="kids">
      <div class=${kids}>${view.children.map((child) => single(child, view, ctx, state))}</div>
    </div>
  </section>`;
}
