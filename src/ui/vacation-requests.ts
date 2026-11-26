/**
 * The vacation requests: for each child the institution's requests that can still be answered,
 * and the window that answers one, day by day. Nothing is sent without a tap.
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
import type { Child, Day, VacationDay, VacationRequest } from "../core/types.ts";
import type { FamilyChild } from "../model/family.ts";
import {
  answerableDays,
  answerReady,
  COMMENT_MAX,
  deadlinePassed,
  openRequests,
} from "../model/vacation.ts";
import type { CardState } from "./card.ts";
import type { Load } from "./loads.ts";
import { alert, apiError, aula, faceImage, icon, label, loading, turnedOff } from "./primitives.ts";
import { head, modal } from "./window.ts";

/** A child's vacation requests, and the entry they are asked and answered from. */
export interface ChildRequests {
  /** The child, with its entries and day. */
  readonly family: FamilyChild;
  /** The entry acted from. */
  readonly entry: Child;
  /** The requests, as they stand. */
  readonly load: Load<VacationRequest[]>;
}

/** What answering a request has come to. */
interface Answer {
  days: VacationDay[];
  comment: string;
  busy: boolean;
  error: unknown;
  sent: boolean;
}

/**
 * Shows the day to answer a request by; nothing for one answered, as its mark says that, nor for
 * one awaiting an answer without a deadline, as its label says that.
 */
export function requestState(request: VacationRequest, ctx: ViewContext): string | undefined {
  if (!request.missing_answer || request.deadline === null) return undefined;
  return `${ctx.t("answerByTitle")} ${formatShortDate(request.deadline, ctx.language)}`;
}

function requestTitle(request: VacationRequest, ctx: ViewContext): string {
  return (
    request.title ||
    ctx.t("holidayOf", { days: formatDayRange(request.start, request.end, ctx.language, "short") })
  );
}

/**
 * Opens the window that answers a request; `key` is the opening button's `data-detail`, and
 * `answered` is called once the answer is sent.
 */
export function openRequest(
  state: CardState,
  target: ChildRequests,
  request: VacationRequest,
  key: string,
  answered: () => void,
): void {
  const answer: Answer = {
    days: request.days.map((day) => ({ ...day })),
    comment: "",
    busy: false,
    error: undefined,
    sent: false,
  };
  const send = (today: Day): void => {
    const entry = target.entry;
    answer.busy = true;
    answer.error = undefined;
    state.requestUpdate();
    answerVacationRequest(
      state.callWS,
      entry,
      request.id,
      answerableDays(answer.days, today),
      answer.comment,
    ).then(
      () => {
        answer.busy = false;
        answer.sent = true;
        rememberSender(entry.child_id, entry.entry_id);
        answered();
        state.requestUpdate();
      },
      (error: unknown) => {
        answer.busy = false;
        answer.error = error;
        state.requestUpdate();
      },
    );
  };
  state.openModal(key, (ctx, close) =>
    modal(requestWindow(answer, target, request, ctx, close, state, send), close),
  );
}

function dayAnswer(
  day: VacationDay,
  request: VacationRequest,
  ctx: ViewContext,
  state: CardState,
  locked: boolean,
): TemplateResult {
  const { t } = ctx;
  const date = capitalize(formatWeekdayShortDate(day.date, ctx.language), ctx.language);
  const choose = (coming: boolean) => (): void => {
    day.is_coming = coming;
    state.requestUpdate();
  };
  const timeInput = (which: "entry_time" | "exit_time", name: string): TemplateResult =>
    html`<label class="answer-time"
      ><span>${name}</span
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
  return html`<li class="answer-day">
    <span class="answer-date">${date}</span>
    <span class="choices" role="group" aria-label=${date}>
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
      day.is_coming === true && request.times_required
        ? html`<span class="answer-times"
            >${timeInput("entry_time", t("dayArrives"))}${timeInput("exit_time", t("dayLeaves"))}</span
          >`
        : nothing
    }
  </li>`;
}

function requestWindow(
  answer: Answer,
  target: ChildRequests,
  request: VacationRequest,
  ctx: ViewContext,
  close: () => void,
  state: CardState,
  send: (today: Day) => void,
): TemplateResult {
  const { t } = ctx;
  const face = state.face(target.family.child);
  const passed = deadlinePassed(request, ctx.today);
  const range = formatDayRange(request.start, request.end, ctx.language, "long");
  const top = head(
    requestTitle(request, ctx),
    [face.name, range],
    [request.missing_answer ? label(t("missingAnswer"), "warning") : label(t("answered"))],
    ctx,
    close,
    faceImage(face, "window-face"),
  );
  if (answer.sent) {
    return html`${top}
      <p class="done-line">${icon("mdi:check-circle-outline")}<span>${t("answerSent")}</span></p>
      <div class="window-actions">
        <button class="filled-button" type="button" @click=${close}>${t("close2")}</button>
      </div>`;
  }
  const note = request.note
    ? html`<p class="window-note">
        ${icon("mdi:information-outline")}<span>${aula(request.note, ctx)}</span>
      </p>`
    : nothing;
  if (!target.entry.allowed.includes("vacation_requests"))
    return html`${top}${note}${turnedOff("vacation_requests", t)}`;
  const locked = passed || answer.busy;
  const ready = answerReady(answer.days, request.times_required, ctx.today);
  return html`${top} ${note}
    ${
      passed
        ? alert("warning", t("requestDeadlinePassed"))
        : request.deadline === null
          ? nothing
          : html`<p class="info-line">
              ${icon("mdi:calendar-clock")}<span
                >${t("answerByTitle")} ${formatShortDate(request.deadline, ctx.language)}</span
              >
            </p>`
    }
    <div class="field">
      <span class="field-label">${t("answerEveryDay")}</span>
      <ul class="answer-days">
        ${answer.days.map((day) =>
          dayAnswer(day, request, ctx, state, locked || day.date < ctx.today),
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
    ${answer.error === undefined ? nothing : alert("error", actionErrorText(answer.error, t))}
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

/** Renders the vacation requests card; `answered` is called once a request is answered. */
export function renderVacationRequests(
  children: readonly ChildRequests[],
  ctx: ViewContext,
  state: CardState,
  answered: () => void,
): TemplateResult {
  const { t } = ctx;
  const waiting = children.some(({ load }) => load.data === undefined && load.error === undefined);
  const rows = children.flatMap((target) => {
    const { load, family } = target;
    if (load.error !== undefined && load.data === undefined)
      return [html`<li>${apiError(load.error, t)}</li>`];
    if (load.data === undefined) return [];
    const face = state.face(family.child);
    return openRequests(load.data, ctx.today).map((request) => {
      const said = requestState(request, ctx);
      const key = `request|${String(family.child.child_id)}|${String(request.id)}`;
      return html`<li>
        <button
          class="family-row"
          type="button"
          aria-haspopup="dialog"
          data-detail=${key}
          @click=${() => {
            openRequest(state, target, request, key, answered);
          }}
        >
          ${faceImage(face)}
          <span class="family-text">
            <span class="family-title">${requestTitle(request, ctx)}</span>
            <span class="family-sub"
              >${face.name} ·
              ${formatDayRange(request.start, request.end, ctx.language, "short")}</span
            >
            ${said === undefined ? nothing : html`<span class="family-sub">${said}</span>`}
          </span>
          ${
            request.missing_answer
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
    });
  });
  return html`<section class="family-card" aria-label=${t("vacationRequests")}>
    <h2 class="block-head">${icon("mdi:beach")}<span>${t("vacationRequests")}</span></h2>
    ${
      rows.length > 0
        ? html`<ul class="family-rows">
            ${rows}
          </ul>`
        : nothing
    }
    ${
      rows.length > 0
        ? nothing
        : waiting
          ? loading(t)
          : html`<p class="empty-line">
              ${icon("mdi:check-circle-outline")}<span>${t("noVacationRequests")}</span>
            </p>`
    }
  </section>`;
}
