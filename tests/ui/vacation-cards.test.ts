import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../../src/index.ts";
import { forget } from "../../src/core/memory.ts";
import { reloadSelection, rememberSender } from "../../src/core/selection.ts";
import type { Change, Child, VacationRequest } from "../../src/core/types.ts";
import { requestState } from "../../src/ui/vacation-requests.ts";
import { present, wsError } from "../fake-hass.ts";
import { REQUESTS, SECOND_ENTRY, todayOf, VACATIONS } from "../fixtures/family.ts";
import { all, mount, text, unmountAll, type Card } from "../fixtures/mount.ts";
import { scenarioNamed } from "../fixtures/scenarios.ts";
import { contextOf } from "../fixtures/snapshot.ts";
import { CHILDREN } from "../fixtures/week.ts";
import { find, settled, tap, texts, type, windowText } from "./family-helpers.ts";

const REQUESTS_CARD = "aula-connect-vacation-requests-card";
const VACATION = "aula-connect-vacation-card";
const [, OSKAR] = CHILDREN as [Child, Child];

type Commands = Record<string, (message: Record<string, unknown>) => unknown>;

/** The children, their entry allowing only the changes given. */
function allowing(allowed: readonly Change[]): Child[] {
  return CHILDREN.map((child) => ({ ...child, allowed }));
}

/** Oskar's requests and vacations; Ida has none. */
function commands(overrides: Commands = {}): Commands {
  return {
    "aula_connect/vacation_requests": (message) =>
      message.child_id === OSKAR.child_id ? REQUESTS : { requests: [] },
    "aula_connect/vacation_request/answer": () => null,
    "aula_connect/vacations": (message) =>
      message.child_id === OSKAR.child_id ? VACATIONS : { vacations: [] },
    "aula_connect/vacation/add": () => null,
    "aula_connect/vacation/delete": () => null,
    ...overrides,
  };
}

function sent(
  card: { calls: readonly (readonly unknown[])[] },
  kind: string,
): Record<string, unknown>[] {
  return card.calls
    .map(([message]) => message as Record<string, unknown>)
    .filter((message) => message.type === `aula_connect/${kind}`);
}

async function day(card: Card, index: number, choice: "Kommer" | "Kommer ikke"): Promise<void> {
  const buttons = all(card, `dialog .answer-day:nth-child(${String(index)}) .choice`);
  present(buttons[choice === "Kommer" ? 0 : 1] as HTMLButtonElement | undefined).click();
  await settled(card);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  window.localStorage.clear();
  reloadSelection();
});

afterEach(async () => {
  unmountAll();
  forget();
  window.localStorage.clear();
  reloadSelection();
  vi.useRealTimers();
  vi.restoreAllMocks();
  await new Promise((resolve) => setImmediate(resolve));
});

describe("the vacation requests card", () => {
  it("lists the requests to answer first, once the children's day has come", async () => {
    const { card } = await mount(REQUESTS_CARD, "thu-1000", { commands: commands() });
    expect(text(card)).toContain("Henter");
    unmountAll();
    const { card: shown } = await mount(REQUESTS_CARD, "thu-1000", {
      today: todayOf,
      commands: commands(),
    });
    expect(texts(shown, ".family-title")).toEqual(["Juleferie", "Ferien: 15.–16. feb."]);
    expect(texts(shown, ".family-sub")).toEqual([
      "Oskar · 21.–23. dec.",
      "Svar senest 20. nov.",
      "Oskar · 15.–16. feb.",
    ]);
    expect(texts(shown, ".family-row .label.warning")).toEqual(["Mangler svar"]);
    const ends = all(shown, ".family-row > ha-icon").map((mark) => [
      mark.getAttribute("icon"),
      mark.getAttribute("aria-label"),
    ]);
    expect(ends).toEqual([
      ["mdi:chevron-right", null],
      ["mdi:check-circle", "Besvaret"],
    ]);
  });

  it("says when there is no request, or why the requests cannot be had", async () => {
    const { card } = await mount(REQUESTS_CARD, "thu-1000", {
      today: todayOf,
      commands: commands({ "aula_connect/vacation_requests": () => ({ requests: [] }) }),
    });
    expect(texts(card, ".empty-line")).toEqual(["Ingen ferieanmodninger"]);
    unmountAll();
    const { card: failing } = await mount(REQUESTS_CARD, "thu-1000", {
      today: todayOf,
      commands: commands({
        "aula_connect/vacation_requests": () => {
          throw wsError("home_assistant_error", "Aula is down");
        },
      }),
    });
    expect(text(failing)).toContain("Aula");
    expect(all(failing, ".empty-line")).toEqual([]);
  });

  it("answers a request day by day, with times on the days the child comes", async () => {
    const { card, hass } = await mount(REQUESTS_CARD, "thu-1000", {
      today: todayOf,
      commands: commands(),
    });
    await tap(card, ".family-row", "Juleferie");
    expect(windowText(card)).toContain("Giv besked om, hvilke dage jeres barn kommer i SFO.");
    expect(windowText(card)).toContain("Svar senest 20. nov.");
    const send = (): HTMLButtonElement => find(card, "dialog .filled-button", "Send svar");
    expect(send().disabled).toBe(true);
    await day(card, 1, "Kommer");
    await day(card, 2, "Kommer ikke");
    await day(card, 3, "Kommer ikke");
    expect(all(card, "dialog .answer-day:nth-child(1) input")).toHaveLength(2);
    expect(send().disabled).toBe(true);
    await type(card, "dialog .answer-day:nth-child(1) .answer-time:nth-child(1) input", "08:00");
    await type(card, "dialog .answer-day:nth-child(1) .answer-time:nth-child(2) input", "15:00");
    await type(card, "dialog textarea", "Tak");
    expect(send().disabled).toBe(false);
    await type(card, "dialog .answer-day:nth-child(1) .answer-time:nth-child(2) input", "");
    expect(send().disabled).toBe(true);
    await type(card, "dialog .answer-day:nth-child(1) .answer-time:nth-child(2) input", "15:00");
    const before = sent(hass.callWS.mock, "vacation_requests").length;
    send().click();
    await settled(card);
    expect(sent(hass.callWS.mock, "vacation_request/answer")).toEqual([
      {
        type: "aula_connect/vacation_request/answer",
        entry_id: "entry-a",
        child_id: 1002,
        request_id: 91,
        days: [
          { date: "2026-12-21", is_coming: true, entry_time: "08:00", exit_time: "15:00" },
          { date: "2026-12-22", is_coming: false },
          { date: "2026-12-23", is_coming: false },
        ],
        comment: "Tak",
      },
    ]);
    expect(windowText(card)).toContain("Svaret er sendt");
    expect(sent(hass.callWS.mock, "vacation_requests").length).toBeGreaterThan(before);
    await tap(card, "dialog .filled-button", "Færdig");
    expect(windowText(card)).toBe("");
  });

  it("answers no day gone by, and nothing once the deadline has passed", async () => {
    const started = {
      ...present(REQUESTS.requests[1]),
      id: 93,
      missing_answer: true,
      start: "2026-10-28",
      end: "2026-10-30",
      days: ["2026-10-28", "2026-10-29", "2026-10-30"].map((date) => ({
        date,
        is_coming: null,
        entry_time: null,
        exit_time: null,
      })),
    };
    const late = { ...present(REQUESTS.requests[0]), deadline: "2026-10-28" };
    const { card, hass } = await mount(REQUESTS_CARD, "thu-1000", {
      today: todayOf,
      commands: commands({
        "aula_connect/vacation_requests": (message) =>
          message.child_id === OSKAR.child_id ? { requests: [late, started] } : { requests: [] },
      }),
    });
    await tap(card, ".family-row", "Juleferie");
    expect(windowText(card)).toContain("Fristen er overskredet");
    expect(all(card, "dialog .choice:not(:disabled)")).toEqual([]);
    await tap(card, ".detail-close");
    await tap(card, ".family-row", "Ferien");
    const disabled = all(card, "dialog .answer-day").map(
      (row) => present(row.querySelector("button")).disabled,
    );
    expect(disabled).toEqual([true, false, false]);
    expect(all(card, "dialog .answer-time")).toEqual([]);
    await day(card, 2, "Kommer");
    await day(card, 3, "Kommer");
    await tap(card, "dialog .filled-button", "Send svar");
    expect(sent(hass.callWS.mock, "vacation_request/answer")[0]?.days).toEqual([
      { date: "2026-10-29", is_coming: true },
      { date: "2026-10-30", is_coming: true },
    ]);
  });

  it("says why an answer was not sent", async () => {
    const { card } = await mount(REQUESTS_CARD, "thu-1000", {
      today: todayOf,
      commands: commands({
        "aula_connect/vacation_request/answer": () => {
          throw wsError("not_found", "Gone");
        },
      }),
    });
    await tap(card, ".family-row", "Ferien");
    await tap(card, "dialog .filled-button", "Send svar");
    expect(windowText(card)).toContain("Aula kender det ikke længere.");
  });

  it("asks again when the number awaiting an answer changes", async () => {
    const { card, hass } = await mount(REQUESTS_CARD, "thu-1000", {
      today: todayOf,
      commands: commands(),
    });
    const before = sent(hass.callWS.mock, "vacation_requests").length;
    const subscription = hass.connection.active.find(
      (item) =>
        item.message.type === "aula_connect/today/subscribe" && item.message.child_id === 1002,
    );
    subscription?.callback({ ...todayOf(OSKAR), vacation_requests_pending: 0 });
    await settled(card);
    expect(sent(hass.callWS.mock, "vacation_requests")).toHaveLength(before + 1);
  });
});

describe("a request's state", () => {
  it("offers no answer where answering is turned off, and sends none", async () => {
    const { card, hass } = await mount(REQUESTS_CARD, "thu-1000", {
      children: allowing(["vacations"]),
      today: todayOf,
      commands: commands(),
    });
    await tap(card, ".family-row", "Juleferie");
    expect(windowText(card)).toContain(
      "Svar på ferieanmodninger er slået fra i Aula Connects indstillinger.",
    );
    expect(all(card, "dialog .answer-day")).toEqual([]);
    expect(all(card, "dialog .window-actions")).toEqual([]);
    expect(sent(hass.callWS.mock, "vacation_request/answer")).toEqual([]);
  });

  it("answers from a guardian whose entry allows it", async () => {
    const { card, hass } = await mount(REQUESTS_CARD, "thu-1000", {
      children: [...allowing([]), ...SECOND_ENTRY],
      today: todayOf,
      commands: commands(),
      config: { children: [1002] },
    });
    await tap(card, ".family-row", "Ferien");
    await day(card, 1, "Kommer ikke");
    await day(card, 2, "Kommer ikke");
    await tap(card, "dialog .filled-button", "Send svar");
    expect(sent(hass.callWS.mock, "vacation_request/answer")).toMatchObject([
      { entry_id: "entry-b", child_id: 1002 },
    ]);
  });

  it("says by when to answer, where it has a deadline and no answer yet", () => {
    const ctx = contextOf(scenarioNamed("thu-1000"));
    const request = present(REQUESTS.requests[0]) as VacationRequest;
    expect(requestState({ ...request, deadline: null }, ctx)).toBeUndefined();
    expect(requestState(request, ctx)).toBe("Svar senest 20. nov.");
    expect(requestState({ ...request, missing_answer: false }, ctx)).toBeUndefined();
  });
});

describe("the vacation card", () => {
  it("lists the vacations not over yet, each deletable where Aula lets it", async () => {
    const { card } = await mount(VACATION, "thu-1000", { commands: commands() });
    expect(texts(card, ".family-title")).toEqual(["29.–30. oktober", "21.–23. december"]);
    expect(texts(card, ".family-sub")).toEqual(["Oskar", "Oskar · Til bedsteforældre"]);
    expect(texts(card, ".family-row .label")).toEqual(["I dag"]);
    expect(all(card, ".family-row .icon-button")).toHaveLength(1);
  });

  it("says when there is no vacation, or why the vacations cannot be had", async () => {
    const { card } = await mount(VACATION, "thu-1000", {
      commands: commands({ "aula_connect/vacations": () => ({ vacations: [] }) }),
    });
    expect(texts(card, ".empty-line")).toEqual(["Ingen ferie meldt"]);
    unmountAll();
    const { card: failing } = await mount(VACATION, "thu-1000", {
      commands: commands({
        "aula_connect/vacations": () => {
          throw wsError("unknown_command", "Unknown command.");
        },
      }),
    });
    expect(text(failing)).toContain("opdatér integrationen");
  });

  it("deletes a vacation once confirmed", async () => {
    const { card, hass } = await mount(VACATION, "thu-1000", { commands: commands() });
    await tap(card, ".family-row .icon-button");
    expect(windowText(card)).toContain("Slet Oskars ferie?");
    expect(windowText(card)).toContain("Til bedsteforældre");
    await tap(card, "dialog .filled-button", "Slet");
    expect(sent(hass.callWS.mock, "vacation/delete")).toEqual([
      { type: "aula_connect/vacation/delete", entry_id: "entry-a", vacation_id: 71 },
    ]);
    expect(windowText(card)).toContain("Ferien er slettet");
  });

  it("says why a vacation was not deleted", async () => {
    const { card } = await mount(VACATION, "thu-1000", {
      commands: commands({
        "aula_connect/vacations": () => ({
          vacations: [{ ...present(VACATIONS.vacations[0]), comment: "" }],
        }),
        "aula_connect/vacation/delete": () => {
          throw wsError("home_assistant_error", "Aula is down");
        },
      }),
    });
    await tap(card, ".family-row .icon-button");
    await tap(card, "dialog .filled-button", "Slet");
    expect(windowText(card)).toContain("Det kunne ikke gøres i Aula lige nu.");
  });

  it("registers a vacation for the children chosen, from each guardian's entry", async () => {
    rememberSender(1002, "entry-b");
    const { card, hass } = await mount(VACATION, "thu-1000", {
      children: [...CHILDREN, ...SECOND_ENTRY],
      commands: commands(),
    });
    await tap(card, ".window-actions .filled-button", "Meld ferie");
    expect(texts(card, "dialog .face-choice span:not(.face)")).toEqual(["Ida", "Oskar"]);
    const add = (): HTMLButtonElement => find(card, "dialog .filled-button", "Meld ferie");
    expect(add().disabled).toBe(true);
    await type(card, 'dialog input[type="date"]', "2026-11-02");
    expect(
      find(card, "dialog .date-field:nth-child(2) input", undefined, HTMLInputElement).value,
    ).toBe("2026-11-02");
    await type(card, "dialog .date-field:nth-child(2) input", "2026-11-04");
    await type(card, "dialog textarea", "Besøg ");
    expect(texts(card, "dialog .field-count")).toEqual(["6 af 250 tegn"]);
    expect(windowText(card)).toContain("Ferie for Ida og Oskar: 2.–4. november");
    await tap(card, "dialog .face-choice", "Ida");
    await tap(card, "dialog .face-choice", "Oskar");
    expect(add().disabled).toBe(true);
    await tap(card, "dialog .face-choice", "Ida");
    await tap(card, "dialog .face-choice", "Oskar");
    add().click();
    await settled(card);
    expect(sent(hass.callWS.mock, "vacation/add")).toEqual([
      {
        type: "aula_connect/vacation/add",
        entry_id: "entry-a",
        child_ids: [1001],
        start: "2026-11-02",
        end: "2026-11-04",
        comment: "Besøg",
      },
      {
        type: "aula_connect/vacation/add",
        entry_id: "entry-b",
        child_ids: [1002],
        start: "2026-11-02",
        end: "2026-11-04",
        comment: "Besøg",
      },
    ]);
    expect(windowText(card)).toContain("Ferien er meldt");
  });

  it("offers neither registering nor deleting where that is turned off", async () => {
    const { card } = await mount(VACATION, "thu-1000", {
      children: allowing(["vacation_requests"]),
      commands: commands(),
    });
    expect(texts(card, ".family-title")).toEqual(["29.–30. oktober", "21.–23. december"]);
    expect(all(card, ".family-row .icon-button")).toEqual([]);
    expect(all(card, ".window-actions")).toEqual([]);
    expect(texts(card, ".off")).toEqual([
      "Registrering og sletning af ferie er slået fra i Aula Connects indstillinger.",
    ]);
  });

  it("registers a vacation only for the children whose entry allows it", async () => {
    const { card, hass } = await mount(VACATION, "thu-1000", {
      children: CHILDREN.map((child) => ({
        ...child,
        allowed: child.child_id === 1001 ? ["vacations" as const] : [],
      })),
      commands: commands(),
    });
    expect(all(card, ".family-row .icon-button")).toEqual([]);
    await tap(card, ".window-actions .filled-button", "Meld ferie");
    expect(all(card, "dialog .face-choice")).toEqual([]);
    await type(card, 'dialog input[type="date"]', "2026-11-02");
    await tap(card, "dialog .filled-button", "Meld ferie");
    expect(sent(hass.callWS.mock, "vacation/add")).toMatchObject([{ child_ids: [1001] }]);
  });

  it("registers for one child without asking whom, and says why it was not registered", async () => {
    const { card } = await mount(VACATION, "thu-1000", {
      config: { children: [1002] },
      commands: commands({
        "aula_connect/vacation/add": () => {
          throw wsError("invalid_format", "The comment is too long");
        },
      }),
    });
    await tap(card, ".window-actions .filled-button", "Meld ferie");
    expect(all(card, "dialog .face-choice")).toEqual([]);
    await type(card, "dialog .date-field:nth-child(2) input", "2026-11-04");
    await type(card, 'dialog input[type="date"]', "2026-11-02");
    await type(card, 'dialog input[type="date"]', "2026-11-05");
    expect(
      find(card, "dialog .date-field:nth-child(2) input", undefined, HTMLInputElement).value,
    ).toBe("2026-11-05");
    await tap(card, "dialog .filled-button", "Meld ferie");
    expect(windowText(card)).toContain("Aula Connect kunne ikke læse det: The comment is too long");
  });
});
