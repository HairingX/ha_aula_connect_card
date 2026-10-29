/**
 * The homework card's template: for each child, the homework by the day it is for, the focus
 * day first even when it has none, the earlier days folded at the bottom.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit";

import type { ViewContext } from "../core/context.ts";
import { formatDay, formatShortDate, formatWeekdayShortDate } from "../core/dates.ts";
import { childKey } from "../core/types.ts";
import type { HomeworkCardView, HomeworkChildView, HomeworkGroup } from "../model/homework-view.ts";
import { homeworkBoxes } from "./blocks.ts";
import type { CardState } from "./card.ts";
import { apiError, dayTitle, icon, loading, names, who } from "./primitives.ts";

function group(item: HomeworkGroup, ctx: ViewContext, level: number): TemplateResult {
  const relative = item.relation !== "weekday";
  const date = relative
    ? formatWeekdayShortDate(item.day, ctx.language)
    : formatShortDate(item.day, ctx.language);
  const week = item.week === undefined ? "" : ` · ${ctx.t("weekShort", { n: item.week })}`;
  return html`<section class="group">
    <div class="group-head" role="heading" aria-level=${level}>
      <span class="group-title">${dayTitle(item.day, ctx)}</span>
      <span class="group-date">${date}${week}</span>
    </div>
    ${
      item.items.length > 0
        ? homeworkBoxes(item.items, ctx)
        : html`<p class="empty">${ctx.t("noHomework")}</p>`
    }
  </section>`;
}

function body(child: HomeworkChildView, ctx: ViewContext, state: CardState): unknown {
  const { t } = ctx;
  if (child.state.kind === "loading") return loading(t);
  if (child.state.kind === "error") return apiError(child.state.error, t);
  if (!child.weekPlan) return html`<p class="empty">${t("noWeekPlan")}</p>`;
  const key = `${childKey(child.child)}|earlier`;
  const horizon = child.focus.day === undefined ? child.focus.horizon : undefined;
  return html`${child.state.error === undefined ? nothing : apiError(child.state.error, t)}
  ${
    horizon === undefined
      ? nothing
      : html`<p class="none">${t("noSchoolDays", { day: formatDay(horizon, ctx.language) })}</p>`
  }
  ${
    child.groups.length > 0
      ? html`<div class="groups">${child.groups.map((item) => group(item, ctx, 3))}</div>`
      : nothing
  }
  ${child.notYet.map((week) => html`<p class="not-yet">${t("weekPlanNotYet", { n: week })}</p>`)}
  ${
    child.earlier.length > 0
      ? html`<details
          class="fold earlier"
          ?open=${state.isOpen(key, false)}
          @toggle=${state.toggled(key, false)}
        >
          <summary>
            ${t("earlierHomework", { n: child.earlierCount })}${icon("mdi:chevron-down", "chevron")}
          </summary>
          <div class="groups">${child.earlier.map((item) => group(item, ctx, 4))}</div>
        </details>`
      : nothing
  }`;
}

/** Renders the homework card. */
export function renderHomework(
  view: HomeworkCardView,
  ctx: ViewContext,
  state: CardState,
): TemplateResult {
  const label = ctx.t("regionHomework", {
    names: names(
      view.children.map((child) => child.child),
      ctx,
    ),
  });
  return html`<section class="homework-card stack" aria-label=${label}>
    <div class="kids">
      <div class="children kids-${String(Math.min(view.children.length, 3))}">
        ${view.children.map(
          (child) =>
            html`<div class="child">
              <h2>
                ${who(child.child, [
                  ...(view.differentSchools ? [child.child.institution_name] : []),
                  ctx.t("homework"),
                ])}
              </h2>
              ${body(child, ctx, state)}
            </div>`,
        )}
      </div>
    </div>
  </section>`;
}
