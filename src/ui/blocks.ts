/**
 * The blocks of a day, each with its own look: homework on one surface, the things to bring as
 * rows, the timetable ruled, the plan as open text, events as icon rows. A block holds a part for
 * each child it is shown for.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit/html.js";

import type { ViewContext } from "../core/context.ts";
import { initials } from "../core/text.ts";
import type { Child, Day } from "../core/types.ts";
import {
  type BlockId,
  type BlockPlan,
  type DayContent,
  type EmptyKind,
  type LessonRow,
  type LessonStatus,
  type TimedEvent,
  type TimetableRow,
} from "../model/blocks.ts";
import type { CalendarEvent } from "../core/types.ts";
import { dayBar, type BarItem } from "../model/daybar.ts";
import type { NoteView } from "../model/notes.ts";
import type { SubjectLabel } from "../model/subjects.ts";
import type { CardState } from "./card.ts";
import {
  aula,
  avatar,
  eventIcon,
  eventWhen,
  headingOf,
  icon,
  label,
  more,
  nowLabel,
  segments,
  time,
  timeText,
} from "./primitives.ts";

/** A child's part of a block. */
export interface Part {
  /** What the child's day holds. */
  readonly content: DayContent;
  /** What the child's blocks show of it. */
  readonly plan: BlockPlan;
  /** Why the part says it has nothing; "none" for the block's own sentence. */
  readonly empty: EmptyKind | "none" | undefined;
  /** The child, named above the part when the block is for several. */
  readonly child: Child | undefined;
  /** The key what a child has opened is kept by. */
  readonly key: string;
  /** The column the part takes when the children stand side by side. */
  readonly col: number;
}

/** How a day's blocks are shown. */
export interface BlockOptions {
  /** The day the blocks are for. */
  readonly day: Day;
  /** Whether the timetable names the teachers: in the week card, for planning. */
  readonly detailed: boolean;
  /** The heading level of the blocks' headers. */
  readonly level: number;
  /** What is open, what is cut short, and how the configuration folds the day. */
  readonly state: CardState;
}

/** The blocks' icons; Vigtigt has a flag, as the teacher marked it. */
export const BLOCK_ICONS: Readonly<Record<BlockId, string>> = {
  task: "mdi:flag-outline",
  pack: "mdi:bag-personal-outline",
  timetable: "mdi:timetable",
  comment: "mdi:note-text-outline",
  events: "mdi:calendar-outline",
  birthdays: "mdi:cake-variant-outline",
};

function title(id: BlockId, ctx: ViewContext): string {
  switch (id) {
    case "task":
      return ctx.t("blockTask");
    case "timetable":
      return ctx.t("blockTimetable");
    default:
      return ctx.t("blockComment");
  }
}

function homeworkItems(notes: readonly NoteView[], ctx: ViewContext): unknown {
  return notes.map(
    (note) =>
      html`<li class="hw">
        ${
          note.subject || note.title
            ? html`<div class="hw-head">
                ${note.subject ? label(aula(note.subject.name, ctx), "subject") : nothing}
                ${note.title ? html`<span class="hw-title">${aula(note.title, ctx)}</span>` : nothing}
              </div>`
            : nothing
        }
        ${note.text ? html`<p class="hw-text">${aula(note.text, ctx)}</p>` : nothing}
      </li>`,
  );
}

/** Shows homework notes on one surface: the subject as a label, Meebook's title, the text. */
export function homeworkList(notes: readonly NoteView[], ctx: ViewContext): TemplateResult {
  return html`<ul class="homework">
    ${homeworkItems(notes, ctx)}
  </ul>`;
}

/** Returns the sentence a part says when it has nothing. */
export function emptyText(
  id: BlockId,
  empty: EmptyKind | "none",
  content: DayContent,
  ctx: ViewContext,
): string {
  switch (empty) {
    case "planMissing":
      return ctx.t("weekPlanNotYet", { n: String(content.planMissing) });
    case "noWeekPlan":
      return ctx.t("noWeekPlanHomework");
    case "noTimetable":
      return ctx.t("noLessons");
    case "noHomework":
      return ctx.t("noHomework");
    default:
      return ctx.t(id === "task" ? "noHomework" : id === "timetable" ? "noLessons" : "noPlan");
  }
}

/**
 * Shows Vigtigt on one surface: first what to bring, each thing in its subject's colour after
 * "Husk:", then what the week plan marks, or why it marks nothing.
 */
function important(part: Part, ctx: ViewContext): TemplateResult {
  const { homework, noHomework, pack, subjects } = part.plan;
  return html`<ul class="homework">
    ${
      pack.length > 0 || subjects.length > 0
        ? html`<li class="hw hw-pack">
            <span class="pack-label">${ctx.t("remember")}</span>
            ${pack.map(
              (row) =>
                html`<span class="pack-row" style=${subjectColor(row.subject)}
                  >${row.items.map(
                    (item, index) =>
                      html`${index > 0 ? html`<span class="sr">, </span>` : nothing}<span
                          class="pack-item"
                          >${aula(item, ctx)}</span
                        >`,
                  )}
                  <span class="pack-source ${row.subject.color ? "sr" : ""}"
                    >${aula(row.subject.name, ctx)}</span
                  ></span
                >`,
            )}
            ${
              subjects.length > 0
                ? html`<span class="pack-subjects"
                    ><span class="pack-label">${ctx.t("subjects")}</span>
                    ${aula(subjects.map((item) => item.name).join(", "), ctx)}</span
                  >`
                : nothing
            }
          </li>`
        : nothing
    }
    ${homeworkItems(homework, ctx)}
    ${
      homework.length === 0 && noHomework
        ? html`<li class="hw">
            <p class="empty">${emptyText("task", noHomework, part.content, ctx)}</p>
          </li>`
        : nothing
    }
  </ul>`;
}

function statusIcon(status: LessonStatus): unknown {
  return icon(
    status.kind === "substitute" ? "mdi:account-switch-outline" : "mdi:alert-circle-outline",
  );
}

function statusLabel(status: LessonStatus | undefined, ctx: ViewContext): unknown {
  return status?.kind === "substitute"
    ? label(html`${statusIcon(status)}${ctx.t("substitute")}`)
    : status
      ? label(html`${statusIcon(status)}${aula(status.text, ctx)}`, "warning")
      : nothing;
}

function subjectName(row: LessonRow, ctx: ViewContext): TemplateResult {
  const subjects = [row.subject, ...row.also];
  const name = subjects.map((subject) => subject.name).join(", ");
  const raw = subjects.map((subject) => subject.raw).join(", ");
  return html`<span class="subject" title=${name === raw ? nothing : raw}
    >${aula(name, ctx)}</span
  >`;
}

// Black or white, whichever reads on the colour: by its relative luminance, as WCAG has it.
/** The style that gives a subject's colour. */
export function subjectColor(subject: SubjectLabel): string {
  return subject.color ? `--subject: ${subject.color}` : "";
}

/**
 * Shows the day as a bar in the subjects' colours: a lane of lessons, a lane for each lesson at
 * another's time that does not go into it, then the events. A part names its subject where it
 * has room, else by its abbreviation, else by its colour alone; the card measures which.
 */
function bar(part: Part, ctx: ViewContext): unknown {
  const today = part.content.view.day === ctx.today;
  const day = dayBar(
    part.content.timetable,
    part.plan.timed,
    part.plan.allDay,
    ctx.zone,
    today ? ctx.now : undefined,
  );
  const span = Math.max(1, day.end - day.start);
  const at = (minute: number): string => `${String(((minute - day.start) / span) * 100)}%`;
  const place = (from: number, to: number): string =>
    `left: ${at(from)}; width: calc(${String(((to - from) / span) * 100)}% - 2px)`;
  const item = (entry: BarItem): TemplateResult =>
    entry.kind === "lesson"
      ? html`<span
          class="bar-item ${entry.row.cancelled ? "cancelled" : ""}"
          style="${place(entry.from, entry.to)}; ${subjectColor(entry.row.subject)}"
          >${entry.row.status ? statusIcon(entry.row.status) : nothing}<span class="bar-name"
            >${aula(entry.row.subject.name, ctx)}</span
          ><span class="bar-short">${aula(entry.row.subject.short, ctx)}</span></span
        >`
      : html`<span class="bar-item ev" style=${place(entry.from, entry.to)}
          >${icon(eventIcon(entry.event.type))}<span class="bar-name"
            >${aula(entry.event.title, ctx)}</span
          ></span
        >`;
  // What the bar shows of an item, said: its subjects or title, when, and a lesson's change.
  const say = (title: string, start: string, end: string, status = ""): string =>
    `${title} ${timeText(start, ctx)}–${timeText(end, ctx)}${status && `, ${status}`}`;
  const spoken = (entry: BarItem): string =>
    entry.kind === "event"
      ? say(entry.event.title, entry.event.start, entry.event.end)
      : say(
          [entry.row.subject, ...entry.row.also].map((subject) => subject.name).join(", "),
          entry.row.block.start,
          entry.row.block.end,
          entry.row.status?.kind === "substitute" ? ctx.t("substitute") : entry.row.status?.text,
        );
  return html`<div class="daybar" aria-hidden="true">
      <div class="bar-lanes">
        ${day.hours.map((hour) => html`<span class="hour" style="left: ${at(hour)}"></span>`)}
        ${day.now === undefined ? nothing : html`<span class="now-mark" style="left: ${at(day.now)}"></span>`}
        ${day.lanes.map(
          (lane) =>
            html`<div class="lane ${lane[0]?.kind === "event" ? "thin" : ""}">
              ${lane.map(item)}
            </div>`,
        )}
        ${day.allDay.map(
          (event) =>
            html`<div class="lane thin">
              <span class="bar-item ev all-day" style="left: 0; width: 100%"
                ><span class="bar-name">${aula(event.title, ctx)}</span></span
              >
            </div>`,
        )}
      </div>
      ${
        day.from === undefined || day.until === undefined
          ? nothing
          : html`<div class="ticks">${time(day.from, ctx)}${time(day.until, ctx)}</div>`
      }
    </div>
    <ul class="sr">
      ${day.allDay.map((event) => html`<li>${event.title}, ${ctx.t("allDay")}</li>`)}
      ${day.lanes.flat().map((entry) => html`<li>${spoken(entry)}</li>`)}
    </ul>`;
}

function lessonRow(row: TimetableRow, ctx: ViewContext, detailed: boolean): TemplateResult {
  if (row.kind === "break") {
    return html`<li class="break">
      <span class="break-main">${ctx.t("breakMinutes", { n: row.minutes })}</span>
    </li>`;
  }
  const { block, status } = row;
  const lesson = block.lesson;
  const teachers = lesson.teachers.map((name) => name.trim()).filter((name) => name !== "");
  const room = lesson.location?.trim();
  const meta: TemplateResult[] = [];
  if (detailed && teachers.length > 0) {
    meta.push(
      html`<span class="sr">${ctx.t("teachers")}: </span>${teachers.map(
          (name, index) =>
            html`${index > 0 ? ", " : ""}<abbr title=${name}>${initials(name)}</abbr>`,
        )}`,
    );
  }
  if (room) meta.push(html`<span class="sr">${ctx.t("room")}: </span>${aula(room, ctx)}`);
  return html`<li
    class="lesson ${row.time ?? ""} ${row.cancelled ? "cancelled" : ""}"
    style=${subjectColor(row.subject)}
  >
    <span class="lesson-time"
      >${time(block.start, ctx, "start")}<span class="sr">–</span
      >${time(block.end, ctx, "end")}</span
    >
    <span class="lesson-main">
      <span class="lesson-head">
        ${subjectName(row, ctx)} ${row.time === "now" && !row.cancelled ? nowLabel(ctx.t) : nothing}
        ${statusLabel(status, ctx)}
      </span>
      ${meta.length > 0 ? segments(meta, "lesson-meta") : nothing}
    </span>
  </li>`;
}

// An event that began on an earlier day comes first.
function startOf(item: TimedEvent): string {
  return item.span === "until" ? "" : item.event.start;
}

/**
 * Shows a day as a calendar does: the events lasting the whole day first, then the lessons and
 * the events with a time in the order they begin, an event before a lesson beginning with it.
 */
function timeline(
  part: Part,
  rows: readonly TimetableRow[],
  row: (item: TimetableRow) => TemplateResult,
  ctx: ViewContext,
): unknown[] {
  const event = (item: TimedEvent): TemplateResult => eventRow(item, ctx);
  const timed = [...part.plan.timed].sort((a, b) => startOf(a).localeCompare(startOf(b)));
  const lines: unknown[] = part.plan.allDay.map((item) => allDayRow(item, ctx));
  const before = (start: string): void => {
    for (let first = timed[0]; first !== undefined && startOf(first) <= start; first = timed[0]) {
      lines.push(event(first));
      timed.shift();
    }
  };
  for (const item of rows) {
    before(item.kind === "lesson" ? item.block.start : item.start);
    lines.push(row(item));
  }
  lines.push(...timed.map(event));
  return lines;
}

// An event's title, with its place on a line under it.
function eventText(event: CalendarEvent, ctx: ViewContext): TemplateResult {
  const place = event.location?.trim();
  return html`<span class="lesson-head"
    >${icon(eventIcon(event.type))}<span class="event-text"
      >${aula(event.title, ctx)}${
        place ? html`<span class="event-place">${aula(place, ctx)}</span>` : nothing
      }</span
    ></span
  >`;
}

function allDayRow(item: CalendarEvent, ctx: ViewContext): TemplateResult {
  return html`<li class="lesson event-row all-day">
    <span class="lesson-time">${ctx.t("allDay")}</span>
    <span class="lesson-main">${eventText(item, ctx)}</span>
  </li>`;
}

function eventRow(item: TimedEvent, ctx: ViewContext): TemplateResult {
  return html`<li class="lesson event-row">
    <span class="lesson-time">${eventWhen(item, ctx)}</span>
    <span class="lesson-main">${eventText(item.event, ctx)}</span>
  </li>`;
}

/**
 * Shows the week plan's other notes in a quiet column, each folded after the configured lines and
 * opened by itself; `key` keeps their state.
 */
export function planNotes(
  notes: readonly NoteView[],
  key: string,
  ctx: ViewContext,
  state: CardState,
): TemplateResult {
  const { lines } = state.folding;
  // A teacher may write fifty lines.
  return html`<ul class="plan">
    ${notes.map((note) => {
      const noteKey = `${key}|${String(note.note.id)}`;
      const open = state.isOpen(noteKey, false);
      return html`<li class="plan-note">
        ${
          note.subject || note.title
            ? html`<span class="plan-subject"
                >${aula([note.subject?.name, note.title].filter((item) => item !== undefined).join(" · "), ctx)}</span
              >`
            : nothing
        }
        <p
          class="plan-text ${lines > 0 && !open ? "clamp" : ""}"
          style="--lines: ${lines}"
          data-cut=${noteKey}
        >
          ${aula(note.text, ctx)}
        </p>
        ${open || state.cut(noteKey) ? more(noteKey, open, false, ctx.t("showMore"), state, ctx) : nothing}
      </li>`;
    })}
  </ul>`;
}

function plan(part: Part, ctx: ViewContext, options: BlockOptions): TemplateResult {
  return planNotes(part.content.plan, `${part.key}|plan|${options.day}`, ctx, options.state);
}

function body(
  id: BlockId,
  part: Part,
  ctx: ViewContext,
  options: BlockOptions,
  unfolded: boolean,
): unknown {
  switch (id) {
    case "task":
      return important(part, ctx);
    case "timetable":
      return unfolded
        ? html`<ol class="lessons">
            ${timeline(
              part,
              part.content.timetable,
              (row) => lessonRow(row, ctx, options.detailed),
              ctx,
            )}
          </ol>`
        : bar(part, ctx);
    default:
      return plan(part, ctx, options);
  }
}

/**
 * Returns the one sentence every part says when none has anything, so that it is said once for
 * every child; undefined when a part has something, or the parts say different things.
 */
export function sameEmpty(texts: readonly (string | undefined)[]): string | undefined {
  const [first] = texts;
  return first !== undefined && texts.every((text) => text === first) ? first : undefined;
}

/**
 * Shows a block: its header, then each child's part, named when the block is for several. When
 * no child has anything and each would say the same, the block says it once, naming no one.
 */
export function renderBlock(
  id: BlockId,
  parts: readonly Part[],
  ctx: ViewContext,
  options: BlockOptions,
): TemplateResult {
  const texts = parts.map((part) =>
    part.empty === undefined ? undefined : emptyText(id, part.empty, part.content, ctx),
  );
  const once = sameEmpty(texts);
  // One button unfolds every child's timetable of the block: kept by the first child's key, so
  // that it folds again when that child's day moves on.
  const key = `${String(parts[0]?.key)}|timetable|${options.day}`;
  const { full } = options.state.folding;
  const unfolded = options.state.isOpen(key, full);
  return html`<section class="block" data-block=${id}>
    ${headingOf(options.level, html`${icon(BLOCK_ICONS[id])}<span>${title(id, ctx)}</span>`, "block-head")}
    ${
      once === undefined
        ? html`<div class="cols">
              ${parts.map(
                (part, index) =>
                  html`<div
                    class="part ${texts[index] === undefined ? "" : "is-empty"}"
                    style="--col: ${part.col}"
                  >
                    ${
                      part.child
                        ? headingOf(
                            options.level + 1,
                            html`${avatar(part.child)}<span>${part.child.first_name}</span>`,
                            "part-who",
                          )
                        : nothing
                    }
                    ${
                      texts[index] === undefined
                        ? body(id, part, ctx, options, unfolded)
                        : html`<p class="empty">${texts[index]}</p>`
                    }
                  </div>`,
              )}
            </div>
            ${
              id === "timetable"
                ? more(key, unfolded, full, ctx.t("showTimetable"), options.state, ctx)
                : nothing
            }`
        : html`<p class="empty">${once}</p>`
    }
  </section>`;
}
