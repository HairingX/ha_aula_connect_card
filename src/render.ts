/**
 * The card's templates: a child's weeks, and the days in them.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit";
import { repeat } from "lit/directives/repeat.js";

import { errorText } from "./api";
import type { SectionConfig, ShowKey } from "./config";
import { addDays, dayOf, formatDay, formatTime } from "./dates";
import type { Translate } from "./i18n";
import { buildWeeks, type DayView } from "./model";
import { groupTasks } from "./sections";
import { htmlToText, initials } from "./text";
import type { CalendarEvent, Child, Lesson, Task, WeekData } from "./types";

/** What the templates need to know besides the data. */
export interface RenderContext {
  /** The card's texts in the user's language. */
  t: Translate;
  /** The language dates are formatted in. */
  language: string;
  /** The time zone times are shown in. */
  zone: string;
  /** Whether times are shown with AM and PM. */
  amPm: boolean;
  /** The current day in `zone`. */
  today: string;
  /** The current instant. */
  now: Date;
  /** The first day shown. */
  start: string;
  /** The number of weeks shown. */
  weeks: number;
  /** Whether each part is shown. */
  show: Record<ShowKey, boolean>;
  /** The sections the week plan's notes are sorted into. */
  sections: readonly SectionConfig[];
}

/** A child's data, or why there is none yet. */
export interface ChildState {
  /** The range the data is for, `start/end`. */
  range: string;
  /** The child's data, once it has come. */
  data?: WeekData;
  /** Why the data could not be had. */
  error?: unknown;
}

/** Shows a message in the style of Home Assistant's alerts; an error is announced. */
export function alert(kind: "error" | "warning" | "info", message: string): TemplateResult {
  const icon = kind === "info" ? "mdi:information-outline" : "mdi:alert-circle-outline";
  return html`<div class="alert ${kind}" role=${kind === "info" ? "status" : "alert"}>
    <ha-icon icon=${icon} aria-hidden="true"></ha-icon><span>${message}</span>
  </div>`;
}

/** Shows that data is on its way. */
export function loading(t: Translate): TemplateResult {
  return html`<p class="loading" role="status">
    <span class="pulse" aria-hidden="true"></span>${t("loading")}
  </p>`;
}

function time(text: string, ctx: RenderContext): TemplateResult | typeof nothing {
  const instant = new Date(text);
  if (Number.isNaN(instant.getTime())) return nothing;
  return html`<time datetime=${text}
    >${formatTime(instant, ctx.language, ctx.zone, ctx.amPm)}</time
  >`;
}

function lessonStatus(status: string | null, t: Translate): string | undefined {
  if (status === null || status === "" || status === "normal") return undefined;
  return status === "substitute" ? t("substitute") : status;
}

function lesson(item: Lesson, ctx: RenderContext): TemplateResult {
  const label = lessonStatus(item.status, ctx.t);
  const now = new Date(item.start) <= ctx.now && ctx.now < new Date(item.end);
  const teachers = item.teachers.filter((name) => name.trim() !== "");
  return html`<li class="lesson ${now ? "now" : ""}">
    <span class="lesson-time"
      >${time(item.start, ctx)}<span class="end">${time(item.end, ctx)}</span></span
    >
    <span class="lesson-main">
      <span class="lesson-title">
        <span class="subject">${item.title}</span>
        ${now ? html`<span class="tag now-tag">${ctx.t("now")}</span>` : nothing}
        ${label ? html`<span class="tag">${label}</span>` : nothing}
      </span>
      ${
        teachers.length > 0 || item.location
          ? html`<span class="lesson-meta">
              ${
                teachers.length > 0
                  ? html`<span class="sr">${ctx.t("teachers")}:</span> ${teachers.map(
                        (name, index) =>
                          html`${index > 0 ? ", " : ""}<abbr title=${name}
                              >${initials(name)}</abbr
                            >`,
                      )}`
                  : nothing
              }
              ${teachers.length > 0 && item.location ? html`<span aria-hidden="true"> · </span>` : nothing}
              ${
                item.location
                  ? html`<span class="sr">${ctx.t("room")}: </span><span>${item.location}</span>`
                  : nothing
              }
            </span>`
          : nothing
      }
    </span>
  </li>`;
}

function task(item: Task): TemplateResult {
  const content = htmlToText(item.content);
  return html`<li class="task">
    <div class="task-head">
      ${item.subject ? html`<span class="chip">${item.subject}</span>` : nothing}
      ${item.title ? html`<span class="task-title">${item.title}</span>` : nothing}
    </div>
    ${content ? html`<p class="task-content">${content}</p>` : nothing}
    ${item.author ? html`<p class="task-author">${item.author}</p>` : nothing}
  </li>`;
}

function event(item: CalendarEvent, day: string, ctx: RenderContext): TemplateResult {
  // A timed event spanning several days shows its times on its first day only.
  const startsToday = !item.all_day && dayOf(new Date(item.start), ctx.zone) === day;
  return html`<li class="item">
    <ha-icon icon="mdi:calendar-blank-outline" aria-hidden="true"></ha-icon>
    <span class="item-text">
      <span class="item-time"
        >${startsToday ? html`${time(item.start, ctx)}–${time(item.end, ctx)}` : ctx.t("allDay")}</span
      >
      <span class="item-title">${item.title}</span>
      ${item.location ? html`<span class="item-meta">${item.location}</span>` : nothing}
    </span>
  </li>`;
}

function summary(view: DayView, ctx: RenderContext, other: SectionConfig): TemplateResult[] {
  const parts: TemplateResult[] = [];
  const first = view.lessons[0];
  const last = view.lessons[view.lessons.length - 1];
  if (ctx.show.timetable && first && last) {
    parts.push(
      html`<span class="count"
        ><ha-icon icon="mdi:clock-outline" aria-hidden="true"></ha-icon
        >${time(first.start, ctx)}–${time(last.end, ctx)}</span
      >`,
    );
  }
  if (ctx.show.tasks) {
    for (const group of groupTasks(view.tasks, ctx.sections, other)) {
      parts.push(
        html`<span class="count"
          ><ha-icon
            icon=${group.section.icon ?? "mdi:note-text-outline"}
            aria-hidden="true"
          ></ha-icon
          >${group.section.title}: ${group.tasks.length}</span
        >`,
      );
    }
  }
  if (ctx.show.events && view.events.length > 0) {
    parts.push(
      html`<span class="count"
        ><ha-icon icon="mdi:calendar-blank-outline" aria-hidden="true"></ha-icon>${ctx.t("events")}:
        ${view.events.length}</span
      >`,
    );
  }
  if (ctx.show.birthdays) {
    for (const birthday of view.birthdays) {
      parts.push(
        html`<span class="count"
          ><ha-icon icon="mdi:cake-variant-outline" aria-hidden="true"></ha-icon>${ctx.t(
            "birthdayOf",
            { name: birthday.name },
          )}</span
        >`,
      );
    }
  }
  return parts;
}

function day(view: DayView, ctx: RenderContext): TemplateResult {
  const { t, show } = ctx;
  const other: SectionConfig = { title: t("sectionOther"), icon: "mdi:note-text-outline" };
  const isToday = view.day === ctx.today;
  const when = isToday ? "today" : view.day < ctx.today ? "past" : "future";
  const lessons = show.timetable ? view.lessons : [];
  const groups = show.tasks ? groupTasks(view.tasks, ctx.sections, other) : [];
  const events = show.events ? view.events : [];
  const birthdays = show.birthdays ? view.birthdays : [];
  const empty =
    lessons.length + groups.length + events.length + birthdays.length === 0 &&
    !(show.tasks && view.lessons.length > 0);
  const parts = summary(view, ctx, other);
  const badge = isToday
    ? t("today")
    : view.day === addDays(ctx.today, 1)
      ? t("tomorrow")
      : undefined;
  return html`<li class="day ${when}">
    <details ?open=${isToday}>
      <summary>
        <div class="day-head">
          <h4 class="day-name">${formatDay(view.day, ctx.language)}</h4>
          ${badge ? html`<span class="badge">${badge}</span>` : nothing}
          <ha-icon class="chevron" icon="mdi:chevron-down" aria-hidden="true"></ha-icon>
        </div>
        ${
          parts.length > 0
            ? html`<div class="day-summary">${parts}</div>`
            : html`<div class="day-summary quiet">${t("nothingPlanned")}</div>`
        }
      </summary>
      <div class="day-body">
        ${
          lessons.length > 0
            ? html`<section class="block" aria-label=${t("timetable")}>
                <ol class="lessons">
                  ${lessons.map((item) => lesson(item, ctx))}
                </ol>
              </section>`
            : nothing
        }
        ${groups.map(
          (group) =>
            html`<section class="block">
              <h5 class="block-title">
                <ha-icon
                  icon=${group.section.icon ?? "mdi:note-text-outline"}
                  aria-hidden="true"
                ></ha-icon
                >${group.section.title}
              </h5>
              <ul class="tasks">
                ${group.tasks.map(task)}
              </ul>
            </section>`,
        )}
        ${
          show.tasks && groups.length === 0 && view.lessons.length > 0
            ? html`<p class="quiet">${t("noHomework")}</p>`
            : nothing
        }
        ${
          events.length > 0
            ? html`<section class="block" aria-label=${t("events")}>
                <ul class="items">
                  ${events.map((item) => event(item, view.day, ctx))}
                </ul>
              </section>`
            : nothing
        }
        ${
          birthdays.length > 0
            ? html`<section class="block" aria-label=${t("birthdays")}>
                <ul class="items">
                  ${birthdays.map(
                    (birthday) =>
                      html`<li class="item">
                        <ha-icon icon="mdi:cake-variant-outline" aria-hidden="true"></ha-icon
                        ><span class="item-text"
                          ><span class="item-title"
                            >${t("birthdayOf", { name: birthday.name })}</span
                          ></span
                        >
                      </li>`,
                  )}
                </ul>
              </section>`
            : nothing
        }
        ${empty ? html`<p class="quiet">${t("nothingPlanned")}</p>` : nothing}
      </div>
    </details>
  </li>`;
}

/** Shows a child: a header, then the child's weeks day by day, or why they cannot be shown. */
export function child(
  item: Child,
  state: ChildState | undefined,
  ctx: RenderContext,
): TemplateResult {
  const { t } = ctx;
  const id = `child-${String(item.child_id)}`;
  const weeks = buildWeeks(state?.data, ctx.start, ctx.weeks, ctx.zone);
  // Without a week plan there are no notes or birthdays, so their absence says nothing.
  const dayCtx =
    state?.data?.week_plan === false
      ? { ...ctx, show: { ...ctx.show, tasks: false, birthdays: false } }
      : ctx;
  const nothingAtAll =
    state?.data !== undefined &&
    [state.data.lessons, state.data.events, state.data.tasks, state.data.birthdays].every(
      (list) => list.length === 0,
    );
  let body: TemplateResult;
  if (state?.error !== undefined) body = alert("error", errorText(state.error, t));
  else if (!state?.data) body = loading(t);
  else
    body = html`${nothingAtAll ? html`<p class="quiet week-empty">${t("noData")}</p>` : nothing}
      <div class="weeks ${weeks.length > 1 ? "two" : "one"}">
        ${weeks.map(
          (week, index) =>
            html`<section class="week" aria-labelledby="${id}-week-${String(index)}">
              <h3 class="week-title" id="${id}-week-${String(index)}">
                <span>${index === 0 ? t("thisWeek") : t("nextWeek")}</span>
                <span class="week-number">${t("weekNumber", { n: week.number })}</span>
              </h3>
              <ol class="days">
                ${repeat(
                  week.days,
                  (view) => view.day,
                  (view) => day(view, dayCtx),
                )}
              </ol>
            </section>`,
        )}
      </div>`;
  return html`<section class="child" aria-labelledby=${id}>
    <header class="child-header">
      <span class="avatar" aria-hidden="true">${item.first_name.charAt(0).toUpperCase()}</span>
      <div class="child-names">
        <h2 id=${id}>${item.first_name}</h2>
        <span class="institution">${item.institution_name}</span>
      </div>
    </header>
    ${body}
  </section>`;
}
