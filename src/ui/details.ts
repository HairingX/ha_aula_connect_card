/**
 * The window a lesson or an event of the whole timetable opens: a modal dialog with everything
 * the card knows of it, closed by its button, by Escape or by a tap outside it. It only shows:
 * nothing in it acts on Aula. Its time stands first, as a ticket with the day's tile; the rest
 * follows in quiet sections, the guardian's answer last.
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
  icon,
  label,
  listOf,
  loading,
  segments,
  tile,
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

const ABOUT: Readonly<Record<string, TextKey>> = {
  school_home_meeting: "aboutTalk",
  parental_meeting: "aboutMeeting",
};

const ROLES: Readonly<Record<string, TextKey>> = {
  teacher: "roleTeacher",
  "preschool-teacher": "roleEducator",
  pedagogue: "roleEducator",
  leader: "roleLeader",
};

// The answer's word, and its mark: a tick for yes, so that it is seen at a glance.
const ANSWERS: Readonly<Record<string, readonly [TextKey, string]>> = {
  accepted: ["answerAccepted", "mdi:check"],
  declined: ["answerDeclined", "mdi:close-circle-outline"],
  waiting: ["answerWaiting", "mdi:help-circle-outline"],
  tentative: ["answerTentative", "mdi:help-circle-outline"],
};

function dayText(day: Day, ctx: ViewContext): string {
  return capitalize(formatDay(day, ctx.language), ctx.language);
}

// A moment on a day of its own: its date, with its weekday when `long`, then its time.
function moment(item: Moment, ctx: ViewContext, long = false): TemplateResult {
  const date = long
    ? capitalize(formatWeekdayShortDate(item.day, ctx.language), ctx.language)
    : formatShortDate(item.day, ctx.language);
  return html`<span class="tabular detail-moment">${date} ${time(item.at, ctx)}</span>`;
}

/** A line of a section: what it is, beside what it says. */
function row(title: string, value: unknown): TemplateResult {
  return html`<div class="detail-row">
    <dt>${title}</dt>
    <dd>${value}</dd>
  </div>`;
}

/** A section under its quiet heading; nothing when it has nothing. */
function section(
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

function head(
  title: unknown,
  meta: readonly unknown[],
  marks: readonly TemplateResult[],
  ctx: ViewContext,
  close: () => void,
): TemplateResult {
  return html`<header class="detail-head">
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
 * The ticket: the day's tile beside the time, large, and under it the day and the place. `what`
 * names the time where it is not the event's own, as a booked one.
 */
function ticket(
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

function lesson(view: LessonDetail, ctx: ViewContext, close: () => void): TemplateResult {
  const { status } = view;
  const { t } = ctx;
  const rows = [
    ...(view.room ? [row(t("room"), aula(view.room, ctx))] : []),
    ...(view.teachers.length > 0
      ? [row(t("teachers"), aula(listOf(view.teachers, ctx), ctx))]
      : []),
    ...(status
      ? [
          row(
            t("change"),
            status.kind === "substitute"
              ? label(html`${icon("mdi:account-switch-outline")}${t("substitute")}`, "warning")
              : label(
                  html`${icon("mdi:alert-circle-outline")}${aula(status.text, ctx)}`,
                  "warning",
                ),
          ),
        ]
      : []),
  ];
  return html`${head(
    html`${view.color ? html`<span class="detail-dot" aria-hidden="true"></span>` : nothing}${aula(view.title, ctx)}`,
    [t("typeLesson"), ...(view.raw === undefined ? [] : [aula(view.raw, ctx)])],
    [],
    ctx,
    close,
  )}
  ${ticket(view.day, undefined, timeSpan(view.start, view.end, ctx), [dayText(view.day, ctx)], ctx)}
  ${section(t("aboutLesson"), rows)}`;
}

// The event's own time: its span within a day, from one day's time to another's, or its days.
function ownTime(view: EventDetail, ctx: ViewContext, place: readonly unknown[]): TemplateResult {
  const { t } = ctx;
  if (view.allDay) {
    return view.first === view.last
      ? ticket(view.first, undefined, t("allDay"), [dayText(view.first, ctx), ...place], ctx)
      : ticket(
          view.first,
          undefined,
          formatDayRange(view.first, view.last, ctx.language, "long"),
          [t("allDay"), ...place],
          ctx,
        );
  }
  return view.first === view.last
    ? ticket(
        view.first,
        undefined,
        timeSpan(view.start, view.end, ctx),
        [dayText(view.first, ctx), ...place],
        ctx,
      )
    : ticket(
        view.first,
        undefined,
        html`<span class="tabular">${time(view.start, ctx)} → ${time(view.end, ctx)}</span>`,
        [formatDayRange(view.first, view.last, ctx.language, "long"), ...place],
        ctx,
      );
}

// The whole event beside the time booked in it: its span where it is on the booked day, else its
// days and times.
function whole(view: EventDetail, day: Day, ctx: ViewContext): TemplateResult {
  const span =
    view.allDay || view.first !== view.last
      ? html`${capitalize(formatWeekdayShortDate(view.first, ctx.language), ctx.language)}
        ${view.allDay ? nothing : time(view.start, ctx)} →
        ${capitalize(formatWeekdayShortDate(view.last, ctx.language), ctx.language)}
        ${view.allDay ? nothing : time(view.end, ctx)}`
      : view.first === day
        ? timeSpan(view.start, view.end, ctx)
        : html`${dayText(view.first, ctx)} ${timeSpan(view.start, view.end, ctx)}`;
  return html`<p class="detail-whole">
    <span class="detail-whole-label">${ctx.t("detailWhole")}</span>
    <span class="tabular">${span}</span>
  </p>`;
}

function people(view: EventDetail, ctx: ViewContext): TemplateResult[] {
  const { t } = ctx;
  const { creator, invited } = view;
  const role = creator && ROLES[creator.role];
  return [
    ...(creator
      ? [row(t("createdBy"), segments([aula(creator.name, ctx), ...(role ? [t(role)] : [])]))]
      : []),
    ...(view.coOrganizers.length > 0
      ? [row(t("coOrganizers"), aula(listOf(view.coOrganizers, ctx), ctx))]
      : []),
    ...(view.groups.length > 0 || invited
      ? [
          row(
            t("invited"),
            html`${view.groups.length > 0 ? html`<span class="detail-line">${aula(listOf(view.groups, ctx), ctx)}</span>` : nothing}${
              invited
                ? html`<span class="detail-line detail-quiet"
                    >${t("answeredOf", { n: invited.answered, of: invited.invited })}</span
                  >`
                : nothing
            }`,
          ),
        ]
      : []),
  ];
}

function reply(view: EventDetail, ctx: ViewContext): TemplateResult[] {
  const { t } = ctx;
  const { answer, deadline } = view;
  const known = answer && ANSWERS[answer.value];
  return [
    ...(answer
      ? [
          row(
            t("yourAnswer"),
            html`${label(
              known
                ? html`${icon(known[1])}${t(known[0])}`
                : html`${icon("mdi:reply-outline")}${aula(answer.value, ctx)}`,
              "detail-answer",
            )}${answer.at ? html` <span class="detail-quiet">${moment(answer.at, ctx)}</span>` : nothing}`,
          ),
        ]
      : []),
    ...(deadline
      ? [
          row(
            t("deadline"),
            html`${moment(deadline, ctx, true)}
            ${deadline.passed ? label(t("deadlinePassed"), "warning") : nothing}`,
          ),
        ]
      : []),
    ...(view.attachments > 0
      ? [row(t("attachments"), t("attachmentsInAula", { n: view.attachments }))]
      : []),
  ];
}

function event(view: EventDetail, ctx: ViewContext, close: () => void): TemplateResult {
  const { booked } = view;
  const { t } = ctx;
  const type = TYPES[view.type];
  const marks = [
    ...(view.deleted ? [label(html`${icon("mdi:delete-outline")}${t("deleted")}`, "warning")] : []),
    ...(view.private ? [label(html`${icon("mdi:lock-outline")}${t("private")}`)] : []),
  ];
  // The ticket names the place of the time it shows; another place is said below.
  const about = section(
    t(ABOUT[view.type] ?? "aboutEvent"),
    booked && view.location ? [row(t("detailPlace"), aula(view.location, ctx))] : [],
    view.text ? html`<p class="detail-text">${aula(view.text, ctx)}</p>` : nothing,
  );
  const who = people(view, ctx);
  const answered = reply(view, ctx);
  const side = who.length > 0 || answered.length > 0 || view.loading || view.error !== undefined;
  return html`${head(
      aula(view.title, ctx),
      [...(type ? [t(type)] : []), ...(view.institution ? [aula(view.institution, ctx)] : [])],
      marks,
      ctx,
      close,
    )}
    <div class="detail-cols">
      <div class="detail-col">
        ${
          booked
            ? html`${ticket(
                booked.day,
                t("bookedTime"),
                timeSpan(booked.start, booked.end, ctx),
                [
                  dayText(booked.day, ctx),
                  ...(booked.location ? [aula(booked.location, ctx)] : []),
                ],
                ctx,
              )}${whole(view, booked.day, ctx)}`
            : ownTime(view, ctx, view.location ? [aula(view.location, ctx)] : [])
        }
        ${about}
      </div>
      ${
        side
          ? html`<div class="detail-col">
              ${section(t("people"), who)}${section(t("reply"), answered)}
              ${view.loading ? loading(t) : nothing}
              ${view.error === undefined ? nothing : alert("warning", eventErrorText(view.error, t))}
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
