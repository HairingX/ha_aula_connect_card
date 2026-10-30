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
import type {
  HomeworkCardView,
  HomeworkDay,
  HomeworkHero,
  HomeworkPart,
} from "../model/homework-view.ts";
import { homeworkList, sameEmpty } from "./blocks.ts";
import type { CardState } from "./card.ts";
import {
  aula,
  avatar,
  childState,
  columns,
  dayTitle,
  headingOf,
  icon,
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
  const texts = item.parts.map((part) =>
    part.items.length > 0 ? undefined : partText(part, weekNumber(item.day), ctx),
  );
  const once = several ? sameEmpty(texts) : undefined;
  return html`<section class="hw-day ${item.focus ? "focus" : ""}">
    ${headingOf(level, head, "day-head")}
    ${
      once === undefined
        ? html`<div class="cols">
            ${item.parts.map(
              (part, at) =>
                html`<div
                  class="part ${texts[at] === undefined ? "" : "is-empty"}"
                  style="--col: ${index(part.child)}"
                >
                  ${
                    several
                      ? headingOf(
                          level + 1,
                          html`${avatar(part.child)}<span>${part.child.first_name}</span>`,
                          "part-who",
                        )
                      : nothing
                  }
                  ${
                    texts[at] === undefined
                      ? homeworkList(part.items, ctx)
                      : html`<p class="empty">${texts[at]}</p>`
                  }
                </div>`,
            )}
          </div>`
        : html`<p class="empty">${once}</p>`
    }
  </section>`;
}

function heroLine(item: HomeworkHero, ctx: ViewContext): TemplateResult {
  const { hero } = item;
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
      : [ctx.t("noSchoolDaysUntil", { day: formatDay(hero.horizon, ctx.language) })];
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
  const children = view.children.map((child) => child.child);
  const count = children.length;
  const several = count > 1;
  const [from, to] = view.weeks;
  // The card's title: whose homework it is, and the weeks it covers.
  const title = html`<h2 class="title-who">
    <span class="who"
      ><span class="avatars">${children.map(avatar)}</span>${segments([
        html`<span class="who-name">${names(children, ctx)}</span>`,
        html`<span class="who-meta">${t("homework")}</span>`,
        html`<span class="who-meta">${t("weeksShort", { from, to })}</span>`,
      ])}</span
    >
  </h2>`;
  // Kept by the children, the first one first, so that it closes when its focus day moves on.
  const key = `${children.map(childKey).join("|")}|earlier`;
  return html`<section class="homework-card stack ${columns(count)}" aria-label=${label}>
    ${title}
    ${
      several
        ? html`<div class="strip cols" aria-hidden="true">
            ${children.map(
              (child, index) =>
                html`<div class="kid" style="--col: ${index + 1}">
                  ${who(child, view.differentSchools ? [child.institution_name] : [])}
                </div>`,
            )}
          </div>`
        : nothing
    }
    ${view.children.map((child) =>
      child.state.kind === "ready"
        ? childState(child.state, t)
        : html`<div class="pending">
            ${several ? who(child.child, []) : nothing}${childState(child.state, t)}
          </div>`,
    )}
    ${view.heroes.map((item) => heroLine(item, ctx))}
    ${view.days.length > 0 ? html`<div class="hw-days">${view.days.map((item) => day(item, view, ctx, 3))}</div>` : nothing}
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
                ? html`<div class="hw-days earlier-days">
                    ${view.earlier.map((item) => day(item, view, ctx, 4))}
                  </div>`
                : nothing
            }
          </details>`
        : nothing
    }
  </section>`;
}
