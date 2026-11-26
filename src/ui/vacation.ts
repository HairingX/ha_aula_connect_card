/**
 * The vacations: those registered for each child and not over yet, the window that registers one
 * for children chosen, and the one that deletes one. Nothing is sent without a tap.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit/html.js";

import { actionErrorText, addVacation, deleteVacation, errorText } from "../core/api.ts";
import type { ViewContext } from "../core/context.ts";
import { addDays, formatDayRange } from "../core/dates.ts";
import { rememberSender } from "../core/selection.ts";
import type { Child, Vacation, VacationRequest } from "../core/types.ts";
import type { RequestGroup, VacationFor, VacationGroup } from "../model/absence.ts";
import { answeredAway, vacationGroups } from "../model/absence.ts";
import type { FamilyChild } from "../model/family.ts";
import { COMMENT_MAX, VACATION_AHEAD_DAYS, vacationValid } from "../model/vacation.ts";
import type { CardState } from "./card.ts";
import type { Load } from "./loads.ts";
import {
  alert,
  apiError,
  faceImage,
  icon,
  label,
  listOf,
  loading,
  minis,
  turnedOff,
} from "./primitives.ts";
import { requestRow } from "./vacation-requests.ts";
import { head, modal } from "./window.ts";

/** A child's vacations, and the entry they are asked and registered from. */
export interface ChildVacations {
  /** The child, with its entries and day. */
  readonly family: FamilyChild;
  /** The entry acted from. */
  readonly entry: Child;
  /** The vacations, as they stand. */
  readonly load: Load<Vacation[]>;
  /** The child's vacation requests as they stand, whose answers say days it does not come. */
  readonly answers: readonly VacationRequest[];
}

/** What a window that changes the vacations has come to. */
interface Step {
  busy: boolean;
  error: unknown;
  done: boolean;
}

/** What the window that registers a vacation holds. */
interface Draft extends Step {
  chosen: Set<number>;
  start: string;
  end: string;
  comment: string;
}

function run(state: CardState, step: Step, action: () => Promise<void>, done: () => void): void {
  step.busy = true;
  step.error = undefined;
  state.requestUpdate();
  action().then(
    () => {
      step.busy = false;
      step.done = true;
      done();
      state.requestUpdate();
    },
    (error: unknown) => {
      step.busy = false;
      step.error = error;
      state.requestUpdate();
    },
  );
}

function finished(
  top: TemplateResult,
  text: string,
  close: () => void,
  ctx: ViewContext,
): TemplateResult {
  return html`${top}
    <p class="done-line">${icon("mdi:check-circle-outline")}<span>${text}</span></p>
    <div class="window-actions">
      <button class="filled-button" type="button" @click=${close}>${ctx.t("close2")}</button>
    </div>`;
}

/**
 * Opens the window that registers a vacation for the children chosen, all of them at first, from
 * `day` to `day` where one is given; `key` is the opening button's `data-detail`, and `changed` is
 * called once it is registered.
 */
export function openAddVacation(
  state: CardState,
  children: readonly ChildVacations[],
  key: string,
  changed: () => void,
  day = "",
): void {
  const draft: Draft = {
    chosen: new Set(children.map((item) => item.family.child.child_id)),
    start: day,
    end: day,
    comment: "",
    busy: false,
    error: undefined,
    done: false,
  };
  const add = (): void => {
    const chosen = children.filter((item) => draft.chosen.has(item.family.child.child_id));
    // A vacation is registered from one entry for the children in it: one request per guardian.
    const byEntry = new Map<string, number[]>();
    for (const item of chosen) {
      byEntry.set(item.entry.entry_id, [
        ...(byEntry.get(item.entry.entry_id) ?? []),
        item.entry.child_id,
      ]);
    }
    run(
      state,
      draft,
      async () => {
        for (const [entryId, ids] of byEntry) {
          await addVacation(
            state.callWS,
            entryId,
            ids,
            draft.start,
            draft.end,
            draft.comment.trim(),
          );
        }
      },
      () => {
        for (const item of chosen) rememberSender(item.entry.child_id, item.entry.entry_id);
        changed();
      },
    );
  };
  state.openModal(key, (ctx, close) =>
    modal(addWindow(draft, children, ctx, close, state, add), close),
  );
}

function addWindow(
  draft: Draft,
  children: readonly ChildVacations[],
  ctx: ViewContext,
  close: () => void,
  state: CardState,
  add: () => void,
): TemplateResult {
  const { t } = ctx;
  const top = head(
    t("addVacation"),
    [],
    [],
    ctx,
    close,
    html`<span class="window-icon">${icon("mdi:beach")}</span>`,
  );
  if (draft.done) return finished(top, t("vacationAdded"), close, ctx);
  const last = addDays(ctx.today, VACATION_AHEAD_DAYS);
  const valid = vacationValid(draft.start, draft.end, ctx.today);
  const chosen = children.filter((item) => draft.chosen.has(item.family.child.child_id));
  const ready = valid && chosen.length > 0 && !draft.busy;
  const date = (which: "start" | "end", name: string, min: string): TemplateResult =>
    html`<label class="date-field"
      ><span class="field-label">${name}</span
      ><input
        class="text-input"
        type="date"
        min=${min}
        max=${last}
        .value=${draft[which]}
        ?disabled=${draft.busy}
        @input=${(event: Event) => {
          draft[which] = (event.target as HTMLInputElement).value;
          if (which === "start" && (draft.end === "" || draft.end < draft.start))
            draft.end = draft.start;
          state.requestUpdate();
        }}
    /></label>`;
  return html`${top}
    ${
      children.length > 1
        ? html`<div class="field">
            <span class="field-label" id="vacation-for">${t("vacationFor")}</span>
            <div class="choices" role="group" aria-labelledby="vacation-for">
              ${children.map((item) => {
                const id = item.family.child.child_id;
                const face = state.face(item.family.child);
                return html`<button
                  class="choice face-choice"
                  type="button"
                  aria-pressed=${draft.chosen.has(id) ? "true" : "false"}
                  ?disabled=${draft.busy}
                  @click=${() => {
                    if (!draft.chosen.delete(id)) draft.chosen.add(id);
                    state.requestUpdate();
                  }}
                >
                  ${faceImage(face, "mini")}<span>${face.name}</span>
                </button>`;
              })}
            </div>
          </div>`
        : nothing
    }
    <div class="field date-fields">
      ${date("start", t("vacationFrom"), ctx.today)}
      ${date("end", t("vacationTo"), draft.start === "" ? ctx.today : draft.start)}
    </div>
    <p class="window-note">${icon("mdi:information-outline")}<span>${t("vacationDays")}</span></p>
    <div class="field">
      <label class="field-label" for="vacation-comment">${t("commentLabel")}</label>
      <textarea
        id="vacation-comment"
        class="text-input"
        rows="2"
        maxlength=${COMMENT_MAX}
        .value=${draft.comment}
        ?disabled=${draft.busy}
        @input=${(event: Event) => {
          draft.comment = (event.target as HTMLTextAreaElement).value;
          state.requestUpdate();
        }}
      ></textarea>
      <span class="field-count" aria-live="polite"
        >${t("commentCount", { n: draft.comment.length })}</span
      >
    </div>
    ${
      valid && chosen.length > 0
        ? html`<p class="info-line">
            ${icon("mdi:calendar-check-outline")}<span
              >${t("vacationSummary", {
                names: listOf(
                  chosen.map((item) => state.face(item.family.child).name),
                  ctx,
                ),
                days: formatDayRange(draft.start, draft.end, ctx.language, "long"),
              })}</span
            >
          </p>`
        : nothing
    }
    ${draft.error === undefined ? nothing : alert("error", actionErrorText(draft.error, t))}
    <div class="window-actions">
      <button class="text-button" type="button" @click=${close}>${t("cancel")}</button>
      <button class="filled-button" type="button" ?disabled=${!ready} @click=${add}>
        ${draft.busy ? t("sending") : t("addVacation")}
      </button>
    </div>`;
}

/**
 * Opens the window that deletes a vacation for the children chosen of those it is registered for,
 * all of them at first, once confirmed; `key` is the opening button's `data-detail`, and `changed`
 * is called once it is deleted.
 */
export function openDeleteVacation(
  state: CardState,
  group: VacationGroup,
  key: string,
  changed: () => void,
): void {
  const items = group.items.filter(
    (item) => item.vacation.editable && item.entry.allowed.includes("vacations"),
  );
  const chosen = new Set(items.map((item) => item.child.child_id));
  const step: Step = { busy: false, error: undefined, done: false };
  const remove = (): void => {
    // A vacation registered for several children may be one in Aula: it is deleted once.
    const ids = new Map<string, VacationFor>();
    for (const item of items.filter((found) => chosen.has(found.child.child_id))) {
      ids.set(`${item.entry.entry_id}|${String(item.vacation.id)}`, item);
    }
    run(
      state,
      step,
      async () => {
        for (const item of ids.values()) {
          await deleteVacation(state.callWS, item.entry.entry_id, item.vacation.id);
        }
      },
      changed,
    );
  };
  state.openModal(key, (ctx, close) => {
    const { t } = ctx;
    const faces = items.map((item) => state.face(item.child));
    const days = formatDayRange(group.start, group.end, ctx.language, "long");
    const top = head(
      t("deleteVacationTitle", {
        name: listOf(
          faces.map((face) => face.name),
          ctx,
        ),
      }),
      [days],
      [],
      ctx,
      close,
      minis(faces, ctx, "window-faces"),
    );
    return modal(
      step.done
        ? finished(top, t("vacationDeleted"), close, ctx)
        : html`${top}
            ${group.comment ? html`<p class="window-note">${icon("mdi:comment-text-outline")}<span>${group.comment}</span></p>` : nothing}
            ${
              items.length > 1
                ? html`<div class="field">
                    <span class="field-label" id="delete-for">${t("vacationFor")}</span>
                    <div class="choices" role="group" aria-labelledby="delete-for">
                      ${items.map((item) => {
                        const id = item.child.child_id;
                        const face = state.face(item.child);
                        return html`<button
                          class="choice face-choice"
                          type="button"
                          aria-pressed=${chosen.has(id) ? "true" : "false"}
                          ?disabled=${step.busy}
                          @click=${() => {
                            if (!chosen.delete(id)) chosen.add(id);
                            state.requestUpdate();
                          }}
                        >
                          ${faceImage(face, "mini")}<span>${face.name}</span>
                        </button>`;
                      })}
                    </div>
                  </div>`
                : nothing
            }
            ${step.error === undefined ? nothing : alert("error", actionErrorText(step.error, t))}
            <div class="window-actions">
              <button class="text-button" type="button" @click=${close}>${t("cancel")}</button>
              <button
                class="filled-button danger"
                type="button"
                ?disabled=${step.busy || chosen.size === 0}
                @click=${remove}
              >
                ${step.busy ? t("sending") : t("deleteVacation")}
              </button>
            </div>`,
      close,
    );
  });
}

function vacationRow(
  group: VacationGroup,
  ctx: ViewContext,
  state: CardState,
  changed: () => void,
): TemplateResult {
  const { t } = ctx;
  const faces = group.items.map((item) => state.face(item.child));
  const days = formatDayRange(group.start, group.end, ctx.language, "long");
  const deletable = group.items.some(
    (item) => item.vacation.editable && item.entry.allowed.includes("vacations"),
  );
  const key = `vacation|${group.key}`;
  return html`<li class="family-row">
    ${minis(faces, ctx, "family-faces")}
    <span class="family-text">
      <span class="family-title">${days}</span>
      <span class="family-sub"
        >${[
          listOf(
            faces.map((face) => face.name),
            ctx,
          ),
          group.comment,
        ]
          .filter(Boolean)
          .join(" · ")}</span
      >
    </span>
    ${group.start <= ctx.today ? label(t("vacationOngoing")) : nothing}
    ${
      deletable
        ? html`<button
            class="icon-button"
            type="button"
            aria-haspopup="dialog"
            aria-label=${`${t("deleteVacation")}: ${days}`}
            data-detail=${key}
            @click=${() => {
              openDeleteVacation(state, group, key, changed);
            }}
          >
            ${icon("mdi:delete-outline")}
          </button>`
        : nothing
    }
  </li>`;
}

/** What the Ferie/fri card shows besides the vacations. */
export interface VacationCardParts {
  /** The vacation requests that can still be answered, once for every child they are asked of. */
  readonly requests: readonly RequestGroup[];
  /** Why a child's requests could not be had, where they could not. */
  readonly requestErrors: readonly unknown[];
  /** Called once a vacation is registered or deleted. */
  readonly changed: () => void;
  /** Called once a request is answered. */
  readonly answered: () => void;
}

/**
 * Renders the Ferie/fri card: the requests awaiting an answer, the vacations registered, the
 * buttons that register one, and the requests answered, folded.
 */
export function renderVacations(
  children: readonly ChildVacations[],
  ctx: ViewContext,
  state: CardState,
  parts: VacationCardParts,
): TemplateResult {
  const { t } = ctx;
  const { changed, answered } = parts;
  const waiting = children.some(({ load }) => load.data === undefined && load.error === undefined);
  const allowed = children.filter(({ entry }) => entry.allowed.includes("vacations"));
  const groups = vacationGroups(
    children.map(({ family, entry, load, answers }) => ({
      child: family.child,
      entry,
      data: load.data && [...load.data, ...answeredAway(answers, load.data)],
    })),
    ctx.today,
  );
  const failed = children.flatMap(({ load }) =>
    load.error !== undefined && load.data === undefined ? [load.error] : [],
  );
  // The requests and the vacations come the same way: an error both meet is said once.
  const errors = new Map(
    [...parts.requestErrors, ...failed].map((error) => [errorText(error, t), error] as const),
  );
  const missing = parts.requests.filter((group) => group.missing);
  const answeredGroups = parts.requests.filter((group) => !group.missing);
  return html`<section class="family-card" aria-label=${t("vacations")}>
    <h2 class="block-head">
      ${icon("mdi:island")}<span>${t("vacations")}</span>
      ${groups.length > 0 ? label(t("vacationsCount", { n: groups.length }), "count") : nothing}
    </h2>
    ${[...errors.values()].map((error) => apiError(error, t))}
    ${
      missing.length > 0
        ? html`<h3 class="family-head">${t("missingAnswer")}</h3>
            <ul class="family-rows">
              ${missing.map((group) => requestRow(group, ctx, state, answered))}
            </ul>`
        : nothing
    }
    ${
      groups.length > 0
        ? html`<h3 class="family-head">${t("vacationsRegistered")}</h3>
            <ul class="family-rows">
              ${groups.map((group) => vacationRow(group, ctx, state, changed))}
            </ul>`
        : waiting
          ? loading(t)
          : missing.length > 0
            ? nothing
            : html`<p class="empty-line">
                ${icon("mdi:calendar-blank-outline")}<span>${t("noVacations")}</span>
              </p>`
    }
    ${
      allowed.length === 0
        ? turnedOff("vacations", t)
        : html`<div class="window-actions">
            <button
              class="text-button"
              type="button"
              aria-haspopup="dialog"
              data-detail="vacation-today"
              @click=${() => {
                openAddVacation(state, allowed, "vacation-today", changed, ctx.today);
              }}
            >
              ${t("dayOffToday")}
            </button>
            <button
              class="filled-button"
              type="button"
              aria-haspopup="dialog"
              data-detail="vacation-add"
              @click=${() => {
                openAddVacation(state, allowed, "vacation-add", changed);
              }}
            >
              ${icon("mdi:plus")}<span>${t("addVacation")}</span>
            </button>
          </div>`
    }
    ${
      answeredGroups.length > 0
        ? html`<details class="family-fold">
            <summary>
              <span>${t("requestsAnswered", { n: answeredGroups.length })}</span
              >${icon("mdi:chevron-down", "chevron")}
            </summary>
            <ul class="family-rows">
              ${answeredGroups.map((group) => requestRow(group, ctx, state, answered))}
            </ul>
          </details>`
        : nothing
    }
  </section>`;
}
