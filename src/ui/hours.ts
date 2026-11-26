/**
 * The hours' template: for each institution, today's hours, this week's and next week's, and the
 * days it is closed ahead.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit/html.js";

import type { ViewContext } from "../core/context.ts";
import { capitalize, formatDayRange, formatWeekdayShort } from "../core/dates.ts";
import type { ClosedDays } from "../core/types.ts";
import type { HoursSpan, HoursView, Place } from "../model/hours.ts";
import type { CardState } from "./card.ts";
import { clockText } from "./overview.ts";
import { apiError, aula, icon, label, loading, minis, names } from "./primitives.ts";

/** The closed periods shown before the rest are folded away. */
export const CLOSED_SHOWN = 4;

function days(span: HoursSpan, ctx: ViewContext): string {
  const word = (day: string): string =>
    capitalize(formatWeekdayShort(day, ctx.language), ctx.language);
  return span.first === span.last ? word(span.first) : `${word(span.first)}–${word(span.last)}`;
}

function hoursText(span: HoursSpan, ctx: ViewContext): string {
  if (span.closed) {
    return span.name ? `${ctx.t("hoursClosed")} · ${span.name}` : ctx.t("hoursClosed");
  }
  if (span.open && span.close) return `${clockText(span.open, ctx)}–${clockText(span.close, ctx)}`;
  return ctx.t("hoursOpen");
}

function todayLine(span: HoursSpan | undefined, ctx: ViewContext): TemplateResult | typeof nothing {
  if (!span) return nothing;
  return html`<p class="hours-today ${span.closed ? "is-closed" : ""}">
    ${icon(span.closed ? "mdi:door-closed" : "mdi:door-open")}
    <span>${ctx.t("today")}</span>
    <strong>${aula(hoursText(span, ctx), ctx)}</strong>
  </p>`;
}

function week(title: string, spans: readonly HoursSpan[], ctx: ViewContext): TemplateResult {
  return html`<div class="hours-week">
    <h4 class="hours-week-head">${title}</h4>
    ${
      spans.length === 0
        ? html`<p class="hours-none">${ctx.t("hoursUnknown")}</p>`
        : html`<ul class="hours-days">
            ${spans.map(
              (span) =>
                html`<li
                  class=${[span.closed ? "is-closed" : "", span.today ? "is-today" : ""].join(" ")}
                >
                  <span class="hours-when">${days(span, ctx)}</span>
                  <span class="hours-time tabular"
                    >${
                      span.closed && span.name
                        ? html`${ctx.t("hoursClosed")}
                            <span class="hours-why">· ${aula(span.name, ctx)}</span>`
                        : hoursText(span, ctx)
                    }</span
                  >
                </li>`,
            )}
          </ul>`
    }
  </div>`;
}

function closedRow(period: ClosedDays, ctx: ViewContext): TemplateResult {
  return html`<li class="family-row">
    ${icon("mdi:calendar-remove-outline", "hours-closed-icon")}
    <span class="family-text">
      <span class="family-title">${aula(period.name || ctx.t("hoursClosed"), ctx)}</span>
      <span class="family-sub"
        >${formatDayRange(period.start, period.end, ctx.language, "long")}</span
      >
    </span>
    ${period.start <= ctx.today ? label(ctx.t("vacationOngoing")) : nothing}
  </li>`;
}

function place(item: Place, ctx: ViewContext, state: CardState, many: boolean): TemplateResult {
  const { t } = ctx;
  const shown = item.closed.slice(0, CLOSED_SHOWN);
  const folded = item.closed.slice(CLOSED_SHOWN);
  return html`<section class="hours-place" aria-label=${item.institution}>
    ${
      many
        ? html`<h3 class="hours-place-head">
            ${minis(
              item.children.map((child) => state.face(child)),
              ctx,
            )}
            <span class="family-text">
              <span class="family-title">${aula(item.institution, ctx)}</span>
              <span class="family-sub">${names(item.children, ctx)}</span>
            </span>
          </h3>`
        : nothing
    }
    ${todayLine(item.today, ctx)}
    <div class="hours-weeks">
      ${week(t("thisWeek"), item.thisWeek, ctx)} ${week(t("nextWeek"), item.nextWeek, ctx)}
    </div>
    <h4 class="family-head">${t("closedDays")}</h4>
    ${
      item.closed.length === 0
        ? html`<p class="hours-none">${t("noClosedDays")}</p>`
        : html`<ul class="family-rows">
            ${shown.map((period) => closedRow(period, ctx))}
          </ul>`
    }
    ${
      folded.length > 0
        ? html`<details class="family-fold">
            <summary>
              <span>${t("closedDaysMore", { n: folded.length })}</span
              >${icon("mdi:chevron-down", "chevron")}
            </summary>
            <ul class="family-rows">
              ${folded.map((period) => closedRow(period, ctx))}
            </ul>
          </details>`
        : nothing
    }
  </section>`;
}

/** Renders the hours card: each institution the children go to, once. */
export function renderHours(view: HoursView, ctx: ViewContext, state: CardState): TemplateResult {
  const { t } = ctx;
  const only = view.places.length === 1 && !view.several ? view.places[0] : undefined;
  return html`<section class="family-card hours-card" aria-label=${t("hoursTitle")}>
    <h2 class="block-head">
      ${icon("mdi:clock-outline")}<span>${t("hoursTitle")}</span>
      ${only ? html`<span class="hours-only">${aula(only.institution, ctx)}</span>` : nothing}
    </h2>
    ${view.errors.length > 0 && view.places.length === 0 ? apiError(view.errors[0], t) : nothing}
    ${view.loading ? loading(t) : nothing}
    ${
      !view.loading && view.places.length === 0 && view.errors.length === 0
        ? html`<p class="empty">${t("hoursNone")}</p>`
        : nothing
    }
    ${view.places.map((item) => place(item, ctx, state, !only))}
  </section>`;
}
