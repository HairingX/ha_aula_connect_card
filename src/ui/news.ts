/**
 * The news feed's template: a line for each post, the new and the important marked, and a window
 * with the whole post on a tap.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit/html.js";

import { actionErrorText, markPostSeen } from "../core/api.ts";
import type { ViewContext } from "../core/context.ts";
import {
  capitalize,
  daysBetween,
  formatShortDate,
  formatTime,
  formatWeekday,
} from "../core/dates.ts";
import type { NewsItem, NewsView } from "../model/news.ts";
import type { CardState } from "./card.ts";
import {
  alert,
  apiError,
  aula,
  icon,
  label,
  loading,
  minis,
  names,
  turnedOff,
  weekBreak,
} from "./primitives.ts";
import { run, type Step } from "./vacation.ts";
import { head, modal, section } from "./window.ts";

function when(item: NewsItem, ctx: ViewContext): string {
  const ago = daysBetween(item.day, ctx.today);
  if (ago === 0) return ctx.t("today");
  if (ago === 1) return ctx.t("yesterday");
  return ago < 7
    ? capitalize(formatWeekday(item.day, ctx.language), ctx.language)
    : formatShortDate(item.day, ctx.language);
}

function marks(item: NewsItem, ctx: ViewContext, until = false, seen = false): TemplateResult[] {
  const last = until ? item.post.important_to : null;
  const important = last
    ? ctx.t("newsImportantUntil", { day: formatShortDate(last, ctx.language) })
    : ctx.t("newsImportant");
  return [
    ...(item.fresh && !seen ? [label(ctx.t("newsNew"), "news-new")] : []),
    ...(item.important ? [label(html`${icon("mdi:flag")}${important}`, "warning")] : []),
  ];
}

function byLine(
  item: NewsItem,
  view: NewsView,
  ctx: ViewContext,
  state: CardState,
): TemplateResult | typeof nothing {
  const parts = [
    ...(view.several ? [names(item.children, ctx)] : []),
    ...(item.post.author ? [item.post.author] : []),
  ];
  if (parts.length === 0) return nothing;
  return html`<span class="news-by"
    >${
      view.several
        ? minis(
            item.children.map((child) => state.face(child)),
            ctx,
            "news-faces",
          )
        : nothing
    }<span>${aula(parts.join(" · "), ctx)}</span></span
  >`;
}

function seenPart(
  item: NewsItem,
  step: Step,
  state: CardState,
  ctx: ViewContext,
  changed: () => void,
): unknown {
  if (!item.fresh && !step.done) return nothing;
  const { t } = ctx;
  // The answer takes the button's place, so that nothing below it moves.
  if (step.done) {
    return html`<div class="window-actions">
      <p class="done-line done-action">
        ${icon("mdi:check-circle-outline")}<span>${t("markedSeen")}</span>
      </p>
    </div>`;
  }
  const logins = item.from.filter((entry) => entry.allowed.includes("mark_seen"));
  if (logins.length === 0) return turnedOff("mark_seen", t);
  return html`${step.error === undefined ? nothing : alert("error", actionErrorText(step.error, t))}
    <div class="window-actions">
      <button
        class="filled-button"
        type="button"
        ?disabled=${step.busy}
        @click=${() => {
          run(
            state,
            step,
            async () => {
              for (const entry of logins)
                await markPostSeen(state.callWS, entry.entry_id, item.post.id);
            },
            changed,
          );
        }}
      >
        ${icon("mdi:check")}<span>${step.busy ? t("sending") : t("markSeen")}</span>
      </button>
    </div>`;
}

function openPost(
  item: NewsItem,
  view: NewsView,
  state: CardState,
  key: string,
  changed: () => void,
): void {
  const step: Step = { busy: false, error: undefined, done: false };
  state.openModal(key, (ctx, close) => {
    const { post } = item;
    const at = formatTime(item.at, ctx.language, ctx.zone, ctx.amPm);
    const meta = [
      ...(view.several ? [names(item.children, ctx)] : []),
      `${when(item, ctx)} ${at}`,
      ...(post.author ? [aula(post.author, ctx)] : []),
      ...(post.institution ? [aula(post.institution, ctx)] : []),
    ];
    return modal(
      html`${head(aula(post.title, ctx), meta, marks(item, ctx, true, step.done), ctx, close)}
        <p class="news-text">${aula(item.text, ctx)}</p>
        ${section(
          ctx.t("newsAttachments"),
          [],
          post.attachments.length === 0
            ? nothing
            : html`<ul class="news-files">
                ${post.attachments.map(
                  (file) =>
                    html`<li>
                      ${icon(file.media ? "mdi:image-outline" : "mdi:file-outline")}
                      ${
                        file.url
                          ? html`<a href=${file.url} target="_blank" rel="noopener noreferrer"
                              >${aula(file.name, ctx)}</a
                            >`
                          : aula(file.name, ctx)
                      }
                    </li>`,
                )}
              </ul>`,
        )}
        ${post.groups.length > 0 ? section(ctx.t("newsGroups"), [], html`<p>${post.groups.join(", ")}</p>`) : nothing}
        ${seenPart(item, step, state, ctx, changed)}`,
      close,
    );
  });
}

/**
 * Renders the news feed: at most `max` posts, the newest first; `changed` is called once a post is
 * marked read.
 */
export function renderNews(
  view: NewsView,
  ctx: ViewContext,
  state: CardState,
  max: number,
  changed: () => void,
): TemplateResult {
  const shown = view.items.slice(0, max);
  return html`<section class="news" aria-label=${ctx.t("navNews")}>
    ${view.errors.length > 0 && view.items.length === 0 ? apiError(view.errors[0], ctx.t) : nothing}
    ${view.loading ? loading(ctx.t) : nothing}
    ${
      !view.loading && view.items.length === 0 && view.errors.length === 0
        ? html`<p class="empty">${ctx.t("newsNone")}</p>`
        : nothing
    }
    <ul class="news-list">
      ${shown.map((item, index) => {
        const key = `post|${String(item.post.id)}`;
        return html`${weekBreak(item.day, shown[index - 1]?.day, ctx, true)}
          <li>
            <button
              class="news-item ${item.fresh ? "is-new" : ""}"
              type="button"
              aria-haspopup="dialog"
              data-detail=${key}
              @click=${() => {
                openPost(item, view, state, key, changed);
              }}
            >
              <span class="news-when">${when(item, ctx)}</span>
              <span class="news-main">
                <span class="news-title"
                  >${aula(item.post.title, ctx)}${marks(item, ctx).map((mark) => html` ${mark}`)}</span
                >
                <span class="news-excerpt">${aula(item.text.replace(/\s*\n+\s*/g, " "), ctx)}</span>
                ${byLine(item, view, ctx, state)}
              </span>
              ${item.post.attachments.length > 0 ? icon("mdi:paperclip", "news-clip") : nothing}
              ${icon("mdi:chevron-right", "chevron-end")}
            </button>
          </li>`;
      })}
    </ul>
  </section>`;
}
