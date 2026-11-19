/**
 * The parts every window of the cards is made of: a modal dialog, centred on a wide screen and a
 * sheet from the bottom on a narrow one, closed by its button, by Escape or by a tap outside it;
 * its head, its ticket for a time, and its sections of quiet rows.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit/html.js";

import type { ViewContext } from "../core/context.ts";
import type { Day } from "../core/types.ts";
import { icon, segments, tile } from "./primitives.ts";

/** Shows a window; `close` is called when it is asked to close, by Escape or a tap outside it. */
export function modal(content: unknown, close: () => void, style = ""): TemplateResult {
  return html`<dialog
    class="detail"
    aria-labelledby="detail-title"
    style=${style}
    @close=${close}
    @click=${(tap: Event) => {
      if (tap.target === tap.currentTarget) close();
    }}
  >
    <div class="detail-body">${content}</div>
  </dialog>`;
}

/** Shows a line of a section: what it is, beside what it says. */
export function row(title: string, value: unknown): TemplateResult {
  return html`<div class="detail-row">
    <dt>${title}</dt>
    <dd>${value}</dd>
  </div>`;
}

/** Shows a section under its quiet heading; nothing when it has nothing. */
export function section(
  title: string,
  rows: readonly TemplateResult[],
  after: unknown = nothing,
): unknown {
  return rows.length === 0 && after === nothing
    ? nothing
    : html`<section class="detail-section">
        <h3 class="detail-heading">${title}</h3>
        ${rows.length > 0 ? html`<dl class="detail-list">${rows}</dl>` : nothing}${after}
      </section>`;
}

/**
 * Shows a window's head: its title over a line of what it is, the button that closes it, and the
 * marks under it; `face` stands before the title, as a child's.
 */
export function head(
  title: unknown,
  meta: readonly unknown[],
  marks: readonly TemplateResult[],
  ctx: ViewContext,
  close: () => void,
  face: unknown = nothing,
): TemplateResult {
  return html`<header class="detail-head">
      ${face}
      <div class="detail-titles">
        <h2 id="detail-title" class="detail-title">${title}</h2>
        ${meta.length > 0 ? segments(meta, "detail-meta") : nothing}
      </div>
      <button class="detail-close" type="button" aria-label=${ctx.t("close")} @click=${close}>
        ${icon("mdi:close")}
      </button>
    </header>
    ${marks.length > 0 ? html`<p class="detail-labels">${marks}</p>` : nothing}`;
}

/**
 * Shows the ticket: the day's tile beside the time, large, and under it the day and the place. `what`
 * names the time where it is not the event's own, as a booked one.
 */
export function ticket(
  day: Day,
  what: string | undefined,
  when: unknown,
  under: readonly unknown[],
  ctx: ViewContext,
): TemplateResult {
  return html`<div class="detail-ticket">
    ${tile(day, ctx, false)}
    <div class="detail-stub">
      ${what === undefined ? nothing : html`<span class="detail-what">${what}</span>`}
      <span class="detail-when">${when}</span>
      ${segments(under, "detail-under")}
    </div>
  </div>`;
}
