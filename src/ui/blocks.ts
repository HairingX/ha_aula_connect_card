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
import type { Child } from "../core/types.ts";
import type { BlockId, DayContent, EmptyKind, TimetableRow } from "../model/blocks.ts";
import type { NoteView } from "../model/notes.ts";
import type { Quote } from "../model/pack.ts";
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
  time,
} from "./primitives.ts";

/** A child's part of a block. */
export interface Part {
  /** What the child's day holds. */
  readonly content: DayContent;
  /** The child's quotes for Husk. */
  readonly quotes: readonly Quote[];
  /** Why the part says it has nothing; "none" for the block's own sentence. */
  readonly empty: EmptyKind | "none" | undefined;
  /** The child, named above the part when the block is for several. */
  readonly child: Child | undefined;
  /** The key a child's open plan is kept by. */
  readonly key: string;
  /** The column the part takes when the children stand side by side. */
  readonly col: number;
}

/** How a day's blocks are shown. */
export interface BlockOptions {
  /** Whether the timetable names the teachers: in the week card, for planning. */
  readonly detailed: boolean;
  /** The heading level of the blocks' headers. */
  readonly level: number;
  /** What is open, and what is cut short. */
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
  const { content, quotes } = part;
  return html`<ul class="pack">
    ${
      content.subjects.length > 0
        ? html`<li class="pack-subjects">
            ${aula(ctx.t("subjects", { subjects: content.subjects.map((item) => item.name).join(", ") }), ctx)}
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

function lessonRow(row: TimetableRow, ctx: ViewContext, detailed: boolean): TemplateResult {
  if (row.kind === "break") {
    return html`<li class="break">
      <span class="break-main">${ctx.t("breakMinutes", { n: row.minutes })}</span>
    </li>`;
  }
  const { block, subject, status } = row;
  const lesson = block.lesson;
  const teachers = lesson.teachers.map((name) => name.trim()).filter((name) => name !== "");
  const room = lesson.location?.trim();
  const meta: TemplateResult[] = [];
  if (detailed && teachers.length > 0) {
    meta.push(
      html`<span class="sr">${ctx.t("teachers")}:</span>
        ${teachers.map((name, index) => html`${index > 0 ? ", " : ""}<abbr title=${name}>${initials(name)}</abbr>`)}`,
    );
  }
  if (room) meta.push(html`<span class="sr">${ctx.t("room")}:</span> ${aula(room, ctx)}`);
  return html`<li class="lesson ${row.time ?? ""} ${row.cancelled ? "cancelled" : ""}">
    <span class="lesson-time"
      >${time(block.start, ctx, "start")}<span class="sr">–</span
      >${time(block.end, ctx, "end")}</span
    >
    <span class="lesson-main">
      <span class="lesson-head">
        <span class="subject" title=${subject.name === subject.raw ? nothing : subject.raw}
          >${aula(subject.name, ctx)}</span
        >
        ${row.time === "now" && !row.cancelled ? nowLabel(ctx.t) : nothing}
        ${
          status?.kind === "substitute"
            ? label(html`${icon("mdi:account-switch-outline")}${ctx.t("substitute")}`)
            : status
              ? label(html`${icon("mdi:alert-circle-outline")}${aula(status.text, ctx)}`, "warning")
              : nothing
        }
      </span>
      ${
        meta.length > 0
          ? html`<span class="lesson-meta"
              >${meta.map((part, index) => html`${index > 0 ? html`<span aria-hidden="true"> · </span>` : nothing}${part}`)}</span
            >`
          : nothing
      }
    </span>
  </li>`;
}

function plan(part: Part, ctx: ViewContext, options: BlockOptions): TemplateResult {
  const key = `${part.key}|plan|${part.content.view.day}`;
  const { open, cut } = options.state.plan(key);
  return html`<ul class="plan ${open ? "open" : ""}" data-plan=${key}>
      ${part.content.plan.map(
        (note) =>
          html`<li class="plan-note">
            ${
              note.subject || note.title
                ? html`<span class="plan-subject"
                    >${aula([note.subject?.name, note.title].filter((item) => item !== undefined).join(" · "), ctx)}</span
                  >`
                : nothing
            }
            <p class="plan-text">${aula(note.text, ctx)}</p>
          </li>`,
      )}
    </ul>
    ${
      cut || open
        ? html`<button
            class="more"
            type="button"
            aria-expanded=${open ? "true" : "false"}
            @click=${() => {
              options.state.togglePlan(key);
            }}
          >
            ${open ? ctx.t("showLess") : ctx.t("showMore")}${icon("mdi:chevron-down", "chevron")}
          </button>`
        : nothing
    }`;
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
                ? html`<span class="quiet"> · ${aula(item.event.location, ctx)}</span>`
                : nothing
            }</span
          >
          <span class="item-time">${eventWhen(item, ctx)}</span>
        </li>`,
    )}
  </ul>`;
}

function body(id: BlockId, part: Part, ctx: ViewContext, options: BlockOptions): unknown {
  switch (id) {
    case "homework":
      return homeworkList(part.content.homework, ctx);
    case "pack":
      return pack(part, ctx);
    case "timetable":
      return html`<ol class="lessons">
        ${part.content.timetable.map((row) => lessonRow(row, ctx, options.detailed))}
      </ol>`;
    case "plan":
      return plan(part, ctx, options);
    default:
      return events(part, ctx);
  }
}

/** Shows a block: its header, then each child's part, named when the block is for several. */
export function renderBlock(
  id: BlockId,
  parts: readonly Part[],
  ctx: ViewContext,
  options: BlockOptions,
): TemplateResult {
  const day = parts[0]?.content.view.day ?? ctx.today;
  return html`<section class="block" data-block=${id}>
    ${headingOf(options.level, html`${icon(ICONS[id])}<span>${title(id, day, ctx)}</span>`, "block-head")}
    <div class="cols">
      ${parts.map(
        (part) =>
          html`<div class="part" style="--col: ${part.col}">
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
              part.empty === undefined
                ? body(id, part, ctx, options)
                : html`<p class="empty">${emptyText(id, part.empty, part.content, ctx)}</p>`
            }
          </div>`,
      )}
    </div>
  </section>`;
}
