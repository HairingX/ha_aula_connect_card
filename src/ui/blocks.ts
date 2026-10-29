/**
 * The six blocks of a day, each with its own look: homework boxed, the things to bring as rows,
 * the timetable ruled, the plan as open text, events and birthdays as icon rows.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit";

import type { ViewContext } from "../core/context.ts";
import { daysBetween, formatWeekday } from "../core/dates.ts";
import { initials } from "../core/text.ts";
import type {
  BlockId,
  BlockPlan,
  DayContent,
  PlannedBlock,
  TimetableRow,
} from "../model/blocks.ts";
import type { NoteView } from "../model/notes.ts";
import type { Quote } from "../model/pack.ts";
import { aula, eventIcon, eventTime, icon, label, nowLabel, time } from "./primitives.ts";

/** How a day's blocks are shown. */
export interface BlockOptions {
  /** Whether the timetable names the teachers: in the week card, for planning. */
  readonly detailed: boolean;
  /** The heading level of the blocks' headers. */
  readonly level: number;
  /** The key the plan's "Vis mere" is kept by. */
  readonly planKey: string;
  /** Whether the plan's notes are shown in full. */
  readonly planOpen: boolean;
  /** Whether a plan note is cut short, so that "Vis mere" is offered. */
  readonly planCut: boolean;
  /** Opens or closes the plan's notes. */
  readonly togglePlan: (key: string) => void;
}

const ICONS: Readonly<Record<BlockId, string>> = {
  homework: "mdi:book-open-page-variant-outline",
  pack: "mdi:bag-personal-outline",
  timetable: "mdi:timetable",
  plan: "mdi:clipboard-text-outline",
  events: "mdi:calendar-outline",
  birthdays: "mdi:cake-variant-outline",
};

function header(
  id: BlockId,
  title: string,
  level: number,
  meta: unknown = nothing,
): TemplateResult {
  return html`<div class="block-head" role="heading" aria-level=${level}>
    ${icon(ICONS[id])}<span>${title}</span>${
      meta === nothing ? nothing : html`<span class="block-meta">${meta}</span>`
    }
  </div>`;
}

/** Returns the homework block's title: "Lektier til i morgen", naming the day it is for. */
export function homeworkTitle(day: string, ctx: ViewContext): string {
  const ahead = daysBetween(ctx.today, day);
  if (ahead === 0) return ctx.t("homeworkToday");
  if (ahead === 1) return ctx.t("homeworkTomorrow");
  return ctx.t("homeworkDay", { day: formatWeekday(day, ctx.language) });
}

/** Shows homework notes as boxes: the subject as a label, Meebook's title, the text in full. */
export function homeworkBoxes(notes: readonly NoteView[], ctx: ViewContext): TemplateResult {
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

function homework(
  content: DayContent,
  block: PlannedBlock,
  ctx: ViewContext,
  options: BlockOptions,
): TemplateResult {
  const count = content.homework.length;
  return html`<section class="block">
    ${header("homework", homeworkTitle(content.view.day, ctx), options.level, count > 0 ? count : nothing)}
    ${block.empty ? html`<p class="empty">${ctx.t("noHomework")}</p>` : homeworkBoxes(content.homework, ctx)}
  </section>`;
}

function pack(
  content: DayContent,
  quotes: readonly Quote[],
  ctx: ViewContext,
  options: BlockOptions,
): TemplateResult {
  return html`<section class="block">
    ${header("pack", ctx.t("blockPack"), options.level)}
    <ul class="pack">
      ${content.pack.map(
        (row) =>
          html`<li class="pack-row">
            <span class="pack-what">${aula(row.items.join(", "), ctx)}</span>
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
    </ul>
  </section>`;
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
  return html`<li class="lesson ${row.time ?? ""}">
    <span class="lesson-time"
      >${time(block.start, ctx, "start")}<span class="sr">–</span
      >${time(block.end, ctx, "end")}</span
    >
    <span class="lesson-main">
      <span class="lesson-head">
        <span class="subject" title=${subject.name === subject.raw ? nothing : subject.raw}
          >${aula(subject.name, ctx)}</span
        >
        ${row.time === "now" ? nowLabel(ctx.t) : nothing}
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

function timetable(
  content: DayContent,
  block: PlannedBlock,
  ctx: ViewContext,
  options: BlockOptions,
): TemplateResult {
  return html`<section class="block">
    ${header("timetable", ctx.t("blockTimetable"), options.level)}
    ${
      block.empty
        ? html`<p class="empty">${ctx.t("noTimetableInAula")}</p>`
        : html`<ol class="lessons">
            ${content.timetable.map((row) => lessonRow(row, ctx, options.detailed))}
          </ol>`
    }
  </section>`;
}

function plan(content: DayContent, ctx: ViewContext, options: BlockOptions): TemplateResult {
  const { planKey, planOpen, planCut } = options;
  return html`<section class="block">
    ${header("plan", ctx.t("blockPlan"), options.level)}
    <ul class="plan ${planOpen ? "open" : ""}" data-plan=${planKey}>
      ${content.plan.map(
        (note) =>
          html`<li class="plan-note">
            ${
              note.subject || note.title
                ? html`<span class="plan-subject"
                    >${aula([note.subject?.name, note.title].filter((part) => part !== undefined).join(" · "), ctx)}</span
                  >`
                : nothing
            }
            <p class="plan-text">${aula(note.text, ctx)}</p>
          </li>`,
      )}
    </ul>
    ${
      planCut || planOpen
        ? html`<button
            class="more"
            type="button"
            aria-expanded=${planOpen ? "true" : "false"}
            @click=${() => {
              options.togglePlan(planKey);
            }}
          >
            ${planOpen ? ctx.t("showLess") : ctx.t("showMore")}${icon("mdi:chevron-down", "chevron")}
          </button>`
        : nothing
    }
  </section>`;
}

function events(content: DayContent, ctx: ViewContext, options: BlockOptions): TemplateResult {
  return html`<section class="block">
    ${header("events", ctx.t("blockEvents"), options.level)}
    <ul class="items">
      ${content.events.map(
        (event) =>
          html`<li class="item">
            ${icon(eventIcon(event.type))}
            <span class="item-text"
              >${aula(event.title, ctx)}${
                event.location
                  ? html`<span class="quiet"> · ${aula(event.location, ctx)}</span>`
                  : nothing
              }</span
            >
            <span class="item-time">${eventTime(event, ctx)}</span>
          </li>`,
      )}
    </ul>
  </section>`;
}

function birthdays(content: DayContent, ctx: ViewContext, options: BlockOptions): TemplateResult {
  return html`<section class="block">
    ${header("birthdays", ctx.t("blockBirthdays"), options.level)}
    <ul class="items">
      ${content.birthdays.map(
        (birthday) =>
          html`<li class="item">
            ${icon("mdi:cake-variant-outline")}
            <span class="item-text">${ctx.t("birthdayOf", { name: birthday.name })}</span>
          </li>`,
      )}
    </ul>
  </section>`;
}

/** Shows a day's blocks in their planned order. */
export function renderBlocks(
  planned: BlockPlan,
  content: DayContent,
  ctx: ViewContext,
  options: BlockOptions,
): TemplateResult[] {
  return planned.blocks.map((block) => {
    switch (block.id) {
      case "homework":
        return homework(content, block, ctx, options);
      case "pack":
        return pack(content, planned.quotes, ctx, options);
      case "timetable":
        return timetable(content, block, ctx, options);
      case "plan":
        return plan(content, ctx, options);
      case "events":
        return events(content, ctx, options);
      case "birthdays":
        return birthdays(content, ctx, options);
    }
  });
}
