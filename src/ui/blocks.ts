/**
 * The blocks of a day, each with its own look: homework on one surface, the things to bring as
 * rows, the timetable ruled, the plan as open text, events as icon rows. A block holds a part for
 * each child it is shown for.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit";

import type { ViewContext } from "../core/context.ts";
import { daysBetween, formatWeekday } from "../core/dates.ts";
import { initials } from "../core/text.ts";
import type { Child, Day } from "../core/types.ts";
import {
  foldTimetable,
  type BlockId,
  type DayContent,
  type EmptyKind,
  type LessonRow,
  type LessonStatus,
  type TimetableRow,
} from "../model/blocks.ts";
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
  nowLabel,
  segments,
  time,
} from "./primitives.ts";

/** A child's part of a block. */
export interface Part {
  /** What the child's day holds. */
  readonly content: DayContent;
  /** The child's quotes for Husk. */
  readonly quotes: readonly Quote[];
  /** The subjects Husk names: none beside the timetable. */
  readonly subjects: readonly SubjectLabel[];
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

const ICONS: Readonly<Record<BlockId, string>> = {
  homework: "mdi:book-open-page-variant-outline",
  pack: "mdi:bag-personal-outline",
  timetable: "mdi:timetable",
  plan: "mdi:clipboard-text-outline",
  events: "mdi:calendar-outline",
  birthdays: "mdi:cake-variant-outline",
};

/** Returns the homework block's title: "Lektier til i morgen", naming the day it is for. */
export function homeworkTitle(day: string, ctx: ViewContext): string {
  const ahead = daysBetween(ctx.today, day);
  if (ahead === 0) return ctx.t("homeworkToday");
  if (ahead === 1) return ctx.t("homeworkTomorrow");
  return ctx.t("homeworkDay", { day: formatWeekday(day, ctx.language) });
}

function title(id: BlockId, day: string, ctx: ViewContext): string {
  switch (id) {
    case "homework":
      return homeworkTitle(day, ctx);
    case "pack":
      return ctx.t("blockPack");
    case "timetable":
      return ctx.t("blockTimetable");
    case "plan":
      return ctx.t("blockPlan");
    default:
      return ctx.t("blockEvents");
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
      return ctx.t("weekPlanNotYet", { n: content.planMissing ?? "" });
    case "noWeekPlan":
      return ctx.t("noWeekPlanHomework");
    case "noTimetable":
      return ctx.t("noLessons");
    case "noHomework":
      return ctx.t("noHomework");
    default:
      return ctx.t(
        id === "homework"
          ? "noHomework"
          : id === "pack"
            ? "noPack"
            : id === "timetable"
              ? "noLessons"
              : id === "plan"
                ? "noPlan"
                : "noEvents",
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
    ${time(row.block.start, ctx, "start")}
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

/** Shows the button that unfolds or folds what is kept by `key`. */
function more(
  key: string,
  open: boolean,
  fallback: boolean,
  text: string,
  options: BlockOptions,
  ctx: ViewContext,
): TemplateResult {
  return html`<button
    class="more"
    type="button"
    aria-expanded=${open ? "true" : "false"}
    @click=${() => {
      options.state.toggle(key, fallback);
    }}
  >
    ${open ? ctx.t("showLess") : text}${icon("mdi:chevron-down", "chevron")}
  </button>`;
}

// A note is folded after a few lines, as a teacher may write fifty; each unfolds by itself.
function plan(part: Part, ctx: ViewContext, options: BlockOptions): TemplateResult {
  const { state } = options;
  const { lines } = state.folding;
  return html`<ul class="plan">
    ${part.content.plan.map((note) => {
      const key = `${part.key}|plan|${options.day}|${String(note.note.id)}`;
      const open = state.isOpen(key, false);
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
          data-cut=${key}
        >
          ${aula(note.text, ctx)}
        </p>
        ${open || state.cut(key) ? more(key, open, false, ctx.t("showMore"), options, ctx) : nothing}
      </li>`;
    })}
  </ul>`;
}

function events(part: Part, ctx: ViewContext): TemplateResult {
  return html`<ul class="items">
    ${part.content.timed.map(
      (item) =>
        html`<li class="item">
          ${icon(eventIcon(item.event.type))}
          <span class="item-text"
            >${aula(item.event.title, ctx)}${
              item.event.location
                ? html`<span class="item-place">${aula(item.event.location, ctx)}</span>`
                : nothing
            }</span
          >
          <span class="item-time">${eventWhen(item, ctx)}</span>
        </li>`,
    )}
  </ul>`;
}

function body(
  id: BlockId,
  part: Part,
  ctx: ViewContext,
  options: BlockOptions,
  unfolded: boolean,
): unknown {
  switch (id) {
    case "homework":
      return homeworkList(part.content.homework, ctx);
    case "pack":
      return pack(part, ctx);
    case "timetable":
      return unfolded
        ? html`<ol class="lessons">
            ${part.content.timetable.map((row) => lessonRow(row, ctx, options.detailed))}
          </ol>`
        : html`<ol class="lessons folded">
            ${foldTimetable(part.content.timetable).map((row) => foldedRow(row, ctx))}
          </ol>`;
    case "plan":
      return plan(part, ctx, options);
    default:
      return events(part, ctx);
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
    ${headingOf(options.level, html`${icon(ICONS[id])}<span>${title(id, options.day, ctx)}</span>`, "block-head")}
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
                ? more(key, unfolded, full, ctx.t("showTimetable"), options, ctx)
                : nothing
            }`
        : html`<p class="empty">${once}</p>`
    }
  </section>`;
}
