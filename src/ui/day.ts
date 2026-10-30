/**
 * The school day card's template: the day that matters now, its header the largest text on the
 * card, and above it what is left of today and the days passed over. Children who share the day
 * share the header, and each block answers its question for every child in turn: side by side
 * when there is room, in aligned columns.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit";

import type { ViewContext } from "../core/context.ts";
import { capitalize, formatDay, formatDayRange, formatWeekday } from "../core/dates.ts";
import { glue } from "../core/text.ts";
import { childKey, type Child, type Day } from "../core/types.ts";
import type { BridgeRow } from "../model/bridges.ts";
import type { AboveRows, DayCardView, DayChildView, DayGroup, Hero } from "../model/day-view.ts";
import type { Fact } from "../model/blocks.ts";
import { isRunning } from "../model/today.ts";
import { renderBlock } from "./blocks.ts";
import type { CardState } from "./card.ts";
import {
  apiError,
  aula,
  avatar,
  columns,
  eventIcon,
  eventWhen,
  fact,
  facts as factList,
  heading,
  hours,
  icon,
  loading,
  names,
  segments,
  tile,
  timeText,
  titled,
  who,
} from "./primitives.ts";

/** The most parts of the rest-of-today row before the others become "+n". */
const TODAY_PARTS = 3;

function line(
  iconName: string,
  labelText: unknown,
  text: unknown,
  end: unknown = nothing,
): TemplateResult {
  return html`<li class="bridge ${text === nothing ? "alone" : ""}">
    ${icon(iconName)}
    <span class="bridge-label">${labelText}</span>
    ${text === nothing ? nothing : html`<span class="bridge-text">${text}</span>`}
    ${end === nothing ? nothing : html`<span class="bridge-end">${end}</span>`}
  </li>`;
}

function joined(parts: readonly unknown[], ctx: ViewContext): TemplateResult {
  const shown = parts.slice(0, TODAY_PARTS);
  const more = parts.length - shown.length;
  return segments(more > 0 ? [...shown, ctx.t("more", { n: more })] : shown);
}

function factText(item: Fact, ctx: ViewContext): unknown {
  return item.kind === "event"
    ? aula(item.event.title, ctx)
    : ctx.t("birthdayOf", { name: item.birthday.name });
}

function whose(only: readonly Child[], ctx: ViewContext): string {
  return only.length > 0 ? ` (${names(only, ctx)})` : "";
}

// With several children each time is named, so that one child's is never read as every child's.
function todayRow(
  above: AboveRows,
  ctx: ViewContext,
  several: boolean,
): TemplateResult | typeof nothing {
  const { t } = ctx;
  if (above.today.length === 0) return nothing;
  const parts: unknown[] = [];
  for (const { child, rest, running } of above.today) {
    const time = rest.ends === undefined ? undefined : timeText(rest.ends, ctx);
    if (several) {
      if (time !== undefined) parts.push(t("childEnds", { name: child.first_name, time }));
    } else {
      if (running) parts.push(t("nowLesson", { subject: running.name }));
      if (time !== undefined) parts.push(t("schoolEnds", { time }));
    }
  }
  for (const { item, only } of above.events) {
    parts.push(
      html`${aula(item.event.title, ctx)}
      ${eventWhen(item, ctx, !isRunning(item.event, ctx.now))}${whose(only, ctx)}`,
    );
  }
  for (const { item, only } of above.facts)
    parts.push(html`${factText(item, ctx)}${whose(only, ctx)}`);
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
        : glue(`${weekday(first)}–${formatWeekday(last, ctx.language)}`);
  }
}

function bridge(row: BridgeRow, only: readonly Child[], ctx: ViewContext): TemplateResult {
  const who = whose(only, ctx);
  switch (row.kind) {
    case "holiday":
      return line(
        eventIcon(row.event.type),
        html`${aula(bridgeLabel(row, ctx), ctx)}${who}`,
        nothing,
        formatDayRange(row.first, row.last, ctx.language, "short"),
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
        html`${joined(titles, ctx)}${who}`,
        timed ? timeText(first.event.start, ctx) : nothing,
      );
    }
    case "empty":
      return line(
        "mdi:calendar-remove-outline",
        bridgeLabel(row, ctx),
        `${ctx.t(row.cancelled ? "allCancelled" : "noTimetableInAula")}${who}`,
      );
  }
}

function aboveRows(
  above: AboveRows,
  ctx: ViewContext,
  several: boolean,
): TemplateResult | typeof nothing {
  if (above.today.length === 0 && above.bridges.length === 0 && above.moreDays === 0) {
    return nothing;
  }
  return html`<ul class="above">
    ${todayRow(above, ctx, several)}${above.bridges.map((item) => bridge(item.row, item.only, ctx))}
    ${
      above.moreDays > 0
        ? html`<li class="bridge-more">${ctx.t("daysWithoutSchool", { n: above.moreDays })}</li>`
        : nothing
    }
  </ul>`;
}

function hero(
  item: Hero,
  shown: readonly Fact[],
  span: { start: string; end: string } | undefined,
  ctx: ViewContext,
  named: Child | undefined,
): TemplateResult {
  let mark: TemplateResult;
  let title: TemplateResult;
  switch (item.kind) {
    case "day": {
      const { reason } = item.focus;
      mark = tile(item.day, ctx, reason === "today");
      title = heading(item.day, reason, ctx);
      break;
    }
    case "holiday":
      mark = html`<span class="tile" aria-hidden="true">${icon("mdi:beach")}</span>`;
      title = titled(aula(item.event.title, ctx), [
        formatDayRange(item.first, item.last, ctx.language, "long"),
        ...(item.resumes === undefined
          ? []
          : [ctx.t("schoolStarts", { day: formatDay(item.resumes, ctx.language) })]),
      ]);
      break;
    case "none":
      mark = html`<span class="tile" aria-hidden="true"
        >${icon("mdi:calendar-remove-outline")}</span
      >`;
      title = titled(ctx.t("noSchoolDays"), [
        ctx.t("noSchoolDaysUntil", { day: formatDay(item.horizon, ctx.language) }),
      ]);
  }
  return html`<div class="hero">
    ${mark}
    <div class="hero-text">
      <h2>${named ? html`<span class="sr">${named.first_name}: </span>` : nothing}${title}</h2>
      ${factList([...(span ? [hours(span, ctx)] : []), ...shown.map((entry) => fact(entry, ctx))])}
    </div>
  </div>`;
}

function childError(child: DayChildView, ctx: ViewContext): TemplateResult | typeof nothing {
  if (child.state.kind === "loading") return loading(ctx.t);
  if (child.state.kind === "error") return apiError(child.state.error, ctx.t);
  return child.state.error === undefined ? nothing : apiError(child.state.error, ctx.t);
}

function strip(group: DayGroup, view: DayCardView, ctx: ViewContext): TemplateResult {
  return html`<ul class="strip cols">
    ${group.children.map(
      (child, index) =>
        html`<li class="kid" style="--col: ${index + 1}">
          <span class="kid-who"
            >${avatar(child.child)}${segments([
              html`<span class="kid-name">${child.child.first_name}</span>`,
              ...(view.differentSchools ? [child.child.institution_name] : []),
            ])}</span
          >
          ${
            child.content?.hours
              ? hours(child.content.hours, ctx)
              : child.content
                ? html`<span class="quiet"
                    >${ctx.t(child.content.view.lessons.length > 0 ? "allCancelled" : "noTimetable")}</span
                  >`
                : nothing
          }
          ${factList(
            child.facts.map((item) => fact(item, ctx)),
            "span",
          )}
          ${childError(child, ctx)}
        </li>`,
    )}
  </ul>`;
}

function blocks(group: DayGroup, day: Day, ctx: ViewContext, state: CardState): TemplateResult {
  if (group.blocks.length === 0) return html`<p class="empty">${ctx.t("nothingThisDay")}</p>`;
  const several = group.children.length > 1;
  return html`<div class="day-blocks">
    ${group.blocks.map((block) =>
      renderBlock(
        block.id,
        block.parts.map((part, index) => ({
          content: part.content,
          quotes: part.plan.quotes,
          subjects: part.plan.subjects,
          empty: part.empty,
          child: several ? part.child.child : undefined,
          key: childKey(part.child.child),
          col: index + 1,
        })),
        ctx,
        { day, detailed: false, level: 3, state },
      ),
    )}
  </div>`;
}

function group(
  item: DayGroup,
  view: DayCardView,
  ctx: ViewContext,
  state: CardState,
  several: boolean,
): TemplateResult {
  const count = item.children.length;
  const [first] = item.children;
  const one = count === 1 ? first : undefined;
  const school = (child: Child): string[] =>
    view.differentSchools ? [child.institution_name] : [];
  return html`<div class="child ${columns(count)} ${one ? "single" : ""}">
    ${one ? who(one.child, school(one.child)) : nothing} ${one ? childError(one, ctx) : nothing}
    ${
      item.hero
        ? html`${item.above ? aboveRows(item.above, ctx, count > 1) : nothing}
          ${hero(item.hero, item.facts, one?.content?.hours, ctx, several ? one?.child : undefined)}
          ${count > 1 ? strip(item, view, ctx) : nothing}
          ${item.hero.kind === "day" ? blocks(item, item.hero.day, ctx, state) : nothing}`
        : nothing
    }
  </div>`;
}

/** Renders the school day card. */
export function renderDay(view: DayCardView, ctx: ViewContext, state: CardState): TemplateResult {
  const label = ctx.t("regionDay", {
    names: names(
      view.groups.flatMap((item) => item.children.map((child) => child.child)),
      ctx,
    ),
  });
  const several = view.groups.length > 1;
  // Children at schools with different days stand side by side; a shared day has its columns.
  const side =
    several && view.groups.every((item) => item.children.length === 1)
      ? columns(view.groups.length, "kids-")
      : "";
  return html`<section class="day stack" aria-label=${label}>
    <div class="kids">
      <div class="children ${side}">
        ${view.groups.map((item) => group(item, view, ctx, state, several))}
      </div>
    </div>
  </section>`;
}
