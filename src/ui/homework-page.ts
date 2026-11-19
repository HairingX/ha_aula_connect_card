/**
 * The homework page's template: a pager for the weeks, then the homework due on each day, the
 * children's faces naming whose it is.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit/html.js";

import type { ViewContext } from "../core/context.ts";
import {
  addDays,
  capitalize,
  daysBetween,
  formatDayRange,
  formatShortDate,
  formatWeekday,
} from "../core/dates.ts";
import type { HomeworkItem, HomeworkPageView } from "../model/homework-page.ts";
import type { CardState } from "./card.ts";
import { apiError, aula, faceImage, icon, label, loading, names } from "./primitives.ts";

/** What the homework page's template asks the element besides what is open: the week shown. */
export interface HomeworkBrowser extends CardState {
  /** Shows the week before (-1) or after (1), or with 0 this week. */
  browse(step: -1 | 0 | 1): void;
}

function item(entry: HomeworkItem, ctx: ViewContext, state: CardState): TemplateResult {
  const face = state.face(entry.child);
  const { note } = entry;
  return html`<li class="hw-entry">
    ${faceImage(face, "mini")}
    <span class="hw-entry-text">
      <span class="hw-head"
        ><span class="hw-who">${face.name}</span>
        ${note.subject ? label(aula(note.subject.name, ctx), "subject") : nothing}
        ${note.title ? html`<span class="hw-title">${aula(note.title, ctx)}</span>` : nothing}</span
      >
      ${note.text ? html`<span class="hw-text">${aula(note.text, ctx)}</span>` : nothing}
    </span>
  </li>`;
}

function dayHead(day: string, ctx: ViewContext): TemplateResult {
  const ahead = daysBetween(ctx.today, day);
  const title =
    ahead === 0
      ? ctx.t("today")
      : ahead === 1
        ? ctx.t("tomorrow")
        : capitalize(formatWeekday(day, ctx.language), ctx.language);
  const line =
    ahead > 1
      ? `${formatShortDate(day, ctx.language)} · ${ctx.t("inDays", { n: ahead })}`
      : formatShortDate(day, ctx.language);
  return html`<h3 class="hw-day-head">${title} <span class="quiet">${line}</span></h3>`;
}

function relation(offset: number, ctx: ViewContext): string {
  if (offset === 0) return ctx.t("thisWeek");
  if (offset === 1) return ctx.t("nextWeek");
  if (offset === -1) return ctx.t("lastWeek");
  return offset > 0 ? ctx.t("weeksAhead", { n: offset }) : ctx.t("weeksAgo", { n: -offset });
}

/** Renders the homework page. */
export function renderHomeworkPage(
  view: HomeworkPageView,
  ctx: ViewContext,
  browser: HomeworkBrowser,
): TemplateResult {
  const { t } = ctx;
  const children = [
    ...new Set([
      ...view.days.flatMap((day) => day.items.map((entry) => entry.child)),
      ...view.none,
    ]),
  ];
  const key = `earlier|${view.week}`;
  const open = browser.isOpen(key, false);
  return html`<section
    class="hw-page"
    aria-label=${t("regionHomeworkPage", { names: names(children, ctx) })}
  >
    <nav class="hw-pager" aria-label=${t("weekNav")}>
      <button
        class="nav-step"
        type="button"
        aria-label=${t("previousWeek")}
        @click=${() => {
          browser.browse(-1);
        }}
      >
        ${icon("mdi:chevron-left")}
      </button>
      <span class="hw-week" aria-live="polite"
        ><b>${t("weekNumber", { n: view.number })}</b>
        <span class="quiet"
          >${formatDayRange(view.week, addDays(view.week, 6), ctx.language, "short")} ·
          ${relation(view.offset, ctx)}</span
        ></span
      >
      ${
        view.offset === 0
          ? nothing
          : html`<button
              class="nav-today"
              type="button"
              @click=${() => {
                browser.browse(0);
              }}
            >
              <span>${t("today")}</span>
            </button>`
      }
      <button
        class="nav-step"
        type="button"
        aria-label=${t("nextWeek")}
        @click=${() => {
          browser.browse(1);
        }}
      >
        ${icon("mdi:chevron-right")}
      </button>
    </nav>
    ${view.error !== undefined ? apiError(view.error, t) : view.loading ? loading(t) : nothing}
    ${
      view.earlier.length > 0
        ? html`<details class="fold" ?open=${open} @toggle=${browser.toggled(key, false)}>
            <summary>
              ${t("earlierInWeek", { n: view.earlier.length })}
              ${icon("mdi:chevron-down", "chevron")}
            </summary>
            ${
              open
                ? html`<ul class="hw-list">
                    ${view.earlier.map((entry) => item(entry, ctx, browser))}
                  </ul>`
                : nothing
            }
          </details>`
        : nothing
    }
    ${view.days.map(
      (day) =>
        html`<section class="hw-day">
          ${dayHead(day.day, ctx)}
          <ul class="hw-list">
            ${day.items.map((entry) => item(entry, ctx, browser))}
          </ul>
        </section>`,
    )}
    ${
      view.loading || view.error !== undefined
        ? nothing
        : view.none.map(
            (child) =>
              html`<p class="hw-none">
                ${faceImage(browser.face(child), "mini")}<span
                  >${t(
                    view.offset === 0 && view.earlier.some((entry) => entry.child === child)
                      ? "noMoreHomeworkWeek"
                      : "noHomeworkWeek",
                    {
                      name: browser.face(child).name,
                      n: view.number,
                    },
                  )}</span
                >
              </p>`,
          )
    }
  </section>`;
}
