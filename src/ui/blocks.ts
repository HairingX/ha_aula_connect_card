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
  foldTimetable,
  type BlockId,
  type DayContent,
  type EmptyKind,
  type LessonRow,
  type LessonStatus,
  type TimedEvent,
  type TimetableRow,
} from "../model/blocks.ts";
import type { CalendarEvent } from "../core/types.ts";
import type { NoteView } from "../model/notes.ts";
import type { Quote } from "../model/pack.ts";
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
  timeSpan,
} from "./primitives.ts";

/** A child's part of a block. */
export interface Part {
  /** What the child's day holds. */
  readonly content: DayContent;
  /** The child's quotes for Husk. */
  readonly quotes: readonly Quote[];
  /** The subjects Husk names: none beside the timetable. */
  readonly subjects: readonly SubjectLabel[];
  /** The events lasting the whole day, first in the timetable. */
  readonly allDay: readonly CalendarEvent[];
  /** The events with a time, among the timetable's lessons. */
  readonly timed: readonly TimedEvent[];
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
    case "pack":
      return ctx.t("blockPack");
    case "timetable":
      return ctx.t("blockTimetable");
    default:
      return ctx.t("blockComment");
  }
}

/** Shows homework notes on one surface: the subject as a label, Meebook's title, the text. */
export function homeworkList(notes: readonly NoteView[], ctx: ViewContext): TemplateResult {
  return html`<ul class="homework">
    ${notes.map(
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
    )}
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
      return ctx.t(
        id === "task"
          ? "noHomework"
          : id === "pack"
            ? "noPack"
            : id === "timetable"
              ? "noLessons"
              : "noPlan",
      );
  }
}

function pack(part: Part, ctx: ViewContext): TemplateResult {
  const { content, quotes, subjects } = part;
  return html`<ul class="pack">
    ${
      subjects.length > 0
        ? html`<li class="pack-subjects">
            <span class="pack-label">${ctx.t("subjects")}</span>
            ${aula(subjects.map((item) => item.name).join(", "), ctx)}
          </li>`
        : nothing
    }
    ${content.pack.map(
      (row) =>
        html`<li class="pack-row">
          <span class="pack-what"
            >${row.items.map((item) => html`<span class="pack-item">${aula(item, ctx)}</span>`)}</span
          >
          <span class="pack-source">${aula(row.subject.name, ctx)}</span>
        </li>`,
    )}
    ${quotes.map(
      (quote) =>
        html`<li class="pack-row quote">
          <q class="pack-what">${aula(quote.text, ctx)}</q>
          <span class="pack-source"
            >${
              quote.subject
                ? ctx.t("weekPlanSource", { subject: quote.subject.name })
                : ctx.t("weekPlan")
            }</span
          >
        </li>`,
    )}
  </ul>`;
}

function statusLabel(status: LessonStatus | undefined, ctx: ViewContext): unknown {
  return status?.kind === "substitute"
    ? label(html`${icon("mdi:account-switch-outline")}${ctx.t("substitute")}`)
    : status
      ? label(html`${icon("mdi:alert-circle-outline")}${aula(status.text, ctx)}`, "warning")
      : nothing;
}

function subjectName(row: LessonRow, ctx: ViewContext): TemplateResult {
  const { name, raw } = row.subject;
  return html`<span class="subject" title=${name === raw ? nothing : raw}
    >${aula(name, ctx)}</span
  >`;
}

// Folded, a subject's line holds when it begins and a change of the usual, which is news: beside
// the subject, where a long one wraps at its words, the times keeping their column.
function foldedRow(row: LessonRow, ctx: ViewContext): TemplateResult {
  return html`<li class="lesson ${row.cancelled ? "cancelled" : ""}">
    <span class="lesson-head">${subjectName(row, ctx)} ${statusLabel(row.status, ctx)}</span>
    ${timeSpan(row.block.start, row.block.end, ctx)}
  </li>`;
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
  return html`<li class="lesson ${row.time ?? ""} ${row.cancelled ? "cancelled" : ""}">
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

// An event that began on an earlier day comes first; one that lasts the day is no time of day.
function startOf(item: TimedEvent): string {
  return item.span === "within" || item.span === "from" ? item.event.start : "";
}

/**
 * Shows a day as a calendar does: the events lasting the whole day first, then the lessons and
 * the events with a time in the order they begin, an event before a lesson beginning with it.
 */
function timeline<Row extends TimetableRow>(
  part: Part,
  rows: readonly Row[],
  row: (item: Row) => TemplateResult,
  full: boolean,
  ctx: ViewContext,
): unknown[] {
  const event = (item: TimedEvent): TemplateResult => eventRow(item, ctx, full);
  const whole = part.timed.filter(
    (item) => item.span !== "within" && item.span !== "from" && item.span !== "until",
  );
  const timed = part.timed
    .filter((item) => !whole.includes(item))
    .sort((a, b) => startOf(a).localeCompare(startOf(b)));
  const lines: unknown[] = [
    ...part.allDay.map((item) => allDayRow(item, ctx, full)),
    ...whole.map((item) => allDayRow(item.event, ctx, full)),
  ];
  let next = 0;
  for (const item of rows) {
    const start = item.kind === "lesson" ? item.block.start : item.start;
    while (next < timed.length && startOf(timed[next] as TimedEvent) <= start) {
      lines.push(event(timed[next] as TimedEvent));
      next += 1;
    }
    lines.push(row(item));
  }
  for (const item of timed.slice(next)) lines.push(event(item));
  return lines;
}

function allDayRow(item: CalendarEvent, ctx: ViewContext, full: boolean): TemplateResult {
  const head = html`<span class="lesson-head"
    >${icon(eventIcon(item.type))}${aula(item.title, ctx)}</span
  >`;
  return full
    ? html`<li class="lesson event-row all-day">
        <span class="lesson-time">${ctx.t("allDay")}</span>
        <span class="lesson-main">${head}</span>
      </li>`
    : html`<li class="lesson event-row all-day">
        ${head}<span class="event-when">${ctx.t("allDay")}</span>
      </li>`;
}

function eventRow(item: TimedEvent, ctx: ViewContext, full: boolean): TemplateResult {
  const place = item.event.location?.trim();
  return full
    ? html`<li class="lesson event-row">
        <span class="lesson-time">${eventWhen(item, ctx)}</span>
        <span class="lesson-main">
          <span class="lesson-head"
            >${icon(eventIcon(item.event.type))}${aula(item.event.title, ctx)}</span
          >
          ${place ? html`<span class="lesson-meta">${aula(place, ctx)}</span>` : nothing}
        </span>
      </li>`
    : html`<li class="lesson event-row">
        <span class="lesson-head"
          >${icon(eventIcon(item.event.type))}${aula(item.event.title, ctx)}</span
        >
        <span class="event-when">${eventWhen(item, ctx)}</span>
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
      return homeworkList(part.content.homework, ctx);
    case "pack":
      return pack(part, ctx);
    case "timetable":
      return unfolded
        ? html`<ol class="lessons">
            ${timeline(
              part,
              part.content.timetable,
              (row) => lessonRow(row, ctx, options.detailed),
              true,
              ctx,
            )}
          </ol>`
        : html`<ol class="lessons folded">
            ${timeline(
              part,
              foldTimetable(part.content.timetable),
              (row) => foldedRow(row, ctx),
              false,
              ctx,
            )}
          </ol>`;
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
              ${parts.map((part, index) =>
                id === "pack" && texts[index] !== undefined
                  ? nothing
                  : html`<div
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
