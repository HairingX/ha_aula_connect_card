/**
 * The vacation requests: a row for each request, once for every child it is asked of, and the
 * window that answers it day by day for all of them at once, a day split where the children's
 * differ. Nothing is sent without a tap, and each child's answer is sent once.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit/html.js";

import { actionErrorText, answerVacationRequest } from "../core/api.ts";
import type { ViewContext } from "../core/context.ts";
import {
  capitalize,
  formatDayRange,
  formatShortDate,
  formatWeekdayShortDate,
} from "../core/dates.ts";
import { rememberSender } from "../core/selection.ts";
import type { Day, VacationDay } from "../core/types.ts";
import type { RequestFor, RequestGroup } from "../model/absence.ts";
import { answerableDays, answerReady, COMMENT_MAX, deadlinePassed } from "../model/vacation.ts";
import type { CardState } from "./card.ts";
import { alert, aula, faceImage, icon, label, listOf, minis, turnedOff } from "./primitives.ts";
import { head, modal } from "./window.ts";

/** A child's own answer for a day. */
interface OwnAnswer {
  /** The child's request. */
  readonly item: RequestFor;
  /** Its answer for the day. */
  readonly day: VacationDay;
}

/** A day's answer: for every child at once, or one for each child where they differ. */
interface DayAnswer {
  /** The day. */
  readonly date: Day;
  /** The answer every child is given, while the day is not split. */
  readonly shared: VacationDay;
  /** Each child's own answer, once the day is split. */
  split: OwnAnswer[] | undefined;
}

/** What answering a request has come to. */
interface Answer {
  readonly days: DayAnswer[];
  comment: string;
  busy: boolean;
  /** Why the children whose answer failed were not answered. */
  readonly errors: Map<RequestFor, unknown>;
  /** The children whose answer was sent. */
  readonly sent: Set<RequestFor>;
}

/** Returns a request's title, or its days where it has none. */
export function requestTitle(group: RequestGroup, ctx: ViewContext): string {
  return (
    group.title ||
    ctx.t("holidayOf", { days: formatDayRange(group.start, group.end, ctx.language, "short") })
  );
}

/** Returns a request's line under its title: its days, and the day to answer it by while it awaits an answer. */
export function requestLine(group: RequestGroup, ctx: ViewContext): string {
  const days = formatDayRange(group.start, group.end, ctx.language, "short");
  return group.missing && group.deadline !== null
    ? `${days} · ${ctx.t("answerByTitle")} ${formatShortDate(group.deadline, ctx.language)}`
    : days;
}

const same = (a: VacationDay, b: VacationDay): boolean =>
  a.is_coming === b.is_coming && a.entry_time === b.entry_time && a.exit_time === b.exit_time;

// A child whose request lacks one of the days starts it unanswered.
function answerOf(items: readonly RequestFor[]): Answer {
  const [first] = items as readonly [RequestFor, ...RequestFor[]];
  const days = first.request.days.map((day): DayAnswer => {
    const blank = { ...day, is_coming: null, entry_time: null, exit_time: null };
    const own = items.map((item) => ({
      item,
      day: { ...(item.request.days.find((found) => found.date === day.date) ?? blank) },
    }));
    const differ = own.some((answer) => !same(answer.day, day));
    return { date: day.date, shared: { ...day }, split: differ ? own : undefined };
  });
  return { days, comment: "", busy: false, errors: new Map(), sent: new Set() };
}

function daysFor(answer: Answer, item: RequestFor): VacationDay[] {
  return answer.days.flatMap((day) =>
    (day.split
      ? day.split.filter((own) => own.item === item).map((own) => own.day)
      : [day.shared]
    ).map((own) => ({ ...own, date: day.date })),
  );
}

/**
 * Opens the window that answers a request for every child it is asked of whose entry allows it;
 * `key` is the opening button's `data-detail`, and `answered` is called once an answer is sent.
 */
export function openRequestGroup(
  state: CardState,
  group: RequestGroup,
  key: string,
  answered: () => void,
): void {
  const items = group.items.filter((item) => item.entry.allowed.includes("vacation_requests"));
  const answer = answerOf(items.length > 0 ? items : group.items);
  const send = (today: Day): void => {
    const waiting = items.filter((item) => !answer.sent.has(item));
    answer.busy = true;
    answer.errors.clear();
    state.requestUpdate();
    void (async () => {
      // One answer for each child, in turn, each sent once.
      for (const item of waiting) {
        try {
          await answerVacationRequest(
            state.callWS,
            item.entry,
            item.request.id,
            answerableDays(daysFor(answer, item), today),
            answer.comment,
          );
          answer.sent.add(item);
          rememberSender(item.entry.child_id, item.entry.entry_id);
        } catch (error: unknown) {
          answer.errors.set(item, error);
        }
      }
      answer.busy = false;
      if (answer.sent.size > 0) answered();
      state.requestUpdate();
    })();
  };
  state.openModal(key, (ctx, close) =>
    modal(requestWindow(answer, group, items, ctx, close, state, send), close),
  );
}

function dayChoices(
  day: VacationDay,
  name: string,
  times: boolean,
  locked: boolean,
  ctx: ViewContext,
  state: CardState,
): TemplateResult {
  const { t } = ctx;
  const choose = (coming: boolean) => (): void => {
    day.is_coming = coming;
    state.requestUpdate();
  };
  const timeInput = (which: "entry_time" | "exit_time", text: string): TemplateResult =>
    html`<label class="answer-time"
      ><span>${text}</span
      ><input
        class="text-input"
        type="time"
        .value=${day[which] ?? ""}
        ?disabled=${locked}
        @input=${(event: Event) => {
          const value = (event.target as HTMLInputElement).value;
          day[which] = value === "" ? null : value;
          state.requestUpdate();
        }}
    /></label>`;
  return html`<span class="choices" role="group" aria-label=${name}>
      <button
        class="choice"
        type="button"
        aria-pressed=${day.is_coming === true ? "true" : "false"}
        ?disabled=${locked}
        @click=${choose(true)}
      >
        ${t("dayComing")}
      </button>
      <button
        class="choice"
        type="button"
        aria-pressed=${day.is_coming === false ? "true" : "false"}
        ?disabled=${locked}
        @click=${choose(false)}
      >
        ${t("dayNotComing")}
      </button>
    </span>
    ${
      day.is_coming === true && times
        ? html`<span class="answer-times"
            >${timeInput("entry_time", t("dayArrives"))}${timeInput("exit_time", t("dayLeaves"))}</span
          >`
        : nothing
    }`;
}

function dayRow(
  day: DayAnswer,
  items: readonly RequestFor[],
  times: boolean,
  locked: boolean,
  ctx: ViewContext,
  state: CardState,
): TemplateResult {
  const { t } = ctx;
  const date = capitalize(formatWeekdayShortDate(day.date, ctx.language), ctx.language);
  const toggle = (): void => {
    if (day.split === undefined) {
      day.split = items.map((item) => ({ item, day: { ...day.shared } }));
    } else {
      Object.assign(day.shared, ...day.split.slice(0, 1).map((own) => own.day), {
        date: day.date,
      });
      day.split = undefined;
    }
    state.requestUpdate();
  };
  const split = day.split;
  return html`<li class="answer-day">
    <span class="answer-date">${date}</span>
    ${
      split === undefined
        ? dayChoices(day.shared, date, times, locked, ctx, state)
        : html`<ul class="answer-split">
            ${split
              .filter((own) => items.includes(own.item))
              .map((own) => {
                const face = state.face(own.item.child);
                return html`<li class="answer-child">
                  <span class="answer-who"
                    >${faceImage(face, "mini")}<span>${face.name}</span></span
                  >
                  ${dayChoices(own.day, `${date}: ${face.name}`, times, locked, ctx, state)}
                </li>`;
              })}
          </ul>`
    }
    ${
      items.length > 1 && !locked
        ? html`<button class="text-button answer-split-toggle" type="button" @click=${toggle}>
            ${split === undefined ? t("answerSplit") : t("answerJoin")}
          </button>`
        : nothing
    }
  </li>`;
}

function requestWindow(
  answer: Answer,
  group: RequestGroup,
  items: readonly RequestFor[],
  ctx: ViewContext,
  close: () => void,
  state: CardState,
  send: (today: Day) => void,
): TemplateResult {
  const { t } = ctx;
  const faces = group.items.map((item) => state.face(item.child));
  const range = formatDayRange(group.start, group.end, ctx.language, "long");
  const top = head(
    requestTitle(group, ctx),
    [
      listOf(
        faces.map((face) => face.name),
        ctx,
      ),
      range,
    ],
    [group.missing ? label(t("missingAnswer"), "warning") : label(t("answered"))],
    ctx,
    close,
    minis(faces, ctx, "window-faces"),
  );
  const [first] = group.items as readonly [RequestFor, ...RequestFor[]];
  const note = first.request.note
    ? html`<p class="window-note">
        ${icon("mdi:information-outline")}<span>${aula(first.request.note, ctx)}</span>
      </p>`
    : nothing;
  if (items.length === 0) return html`${top}${note}${turnedOff("vacation_requests", t)}`;
  const nameOf = (item: RequestFor): string => state.face(item.child).name;
  const sentTo = items.filter((item) => answer.sent.has(item));
  const sentLine =
    sentTo.length > 0
      ? html`<p class="done-line">
          ${icon("mdi:check-circle-outline")}<span
            >${t("answerSentFor", { names: listOf(sentTo.map(nameOf), ctx) })}</span
          >
        </p>`
      : nothing;
  if (sentTo.length === items.length) {
    return html`${top} ${sentLine}
      <div class="window-actions">
        <button class="filled-button" type="button" @click=${close}>${t("close2")}</button>
      </div>`;
  }
  const passed = deadlinePassed(first.request, ctx.today);
  const locked = passed || answer.busy;
  const times = first.request.times_required;
  const waiting = items.filter((item) => !answer.sent.has(item));
  const ready = waiting.every((item) => answerReady(daysFor(answer, item), times, ctx.today));
  return html`${top} ${note}
    ${
      passed
        ? alert("warning", t("requestDeadlinePassed"))
        : group.deadline === null
          ? nothing
          : html`<p class="info-line">
              ${icon("mdi:calendar-clock")}<span
                >${t("answerByTitle")} ${formatShortDate(group.deadline, ctx.language)}</span
              >
            </p>`
    }
    <div class="field">
      <span class="field-label">${t("answerEveryDay")}</span>
      <ul class="answer-days">
        ${answer.days.map((day) =>
          dayRow(day, waiting, times, locked || day.date < ctx.today, ctx, state),
        )}
      </ul>
    </div>
    <div class="field">
      <label class="field-label" for="answer-comment">${t("commentLabel")}</label>
      <textarea
        id="answer-comment"
        class="text-input"
        rows="2"
        maxlength=${COMMENT_MAX}
        .value=${answer.comment}
        ?disabled=${locked}
        @input=${(event: Event) => {
          answer.comment = (event.target as HTMLTextAreaElement).value;
          state.requestUpdate();
        }}
      ></textarea>
    </div>
    ${sentLine}
    ${[...answer.errors].map(([item, error]) =>
      alert(
        "error",
        t("answerFailedFor", { name: nameOf(item), error: actionErrorText(error, t) }),
      ),
    )}
    ${
      ready && !passed
        ? html`<p class="info-line">
            ${icon("mdi:send-outline")}<span
              >${t("answerGoesTo", { names: listOf(waiting.map(nameOf), ctx) })}</span
            >
          </p>`
        : nothing
    }
    <div class="window-actions">
      <button class="text-button" type="button" @click=${close}>${t("cancel")}</button>
      <button
        class="filled-button"
        type="button"
        ?disabled=${locked || !ready}
        @click=${() => {
          send(ctx.today);
        }}
      >
        ${answer.busy ? t("sending") : t("sendAnswer")}
      </button>
    </div>`;
}

/** Shows a request's row, once for every child it is asked of; a tap opens its window. */
export function requestRow(
  group: RequestGroup,
  ctx: ViewContext,
  state: CardState,
  answered: () => void,
): TemplateResult {
  const { t } = ctx;
  const key = `request|${group.key}`;
  const faces = group.items.map((item) => state.face(item.child));
  return html`<li>
    <button
      class="family-row"
      type="button"
      aria-haspopup="dialog"
      data-detail=${key}
      @click=${() => {
        openRequestGroup(state, group, key, answered);
      }}
    >
      ${minis(faces, ctx, "family-faces")}
      <span class="family-text">
        <span class="family-title">${requestTitle(group, ctx)}</span>
        <span class="family-sub">${requestLine(group, ctx)}</span>
      </span>
      ${
        group.missing
          ? html`${label(t("missingAnswer"), "warning")}${icon("mdi:chevron-right", "chevron-end")}`
          : html`<ha-icon
              class="chevron-end answered-mark"
              icon="mdi:check-circle"
              role="img"
              aria-label=${t("answered")}
            ></ha-icon>`
      }
    </button>
  </li>`;
}
