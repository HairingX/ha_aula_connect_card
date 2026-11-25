/**
 * The vacations: those registered for each child and not over yet, the window that registers one
 * for children chosen, and the one that deletes one. Nothing is sent without a tap.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit/html.js";

import { actionErrorText, addVacation, deleteVacation } from "../core/api.ts";
import type { ViewContext } from "../core/context.ts";
import { addDays, formatDayRange } from "../core/dates.ts";
import { rememberSender } from "../core/selection.ts";
import type { Child, Vacation } from "../core/types.ts";
import type { FamilyChild } from "../model/family.ts";
import {
  COMMENT_MAX,
  comingVacations,
  VACATION_AHEAD_DAYS,
  vacationValid,
} from "../model/vacation.ts";
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
  turnedOff,
} from "./primitives.ts";
import { head, modal } from "./window.ts";

/** A child's vacations, and the entry they are asked and registered from. */
export interface ChildVacations {
  /** The child, with its entries and day. */
  readonly family: FamilyChild;
  /** The entry acted from. */
  readonly entry: Child;
  /** The vacations, as they stand. */
  readonly load: Load<Vacation[]>;
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
 * Opens the window that registers a vacation for the children chosen, all of them at first; `key`
 * is the opening button's `data-detail`, and `changed` is called once it is registered.
 */
export function openAddVacation(
  state: CardState,
  children: readonly ChildVacations[],
  key: string,
  changed: () => void,
): void {
  const draft: Draft = {
    chosen: new Set(children.map((item) => item.family.child.child_id)),
    start: "",
    end: "",
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
 * Opens the window that deletes a vacation, once confirmed; `key` is the opening button's
 * `data-detail`, and `changed` is called once it is deleted.
 */
export function openDeleteVacation(
  state: CardState,
  target: ChildVacations,
  vacation: Vacation,
  key: string,
  changed: () => void,
): void {
  const step: Step = { busy: false, error: undefined, done: false };
  const remove = (): void => {
    run(
      state,
      step,
      () => deleteVacation(state.callWS, target.entry.entry_id, vacation.id),
      changed,
    );
  };
  state.openModal(key, (ctx, close) => {
    const { t } = ctx;
    const face = state.face(target.family.child);
    const days = formatDayRange(vacation.start, vacation.end, ctx.language, "long");
    const top = head(
      t("deleteVacationTitle", { name: face.name }),
      [days],
      [],
      ctx,
      close,
      faceImage(face, "window-face"),
    );
    return modal(
      step.done
        ? finished(top, t("vacationDeleted"), close, ctx)
        : html`${top}
            ${vacation.comment ? html`<p class="window-note">${icon("mdi:comment-text-outline")}<span>${vacation.comment}</span></p>` : nothing}
            ${step.error === undefined ? nothing : alert("error", actionErrorText(step.error, t))}
            <div class="window-actions">
              <button class="text-button" type="button" @click=${close}>${t("cancel")}</button>
              <button
                class="filled-button danger"
                type="button"
                ?disabled=${step.busy}
                @click=${remove}
              >
                ${step.busy ? t("sending") : t("deleteVacation")}
              </button>
            </div>`,
      close,
    );
  });
}

/** Renders the vacation card; `changed` is called once a vacation is registered or deleted. */
export function renderVacations(
  children: readonly ChildVacations[],
  ctx: ViewContext,
  state: CardState,
  changed: () => void,
): TemplateResult {
  const { t } = ctx;
  const waiting = children.some(({ load }) => load.data === undefined && load.error === undefined);
  const allowed = children.filter(({ entry }) => entry.allowed.includes("vacations"));
  const rows = children.flatMap((target) => {
    const { load, family } = target;
    if (load.error !== undefined && load.data === undefined)
      return [html`<li>${apiError(load.error, t)}</li>`];
    if (load.data === undefined) return [];
    const face = state.face(family.child);
    return comingVacations(load.data, ctx.today).map((vacation) => {
      const key = `vacation|${String(family.child.child_id)}|${String(vacation.id)}`;
      return html`<li class="family-row">
        ${faceImage(face)}
        <span class="family-text">
          <span class="family-title"
            >${formatDayRange(vacation.start, vacation.end, ctx.language, "long")}</span
          >
          <span class="family-sub"
            >${[face.name, vacation.comment].filter(Boolean).join(" · ")}</span
          >
        </span>
        ${vacation.start <= ctx.today ? label(t("today")) : nothing}
        ${
          vacation.editable && target.entry.allowed.includes("vacations")
            ? html`<button
                class="icon-button"
                type="button"
                aria-haspopup="dialog"
                aria-label=${`${t("deleteVacation")}: ${face.name}, ${formatDayRange(vacation.start, vacation.end, ctx.language, "long")}`}
                data-detail=${key}
                @click=${() => {
                  openDeleteVacation(state, target, vacation, key, changed);
                }}
              >
                ${icon("mdi:delete-outline")}
              </button>`
            : nothing
        }
      </li>`;
    });
  });
  return html`<section class="family-card" aria-label=${t("vacations")}>
    <h2 class="block-head">${icon("mdi:island")}<span>${t("vacations")}</span></h2>
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
              ${icon("mdi:calendar-blank-outline")}<span>${t("noVacations")}</span>
            </p>`
    }
    ${
      allowed.length === 0
        ? turnedOff("vacations", t)
        : html`<div class="window-actions">
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
  </section>`;
}
