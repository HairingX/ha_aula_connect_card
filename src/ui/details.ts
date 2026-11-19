/**
 * The window a lesson or an event of the whole timetable opens: a modal dialog with everything
 * the card knows of it, closed by its button, by Escape or by a tap outside it. It only shows:
 * nothing in it acts on Aula.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit/html.js";

import { eventErrorText } from "../core/api.ts";
import type { ViewContext } from "../core/context.ts";
import {
  capitalize,
  formatDay,
  formatDayRange,
  formatShortDate,
  formatWeekdayShortDate,
} from "../core/dates.ts";
import type { TextKey } from "../core/i18n.ts";
import type { Day } from "../core/types.ts";
import type { DetailView, EventDetail, LessonDetail, Moment } from "../model/details.ts";
import {
  alert,
  aula,
  eventIcon,
  icon,
  label,
  listOf,
  loading,
  segments,
  time,
  timeSpan,
} from "./primitives.ts";

const TYPES: Readonly<Record<string, TextKey>> = {
  event: "typeEvent",
  school_home_meeting: "typeSchoolHome",
  parental_meeting: "typeParents",
  lesson: "typeLesson",
  excursion: "typeExcursion",
};

const ROLES: Readonly<Record<string, TextKey>> = {
  teacher: "roleTeacher",
  "preschool-teacher": "roleEducator",
  pedagogue: "roleEducator",
  leader: "roleLeader",
};

const ANSWERS: Readonly<Record<string, TextKey>> = {
  accepted: "answerAccepted",
  declined: "answerDeclined",
  waiting: "answerWaiting",
  tentative: "answerTentative",
};

function dayText(day: Day, ctx: ViewContext): string {
  return capitalize(formatDay(day, ctx.language), ctx.language);
}

// A moment on a day of its own: its date, with its weekday when `long`, then its time.
function moment(item: Moment, ctx: ViewContext, long = false): TemplateResult {
  const date = long
    ? capitalize(formatWeekdayShortDate(item.day, ctx.language), ctx.language)
    : formatShortDate(item.day, ctx.language);
  return html`<span class="tabular">${date} ${time(item.at, ctx)}</span>`;
}

/** A line of the window: its icon and what it is, over what it says. */
function row(name: string, title: string, value: unknown): TemplateResult {
  return html`<div class="detail-row">
    <dt>${icon(name)}${title}</dt>
    <dd>${value}</dd>
  </div>`;
}

function when(view: EventDetail, ctx: ViewContext): unknown {
  if (view.allDay) {
    return view.first === view.last
      ? segments([dayText(view.first, ctx), ctx.t("allDay")])
      : formatDayRange(view.first, view.last, ctx.language, "long");
  }
  if (view.first === view.last) {
    return segments([dayText(view.first, ctx), timeSpan(view.start, view.end, ctx)]);
  }
  return html`<span class="detail-span"
    >${capitalize(formatWeekdayShortDate(view.first, ctx.language), ctx.language)}
    ${time(view.start, ctx)} → ${moment({ at: view.end, day: view.last }, ctx, true)}</span
  >`;
}

function head(
  mark: TemplateResult,
  title: string,
  meta: readonly unknown[],
  ctx: ViewContext,
  close: () => void,
): TemplateResult {
  return html`<header class="detail-head">
    ${mark}
    <div class="detail-titles">
      <h2 id="detail-title" class="detail-title">${aula(title, ctx)}</h2>
      ${meta.length > 0 ? segments(meta, "detail-meta") : nothing}
    </div>
    <button class="detail-close" type="button" aria-label=${ctx.t("close")} @click=${close}>
      ${icon("mdi:close")}
    </button>
  </header>`;
}

function lesson(view: LessonDetail, ctx: ViewContext, close: () => void): TemplateResult {
  const { status } = view;
  return html`${head(
      html`<span class="detail-mark subject-mark" aria-hidden="true"
        >${icon("mdi:book-open-page-variant-outline")}</span
      >`,
      view.title,
      [ctx.t("typeLesson"), ...(view.raw === undefined ? [] : [aula(view.raw, ctx)])],
      ctx,
      close,
    )}
    ${
      status
        ? html`<p class="detail-labels">
            ${
              status.kind === "substitute"
                ? label(
                    html`${icon("mdi:account-switch-outline")}${ctx.t("substitute")}`,
                    "warning",
                  )
                : label(
                    html`${icon("mdi:alert-circle-outline")}${aula(status.text, ctx)}`,
                    "warning",
                  )
            }
          </p>`
        : nothing
    }
    <dl class="detail-facts">
      ${row(
        "mdi:clock-outline",
        ctx.t("detailWhen"),
        segments([dayText(view.day, ctx), timeSpan(view.start, view.end, ctx)]),
      )}
      ${view.room ? row("mdi:map-marker-outline", ctx.t("room"), aula(view.room, ctx)) : nothing}
      ${
        view.teachers.length > 0
          ? row("mdi:account-outline", ctx.t("teachers"), aula(listOf(view.teachers, ctx), ctx))
          : nothing
      }
    </dl>`;
}

// Who arranges it and who is asked, the guardian's answer, and what is attached: the lines
// Aula's details give, those it has.
function more(view: EventDetail, ctx: ViewContext): TemplateResult[] {
  const { t } = ctx;
  const { creator, invited, answer: given, deadline } = view;
  const lines: TemplateResult[] = [];
  if (creator) {
    const role = ROLES[creator.role];
    lines.push(
      row(
        "mdi:account-outline",
        t("createdBy"),
        segments([aula(creator.name, ctx), ...(role ? [t(role)] : [])]),
      ),
    );
  }
  if (view.coOrganizers.length > 0) {
    lines.push(
      row(
        "mdi:account-multiple-outline",
        t("coOrganizers"),
        aula(listOf(view.coOrganizers, ctx), ctx),
      ),
    );
  }
  if (view.groups.length > 0 || invited) {
    lines.push(
      row(
        "mdi:account-group-outline",
        t("invited"),
        html`${
          view.groups.length > 0
            ? html`<span class="detail-line">${aula(listOf(view.groups, ctx), ctx)}</span>`
            : nothing
        }${
          invited
            ? segments(
                [
                  t("invitedCount", { n: invited.invited }),
                  t("answeredCount", { n: invited.answered }),
                ],
                "detail-quiet",
              )
            : nothing
        }`,
      ),
    );
  }
  if (given) {
    const word = ANSWERS[given.value];
    lines.push(
      row(
        "mdi:reply-outline",
        t("yourAnswer"),
        segments([
          html`<span class="detail-answer">${word ? t(word) : aula(given.value, ctx)}</span>`,
          ...(given.at ? [moment(given.at, ctx)] : []),
        ]),
      ),
    );
  }
  if (deadline) {
    lines.push(
      row(
        "mdi:calendar-clock-outline",
        t("deadline"),
        html`${moment(deadline, ctx, true)}
        ${deadline.passed ? label(t("deadlinePassed"), "warning") : nothing}`,
      ),
    );
  }
  if (view.attachments > 0) {
    lines.push(
      row("mdi:paperclip", t("attachments"), t("attachmentsInAula", { n: view.attachments })),
    );
  }
  return lines;
}

function event(view: EventDetail, ctx: ViewContext, close: () => void): TemplateResult {
  const { booked } = view;
  const { t } = ctx;
  const type = TYPES[view.type];
  const lines = more(view, ctx);
  return html`${head(
      html`<span class="detail-mark" aria-hidden="true">${icon(eventIcon(view.type))}</span>`,
      view.title,
      [...(type ? [t(type)] : []), ...(view.institution ? [aula(view.institution, ctx)] : [])],
      ctx,
      close,
    )}
    ${
      view.deleted || view.private
        ? html`<p class="detail-labels">
            ${view.deleted ? label(html`${icon("mdi:delete-outline")}${t("deleted")}`, "warning") : nothing}
            ${view.private ? label(html`${icon("mdi:lock-outline")}${t("private")}`) : nothing}
          </p>`
        : nothing
    }
    <div class="detail-cols">
      <div class="detail-col">
        ${
          booked
            ? html`<div class="detail-booked">
                <span class="detail-booked-label">${t("bookedTime")}</span>
                <span class="detail-booked-time">${timeSpan(booked.start, booked.end, ctx)}</span>
                ${segments([
                  dayText(booked.day, ctx),
                  ...(booked.location ? [aula(booked.location, ctx)] : []),
                ])}
              </div>`
            : nothing
        }
        <dl class="detail-facts">
          ${row("mdi:clock-outline", t(booked ? "detailWhole" : "detailWhen"), when(view, ctx))}
          ${
            view.location
              ? row("mdi:map-marker-outline", t("detailPlace"), aula(view.location, ctx))
              : nothing
          }
        </dl>
        ${view.text ? html`<p class="detail-text">${aula(view.text, ctx)}</p>` : nothing}
      </div>
      ${
        lines.length > 0 || view.loading || view.error !== undefined
          ? html`<div class="detail-col">
              ${lines.length > 0 ? html`<dl class="detail-facts">${lines}</dl>` : nothing}
              ${view.loading ? loading(t) : nothing}
              ${view.error === undefined ? nothing : alert("info", eventErrorText(view.error, t))}
            </div>`
          : nothing
      }
    </div>`;
}

/**
 * Shows a lesson's or an event's window. `close` is called when it is asked to close: by its
 * button, by Escape, or by a tap outside it, on its backdrop.
 */
export function detailDialog(
  view: DetailView,
  ctx: ViewContext,
  close: () => void,
): TemplateResult {
  return html`<dialog
    class="detail"
    aria-labelledby="detail-title"
    style=${view.kind === "lesson" && view.color ? `--subject: ${view.color}` : ""}
    @close=${close}
    @click=${(tap: Event) => {
      if (tap.target === tap.currentTarget) close();
    }}
  >
    <div class="detail-body">
      ${view.kind === "lesson" ? lesson(view, ctx, close) : event(view, ctx, close)}
    </div>
  </dialog>`;
}
