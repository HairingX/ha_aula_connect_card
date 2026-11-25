/**
 * Reporting a child sick, and writing a message about it: two steps, each its own tap. The first
 * reports the child sick along the route Aula Connect finds, once it has checked that the child
 * can be; the second, which the family may skip, writes a message in a thread the family chooses.
 * Nothing is sent without a tap.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit/html.js";

import {
  actionErrorText,
  checkSick,
  fetchThreads,
  replyMessage,
  reportSick,
  undoSick,
} from "../core/api.ts";
import type { ViewContext } from "../core/context.ts";
import { capitalize, dayOf, formatDay, formatShortDate, instant } from "../core/dates.ts";
import { rememberSender } from "../core/selection.ts";
import type { Change, Child, SickCheck, ThreadList, TodayData } from "../core/types.ts";
import { allowing, senderOf, type FamilyChild, type FamilyView } from "../model/family.ts";
import type { CardState } from "./card.ts";
import { alert, faceImage, icon, label, loading, turnedOff } from "./primitives.ts";
import { head, modal } from "./window.ts";

/** What reporting a child sick is about: the child, its entries and its day as it is now. */
export interface SickTarget {
  /** The child, with its entries and day. */
  readonly family: FamilyChild;
  /** The message about the illness, `{name}` standing for the child's first name. */
  readonly message: string | undefined;
  /** The guardian to act as, by the name of the entry's guardian. */
  readonly sender: string | undefined;
}

/** How far the two steps have come. */
interface Flow {
  step: "report" | "write" | "done";
  entry: Child;
  busy: boolean;
  error: unknown;
  /** Whether the child was reported sick in this window. */
  reported: boolean;
  /** Whether a report was taken back in this window. */
  undone: boolean;
  /** The entry the check before a report was last asked for. */
  checked: Child | undefined;
  /** What that check answered, or its error; undefined while it runs. */
  check: SickCheck | { readonly error: unknown } | undefined;
  threads: ThreadList | undefined;
  threadsError: unknown;
  thread: string | number | undefined;
  text: string;
  sent: boolean;
}

/** Fills a message's template in: `{name}` is the child's first name. */
export function fillMessage(template: string, child: Child): string {
  return template.replace(/\{name\}/g, child.first_name);
}

function may(family: FamilyChild, change: Change): boolean {
  return allowing(family, change).length > 0;
}

function since(today: TodayData | undefined, ctx: ViewContext): string | undefined {
  const day = today?.sick.since;
  return day && day < ctx.today ? day : undefined;
}

/**
 * Opens the window that reports a child sick, at the first step; with `write` at the second, or
 * at the end where writing is turned off. `key` is the opening button's `data-detail`.
 */
export function openSick(state: CardState, target: SickTarget, key: string, write = false): void {
  const { family } = target;
  const writes = may(family, "messages");
  const step = write ? (writes ? "write" : "done") : "report";
  const flow: Flow = {
    step,
    entry: senderOf(family, target.sender, step === "write" ? "messages" : "sick_reports"),
    busy: false,
    error: undefined,
    reported: false,
    undone: false,
    checked: undefined,
    check: undefined,
    threads: undefined,
    threadsError: undefined,
    thread: undefined,
    text: "",
    sent: false,
  };
  const entryFor = (change: Change): Child =>
    flow.entry.allowed.includes(change) ? flow.entry : senderOf(family, target.sender, change);
  const run = (action: () => Promise<void>, done: () => void): void => {
    flow.busy = true;
    flow.error = undefined;
    state.requestUpdate();
    action().then(
      () => {
        flow.busy = false;
        done();
        state.requestUpdate();
      },
      (error: unknown) => {
        flow.busy = false;
        flow.error = error;
        state.requestUpdate();
      },
    );
  };
  const loadThreads = (): void => {
    const entry = flow.entry;
    flow.threads = undefined;
    flow.threadsError = undefined;
    fetchThreads(state.callWS, entry).then(
      (threads) => {
        flow.threads = threads;
        const remembered = threads.threads.find(
          (item) => item.thread_id === threads.remembered && item.can_reply,
        );
        flow.thread = threads.remembered_stale ? undefined : remembered?.thread_id;
        state.requestUpdate();
      },
      (error: unknown) => {
        flow.threadsError = error;
        state.requestUpdate();
      },
    );
  };
  // An answer for an entry no longer chosen is left unshown.
  const check = (): void => {
    const entry = flow.entry;
    flow.checked = entry;
    flow.check = undefined;
    const settle = (answer: SickCheck | { readonly error: unknown }): void => {
      if (flow.checked !== entry) return;
      flow.check = answer;
      state.requestUpdate();
    };
    checkSick(state.callWS, entry).then(settle, (error: unknown) => {
      settle({ error });
    });
  };
  const checks = may(family, "sick_reports") && (family.today?.sick.route ?? "none") !== "none";
  const toWrite = (ctx: ViewContext): void => {
    flow.step = "write";
    flow.entry = entryFor("messages");
    flow.text = fillMessage(target.message ?? ctx.t("sickMessageDefault"), family.child);
    flow.error = undefined;
    loadThreads();
  };
  const actions = {
    report: (ctx: ViewContext): void => {
      const entry = flow.entry;
      run(
        () => reportSick(state.callWS, entry),
        () => {
          rememberSender(family.child.child_id, entry.entry_id);
          flow.reported = true;
          flow.undone = false;
          if (writes) toWrite(ctx);
          else flow.step = "done";
        },
      );
    },
    undo: (): void => {
      const entry = entryFor("sick_reports");
      run(
        () => undoSick(state.callWS, entry),
        () => {
          flow.entry = entry;
          flow.reported = false;
          flow.undone = true;
          flow.step = "report";
        },
      );
    },
    send: (thread: string | number): void => {
      const entry = flow.entry;
      run(
        () => replyMessage(state.callWS, entry, thread, flow.text.trim()),
        () => {
          rememberSender(family.child.child_id, entry.entry_id);
          flow.sent = true;
          flow.step = "done";
        },
      );
    },
    choose: (entry: Child): void => {
      flow.entry = entry;
      if (flow.step === "write") loadThreads();
      state.requestUpdate();
    },
    write: toWrite,
  };
  let started = flow.step !== "write";
  state.openModal(key, (ctx, close) => {
    if (!started) {
      started = true;
      toWrite(ctx);
    }
    if (checks && flow.step === "report" && flow.checked !== flow.entry) check();
    return modal(sickWindow(flow, target, ctx, close, state, actions), close);
  });
}

interface Actions {
  readonly report: (ctx: ViewContext) => void;
  readonly undo: () => void;
  readonly send: (thread: string | number) => void;
  readonly choose: (entry: Child) => void;
  readonly write: (ctx: ViewContext) => void;
}

function senders(
  flow: Flow,
  entries: readonly Child[],
  ctx: ViewContext,
  actions: Actions,
): unknown {
  if (entries.length < 2) return nothing;
  return html`<div class="field">
    <span class="field-label" id="sender-label">${ctx.t("sendAs")}</span>
    <div class="choices" role="group" aria-labelledby="sender-label">
      ${entries.map(
        (entry) =>
          html`<button
            class="choice"
            type="button"
            aria-pressed=${entry === flow.entry ? "true" : "false"}
            ?disabled=${flow.busy}
            @click=${() => {
              actions.choose(entry);
            }}
          >
            ${entry.guardian || entry.entry_id}
          </button>`,
      )}
    </div>
  </div>`;
}

function sickWindow(
  flow: Flow,
  target: SickTarget,
  ctx: ViewContext,
  close: () => void,
  state: CardState,
  actions: Actions,
): TemplateResult {
  const { t } = ctx;
  const { family } = target;
  const { child, today } = family;
  const face = state.face(child);
  const name = face.name;
  const route = today?.sick.route ?? "none";
  const check = flow.check;
  const found = check !== undefined && !("error" in check) ? check : undefined;
  const sickToday =
    flow.reported || ((today?.sick.today === true || found?.sick_today === true) && !flow.undone);
  const day = capitalize(formatDay(ctx.today, ctx.language), ctx.language);
  const error = flow.error === undefined ? nothing : alert("error", actionErrorText(flow.error, t));
  const done = html`<p class="done-line">
    ${icon("mdi:check-circle-outline")}<span>${t("sickDone", { name })}</span>
    ${
      route === "aula" && may(family, "sick_reports")
        ? html`<button
            class="text-button"
            type="button"
            ?disabled=${flow.busy}
            @click=${actions.undo}
          >
            ${t("undo")}
          </button>`
        : nothing
    }
  </p>`;
  const faceMark = faceImage(face, "window-face");
  if (flow.step === "done") {
    const title = flow.sent ? t("writeTitle", { name }) : t("reportSick", { name });
    return html`${head(title, [day], [], ctx, close, faceMark)} ${sickToday ? done : nothing}
      ${
        flow.sent
          ? html`<p class="done-line">
              ${icon("mdi:send-check-outline")}<span>${t("sent")}</span>
            </p>`
          : turnedOff("messages", t)
      }
      <div class="window-actions">
        <button class="filled-button" type="button" @click=${close}>${t("close2")}</button>
      </div>`;
  }
  if (flow.step === "write")
    return writeStep(flow, target, ctx, close, state, actions, faceMark, done, error, sickToday);
  // At the first step the child is not reported sick: a child reported sick opens at the second.
  const top = head(t("reportSick", { name }), [day], [], ctx, close, faceMark);
  const writes = may(family, "messages");
  const write = writes
    ? html`<button
        class="text-button"
        type="button"
        @click=${() => {
          actions.write(ctx);
          state.requestUpdate();
        }}
      >
        ${t("writeMessage")}
      </button>`
    : nothing;
  const writeOff = writes ? nothing : turnedOff("messages", t);
  if (!may(family, "sick_reports"))
    return html`${top}${turnedOff("sick_reports", t)}${writeOff}
      <div class="window-actions">${write}</div>`;
  const cannot = route === "none" || found?.child_found === false;
  const button = (enabled: boolean): TemplateResult =>
    html`<button
      class="filled-button"
      type="button"
      ?disabled=${!enabled || flow.busy}
      @click=${() => {
        actions.report(ctx);
      }}
    >
      ${flow.busy ? t("sending") : t("sickConfirm")}
    </button>`;
  // Until the check answers, and where it fails, the report waits: it may not reach the child.
  let line: unknown = nothing;
  let report: unknown = nothing;
  if (!cannot) {
    if (check === undefined) [line, report] = [loading(t), button(false)];
    else if ("error" in check)
      [line, report] = [alert("error", actionErrorText(check.error, t)), button(false)];
    else if (sickToday) line = done;
    else {
      if (route === "tabulex")
        line = html`<p class="window-note">
          ${icon("mdi:alert-outline")}<span>${t("sickFinal")}</span>
        </p>`;
      report = button(true);
    }
  }
  const routeLine = cannot
    ? html`<p class="route none">
        ${icon("mdi:information-outline")}<span>${t("sickRouteNone", { name })}</span>
      </p>`
    : html`<p class="route ${route}">
        ${icon("mdi:check-circle-outline")}<span
          >${t("sickRoute", { institution: child.institution_name })}</span
        >
      </p>`;
  return html`${top} ${flow.undone ? alert("info", t("undone")) : nothing} ${routeLine}
    ${senders(flow, allowing(family, "sick_reports"), ctx, actions)} ${line} ${writeOff} ${error}
    <div class="window-actions">${write} ${report}</div>`;
}

function writeStep(
  flow: Flow,
  target: SickTarget,
  ctx: ViewContext,
  close: () => void,
  state: CardState,
  actions: Actions,
  faceMark: TemplateResult,
  done: TemplateResult,
  error: unknown,
  sickToday: boolean,
): TemplateResult {
  const { t } = ctx;
  const { family } = target;
  const name = state.face(family.child).name;
  const earlier = since(family.today, ctx);
  // A family that wrote the day before, or whose child was ill before today, has written
  // already: skipping is what they most likely want.
  const skipFirst = family.today?.sick.wrote_yesterday === true || earlier !== undefined;
  const threads = flow.threads;
  const chosen = threads?.threads.find((item) => item.thread_id === flow.thread);
  const canSend = chosen !== undefined && flow.text.trim() !== "" && !flow.busy;
  const send = html`<button
    class=${skipFirst ? "text-button" : "filled-button"}
    type="button"
    ?disabled=${!canSend}
    @click=${
      chosen
        ? () => {
            actions.send(chosen.thread_id);
          }
        : nothing
    }
  >
    ${flow.busy ? t("sending") : t("send")}
  </button>`;
  const skip = html`<button
    class=${skipFirst ? "filled-button" : "text-button"}
    type="button"
    @click=${close}
  >
    ${t("skip")}
  </button>`;
  let picker: unknown;
  if (flow.threadsError !== undefined)
    picker = alert("error", actionErrorText(flow.threadsError, t));
  else if (!threads) picker = loading(t);
  else if (threads.threads.length === 0) picker = alert("info", t("noThreads", { name }));
  else
    picker = html`${
        threads.remembered_stale && threads.remembered !== null
          ? alert("warning", t("threadStale"))
          : nothing
      }
      <div class="threads" role="radiogroup" aria-label=${t("threadLabel")}>
        ${threads.threads.map((item) => {
          const at = instant(item.last_activity);
          const meta = [
            ...item.employees,
            ...(at ? [formatShortDate(dayOf(at, ctx.zone), ctx.language)] : []),
          ].join(" · ");
          return html`<label class="thread ${item.can_reply ? "" : "closed"}">
            <input
              type="radio"
              name="thread"
              .checked=${item.thread_id === flow.thread}
              ?disabled=${!item.can_reply || flow.busy}
              @change=${() => {
                flow.thread = item.thread_id;
                state.requestUpdate();
              }}
            />
            <span class="thread-text"
              ><span class="thread-subject">${item.subject}</span
              ><span class="thread-meta">${meta}</span></span
            >
          </label>`;
        })}
      </div>`;
  return html`${head(t("writeQuestion"), [name], [], ctx, close, faceMark)}
    ${sickToday ? done : nothing}
    ${earlier ? html`<p class="info-line">${icon("mdi:thermometer")}<span>${t("sickSinceDay", { name, day: formatDay(earlier, ctx.language) })}</span></p>` : nothing}
    ${family.today?.sick.wrote_yesterday ? html`<p class="info-line">${icon("mdi:message-check-outline")}<span>${t("wroteYesterday")}</span></p>` : nothing}
    ${senders(flow, allowing(family, "messages"), ctx, actions)}
    <div class="field">
      <span class="field-label">${t("threadLabel")}</span>
      ${picker}
    </div>
    <div class="field">
      <label class="field-label" for="sick-message">${t("messageLabel")}</label>
      <textarea
        id="sick-message"
        class="text-input"
        rows="3"
        .value=${flow.text}
        ?disabled=${flow.busy}
        @input=${(event: Event) => {
          flow.text = (event.target as HTMLTextAreaElement).value;
          state.requestUpdate();
        }}
      ></textarea>
    </div>
    ${error}
    <div class="window-actions">${skipFirst ? html`${send}${skip}` : html`${skip}${send}`}</div>`;
}

/** Shows a child's state as the sick card's row and the presence window say it. */
export function sickState(family: FamilyChild, ctx: ViewContext): string {
  const { t } = ctx;
  const today = family.today;
  if (today?.sick.today) return t("sickToday");
  return capitalize(formatDay(ctx.today, ctx.language), ctx.language);
}

/** Shows a label saying a child is reported sick today, where it is. */
export function sickLabel(
  family: { readonly today: TodayData | undefined },
  ctx: ViewContext,
): unknown {
  return family.today?.sick.today
    ? label(html`${icon("mdi:thermometer")}${ctx.t("sickToday")}`, "warning")
    : nothing;
}

/** What the sick card shows. */
export interface SickCardOptions {
  /** The message about the illness, `{name}` standing for the child's first name. */
  readonly message: string | undefined;
  /** The guardian to act as. */
  readonly sender: string | undefined;
}

/** Renders the sick card: a row for each child, which opens the window that reports it sick. */
export function renderSickCard(
  view: FamilyView,
  ctx: ViewContext,
  state: CardState,
  options: SickCardOptions,
): TemplateResult {
  const { t } = ctx;
  return html`<section class="family-card" aria-label=${t("sickTitle")}>
    <h2 class="block-head">${icon("mdi:thermometer")}<span>${t("sickTitle")}</span></h2>
    <ul class="family-rows">
      ${view.children.map((family) => {
        const face = state.face(family.child);
        const key = `sick|${String(family.child.child_id)}`;
        const sick = family.today?.sick.today === true;
        let title = t("reportSick", { name: face.name });
        if (sick) title = may(family, "messages") ? t("writeMessage") : face.name;
        return html`<li>
          <button
            class="family-row"
            type="button"
            aria-haspopup="dialog"
            data-detail=${key}
            @click=${() => {
              openSick(state, { family, ...options }, key, sick);
            }}
          >
            ${faceImage(face)}
            <span class="family-text">
              <span class="family-title">${title}</span>
              <span class="family-sub">${sickState(family, ctx)}</span>
            </span>
            ${sickLabel(family, ctx)} ${icon("mdi:chevron-right", "chevron-end")}
          </button>
        </li>`;
      })}
    </ul>
  </section>`;
}
