import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../../src/index.ts";
import { forget } from "../../src/core/memory.ts";
import { reloadSelection, rememberSender } from "../../src/core/selection.ts";
import type { Change, Child } from "../../src/core/types.ts";
import { requestGroups } from "../../src/model/absence.ts";
import { requestLine } from "../../src/ui/vacation-requests.ts";
import { present, wsError } from "../fake-hass.ts";
import { REQUESTS, SECOND_ENTRY, todayOf, VACATIONS } from "../fixtures/family.ts";
import { all, mount, text, unmountAll, type Card } from "../fixtures/mount.ts";
import { scenarioNamed } from "../fixtures/scenarios.ts";
import { contextOf } from "../fixtures/snapshot.ts";
import { CHILDREN } from "../fixtures/week.ts";
import { find, settled, tap, texts, type, windowText } from "./family-helpers.ts";

const VACATION = "aula-connect-vacation-card";
const [IDA, OSKAR] = CHILDREN as [Child, Child];

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

describe("the vacation requests in the Ferie/fri card", () => {
  it("lists the requests awaiting an answer first, the vacations, and those answered folded", async () => {
    const { card } = await mount(VACATION, "thu-1000", { today: todayOf, commands: commands() });
    expect(texts(card, ".family-head")).toEqual(["Mangler svar", "Meldt"]);
    expect(texts(card, ".block-head .label.count")).toEqual(["2 meldt"]);
    expect(texts(card, ".family-title")).toEqual([
      "Juleferie",
      "29.–30. oktober",
      "21.–23. december",
      "Ferien: 15.–16. feb.",
    ]);
    expect(texts(card, ".family-sub")).toEqual([
      "21.–23. dec. · Svar senest 20. nov.",
      "Oskar",
      "Oskar · Til bedsteforældre",
      "15.–16. feb.",
    ]);
    expect(texts(card, ".family-fold summary")).toEqual(["Besvarede (1)"]);
    const ends = all(card, ".family-row > ha-icon").map((mark) => [
      mark.getAttribute("icon"),
      mark.getAttribute("aria-label"),
    ]);
    expect(ends).toEqual([
      ["mdi:chevron-right", null],
      ["mdi:check-circle", "Besvaret"],
    ]);
  });

  it("says why the requests cannot be had, and still shows the vacations", async () => {
    const { card } = await mount(VACATION, "thu-1000", {
      today: todayOf,
      commands: commands({
        "aula_connect/vacation_requests": () => {
          throw wsError("home_assistant_error", "Aula is down");
        },
      }),
    });
    expect(texts(card, ".alert")).toEqual(["Kunne ikke hente fra Aula: Aula is down"]);
    expect(texts(card, ".family-head")).toEqual(["Meldt"]);
  });

  it("says an error the requests and the vacations both meet once", async () => {
    const old = (): never => {
      throw wsError("unknown_command", "Unknown command.");
    };
    const { card } = await mount(VACATION, "thu-1000", {
      today: todayOf,
      commands: commands({
        "aula_connect/vacation_requests": old,
        "aula_connect/vacations": old,
      }),
    });
    expect(all(card, ".alert")).toHaveLength(1);
  });

  it("answers a request day by day, with times on the days the child comes", async () => {
    const { card, hass } = await mount(VACATION, "thu-1000", {
      today: todayOf,
      commands: commands(),
    });
    await tap(card, ".family-row", "Juleferie");
    expect(windowText(card)).toContain("Giv besked om, hvilke dage jeres barn kommer i SFO.");
    expect(windowText(card)).toContain("Svar senest 20. nov.");
    expect(all(card, "dialog .answer-split-toggle")).toEqual([]);
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
    expect(windowText(card)).toContain("Svaret sendes for Oskar");
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
    expect(windowText(card)).toContain("Svaret er sendt for Oskar");
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
    const { card, hass } = await mount(VACATION, "thu-1000", {
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

  it("says why an answer was not sent, naming the child", async () => {
    const { card } = await mount(VACATION, "thu-1000", {
      today: todayOf,
      commands: commands({
        "aula_connect/vacation_request/answer": () => {
          throw wsError("not_found", "Gone");
        },
      }),
    });
    await tap(card, ".family-fold summary");
    await tap(card, ".family-row", "Ferien");
    await tap(card, "dialog .filled-button", "Send svar");
    expect(windowText(card)).toContain("Oskar: Aula kender det ikke længere.");
  });

  it("asks again when the number awaiting an answer changes", async () => {
    const { card, hass } = await mount(VACATION, "thu-1000", {
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

describe("a request asked of two children", () => {
  const both = (): Commands => commands({ "aula_connect/vacation_requests": () => REQUESTS });

  it("is one row, and one answer sent for each child", async () => {
    const { card, hass } = await mount(VACATION, "thu-1000", { today: todayOf, commands: both() });
    expect(texts(card, ".family-title")[0]).toBe("Juleferie");
    expect(all(card, ".family-row .face")).toHaveLength(2 + 2 + 2);
    await tap(card, ".family-row", "Juleferie");
    expect(windowText(card)).toContain("Ida og Oskar");
    for (const index of [1, 2, 3]) await day(card, index, "Kommer ikke");
    expect(windowText(card)).toContain("Svaret sendes for Ida og Oskar");
    await tap(card, "dialog .filled-button", "Send svar");
    expect(
      sent(hass.callWS.mock, "vacation_request/answer").map((message) => [
        message.child_id,
        message.days,
      ]),
    ).toEqual(
      [IDA, OSKAR].map((child) => [
        child.child_id,
        ["2026-12-21", "2026-12-22", "2026-12-23"].map((date) => ({ date, is_coming: false })),
      ]),
    );
    expect(windowText(card)).toContain("Svaret er sendt for Ida og Oskar");
  });

  it("splits a day where the children differ, and joins it again", async () => {
    const { card, hass } = await mount(VACATION, "thu-1000", { today: todayOf, commands: both() });
    await tap(card, ".family-row", "Juleferie");
    await tap(
      card,
      "dialog .answer-day:nth-child(1) .answer-split-toggle",
      "Forskellig for børnene",
    );
    expect(texts(card, "dialog .answer-who span:not(.face)")).toEqual(["Ida", "Oskar"]);
    await tap(card, "dialog .answer-day:nth-child(1) .answer-split-toggle", "Ens for børnene");
    expect(all(card, "dialog .answer-child")).toEqual([]);
    await tap(card, "dialog .answer-day:nth-child(1) .answer-split-toggle");
    const [idaComes, , , oskarStays] = all(card, "dialog .answer-day:nth-child(1) .choice");
    present(idaComes as HTMLButtonElement | undefined).click();
    present(oskarStays as HTMLButtonElement | undefined).click();
    await settled(card);
    await type(card, "dialog .answer-child:nth-child(1) .answer-time:nth-child(1) input", "08:00");
    await type(card, "dialog .answer-child:nth-child(1) .answer-time:nth-child(2) input", "12:00");
    await day(card, 2, "Kommer ikke");
    await day(card, 3, "Kommer ikke");
    await tap(card, "dialog .filled-button", "Send svar");
    expect(
      sent(hass.callWS.mock, "vacation_request/answer").map((message) => [
        message.child_id,
        (message.days as unknown[])[0],
      ]),
    ).toEqual([
      [1001, { date: "2026-12-21", is_coming: true, entry_time: "08:00", exit_time: "12:00" }],
      [1002, { date: "2026-12-21", is_coming: false }],
    ]);
  });

  it("starts split on a day the children were answered differently", async () => {
    const answered = (coming: boolean) => ({
      requests: [
        {
          ...present(REQUESTS.requests[1]),
          days: [
            { date: "2027-02-15", is_coming: coming, entry_time: null, exit_time: null },
            { date: "2027-02-16", is_coming: false, entry_time: null, exit_time: null },
          ],
        },
      ],
    });
    const { card } = await mount(VACATION, "thu-1000", {
      today: todayOf,
      commands: commands({
        "aula_connect/vacation_requests": (message) =>
          answered(message.child_id === OSKAR.child_id),
      }),
    });
    expect(texts(card, ".family-fold summary")).toEqual(["Besvarede (1)"]);
    await tap(card, ".family-fold summary");
    await tap(card, ".family-row", "Ferien");
    expect(all(card, "dialog .answer-day:nth-child(1) .answer-child")).toHaveLength(2);
    expect(all(card, "dialog .answer-day:nth-child(2) .answer-child")).toEqual([]);
  });

  it("starts a day a child's request lacks unanswered for that child", async () => {
    const staying = present(REQUESTS.requests[0]).days.map((date) => ({
      ...date,
      is_coming: false,
    }));
    const full = { requests: [{ ...present(REQUESTS.requests[0]), days: staying }] };
    const short = { requests: [{ ...present(REQUESTS.requests[0]), days: staying.slice(0, 2) }] };
    const { card } = await mount(VACATION, "thu-1000", {
      today: todayOf,
      commands: commands({
        "aula_connect/vacation_requests": (message) =>
          message.child_id === OSKAR.child_id ? short : full,
      }),
    });
    await tap(card, ".family-row", "Juleferie");
    expect(all(card, "dialog .answer-day:nth-child(3) .answer-child")).toHaveLength(2);
    expect(all(card, "dialog .answer-day:nth-child(1) .answer-child")).toEqual([]);
  });

  it("sends again only for the child whose answer failed", async () => {
    let failing = true;
    const { card, hass } = await mount(VACATION, "thu-1000", {
      today: todayOf,
      commands: commands({
        "aula_connect/vacation_requests": () => REQUESTS,
        "aula_connect/vacation_request/answer": (message) => {
          if (failing && message.child_id === IDA.child_id)
            throw wsError("home_assistant_error", "Aula is down");
          return null;
        },
      }),
    });
    await tap(card, ".family-row", "Juleferie");
    for (const index of [1, 2, 3]) await day(card, index, "Kommer ikke");
    await tap(card, "dialog .filled-button", "Send svar");
    expect(windowText(card)).toContain("Svaret er sendt for Oskar");
    expect(windowText(card)).toContain("Ida: ");
    expect(windowText(card)).toContain("Svaret sendes for Ida");
    failing = false;
    await tap(card, "dialog .filled-button", "Send svar");
    expect(
      sent(hass.callWS.mock, "vacation_request/answer").map((message) => message.child_id),
    ).toEqual([1001, 1002, 1001]);
    expect(windowText(card)).toContain("Svaret er sendt for Ida og Oskar");
  });
});

describe("a request's state", () => {
  it("offers no answer where answering is turned off, and sends none", async () => {
    const { card, hass } = await mount(VACATION, "thu-1000", {
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
    const { card, hass } = await mount(VACATION, "thu-1000", {
      children: [...allowing([]), ...SECOND_ENTRY],
      today: todayOf,
      commands: commands(),
      config: { children: [1002] },
    });
    await tap(card, ".family-fold summary");
    await tap(card, ".family-row", "Ferien");
    await day(card, 1, "Kommer ikke");
    await day(card, 2, "Kommer ikke");
    await tap(card, "dialog .filled-button", "Send svar");
    expect(sent(hass.callWS.mock, "vacation_request/answer")).toMatchObject([
      { entry_id: "entry-b", child_id: 1002 },
    ]);
  });

  it("says its days, and by when to answer it where it has a deadline and no answer yet", () => {
    const ctx = contextOf(scenarioNamed("thu-1000"));
    const request = present(REQUESTS.requests[0]);
    const line = (changes: Record<string, unknown>): string =>
      requestLine(
        present(
          requestGroups(
            [{ child: OSKAR, entry: OSKAR, data: [{ ...request, ...changes }] }],
            ctx.today,
          )[0],
        ),
        ctx,
      ).replace(/\u2060/g, "");
    expect(line({})).toBe("21.–23. dec. · Svar senest 20. nov.");
    expect(line({ deadline: null })).toBe("21.–23. dec.");
    expect(line({ missing_answer: false })).toBe("21.–23. dec.");
  });
});

describe("the vacation card", () => {
  it("lists the vacations not over yet, each deletable where Aula lets it", async () => {
    const { card } = await mount(VACATION, "thu-1000", { commands: commands() });
    expect(texts(card, "li.family-row .family-title")).toEqual([
      "29.–30. oktober",
      "21.–23. december",
    ]);
    expect(texts(card, "li.family-row .family-sub")).toEqual([
      "Oskar",
      "Oskar · Til bedsteforældre",
    ]);
    expect(texts(card, "li.family-row .label")).toEqual(["I gang"]);
    expect(all(card, ".family-row .icon-button")).toHaveLength(1);
  });

  it("says when there is no vacation, or why the vacations cannot be had", async () => {
    const { card } = await mount(VACATION, "thu-1000", {
      commands: commands({
        "aula_connect/vacations": () => ({ vacations: [] }),
        "aula_connect/vacation_requests": () => ({ requests: [] }),
      }),
    });
    expect(texts(card, ".empty-line")).toEqual(["Ingen ferie/fri meldt"]);
    expect(texts(card, ".block-head .label")).toEqual([]);
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
    expect(windowText(card)).toContain("Slet ferie/fri for Oskar?");
    expect(all(card, "dialog .face-choice")).toEqual([]);
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
    await tap(card, ".window-actions .filled-button", "Meld ferie/fri");
    expect(texts(card, "dialog .face-choice span:not(.face)")).toEqual(["Ida", "Oskar"]);
    const add = (): HTMLButtonElement => find(card, "dialog .filled-button", "Meld ferie/fri");
    expect(add().disabled).toBe(true);
    await type(card, 'dialog input[type="date"]', "2026-11-02");
    expect(
      find(card, "dialog .date-field:nth-child(2) input", undefined, HTMLInputElement).value,
    ).toBe("2026-11-02");
    await type(card, "dialog .date-field:nth-child(2) input", "2026-11-04");
    await type(card, "dialog textarea", "Besøg ");
    expect(texts(card, "dialog .field-count")).toEqual(["6 af 250 tegn"]);
    expect(windowText(card)).toContain("Ferie/fri for Ida og Oskar: 2.–4. november");
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
    expect(texts(card, "li.family-row .family-title")).toEqual([
      "29.–30. oktober",
      "21.–23. december",
    ]);
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
    await tap(card, ".window-actions .filled-button", "Meld ferie/fri");
    expect(all(card, "dialog .face-choice")).toEqual([]);
    await type(card, 'dialog input[type="date"]', "2026-11-02");
    await tap(card, "dialog .filled-button", "Meld ferie/fri");
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
    await tap(card, ".window-actions .filled-button", "Meld ferie/fri");
    expect(all(card, "dialog .face-choice")).toEqual([]);
    await type(card, "dialog .date-field:nth-child(2) input", "2026-11-04");
    await type(card, 'dialog input[type="date"]', "2026-11-02");
    await type(card, 'dialog input[type="date"]', "2026-11-05");
    expect(
      find(card, "dialog .date-field:nth-child(2) input", undefined, HTMLInputElement).value,
    ).toBe("2026-11-05");
    await tap(card, "dialog .filled-button", "Meld ferie/fri");
    expect(windowText(card)).toContain("Aula Connect kunne ikke læse det: The comment is too long");
  });

  it("registers a day off today in one window, the days set to today", async () => {
    const { card, hass } = await mount(VACATION, "thu-1000", { commands: commands() });
    await tap(card, ".window-actions .text-button", "Holder fri i dag");
    expect(windowText(card)).toContain("Ferie/fri for Ida og Oskar: 29. oktober");
    await tap(card, "dialog .filled-button", "Meld ferie/fri");
    expect(sent(hass.callWS.mock, "vacation/add")).toMatchObject([
      { child_ids: [1001, 1002], start: "2026-10-29", end: "2026-10-29" },
    ]);
  });

  it("deletes a vacation of two children once, or for the children chosen", async () => {
    const shared = { vacations: [present(VACATIONS.vacations[0])] };
    const { card, hass } = await mount(VACATION, "thu-1000", {
      commands: commands({ "aula_connect/vacations": () => shared }),
    });
    expect(texts(card, "li.family-row .family-sub")).toEqual(["Ida og Oskar · Til bedsteforældre"]);
    await tap(card, ".family-row .icon-button");
    expect(windowText(card)).toContain("Slet ferie/fri for Ida og Oskar?");
    await tap(card, "dialog .face-choice", "Ida");
    await tap(card, "dialog .face-choice", "Oskar");
    expect(find(card, "dialog .filled-button", "Slet").disabled).toBe(true);
    await tap(card, "dialog .face-choice", "Oskar");
    await tap(card, "dialog .filled-button", "Slet");
    expect(sent(hass.callWS.mock, "vacation/delete")).toEqual([
      { type: "aula_connect/vacation/delete", entry_id: "entry-a", vacation_id: 71 },
    ]);
  });
});
