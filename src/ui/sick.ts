/**
 * Reporting a child sick, and writing a message about it, in one window and with one tap: the
 * report goes along the route Aula Connect finds, once it has checked that the child can be, and
 * the message, where the family writes one, in the thread it chooses. Nothing is sent without a
 * tap; a message that fails after the report can be sent again.
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
import { rememberThreads } from "../core/memory.ts";
import { rememberSender } from "../core/selection.ts";
import type { Change, Child, SickCheck, Thread, ThreadList, TodayData } from "../core/types.ts";
import type { ActionConfig, SickThread } from "../config/family.ts";
import { allowing, senderOf, type FamilyChild, type FamilyView } from "../model/family.ts";
import type { CardState } from "./card.ts";
import { alert, faceImage, icon, label, listOf, loading, minis, turnedOff } from "./primitives.ts";
import { head, modal } from "./window.ts";

/** How a child is reported sick and written about. */
export interface SickOptions {
  /** The message about the illness, `{name}` standing for the child's first name. */
  readonly message: string | undefined;
  /** The guardian to act as, by the name of the entry's guardian. */
  readonly sender: string | undefined;
  /** The thread each child is written about in, over the one last written in. */
  readonly threads: readonly SickThread[];
  /** Whether a report goes on to writing a message, rather than offering it. */
  readonly write: boolean;
}

/** Returns how a card's configuration has a child reported sick and written about. */
export function sickOptions(config: ActionConfig): SickOptions {
  return {
    message: config.sickMessage,
    sender: config.sender,
    threads: config.sickThreads,
    write: config.sickWrite,
  };
}

/** What reporting a child sick is about: the child, its entries and its day as it is now. */
export interface SickTarget extends SickOptions {
  /** The child, with its entries and day. */
  readonly family: FamilyChild;
}

/** How far the window has come: filled in, or sent. */
interface Flow {
  step: "form" | "done";
  /** Whether the window reports the child sick, or only writes about it. */
  mode: "report" | "write";
  entry: Child;
  busy: boolean;
  error: unknown;
  /** Whether a message is sent with the report. */
  withMessage: boolean;
  /** Whether the threads are listed to choose another. */
  picking: boolean;
  /** Whether the child was reported sick in this window. */
  reported: boolean;
  /** Whether a report was taken back in this window. */
  undone: boolean;
  /** The entry the check before a report was last asked for. */
  checked: Child | undefined;
  /** What that check answered, or its error; undefined while it runs. */
  check: SickCheck | { readonly error: unknown } | undefined;
  threads: ThreadList | undefined;
  /** The entry the threads were last asked of. */
  threadsOf: Child | undefined;
  threadsError: unknown;
  thread: string | number | undefined;
  /** Why the thread is to be chosen again: the one set is closed, or the one last used old. */
  threadNote: "gone" | "stale" | undefined;
  text: string;
  /** The thread the message was sent in; undefined until it is. */
  sentIn: Thread | undefined;
  /** The thread a message failed to go in after the report, and why; undefined where none did. */
  failed: { readonly thread: Thread; readonly error: unknown } | undefined;
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
 * Opens the window that reports a child sick and writes about it with one tap; with `write`, or
 * where reporting is turned off, it only writes. `key` is the opening button's `data-detail`.
 */
export function openSick(state: CardState, target: SickTarget, key: string, write = false): void {
  const { family } = target;
  const writes = may(family, "messages");
  const mode = write || !may(family, "sick_reports") ? "write" : "report";
  // A family that wrote the day before, or whose child was ill before today, has written
  // already: the message is left out until asked for.
  const wroteAlready =
    family.today?.sick.wrote_yesterday === true || (family.today?.sick.since ?? null) !== null;
  const flow: Flow = {
    step: "form",
    mode,
    entry: senderOf(family, target.sender, mode === "write" ? "messages" : "sick_reports"),
    busy: false,
    error: undefined,
    withMessage: writes && (mode === "write" || (target.write && !wroteAlready)),
    picking: false,
    reported: false,
    undone: false,
    checked: undefined,
    check: undefined,
    threads: undefined,
    threadsOf: undefined,
    threadsError: undefined,
    thread: undefined,
    threadNote: undefined,
    text: "",
    sentIn: undefined,
    failed: undefined,
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
    const entry = entryFor("messages");
    if (flow.threadsOf === entry) return;
    flow.threadsOf = entry;
    flow.threads = undefined;
    flow.threadsError = undefined;
    fetchThreads(state.callWS, entry).then(
      (threads) => {
        if (flow.threadsOf !== entry) return;
        flow.threads = threads;
        rememberThreads(family.child.child_id, threads.threads);
        const set = target.threads.find((item) => item.child === family.child.child_id);
        const open = (id: string | number | null): Thread | undefined =>
          threads.threads.find((item) => String(item.thread_id) === String(id) && item.can_reply);
        if (set) {
          flow.thread = open(set.thread)?.thread_id;
          flow.threadNote = flow.thread === undefined ? "gone" : undefined;
        } else {
          flow.thread = threads.remembered_stale ? undefined : open(threads.remembered)?.thread_id;
          flow.threadNote =
            threads.remembered_stale && threads.remembered !== null ? "stale" : undefined;
        }
        state.requestUpdate();
      },
      (error: unknown) => {
        if (flow.threadsOf !== entry) return;
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
  const send = async (thread: Thread): Promise<void> => {
    const entry = entryFor("messages");
    try {
      await replyMessage(state.callWS, entry, thread.thread_id, flow.text.trim());
      rememberSender(family.child.child_id, entry.entry_id);
      flow.sentIn = thread;
      flow.failed = undefined;
    } catch (error: unknown) {
      flow.failed = { thread, error };
    }
  };
  const actions: Actions = {
    submit: (report: boolean, thread: Thread | undefined): void => {
      const entry = flow.entry;
      run(
        async () => {
          if (report) {
            await reportSick(state.callWS, entry);
            rememberSender(family.child.child_id, entry.entry_id);
            flow.reported = true;
            flow.undone = false;
          }
          if (thread) await send(thread);
        },
        () => {
          flow.step = "done";
        },
      );
    },
    resend: (thread: Thread): void => {
      run(
        () => send(thread),
        () => undefined,
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
          flow.sentIn = undefined;
          flow.failed = undefined;
          flow.mode = "report";
          flow.step = "form";
        },
      );
    },
    choose: (entry: Child): void => {
      flow.entry = entry;
      if (flow.withMessage) loadThreads();
      state.requestUpdate();
    },
    toggle: (): void => {
      flow.withMessage = !flow.withMessage;
      if (flow.withMessage) loadThreads();
      state.requestUpdate();
    },
    pick: (): void => {
      flow.picking = true;
      state.requestUpdate();
    },
    need: (): void => {
      if (flow.withMessage) return;
      flow.withMessage = true;
      loadThreads();
    },
    write: (): void => {
      flow.mode = "write";
      flow.step = "form";
      flow.withMessage = true;
      loadThreads();
      state.requestUpdate();
    },
  };
  let started = false;
  state.openModal(key, (ctx, close) => {
    if (!started) {
      started = true;
      flow.text = fillMessage(target.message ?? ctx.t("sickMessageDefault"), family.child);
      if (flow.withMessage) loadThreads();
    }
    if (checks && flow.mode === "report" && flow.step === "form" && flow.checked !== flow.entry)
      check();
    return modal(sickWindow(flow, target, ctx, close, state, actions), close);
  });
}

interface Actions {
  /** Sends what the window holds: the report where `report`, and the message where a thread is given. */
  readonly submit: (report: boolean, thread: Thread | undefined) => void;
  readonly resend: (thread: Thread) => void;
  readonly undo: () => void;
  readonly choose: (entry: Child) => void;
  readonly toggle: () => void;
  readonly pick: () => void;
  /** Takes the message in where nothing is reported, without asking to render again. */
  readonly need: () => void;
  readonly write: () => void;
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

function threadMeta(item: Thread, ctx: ViewContext): string {
  const at = instant(item.last_activity);
  return [
    ...item.employees,
    ...(at ? [formatShortDate(dayOf(at, ctx.zone), ctx.language)] : []),
  ].join(" · ");
}

function threadPicker(
  flow: Flow,
  name: string,
  ctx: ViewContext,
  state: CardState,
  actions: Actions,
): unknown {
  const { t } = ctx;
  const threads = flow.threads;
  if (flow.threadsError !== undefined) return alert("error", actionErrorText(flow.threadsError, t));
  if (!threads) return loading(t);
  if (threads.threads.length === 0) return alert("info", t("noThreads", { name }));
  const chosen = threads.threads.find((item) => item.thread_id === flow.thread);
  // The thread set or last used is shown alone, the others a tap away.
  if (chosen && !flow.picking)
    return html`<div class="thread-chosen">
      <span class="thread-text"
        ><span class="thread-subject">${chosen.subject}</span
        ><span class="thread-meta">${threadMeta(chosen, ctx)}</span></span
      >
      <button class="text-button" type="button" ?disabled=${flow.busy} @click=${actions.pick}>
        ${t("changeThread")}
      </button>
    </div>`;
  return html`${
      flow.threadNote === undefined
        ? nothing
        : alert("warning", t(flow.threadNote === "gone" ? "threadConfiguredGone" : "threadStale"))
    }
    <div class="threads" role="radiogroup" aria-label=${t("threadLabel")}>
      ${threads.threads.map(
        (item) =>
          html`<label class="thread ${item.can_reply ? "" : "closed"}">
            <input
              type="radio"
              name="thread"
              .checked=${item.thread_id === flow.thread}
              ?disabled=${!item.can_reply || flow.busy}
              @change=${() => {
                flow.thread = item.thread_id;
                flow.threadNote = undefined;
                state.requestUpdate();
              }}
            />
            <span class="thread-text"
              ><span class="thread-subject">${item.subject}</span
              ><span class="thread-meta">${threadMeta(item, ctx)}</span></span
            >
          </label>`,
      )}
    </div>`;
}

function messagePart(
  flow: Flow,
  name: string,
  ctx: ViewContext,
  state: CardState,
  actions: Actions,
  withReport: boolean,
): unknown {
  const { t } = ctx;
  const toggle = withReport
    ? html`<button
        class="switch-row"
        type="button"
        role="switch"
        aria-checked=${flow.withMessage ? "true" : "false"}
        ?disabled=${flow.busy}
        @click=${actions.toggle}
      >
        <span>${t("sendAlso")}</span><span class="switch" aria-hidden="true"></span>
      </button>`
    : nothing;
  if (withReport && !flow.withMessage) return toggle;
  return html`${toggle}
    <div class="field">
      <span class="field-label">${t("threadLabel")}</span>
      ${threadPicker(flow, name, ctx, state, actions)}
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
    </div>`;
}

function doneWindow(
  flow: Flow,
  target: SickTarget,
  ctx: ViewContext,
  close: () => void,
  state: CardState,
  actions: Actions,
  sickToday: boolean,
): TemplateResult {
  const { t } = ctx;
  const { family } = target;
  const name = state.face(family.child).name;
  const day = capitalize(formatDay(ctx.today, ctx.language), ctx.language);
  const undoable = flow.reported && family.today?.sick.route === "aula";
  const writes = may(family, "messages");
  const { sentIn, failed } = flow;
  return html`${head(sickToday ? t("sickDoneTitle", { name }) : t("writeTitle", { name }), [day], [], ctx, close, faceImage(state.face(family.child), "window-face"))}
    ${
      sickToday
        ? html`<p class="done-line">
            ${icon("mdi:check-circle-outline")}<span>${t("sickDone", { name })}</span>
          </p>`
        : nothing
    }
    ${
      sentIn
        ? html`<p class="done-line">
            ${icon("mdi:send-check-outline")}<span>${t("sentIn", { thread: sentIn.subject })}</span>
          </p>`
        : nothing
    }
    ${failed ? alert("error", `${t("messageFailed")} ${actionErrorText(failed.error, t)}`) : nothing}
    ${writes ? nothing : turnedOff("messages", t)}
    <div class="window-actions">
      ${
        undoable
          ? html`<button
              class="text-button"
              type="button"
              ?disabled=${flow.busy}
              @click=${actions.undo}
            >
              ${t("undoReport")}
            </button>`
          : nothing
      }
      ${
        writes && !sentIn && !failed
          ? html`<button class="text-button" type="button" @click=${actions.write}>
              ${t("writeMessage")}
            </button>`
          : nothing
      }
      ${
        failed
          ? html`<button
              class="filled-button"
              type="button"
              ?disabled=${flow.busy}
              @click=${() => {
                actions.resend(failed.thread);
              }}
            >
              ${flow.busy ? t("sending") : t("sendAgain")}
            </button>`
          : html`<button class="filled-button" type="button" @click=${close}>
              ${t("close2")}
            </button>`
      }
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
  if (flow.step === "done") return doneWindow(flow, target, ctx, close, state, actions, sickToday);
  const day = capitalize(formatDay(ctx.today, ctx.language), ctx.language);
  const reports = may(family, "sick_reports");
  const writes = may(family, "messages");
  const faceMark = faceImage(face, "window-face");
  if (!reports && !writes)
    return html`${head(t("reportSick", { name }), [day], [], ctx, close, faceMark)}
    ${sickToday ? html`<p class="done-line">${icon("mdi:check-circle-outline")}<span>${t("sickDone", { name })}</span></p>` : nothing}
    ${turnedOff("sick_reports", t)}${turnedOff("messages", t)}`;
  const reporting = flow.mode === "report" && reports;
  // The check speaks for this moment: a route it finds none on, or a child it cannot find, is no report.
  const cannot =
    route === "none" || (found !== undefined && (found.route === "none" || !found.child_found));
  const report = reporting && !sickToday && !cannot;
  // Until the check answers, and where it fails, the report waits: it may not reach the child.
  let summary: unknown = nothing;
  let ready = !report;
  if (sickToday)
    summary = html`<p class="done-line">
      ${icon("mdi:check-circle-outline")}<span>${t("sickDone", { name })}</span>
      ${
        route === "aula" && reports
          ? html`<button
              class="text-button"
              type="button"
              ?disabled=${flow.busy}
              @click=${actions.undo}
            >
              ${t("undoReport")}
            </button>`
          : nothing
      }
    </p>`;
  else if (reporting && !cannot) {
    if (check === undefined) summary = loading(t);
    else if ("error" in check) summary = alert("error", actionErrorText(check.error, t));
    else {
      ready = true;
      summary = html`<div class="sick-summary">
        ${icon("mdi:thermometer")}
        <span class="sick-summary-text"
          ><strong>${t("sickSummary", { name })}</strong
          ><span
            >${[day, t(route === "tabulex" ? "sickFinal" : "sickUndoable")].join(" · ")}</span
          ></span
        >
      </div>`;
    }
  }
  // The institution is said only where it tells the children shown apart.
  let routeLine: unknown = nothing;
  if (reporting && !sickToday && cannot)
    routeLine = html`<p class="route none">
      ${icon("mdi:information-outline")}<span>${t("sickRouteNone", { name })}</span>
    </p>`;
  else if (report && family.showsInstitution)
    routeLine = html`<p class="route ${route}">
      ${icon("mdi:check-circle-outline")}<span
        >${t("sickRoute", { institution: child.institution_name })}</span
      >
    </p>`;
  const earlier = since(today, ctx);
  const notes = html`${
    !report && earlier
      ? html`<p class="info-line">
          ${icon("mdi:thermometer")}<span
            >${t("sickSinceDay", { name, day: formatDay(earlier, ctx.language) })}</span
          >
        </p>`
      : nothing
  }${
    !report && today?.sick.wrote_yesterday
      ? html`<p class="info-line">
          ${icon("mdi:message-check-outline")}<span>${t("wroteYesterday")}</span>
        </p>`
      : nothing
  }`;
  // Where nothing is to be reported, the window is for the message alone.
  if (!report && writes) actions.need();
  const chosen = flow.threads?.threads.find((item) => item.thread_id === flow.thread);
  // A message with no thread to go in is no message: the report goes alone.
  const message =
    flow.withMessage &&
    writes &&
    flow.threadsError === undefined &&
    (flow.threads === undefined || flow.threads.threads.length > 0);
  const canWrite = chosen !== undefined && flow.text.trim() !== "";
  const enabled = !flow.busy && (report ? ready : true) && (message ? canWrite : report);
  const label = report
    ? message
      ? t("reportAndSend", { name })
      : t("reportSick", { name })
    : t("sendMessage");
  const title =
    report || (reporting && !sickToday) ? t("reportSick", { name }) : t("writeTitle", { name });
  const showButton = report || writes;
  return html`${head(title, [day], [], ctx, close, faceMark)}
    ${flow.undone ? alert("info", t("undone")) : nothing}
    ${reports ? nothing : turnedOff("sick_reports", t)} ${routeLine}
    ${senders(flow, allowing(family, reporting ? "sick_reports" : "messages"), ctx, actions)}
    ${summary} ${notes}
    ${writes ? messagePart(flow, name, ctx, state, actions, report) : turnedOff("messages", t)}
    ${flow.error === undefined ? nothing : alert("error", actionErrorText(flow.error, t))}
    <div class="window-actions">
      <button class="text-button" type="button" @click=${close}>${t("cancel")}</button>
      ${
        showButton
          ? html`<button
              class="filled-button"
              type="button"
              ?disabled=${!enabled}
              @click=${() => {
                actions.submit(report, message ? chosen : undefined);
              }}
            >
              ${flow.busy ? t("sending") : label}
            </button>`
          : nothing
      }
    </div>`;
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

/** A child of the window that reports several sick: whether it can be, and how it went. */
interface SeveralChild {
  readonly family: FamilyChild;
  readonly entry: Child;
  /** What the check answered, or its error; undefined while it runs. */
  check: SickCheck | { readonly error: unknown } | undefined;
  /** Why its report failed; undefined while it did not. */
  error: unknown;
  /** Whether it was reported sick in this window. */
  reported: boolean;
}

/** Tells whether a child can be reported sick now, by its route and its check. */
function reportable(item: SeveralChild): boolean {
  const check = item.check;
  return (
    check !== undefined &&
    !("error" in check) &&
    check.route !== "none" &&
    check.child_found &&
    check.sick_today !== true
  );
}

/**
 * Opens the window that reports several children sick today at once, each checked first and each
 * reported once; then each can be written about on its own. `key` is the opening button's
 * `data-detail`.
 */
export function openSickSeveral(
  state: CardState,
  families: readonly FamilyChild[],
  options: SickOptions,
  key: string,
): void {
  const items: SeveralChild[] = families.map((family) => ({
    family,
    entry: senderOf(family, options.sender, "sick_reports"),
    check: undefined,
    error: undefined,
    reported: false,
  }));
  const chosen = new Set(items.map((item) => item.family.child.child_id));
  const step = { busy: false, done: false };
  for (const item of items) {
    const settle = (answer: SickCheck | { readonly error: unknown }): void => {
      item.check = answer;
      state.requestUpdate();
    };
    checkSick(state.callWS, item.entry).then(settle, (error: unknown) => {
      settle({ error });
    });
  }
  const report = (): void => {
    step.busy = true;
    state.requestUpdate();
    void (async () => {
      // Each child is reported once, in turn; one that fails is not tried again.
      for (const item of items.filter(
        (found) => chosen.has(found.family.child.child_id) && reportable(found),
      )) {
        try {
          await reportSick(state.callWS, item.entry);
          item.reported = true;
          rememberSender(item.family.child.child_id, item.entry.entry_id);
        } catch (error: unknown) {
          item.error = error;
        }
      }
      step.busy = false;
      step.done = true;
      state.requestUpdate();
    })();
  };
  state.openModal(key, (ctx, close) => {
    const { t } = ctx;
    const faces = items.map((item) => state.face(item.family.child));
    const day = capitalize(formatDay(ctx.today, ctx.language), ctx.language);
    const top = head(
      t("reportSeveralSick"),
      [day],
      [],
      ctx,
      close,
      minis(faces, ctx, "window-faces"),
    );
    const nameOf = (item: SeveralChild): string => state.face(item.family.child).name;
    if (step.done) {
      return modal(
        html`${top}
          ${items
            .filter((item) => item.reported || item.error !== undefined)
            .map((item) =>
              item.reported
                ? html`<p class="done-line">
                    ${icon("mdi:check-circle-outline")}<span
                      >${t("sickDone", { name: nameOf(item) })}</span
                    >
                    ${
                      may(item.family, "messages")
                        ? html`<button
                            class="text-button"
                            type="button"
                            @click=${() => {
                              openSick(
                                state,
                                { family: item.family, ...options },
                                `sick|${String(item.family.child.child_id)}`,
                                true,
                              );
                            }}
                          >
                            ${t("writeMessage")}
                          </button>`
                        : nothing
                    }
                  </p>`
                : alert("error", `${nameOf(item)}: ${actionErrorText(item.error, t)}`),
            )}
          <div class="window-actions">
            <button class="filled-button" type="button" @click=${close}>${t("close2")}</button>
          </div>`,
        close,
      );
    }
    const waiting = items.some((item) => item.check === undefined);
    const ready = items.filter(
      (item) => chosen.has(item.family.child.child_id) && reportable(item),
    );
    return modal(
      html`${top}
        <div class="field">
          <span class="field-label" id="sick-several">${t("vacationFor")}</span>
          <div class="choices" role="group" aria-labelledby="sick-several">
            ${items.map((item) => {
              const id = item.family.child.child_id;
              const face = state.face(item.family.child);
              const can = reportable(item);
              return html`<button
                class="choice face-choice"
                type="button"
                aria-pressed=${chosen.has(id) && can ? "true" : "false"}
                ?disabled=${!can || step.busy}
                @click=${() => {
                  if (!chosen.delete(id)) chosen.add(id);
                  state.requestUpdate();
                }}
              >
                ${faceImage(face, "mini")}<span>${face.name}</span>
              </button>`;
            })}
          </div>
        </div>
        ${items.map((item) => {
          const check = item.check;
          if (check === undefined || reportable(item)) return nothing;
          if ("error" in check)
            return alert("error", `${nameOf(item)}: ${actionErrorText(check.error, t)}`);
          return html`<p class="window-note">
            ${icon("mdi:information-outline")}<span
              >${
                check.sick_today === true
                  ? t("sickDone", { name: nameOf(item) })
                  : t("sickRouteNone", { name: nameOf(item) })
              }</span
            >
          </p>`;
        })}
        ${waiting ? loading(t) : nothing}
        ${
          ready.some(
            (item) =>
              item.check !== undefined &&
              !("error" in item.check) &&
              item.check.route === "tabulex",
          )
            ? html`<p class="window-note">
                ${icon("mdi:alert-outline")}<span>${t("sickFinal")}</span>
              </p>`
            : nothing
        }
        ${
          ready.length > 0
            ? html`<p class="info-line">
                ${icon("mdi:thermometer")}<span
                  >${t("sickSeveralSummary", { names: listOf(ready.map(nameOf), ctx) })}</span
                >
              </p>`
            : nothing
        }
        <div class="window-actions">
          <button class="text-button" type="button" @click=${close}>${t("cancel")}</button>
          <button
            class="filled-button"
            type="button"
            ?disabled=${waiting || ready.length === 0 || step.busy}
            @click=${report}
          >
            ${step.busy ? t("sending") : t("sickConfirm")}
          </button>
        </div>`,
      close,
    );
  });
}

/**
 * Renders the sick card: a row for each child, which opens the window that reports it sick, and
 * a button that reports several sick at once where more than one can be.
 */
export function renderSickCard(
  view: FamilyView,
  ctx: ViewContext,
  state: CardState,
  options: SickOptions,
): TemplateResult {
  const { t } = ctx;
  const several = view.children.filter(
    (family) =>
      family.today?.sick.today !== true &&
      family.today?.sick.route !== undefined &&
      family.today.sick.route !== "none" &&
      may(family, "sick_reports"),
  );
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
    ${
      several.length > 1
        ? html`<div class="window-actions">
            <button
              class="text-button"
              type="button"
              aria-haspopup="dialog"
              data-detail="sick-several"
              @click=${() => {
                openSickSeveral(state, several, options, "sick-several");
              }}
            >
              ${t("reportSeveralSick")}
            </button>
          </div>`
        : nothing
    }
  </section>`;
}
