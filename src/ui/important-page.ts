/**
 * The Important page's template: a pager for the weeks, then the important notes for each day, the
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
import type { ImportantItem, ImportantPageView } from "../model/important-page.ts";
import type { CardState } from "./card.ts";
import { apiError, aula, faceImage, icon, label, loading, names } from "./primitives.ts";

/** What the Important page's template asks the element besides what is open: the week shown. */
export interface ImportantBrowser extends CardState {
  /** Shows the week before (-1) or after (1), or with 0 this week. */
  browse(step: -1 | 0 | 1): void;
}

function item(entry: ImportantItem, ctx: ViewContext, state: CardState): TemplateResult {
  const face = state.face(entry.child);
  const { note } = entry;
  return html`<li class="note-entry">
    ${faceImage(face, "mini")}
    <span class="note-entry-text">
      <span class="note-head"
        ><span class="note-who">${face.name}</span>
        ${note.subject ? label(aula(note.subject.name, ctx), "subject") : nothing}
        ${note.title ? html`<span class="note-title">${aula(note.title, ctx)}</span>` : nothing}</span
      >
      ${note.text ? html`<span class="note-text">${aula(note.text, ctx)}</span>` : nothing}
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
  return html`<h3 class="note-day-head">${title} <span class="quiet">${line}</span></h3>`;
}

function relation(offset: number, ctx: ViewContext): string {
  if (offset === 0) return ctx.t("thisWeek");
  if (offset === 1) return ctx.t("nextWeek");
  if (offset === -1) return ctx.t("lastWeek");
  return offset > 0 ? ctx.t("weeksAhead", { n: offset }) : ctx.t("weeksAgo", { n: -offset });
}

/** Renders the Important page. */
export function renderWeekplanPage(
  view: ImportantPageView,
  ctx: ViewContext,
  browser: ImportantBrowser,
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
    class="note-page"
    aria-label=${t("regionImportantPage", { names: names(children, ctx) })}
  >
    <nav class="note-pager" aria-label=${t("weekNav")}>
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
      <span class="note-week" aria-live="polite"
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
                ? html`<ul class="note-list">
                    ${view.earlier.map((entry) => item(entry, ctx, browser))}
                  </ul>`
                : nothing
            }
          </details>`
        : nothing
    }
    ${view.days.map(
      (day) =>
        html`<section class="note-day">
          ${dayHead(day.day, ctx)}
          <ul class="note-list">
            ${day.items.map((entry) => item(entry, ctx, browser))}
          </ul>
        </section>`,
    )}
    ${
      view.loading || view.error !== undefined
        ? nothing
        : view.none.map(
            (child) =>
              html`<p class="note-none">
                ${faceImage(browser.face(child), "mini")}<span
                  >${t(
                    view.offset === 0 && view.earlier.some((entry) => entry.child === child)
                      ? "noMoreImportantWeek"
                      : "noImportantWeek",
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
