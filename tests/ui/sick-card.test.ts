import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../../src/index.ts";
import { forget } from "../../src/core/memory.ts";
import { reloadSelection, selection } from "../../src/core/selection.ts";
import type { Change, Child } from "../../src/core/types.ts";
import { fillMessage } from "../../src/ui/sick.ts";
import { wsError } from "../fake-hass.ts";
import { SECOND_ENTRY, THREADS, todayOf } from "../fixtures/family.ts";
import { all, mount, text, unmountAll } from "../fixtures/mount.ts";
import { OSKAR_ELSEWHERE } from "../fixtures/scenarios.ts";
import { CHILDREN, EVERY_CHANGE } from "../fixtures/week.ts";
import { find, root, settled, tap, texts, type, windowText } from "./family-helpers.ts";

const SICK = "aula-connect-sick-card";
const PRIMARY = "dialog .window-actions .filled-button";
const [IDA] = CHILDREN as [Child, Child];

function day(sick: Record<string, unknown>) {
  return (child: Child): Record<string, unknown> => ({
    ...todayOf(child),
    sick: { route: "aula", today: false, since: null, wrote_yesterday: false, ...sick },
  });
}

/** The children, their entry allowing only the changes given. */
function allowing(allowed: readonly Change[]): Child[] {
  return CHILDREN.map((child) => ({ ...child, allowed }));
}

function commands(overrides: Record<string, (message: Record<string, unknown>) => unknown> = {}) {
  return {
    "aula_connect/sick/report": () => ({ route: "aula" }),
    "aula_connect/sick/undo": () => ({ route: "aula" }),
    "aula_connect/threads": () => THREADS,
    "aula_connect/message/reply": () => null,
    ...overrides,
  };
}

function sent(calls: readonly (readonly unknown[])[], kind: string): unknown[] {
  return calls
    .map(([message]) => message as Record<string, unknown>)
    .filter((message) => message.type === `aula_connect/${kind}`);
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

describe("the sick card", () => {
  it("has a row for each child, saying whether it is reported sick today, whatever its route", async () => {
    const { card } = await mount(SICK, "thu-1000", {
      today: (child) =>
        child.child_id === 1001 ? day({ today: true })(child) : day({ route: "tabulex" })(child),
    });
    expect(texts(card, ".family-title")).toEqual(["Skriv en besked", "Meld Oskar syg"]);
    expect(texts(card, ".family-sub")).toEqual(["Meldt syg i dag", "Torsdag 29. oktober"]);
    expect(text(card)).not.toContain("Tabulex");
    expect(all(card, ".window-note")).toEqual([]);
    const { card: plain } = await mount(SICK, "thu-1000", { today: day({}) });
    expect(texts(plain, ".family-sub")).toEqual(["Torsdag 29. oktober", "Torsdag 29. oktober"]);
  });

  it("reports a child sick, saying first where it cannot be taken back", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      today: day({ route: "tabulex" }),
      commands: commands(),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(sent(hass.callWS.mock.calls, "sick/check")).toEqual([
      { type: "aula_connect/sick/check", entry_id: "entry-a", child_id: 1001 },
    ]);
    expect(windowText(card)).not.toContain("Bakkedal Skole");
    expect(texts(card, "dialog .sick-summary-text > *")).toEqual([
      "Ida meldes syg i dag",
      "Torsdag 29. oktober · Sygemeldingen kan ikke fortrydes herfra.",
    ]);
    expect(windowText(card)).not.toContain("Tabulex");
    expect(sent(hass.callWS.mock.calls, "sick/report")).toEqual([]);
    await tap(card, PRIMARY, "Meld Ida syg og send besked");
    expect(sent(hass.callWS.mock.calls, "sick/report")).toEqual([
      { type: "aula_connect/sick/report", entry_id: "entry-a", child_id: 1001 },
    ]);
    expect(windowText(card)).toContain("Ida er meldt syg i dag");
    expect(texts(card, "dialog .text-button")).not.toContain("Fortryd sygemeldingen");
  });

  it("names the institution only where the children shown are at more than one", async () => {
    const [ida] = CHILDREN as [Child, Child];
    const { card } = await mount(SICK, "thu-1000", {
      children: [ida, OSKAR_ELSEWHERE],
      today: day({}),
      commands: commands(),
    });
    await tap(card, ".family-row", "Meld Oskar syg");
    expect(windowText(card)).toContain("Meldes syg hos Lindegårdens Skole");
  });

  it("reports a child sick and sends the message with one tap, in the thread used last", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", { today: day({}), commands: commands() });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(windowText(card)).not.toContain("Meldes syg hos");
    expect(all(card, "dialog .window-note")).toEqual([]);
    expect(all(card, "dialog .choices")).toEqual([]);
    expect(texts(card, "dialog .window-actions button")).toEqual([
      "Annullér",
      "Meld Ida syg og send besked",
    ]);
    expect(find(card, "dialog textarea", undefined, HTMLTextAreaElement).value).toBe(
      "Ida er syg og bliver derfor hjemme.",
    );
    expect(texts(card, "dialog .thread-chosen .thread-text > *")).toEqual([
      "Sygdom 3.B",
      "Karen Lund · 20. okt.",
    ]);
    await tap(card, "dialog .thread-chosen .text-button", "Skift");
    const radios = [...root(card).querySelectorAll<HTMLInputElement>("dialog .thread input")];
    expect(radios.map((radio) => [radio.checked, radio.disabled])).toEqual([
      [true, false],
      [false, true],
    ]);
    expect(texts(card, ".thread-meta")).toEqual([
      "Karen Lund · 20. okt.",
      "Karen Lund · Bo Holm · 16. okt.",
    ]);
    await type(card, "dialog textarea", "Ida har feber.");
    expect(sent(hass.callWS.mock.calls, "sick/report")).toEqual([]);
    await tap(card, PRIMARY, "Meld Ida syg og send besked");
    expect(sent(hass.callWS.mock.calls, "sick/report")).toEqual([
      { type: "aula_connect/sick/report", entry_id: "entry-a", child_id: 1001 },
    ]);
    expect(sent(hass.callWS.mock.calls, "message/reply")).toEqual([
      {
        type: "aula_connect/message/reply",
        entry_id: "entry-a",
        child_id: 1001,
        thread_id: 501,
        text: "Ida har feber.",
      },
    ]);
    expect(windowText(card)).toContain("Ida er meldt syg i dag");
    expect(windowText(card)).toContain("Beskeden er sendt i Sygdom 3.B");
    expect(selection().senders.get(1001)).toBe("entry-a");
    await tap(card, PRIMARY, "Færdig");
    expect(windowText(card)).toBe("");
  });

  it("writes in the thread set for the child, over the one used last", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      today: day({}),
      config: { sick_threads: [{ child: 1001, thread: "501" }] },
      commands: commands({
        "aula_connect/threads": () => ({ ...THREADS, remembered: "502" }),
      }),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(texts(card, "dialog .thread-chosen .thread-subject")).toEqual(["Sygdom 3.B"]);
    expect(all(card, "dialog .alert")).toEqual([]);
    await tap(card, PRIMARY, "Meld Ida syg og send besked");
    expect(sent(hass.callWS.mock.calls, "message/reply")).toMatchObject([{ thread_id: 501 }]);
  });

  it("asks for a thread again where the one set can no longer be replied in", async () => {
    const { card } = await mount(SICK, "thu-1000", {
      today: day({}),
      config: { sick_threads: [{ child: 1001, thread: 502 }] },
      commands: commands(),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(windowText(card)).toContain(
      "Tråden, der er valgt i indstillingerne, kan ikke længere svares i. Vælg en.",
    );
    expect(all(card, "dialog .thread-chosen")).toEqual([]);
    expect(find(card, PRIMARY).disabled).toBe(true);
  });

  it("leaves the message out where writing is not asked for, taken in with a tap", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      today: day({}),
      config: { sick_write: false },
      commands: commands(),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(find(card, "dialog .switch-row").getAttribute("aria-checked")).toBe("false");
    expect(all(card, "dialog textarea")).toEqual([]);
    expect(sent(hass.callWS.mock.calls, "threads")).toEqual([]);
    expect(windowText(card)).not.toContain("slået fra");
    expect(find(card, PRIMARY).textContent).toContain("Meld Ida syg");
    await tap(card, "dialog .switch-row");
    expect(sent(hass.callWS.mock.calls, "threads")).toHaveLength(1);
    expect(find(card, PRIMARY).textContent).toContain("Meld Ida syg og send besked");
    await tap(card, "dialog .switch-row");
    expect(all(card, "dialog textarea")).toEqual([]);
    await tap(card, PRIMARY, "Meld Ida syg");
    expect(sent(hass.callWS.mock.calls, "message/reply")).toEqual([]);
    expect(windowText(card)).toContain("Ida er meldt syg i dag");
    expect(windowText(card)).not.toContain("Beskeden er sendt");
    await tap(card, "dialog .window-actions .text-button", "Skriv en besked");
    expect(texts(card, "dialog .window-actions button")).toEqual(["Annullér", "Send besked"]);
    expect(all(card, "dialog .switch-row")).toEqual([]);
    await tap(card, PRIMARY, "Send besked");
    expect(sent(hass.callWS.mock.calls, "message/reply")).toHaveLength(1);
    expect(sent(hass.callWS.mock.calls, "threads")).toHaveLength(1);
  });

  it("takes a report back, today", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", { today: day({}), commands: commands() });
    await tap(card, ".family-row", "Meld Ida syg");
    await tap(card, PRIMARY, "Meld Ida syg og send besked");
    await tap(card, "dialog .window-actions .text-button", "Fortryd sygemeldingen");
    expect(sent(hass.callWS.mock.calls, "sick/undo")).toHaveLength(1);
    expect(windowText(card)).toContain("Sygemeldingen er taget tilbage");
    expect(find(card, PRIMARY, "Meld Ida syg").disabled).toBe(false);
  });

  it("says the child is reported sick where the message failed, and sends it again", async () => {
    let fails = true;
    const { card, hass } = await mount(SICK, "thu-1000", {
      today: day({}),
      commands: commands({
        "aula_connect/message/reply": () => {
          if (fails) throw wsError("home_assistant_error", "Aula could not be reached");
          return null;
        },
      }),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    await tap(card, PRIMARY, "Meld Ida syg og send besked");
    expect(windowText(card)).toContain("Ida er meldt syg i dag");
    expect(windowText(card)).toContain("Beskeden blev ikke sendt.");
    expect(sent(hass.callWS.mock.calls, "sick/report")).toHaveLength(1);
    fails = false;
    await tap(card, PRIMARY, "Send igen");
    expect(sent(hass.callWS.mock.calls, "message/reply")).toHaveLength(2);
    expect(sent(hass.callWS.mock.calls, "sick/report")).toHaveLength(1);
    expect(windowText(card)).toContain("Beskeden er sendt i Sygdom 3.B");
    expect(windowText(card)).not.toContain("ikke sendt");
    expect(find(card, PRIMARY).textContent).toContain("Færdig");
  });

  it("waits for a thread and a text before a message goes with the report", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      today: day({}),
      commands: commands({
        "aula_connect/threads": () => ({ ...THREADS, remembered: 77, remembered_stale: true }),
      }),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(windowText(card)).toContain("er fra et tidligere år eller lukket");
    expect(find(card, PRIMARY).disabled).toBe(true);
    const radio = find(card, "dialog .thread input", undefined, HTMLInputElement);
    radio.checked = true;
    radio.dispatchEvent(new Event("change"));
    await settled(card);
    expect(find(card, PRIMARY).disabled).toBe(false);
    expect(windowText(card)).not.toContain("er fra et tidligere år eller lukket");
    await type(card, "dialog textarea", " ");
    expect(find(card, PRIMARY).disabled).toBe(true);
    await tap(card, "dialog .switch-row");
    expect(find(card, PRIMARY).disabled).toBe(false);
    await tap(card, "dialog .window-actions .text-button", "Annullér");
    expect(windowText(card)).toBe("");
    expect(sent(hass.callWS.mock.calls, "message/reply")).toEqual([]);
    expect(sent(hass.callWS.mock.calls, "sick/report")).toEqual([]);
  });

  it("leaves the message out at first where it was written the weekday before", async () => {
    const { card } = await mount(SICK, "thu-1000", {
      today: day({ wrote_yesterday: true }),
      commands: commands(),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(find(card, "dialog .switch-row").getAttribute("aria-checked")).toBe("false");
  });

  it("writes about a child ill since before today, saying so", async () => {
    const { card } = await mount(SICK, "thu-1000", {
      today: day({ today: true, since: "2026-10-28", wrote_yesterday: true }),
      commands: commands(),
      config: { sick_message: "{name} er stadig syg." },
    });
    await tap(card, ".family-row", "Skriv en besked");
    expect(windowText(card)).toContain("Skriv om Ida");
    expect(windowText(card)).toContain("Ida har været syg siden onsdag 28. oktober");
    expect(windowText(card)).toContain("I skrev en besked herfra på hverdagen før");
    expect(find(card, "dialog textarea", undefined, HTMLTextAreaElement).value).toBe(
      "Ida er stadig syg.",
    );
    expect(texts(card, "dialog .window-actions button")).toEqual(["Annullér", "Send besked"]);
  });

  it("says when there is no thread, or the threads cannot be had", async () => {
    const { card } = await mount(SICK, "thu-1000", {
      today: day({ today: true }),
      commands: commands({ "aula_connect/threads": () => ({ threads: [] }) }),
    });
    await tap(card, ".family-row", "Skriv en besked");
    expect(windowText(card)).toContain("Ingen tråd om Ida at skrive i");
    expect(find(card, PRIMARY, "Send besked").disabled).toBe(true);
    unmountAll();
    const { card: reporting, hass } = await mount(SICK, "thu-1000", {
      today: day({}),
      commands: commands({ "aula_connect/threads": () => ({ threads: [] }) }),
    });
    await tap(reporting, ".family-row", "Meld Ida syg");
    expect(windowText(reporting)).toContain("Ingen tråd om Ida at skrive i");
    await tap(reporting, PRIMARY, "Meld Ida syg");
    expect(sent(hass.callWS.mock.calls, "sick/report")).toHaveLength(1);
    expect(sent(hass.callWS.mock.calls, "message/reply")).toEqual([]);
    unmountAll();
    const { card: failing } = await mount(SICK, "thu-1000", {
      today: day({ today: true }),
      commands: commands({
        "aula_connect/threads": () => {
          throw wsError("unknown_command", "Unknown command.");
        },
      }),
    });
    await tap(failing, ".family-row", "Skriv en besked");
    expect(windowText(failing)).toContain("Opdatér Aula Connect");
  });

  it("says why a report failed, and reports nothing where Aula Connect cannot", async () => {
    const { card } = await mount(SICK, "thu-1000", {
      today: day({}),
      commands: commands({
        "aula_connect/sick/report": () => {
          throw wsError("not_supported", "No");
        },
      }),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    await tap(card, PRIMARY, "Meld Ida syg og send besked");
    expect(windowText(card)).toContain("Aula Connect kan ikke gøre det for dette barn endnu.");
    expect(all(card, "dialog .sick-summary")).toHaveLength(1);
    unmountAll();
    const { card: none, hass } = await mount(SICK, "thu-1000", { today: day({ route: "none" }) });
    await tap(none, ".family-row", "Meld Ida syg");
    expect(windowText(none)).toContain("Ida kan ikke meldes syg herfra. Meld syg i Aula.");
    expect(texts(none, "dialog .window-actions button")).toEqual(["Annullér", "Send besked"]);
    expect(sent(hass.callWS.mock.calls, "sick/check")).toEqual([]);
  });

  it("acts as the guardian chosen, and asks that guardian's threads", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      children: [...CHILDREN, ...SECOND_ENTRY],
      today: day({}),
      commands: commands(),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(texts(card, "dialog .choice")).toEqual(["Lise Testesen", "Peter Testesen"]);
    await tap(card, "dialog .choice", "Peter");
    expect(
      sent(hass.callWS.mock.calls, "threads").map(
        (message) => (message as { entry_id: string }).entry_id,
      ),
    ).toEqual(["entry-a", "entry-b"]);
    unmountAll();
    const { card: named, hass: second } = await mount(SICK, "thu-1000", {
      children: [...CHILDREN, ...SECOND_ENTRY],
      today: day({}),
      commands: commands(),
      config: { sender: "Peter Testesen" },
    });
    await tap(named, ".family-row", "Meld Ida syg");
    await tap(named, PRIMARY, "Meld Ida syg og send besked");
    expect(sent(second.callWS.mock.calls, "sick/report")).toEqual([
      { type: "aula_connect/sick/report", entry_id: "entry-b", child_id: 1001 },
    ]);
  });

  it("shows only the threads of the guardian chosen, an answer for another left unshown", async () => {
    const answers: Record<string, [(value: unknown) => void, (error: unknown) => void]> = {};
    const threads = (message: Record<string, unknown>) =>
      new Promise((resolve, reject) => {
        answers[String(message.entry_id)] = [resolve, reject];
      });
    const { card } = await mount(SICK, "thu-1000", {
      children: [...CHILDREN, ...SECOND_ENTRY],
      today: day({}),
      commands: commands({ "aula_connect/threads": threads }),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    await tap(card, "dialog .choice", "Peter");
    answers["entry-a"]?.[0](THREADS);
    await settled(card);
    expect(all(card, "dialog .thread-chosen")).toEqual([]);
    answers["entry-b"]?.[0](THREADS);
    await settled(card);
    expect(all(card, "dialog .thread-chosen")).toHaveLength(1);
    await tap(card, "dialog .choice", "Lise");
    answers["entry-a"]?.[1](wsError("home_assistant_error", "Down"));
    await tap(card, "dialog .choice", "Peter");
    await settled(card);
    expect(all(card, "dialog .alert")).toEqual([]);
  });

  it("asks no threads for another guardian while the message is left out", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      children: [...CHILDREN, ...SECOND_ENTRY],
      today: day({}),
      config: { sick_write: false },
      commands: commands(),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    await tap(card, "dialog .choice", "Peter");
    expect(sent(hass.callWS.mock.calls, "threads")).toEqual([]);
  });

  it("writes without reporting, in a thread whose last activity is unknown", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      children: allowing(["messages"]),
      today: day({}),
      commands: commands({
        "aula_connect/threads": () => ({
          threads: [{ ...THREADS.threads[0], last_activity: "" }],
          remembered: 501,
        }),
      }),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(texts(card, ".thread-meta")).toEqual(["Karen Lund"]);
    await tap(card, PRIMARY, "Send besked");
    expect(sent(hass.callWS.mock.calls, "message/reply")).toHaveLength(1);
    expect(windowText(card)).toContain("Beskeden er sendt i Sygdom 3.B");
    expect(windowText(card)).not.toContain("meldt syg i dag");
  });

  it("names a guardian without a name by the entry, and a child whose day has not come by the day", async () => {
    const { card } = await mount(SICK, "thu-1000", {
      children: [...CHILDREN, ...SECOND_ENTRY.map((child) => ({ ...child, guardian: "" }))],
      commands: commands(),
    });
    expect(texts(card, ".family-sub")).toEqual(["Torsdag 29. oktober", "Torsdag 29. oktober"]);
    await tap(card, ".family-row", "Meld Ida syg");
    expect(texts(card, "dialog .choice")).toEqual(["Lise Testesen", "entry-b"]);
    expect(windowText(card)).toContain("Ida kan ikke meldes syg herfra. Meld syg i Aula.");
  });

  it("offers no report where reporting sick is turned off, only writing", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      children: allowing(["messages"]),
      today: day({}),
      commands: commands(),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(windowText(card)).toContain("Sygemelding er slået fra i Aula Connects indstillinger.");
    expect(windowText(card)).not.toContain("Meldes syg hos");
    expect(texts(card, "dialog .window-actions button")).toEqual(["Annullér", "Send besked"]);
    expect(all(card, "dialog .switch-row")).toEqual([]);
    expect(sent(hass.callWS.mock.calls, "sick/report")).toEqual([]);
    expect(sent(hass.callWS.mock.calls, "sick/check")).toEqual([]);
  });

  it("reports without writing where writing is turned off, and claims no message", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      children: allowing(["sick_reports"]),
      today: day({}),
      commands: commands(),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(windowText(card)).toContain("Svar i tråde er slået fra i Aula Connects indstillinger.");
    expect(texts(card, "dialog .window-actions button")).toEqual(["Annullér", "Meld Ida syg"]);
    await tap(card, PRIMARY, "Meld Ida syg");
    expect(sent(hass.callWS.mock.calls, "sick/report")).toHaveLength(1);
    expect(windowText(card)).toContain("Ida er meldt syg i dag");
    expect(windowText(card)).toContain("Svar i tråde er slået fra");
    expect(windowText(card)).not.toContain("Beskeden er sendt");
    expect(sent(hass.callWS.mock.calls, "threads")).toEqual([]);
    await tap(card, "dialog .window-actions .text-button", "Fortryd sygemeldingen");
    expect(sent(hass.callWS.mock.calls, "sick/undo")).toHaveLength(1);
    expect(windowText(card)).toContain("Sygemeldingen er taget tilbage");
    await tap(card, PRIMARY, "Meld Ida syg");
    await tap(card, PRIMARY, "Færdig");
    expect(windowText(card)).toBe("");
  });

  it("offers nothing where both are turned off, saying so", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      children: allowing([]),
      today: day({}),
      commands: commands(),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(texts(card, "dialog .off")).toEqual([
      "Sygemelding er slået fra i Aula Connects indstillinger.",
      "Svar i tråde er slået fra i Aula Connects indstillinger.",
    ]);
    expect(all(card, "dialog .window-actions button")).toEqual([]);
    expect(hass.callWS.mock.calls.map(([message]) => message.type)).toEqual([
      "aula_connect/children",
    ]);
  });

  it("shows a child reported sick as done where writing is turned off", async () => {
    const { card } = await mount(SICK, "thu-1000", {
      children: allowing(["sick_reports"]),
      today: day({ today: true }),
      commands: commands(),
    });
    expect(texts(card, ".family-title")).toEqual(["Ida", "Oskar"]);
    await tap(card, ".family-row", "Ida");
    expect(windowText(card)).toContain("Ida er meldt syg i dag");
    expect(windowText(card)).toContain("Svar i tråde er slået fra");
    expect(texts(card, "dialog .done-line .text-button")).toEqual(["Fortryd sygemeldingen"]);
    unmountAll();
    const { card: neither } = await mount(SICK, "thu-1000", {
      children: allowing([]),
      today: day({ today: true }),
    });
    await tap(neither, ".family-row", "Ida");
    expect(windowText(neither)).toContain("Ida er meldt syg i dag");
    expect(all(neither, "dialog .done-line .text-button")).toEqual([]);
  });

  it("writes about a child reported sick without offering to take it back where that is off", async () => {
    const { card } = await mount(SICK, "thu-1000", {
      children: allowing(["messages"]),
      today: day({ today: true }),
      commands: commands(),
    });
    await tap(card, ".family-row", "Skriv en besked");
    expect(windowText(card)).toContain("Ida er meldt syg i dag");
    expect(all(card, "dialog .done-line .text-button")).toEqual([]);
  });

  it("lists as senders only the guardians whose entry allows each change", async () => {
    const children = [
      ...CHILDREN.map((child) => ({ ...child, allowed: [...EVERY_CHANGE] })),
      ...SECOND_ENTRY.map((child) => ({ ...child, allowed: ["sick_reports" as const] })),
    ];
    const { card, hass } = await mount(SICK, "thu-1000", {
      children,
      today: day({}),
      commands: commands(),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(texts(card, "dialog .choice")).toEqual(["Lise Testesen", "Peter Testesen"]);
    await tap(card, "dialog .choice", "Peter");
    await tap(card, PRIMARY, "Meld Ida syg og send besked");
    expect(all(card, "dialog .choice")).toEqual([]);
    await tap(card, "dialog .window-actions .text-button", "Fortryd sygemeldingen");
    const entries = (kind: string) =>
      sent(hass.callWS.mock.calls, kind).map(
        (message) => (message as { entry_id: string }).entry_id,
      );
    expect(entries("sick/report")).toEqual(["entry-b"]);
    expect(entries("threads")).toEqual(["entry-a"]);
    expect(entries("message/reply")).toEqual(["entry-a"]);
    expect(entries("sick/undo")).toEqual(["entry-b"]);
  });

  it("acts from a guardian whose entry allows the change, over the one configured", async () => {
    const children = [
      ...CHILDREN.map((child) => ({ ...child, allowed: ["sick_reports" as const] })),
      ...SECOND_ENTRY.map((child) => ({ ...child, allowed: ["messages" as const] })),
    ];
    const { card, hass } = await mount(SICK, "thu-1000", {
      children,
      today: day({}),
      commands: commands(),
      config: { sender: "Peter Testesen" },
    });
    await tap(card, ".family-row", "Meld Ida syg");
    await tap(card, PRIMARY, "Meld Ida syg og send besked");
    await tap(card, "dialog .window-actions .text-button", "Fortryd sygemeldingen");
    const entries = (kind: string) =>
      sent(hass.callWS.mock.calls, kind).map(
        (message) => (message as { entry_id: string }).entry_id,
      );
    expect(entries("sick/report")).toEqual(["entry-a"]);
    expect(entries("threads")).toEqual(["entry-b"]);
    expect(entries("message/reply")).toEqual(["entry-b"]);
    expect(entries("sick/undo")).toEqual(["entry-a"]);
  });

  it("says when Aula Connect refuses a change its options do not allow", async () => {
    const { card } = await mount(SICK, "thu-1000", {
      today: day({}),
      commands: commands({
        "aula_connect/sick/report": () => {
          throw wsError("not_allowed", "Off");
        },
      }),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    await tap(card, PRIMARY, "Meld Ida syg og send besked");
    expect(windowText(card)).toContain("Aula Connects indstillinger tillader ikke dette.");
  });

  it("checks before a report, the report waiting while it runs", async () => {
    let answer: (value: unknown) => void = () => undefined;
    const { card, hass } = await mount(SICK, "thu-1000", {
      today: day({}),
      commands: commands({
        "aula_connect/sick/check": () =>
          new Promise((resolve) => {
            answer = resolve;
          }),
      }),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(windowText(card)).toContain("Henter fra Aula…");
    expect(find(card, PRIMARY).disabled).toBe(true);
    answer({ route: "aula", child_found: true, sick_today: false });
    await settled(card);
    expect(windowText(card)).not.toContain("Henter fra Aula…");
    expect(find(card, PRIMARY).disabled).toBe(false);
    expect(sent(hass.callWS.mock.calls, "sick/check")).toHaveLength(1);
    expect(sent(hass.callWS.mock.calls, "sick/report")).toEqual([]);
  });

  it("offers no report for a child the check does not find, sending Aula's way instead", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      today: day({ route: "tabulex" }),
      commands: commands({
        "aula_connect/sick/check": () => ({ route: "tabulex", child_found: false }),
      }),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(windowText(card)).toContain("Ida kan ikke meldes syg herfra. Meld syg i Aula.");
    expect(windowText(card)).not.toContain("Meldes syg hos");
    expect(windowText(card)).not.toContain("kan ikke fortrydes");
    expect(texts(card, "dialog .window-actions button")).toEqual(["Annullér", "Send besked"]);
    expect(sent(hass.callWS.mock.calls, "sick/report")).toEqual([]);
  });

  it("offers no report where the check finds no route, though it says the child is found", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      today: day({ route: "tabulex" }),
      commands: commands({
        "aula_connect/sick/check": () => ({ route: "none", child_found: true }),
      }),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(windowText(card)).toContain("Ida kan ikke meldes syg herfra. Meld syg i Aula.");
    expect(texts(card, "dialog .window-actions button")).toEqual(["Annullér", "Send besked"]);
    expect(sent(hass.callWS.mock.calls, "sick/report")).toEqual([]);
  });

  it("shows a child the check finds reported sick already as done, and offers no report", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      today: day({}),
      commands: commands({
        "aula_connect/sick/check": () => ({ route: "aula", child_found: true, sick_today: true }),
      }),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(windowText(card)).toContain("Ida er meldt syg i dag");
    expect(texts(card, "dialog .window-actions button")).toEqual(["Annullér", "Send besked"]);
    await tap(card, "dialog .done-line .text-button", "Fortryd sygemeldingen");
    expect(sent(hass.callWS.mock.calls, "sick/undo")).toHaveLength(1);
    expect(windowText(card)).toContain("Sygemeldingen er taget tilbage");
    expect(windowText(card)).not.toContain("Ida er meldt syg i dag");
    expect(find(card, PRIMARY, "Meld Ida syg").disabled).toBe(false);
    expect(sent(hass.callWS.mock.calls, "sick/check")).toHaveLength(1);
    expect(sent(hass.callWS.mock.calls, "sick/report")).toEqual([]);
  });

  it("checks a child opened reported sick once its report is taken back", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      today: day({ today: true }),
      commands: commands(),
    });
    await tap(card, ".family-row", "Skriv en besked");
    expect(sent(hass.callWS.mock.calls, "sick/check")).toEqual([]);
    await tap(card, "dialog .done-line .text-button", "Fortryd sygemeldingen");
    expect(sent(hass.callWS.mock.calls, "sick/check")).toHaveLength(1);
    expect(find(card, PRIMARY, "Meld Ida syg og send besked").disabled).toBe(false);
  });

  it("says why the check failed, and keeps the report from being sent", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      today: day({}),
      commands: commands({
        "aula_connect/sick/check": () => {
          throw wsError("not_allowed", "Off");
        },
      }),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(windowText(card)).toContain("Aula Connects indstillinger tillader ikke dette.");
    expect(find(card, PRIMARY).disabled).toBe(true);
    expect(sent(hass.callWS.mock.calls, "sick/report")).toEqual([]);
  });

  it("checks again for another sender, showing only the answer for the one chosen", async () => {
    const answers: Record<string, (value: unknown) => void> = {};
    const { card, hass } = await mount(SICK, "thu-1000", {
      children: [...CHILDREN, ...SECOND_ENTRY],
      today: day({}),
      commands: commands({
        "aula_connect/sick/check": (message) =>
          new Promise((resolve) => {
            answers[String(message.entry_id)] = resolve;
          }),
      }),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    await tap(card, "dialog .choice", "Peter");
    expect(
      sent(hass.callWS.mock.calls, "sick/check").map(
        (message) => (message as { entry_id: string }).entry_id,
      ),
    ).toEqual(["entry-a", "entry-b"]);
    answers["entry-a"]?.({ route: "aula", child_found: false });
    await settled(card);
    expect(windowText(card)).toContain("Henter fra Aula…");
    expect(windowText(card)).not.toContain("kan ikke meldes syg herfra");
    answers["entry-b"]?.({ route: "aula", child_found: true, sick_today: false });
    await settled(card);
    expect(find(card, PRIMARY).disabled).toBe(false);
    await tap(card, PRIMARY, "Meld Ida syg og send besked");
    expect(sent(hass.callWS.mock.calls, "sick/report")).toEqual([
      { type: "aula_connect/sick/report", entry_id: "entry-b", child_id: 1001 },
    ]);
  });

  it("fills a child's name into the message", () => {
    expect(fillMessage("{name} er syg, {name} bliver hjemme.", IDA)).toBe(
      "Ida er syg, Ida bliver hjemme.",
    );
  });
});

describe("reporting several sick at once", () => {
  const open = async (
    overrides: Record<string, (message: Record<string, unknown>) => unknown> = {},
    children?: Child[],
  ) => {
    const mounted = await mount(SICK, "thu-1000", {
      today: day({}),
      commands: commands(overrides),
      ...(children ? { children } : {}),
    });
    await tap(mounted.card, ".window-actions .text-button", "Meld flere syge");
    return mounted;
  };

  it("reports each child chosen once, then offers to write about each", async () => {
    const { card, hass } = await open();
    expect(texts(card, "dialog .face-choice span:not(.face)")).toEqual(["Ida", "Oskar"]);
    expect(windowText(card)).toContain("Meldes syg i dag: Ida og Oskar");
    await tap(card, "dialog .filled-button", "Meld syg");
    expect(sent(hass.callWS.mock.calls, "sick/report")).toEqual([
      { type: "aula_connect/sick/report", entry_id: "entry-a", child_id: 1001 },
      { type: "aula_connect/sick/report", entry_id: "entry-a", child_id: 1002 },
    ]);
    expect(texts(card, "dialog .done-line > span")).toEqual([
      "Ida er meldt syg i dag",
      "Oskar er meldt syg i dag",
    ]);
    await tap(card, "dialog .done-line .text-button", "Skriv en besked");
    expect(windowText(card)).toContain("Skriv om Ida");
  });

  it("reports only the children chosen that can be, saying why the others cannot", async () => {
    const { card, hass } = await open({
      "aula_connect/sick/check": (message) => ({
        route: "aula",
        child_found: message.child_id !== 1002,
        same_institution: true,
        sick_today: false,
        would_send: null,
      }),
    });
    expect(windowText(card)).toContain("Oskar kan ikke meldes syg herfra. Meld syg i Aula.");
    expect(find(card, "dialog .face-choice", "Oskar").disabled).toBe(true);
    expect(windowText(card)).toContain("Meldes syg i dag: Ida");
    await tap(card, "dialog .face-choice", "Ida");
    expect(find(card, "dialog .filled-button", "Meld syg").disabled).toBe(true);
    await tap(card, "dialog .face-choice", "Ida");
    await tap(card, "dialog .filled-button", "Meld syg");
    expect(sent(hass.callWS.mock.calls, "sick/report")).toHaveLength(1);
  });

  it("says why one report failed, and that the other was made", async () => {
    const { card, hass } = await open({
      "aula_connect/sick/report": (message) => {
        if (message.child_id === 1001) throw wsError("home_assistant_error", "Aula is down");
        return { route: "aula" };
      },
    });
    await tap(card, "dialog .filled-button", "Meld syg");
    expect(texts(card, "dialog .alert")).toEqual([
      "Ida: Det kunne ikke gøres i Aula lige nu. Prøv igen senere.",
    ]);
    expect(texts(card, "dialog .done-line > span")).toEqual(["Oskar er meldt syg i dag"]);
    expect(sent(hass.callWS.mock.calls, "sick/report")).toHaveLength(2);
  });

  it("says a check that failed, a child sick already, and a report that cannot be taken back", async () => {
    const { card } = await open({
      "aula_connect/sick/check": (message) => {
        if (message.child_id === 1001) throw wsError("home_assistant_error", "Aula is down");
        return {
          route: "tabulex",
          child_found: true,
          same_institution: true,
          sick_today: false,
          would_send: null,
        };
      },
    });
    expect(texts(card, "dialog .alert")[0]).toMatch(/^Ida: /);
    expect(windowText(card)).toContain("Meldes syg i dag: Oskar");
    expect(texts(card, "dialog .window-note")).toHaveLength(1);
    unmountAll();
    const { card: sickAlready } = await open({
      "aula_connect/sick/check": () => ({
        route: "aula",
        child_found: true,
        same_institution: true,
        sick_today: true,
        would_send: null,
      }),
    });
    expect(texts(sickAlready, "dialog .window-note")).toEqual([
      "Ida er meldt syg i dag",
      "Oskar er meldt syg i dag",
    ]);
    expect(find(sickAlready, "dialog .filled-button", "Meld syg").disabled).toBe(true);
  });

  it("offers no message where writing is turned off, and no button for fewer than two", async () => {
    const { card } = await open({}, allowing(["sick_reports"]));
    await tap(card, "dialog .filled-button", "Meld syg");
    expect(all(card, "dialog .done-line .text-button")).toEqual([]);
    unmountAll();
    const { card: one } = await mount(SICK, "thu-1000", {
      today: (child) => day({ today: child.child_id === 1001 })(child),
      commands: commands(),
    });
    expect(all(one, ".window-actions .text-button")).toEqual([]);
  });
});
