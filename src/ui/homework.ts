/**
 * The homework card's template: the homework by the day it is for, the focus day first even when
 * it has none, each day with a part for each child, and the earlier days folded at the bottom.
 * Children stand side by side in aligned columns where there is room.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit";

import type { ViewContext } from "../core/context.ts";
import {
  formatDay,
  formatDayRange,
  formatShortDate,
  formatWeekdayShortDate,
  weekNumber,
} from "../core/dates.ts";
import { childKey, type Child } from "../core/types.ts";
import type { Hero } from "../model/day-view.ts";
import type {
  HomeworkCardView,
  HomeworkDay,
  HomeworkHero,
  HomeworkPart,
} from "../model/homework-view.ts";
import { homeworkList } from "./blocks.ts";
import type { CardState } from "./card.ts";
import {
  apiError,
  aula,
  avatar,
  dayTitle,
  icon,
  loading,
  names,
  segments,
  who,
} from "./primitives.ts";

function partText(part: HomeworkPart, week: number, ctx: ViewContext): string {
  switch (part.empty) {
    case "planMissing":
      return ctx.t("weekPlanNotYet", { n: week });
    case "noWeekPlan":
      return ctx.t("noWeekPlan");
    default:
      return ctx.t("noHomework");
  }
}

function day(
  item: HomeworkDay,
  view: HomeworkCardView,
  ctx: ViewContext,
  level: 3 | 4,
): TemplateResult {
  const several = view.children.length > 1;
  const relative = item.relation !== "weekday";
  const date = relative
    ? formatWeekdayShortDate(item.day, ctx.language)
    : formatShortDate(item.day, ctx.language);
  const week = item.week === undefined ? [] : [ctx.t("weekShort", { n: item.week })];
  const head = html`<span class="day-title">${dayTitle(item.day, ctx)}</span>${segments(
      [date, ...week],
      "day-date",
    )}`;
  const index = (child: Child): number =>
    view.children.findIndex((entry) => childKey(entry.child) === childKey(child)) + 1;
  return html`<section class="hw-day ${item.focus ? "focus" : ""}">
    ${level === 3 ? html`<h3 class="day-head">${head}</h3>` : html`<h4 class="day-head">${head}</h4>`}
    <div class="cols">
      ${item.parts.map(
        (part) =>
          html`<div class="part" style="--col: ${index(part.child)}">
            ${
              several
                ? html`<p class="part-who">
                    ${avatar(part.child)}<span>${part.child.first_name}</span>
                  </p>`
                : nothing
            }
            ${
              part.items.length > 0
                ? homeworkList(part.items, ctx)
                : html`<p class="empty">${partText(part, weekNumber(item.day), ctx)}</p>`
            }
          </div>`,
      )}
    </div>
  </section>`;
}

function heroLine(item: HomeworkHero, ctx: ViewContext): TemplateResult {
  const hero: Hero = item.hero;
  const whose = item.only.length > 0 ? ` (${names(item.only, ctx)})` : "";
  const title =
    hero.kind === "holiday"
      ? html`${aula(hero.event.title, ctx)}${whose}`
      : `${ctx.t("noSchoolDays")}${whose}`;
  const parts =
    hero.kind === "holiday"
      ? [
          formatDayRange(hero.first, hero.last, ctx.language, "short"),
          ...(hero.resumes === undefined
            ? []
            : [ctx.t("schoolStarts", { day: formatDay(hero.resumes, ctx.language) })]),
        ]
      : hero.kind === "none"
        ? [ctx.t("noSchoolDaysUntil", { day: formatDay(hero.horizon, ctx.language) })]
        : [];
  return html`<section class="hw-day focus">
    <h3 class="day-head">
      ${icon(hero.kind === "holiday" ? "mdi:beach" : "mdi:calendar-remove-outline")}<span
        class="day-title"
        >${title}</span
      >${segments(parts, "day-date")}
    </h3>
  </section>`;
}

/** Renders the homework card. */
export function renderHomework(
  view: HomeworkCardView,
  ctx: ViewContext,
  state: CardState,
): TemplateResult {
  const { t } = ctx;
  const label = t("regionHomework", {
    names: names(
      view.children.map((child) => child.child),
      ctx,
    ),
  });
  const count = view.children.length;
  const several = count > 1;
  const meta = (child: Child): string[] => [
    ...(view.differentSchools ? [child.institution_name] : []),
    t("homework"),
  ];
  // Kept by the first child, so that it closes when that child's focus day moves on.
  const first = view.children[0];
  const key = `${first ? childKey(first.child) : ""}|earlier`;
  return html`<section
    class="homework-card stack n-${String(Math.min(count, 3))}"
    aria-label=${label}
  >
    ${
      several
        ? html`<div class="strip cols" aria-hidden="true">
            ${view.children.map(
              (child, index) =>
                html`<div class="kid" style="--col: ${index + 1}">
                  ${who(child.child, meta(child.child))}
                </div>`,
            )}
          </div>`
        : view.children.map(
            (child) => html`<h2 class="title-who">${who(child.child, meta(child.child))}</h2>`,
          )
    }
    ${view.children.map((child) =>
      child.state.kind === "ready"
        ? child.state.error === undefined
          ? nothing
          : apiError(child.state.error, t)
        : html`<div class="pending">
            ${several ? who(child.child, []) : nothing}
            ${child.state.kind === "loading" ? loading(t) : apiError(child.state.error, t)}
          </div>`,
    )}
    ${view.heroes.map((item) => heroLine(item, ctx))}
    ${view.days.map((item) => day(item, view, ctx, 3))}
    ${view.notYet.map(
      (item) =>
        html`<p class="not-yet">
          ${t("weekPlanNotYet", { n: item.week })}${item.only.length > 0 ? ` (${names(item.only, ctx)})` : ""}
        </p>`,
    )}
    ${
      view.earlier.length > 0
        ? html`<details
            class="fold earlier"
            ?open=${state.isOpen(key, false)}
            @toggle=${state.toggled(key, false)}
          >
            <summary>
              ${t("earlierHomework", { n: view.earlierCount })}${icon("mdi:chevron-down", "chevron")}
            </summary>
            ${
              state.isOpen(key, false)
                ? html`<div class="earlier-days">
                    ${view.earlier.map((item) => day(item, view, ctx, 4))}
                  </div>`
                : nothing
            }
          </details>`
        : nothing
    }
  </section>`;
}
