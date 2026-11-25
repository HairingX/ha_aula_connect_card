import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../../src/index.ts";
import { forget } from "../../src/core/memory.ts";
import { reloadSelection, selection } from "../../src/core/selection.ts";
import type { Change, Child } from "../../src/core/types.ts";
import { fillMessage } from "../../src/ui/sick.ts";
import { wsError } from "../fake-hass.ts";
import { SECOND_ENTRY, THREADS, todayOf } from "../fixtures/family.ts";
import { all, mount, unmountAll } from "../fixtures/mount.ts";
import { CHILDREN, EVERY_CHANGE } from "../fixtures/week.ts";
import { find, root, settled, tap, texts, type, windowText } from "./family-helpers.ts";

const SICK = "aula-connect-sick-card";
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
  it("has a row for each child, saying how it is reported sick", async () => {
    const { card } = await mount(SICK, "thu-1000", {
      today: (child) =>
        child.child_id === 1001 ? day({ today: true })(child) : day({ route: "tabulex" })(child),
    });
    expect(texts(card, ".family-title")).toEqual(["Skriv til lærerne", "Meld Oskar syg"]);
    expect(texts(card, ".family-sub")[0]).toBe("Meldt syg i dag");
    expect(texts(card, ".family-sub")[1]).toContain("Tabulex");
    const { card: plain } = await mount(SICK, "thu-1000", { today: day({}) });
    expect(texts(plain, ".family-sub")).toEqual(["Torsdag 29. oktober", "Torsdag 29. oktober"]);
  });

  it("reports a child sick in Tabulex, saying first that it cannot be taken back", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      today: day({ route: "tabulex" }),
      commands: commands(),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(windowText(card)).toContain("Meldes syg i Tabulex");
    expect(windowText(card)).toContain("En sygemelding i Tabulex kan ikke fortrydes.");
    expect(windowText(card)).not.toContain("SFO og dagtilbud");
    await tap(card, "dialog .filled-button", "Meld syg");
    expect(sent(hass.callWS.mock.calls, "sick/report")).toEqual([
      { type: "aula_connect/sick/report", entry_id: "entry-a", child_id: 1001 },
    ]);
    expect(windowText(card)).toContain("Ida er meldt syg i dag");
    expect(texts(card, "dialog .text-button")).not.toContain("Fortryd");
  });

  it("reports a child sick, then writes to the teachers in the thread used last", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", { today: day({}), commands: commands() });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(windowText(card)).toContain("Meldes syg i Aula (SFO og dagtilbud)");
    expect(windowText(card)).toContain("Aula raskmelder Ida af sig selv i morgen.");
    expect(all(card, "dialog .choices")).toEqual([]);
    await tap(card, "dialog .filled-button", "Meld syg");
    expect(sent(hass.callWS.mock.calls, "sick/report")).toEqual([
      { type: "aula_connect/sick/report", entry_id: "entry-a", child_id: 1001 },
    ]);
    expect(windowText(card)).toContain("Skriv til lærerne?");
    expect(windowText(card)).toContain("Ida er meldt syg i dag");
    expect(find(card, "dialog textarea", undefined, HTMLTextAreaElement).value).toBe(
      "Ida er syg og bliver derfor hjemme.",
    );
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
    await tap(card, "dialog .filled-button", "Send");
    expect(sent(hass.callWS.mock.calls, "message/reply")).toEqual([
      {
        type: "aula_connect/message/reply",
        entry_id: "entry-a",
        child_id: 1001,
        thread_id: 501,
        text: "Ida har feber.",
      },
    ]);
    expect(windowText(card)).toContain("Beskeden er sendt");
    expect(selection().senders.get(1001)).toBe("entry-a");
    await tap(card, "dialog .filled-button", "Færdig");
    expect(windowText(card)).toBe("");
  });

  it("takes a report back, today", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", { today: day({}), commands: commands() });
    await tap(card, ".family-row", "Meld Ida syg");
    await tap(card, "dialog .filled-button", "Meld syg");
    await tap(card, "dialog .done-line .text-button");
    expect(sent(hass.callWS.mock.calls, "sick/undo")).toHaveLength(1);
    expect(windowText(card)).toContain("Sygemeldingen er taget tilbage");
    expect(find(card, "dialog .filled-button", "Meld syg").disabled).toBe(false);
  });

  it("writes without reporting, choosing a thread and leaving it unsent when skipped", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      today: day({}),
      commands: commands({
        "aula_connect/threads": () => ({ ...THREADS, remembered: 77, remembered_stale: true }),
      }),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    await tap(card, "dialog .text-button", "Skriv til lærerne");
    expect(windowText(card)).toContain("tidligere skoleår");
    expect(find(card, "dialog .filled-button", "Send").disabled).toBe(true);
    const radio = find(card, "dialog .thread input", undefined, HTMLInputElement);
    radio.checked = true;
    radio.dispatchEvent(new Event("change"));
    await settled(card);
    expect(find(card, "dialog .filled-button", "Send").disabled).toBe(false);
    await type(card, "dialog textarea", " ");
    expect(find(card, "dialog .filled-button", "Send").disabled).toBe(true);
    await tap(card, "dialog .text-button", "Spring over");
    expect(windowText(card)).toBe("");
    expect(sent(hass.callWS.mock.calls, "message/reply")).toEqual([]);
  });

  it("skips first for a child ill since before today, or written about the day before", async () => {
    const { card } = await mount(SICK, "thu-1000", {
      today: day({ today: true, since: "2026-10-28", wrote_yesterday: true }),
      commands: commands(),
      config: { sick_message: "{name} er stadig syg." },
    });
    await tap(card, ".family-row", "Skriv til lærerne");
    expect(windowText(card)).toContain("Ida har været syg siden onsdag 28. oktober");
    expect(windowText(card)).toContain("I skrev til lærerne herfra på hverdagen før");
    expect(find(card, "dialog textarea", undefined, HTMLTextAreaElement).value).toBe(
      "Ida er stadig syg.",
    );
    expect(texts(card, "dialog .window-actions button")).toEqual(["Send", "Spring over"]);
    expect(find(card, "dialog .window-actions .filled-button").textContent).toContain(
      "Spring over",
    );
  });

  it("says when there is no thread, or the threads cannot be had", async () => {
    const { card } = await mount(SICK, "thu-1000", {
      today: day({ today: true }),
      commands: commands({ "aula_connect/threads": () => ({ threads: [] }) }),
    });
    await tap(card, ".family-row", "Skriv til lærerne");
    expect(windowText(card)).toContain("Ingen tråd om Ida med lærerne");
    unmountAll();
    const { card: failing } = await mount(SICK, "thu-1000", {
      today: day({ today: true }),
      commands: commands({
        "aula_connect/threads": () => {
          throw wsError("unknown_command", "Unknown command.");
        },
      }),
    });
    await tap(failing, ".family-row", "Skriv til lærerne");
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
    await tap(card, "dialog .filled-button", "Meld syg");
    expect(windowText(card)).toContain("Aula Connect kan ikke gøre det for dette barn endnu.");
    unmountAll();
    const { card: none } = await mount(SICK, "thu-1000", { today: day({ route: "none" }) });
    await tap(none, ".family-row", "Meld Ida syg");
    expect(windowText(none)).toContain(
      "Aula Connect har endnu ikke fundet ud af, hvordan Ida meldes syg herfra",
    );
    expect(find(none, "dialog .filled-button", "Meld syg").disabled).toBe(true);
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
    await tap(card, "dialog .text-button", "Skriv til lærerne");
    await tap(card, "dialog .choice", "Lise");
    expect(
      sent(hass.callWS.mock.calls, "threads").map(
        (message) => (message as { entry_id: string }).entry_id,
      ),
    ).toEqual(["entry-b", "entry-a"]);
    unmountAll();
    const { card: named, hass: second } = await mount(SICK, "thu-1000", {
      children: [...CHILDREN, ...SECOND_ENTRY],
      today: day({}),
      commands: commands(),
      config: { sender: "Peter Testesen" },
    });
    await tap(named, ".family-row", "Meld Ida syg");
    await tap(named, "dialog .filled-button", "Meld syg");
    expect(sent(second.callWS.mock.calls, "sick/report")).toEqual([
      { type: "aula_connect/sick/report", entry_id: "entry-b", child_id: 1001 },
    ]);
  });

  it("writes without reporting, in a thread whose last activity is unknown", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      today: day({}),
      commands: commands({
        "aula_connect/threads": () => ({
          threads: [{ ...THREADS.threads[0], last_activity: "" }],
          remembered: 501,
        }),
      }),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    await tap(card, "dialog .text-button", "Skriv til lærerne");
    expect(texts(card, ".thread-meta")).toEqual(["Karen Lund"]);
    await tap(card, "dialog .filled-button", "Send");
    expect(sent(hass.callWS.mock.calls, "message/reply")).toHaveLength(1);
    expect(windowText(card)).toContain("Beskeden er sendt");
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
    expect(windowText(card)).toContain("Aula Connect har endnu ikke fundet ud af");
  });

  it("offers no report where reporting sick is turned off, only writing", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      children: allowing(["messages"]),
      today: day({}),
      commands: commands(),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(windowText(card)).toContain("Sygemelding er slået fra i Aula Connects indstillinger.");
    expect(windowText(card)).not.toContain("Meldes syg i Aula");
    expect(texts(card, "dialog .window-actions button")).toEqual(["Skriv til lærerne"]);
    await tap(card, "dialog .text-button", "Skriv til lærerne");
    expect(windowText(card)).toContain("Skriv til lærerne?");
    expect(sent(hass.callWS.mock.calls, "sick/report")).toEqual([]);
  });

  it("reports without writing where writing is turned off, and claims no message", async () => {
    const { card, hass } = await mount(SICK, "thu-1000", {
      children: allowing(["sick_reports"]),
      today: day({}),
      commands: commands(),
    });
    await tap(card, ".family-row", "Meld Ida syg");
    expect(windowText(card)).toContain("Svar i tråde er slået fra i Aula Connects indstillinger.");
    expect(texts(card, "dialog .window-actions button")).toEqual(["Meld syg"]);
    await tap(card, "dialog .filled-button", "Meld syg");
    expect(sent(hass.callWS.mock.calls, "sick/report")).toHaveLength(1);
    expect(windowText(card)).toContain("Ida er meldt syg i dag");
    expect(windowText(card)).toContain("Svar i tråde er slået fra");
    expect(windowText(card)).not.toContain("Beskeden er sendt");
    expect(sent(hass.callWS.mock.calls, "threads")).toEqual([]);
    await tap(card, "dialog .done-line .text-button", "Fortryd");
    expect(sent(hass.callWS.mock.calls, "sick/undo")).toHaveLength(1);
    expect(windowText(card)).toContain("Sygemeldingen er taget tilbage");
    await tap(card, "dialog .filled-button", "Meld syg");
    await tap(card, "dialog .filled-button", "Færdig");
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
    expect(texts(card, "dialog .done-line .text-button")).toEqual(["Fortryd"]);
    unmountAll();
    const { card: neither } = await mount(SICK, "thu-1000", {
      children: allowing([]),
      today: day({ today: true }),
    });
    await tap(neither, ".family-row", "Ida");
    expect(all(neither, "dialog .done-line .text-button")).toEqual([]);
  });

  it("writes about a child reported sick without offering to take it back where that is off", async () => {
    const { card } = await mount(SICK, "thu-1000", {
      children: allowing(["messages"]),
      today: day({ today: true }),
      commands: commands(),
    });
    await tap(card, ".family-row", "Skriv til lærerne");
    expect(windowText(card)).toContain("Ida er meldt syg i dag");
    expect(all(card, "dialog .done-line .text-button")).toEqual([]);
  });

  it("lists as senders only the guardians whose entry allows each step", async () => {
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
    await tap(card, "dialog .filled-button", "Meld syg");
    expect(all(card, "dialog .choice")).toEqual([]);
    await tap(card, "dialog .done-line .text-button", "Fortryd");
    const entries = (kind: string) =>
      sent(hass.callWS.mock.calls, kind).map(
        (message) => (message as { entry_id: string }).entry_id,
      );
    expect(entries("sick/report")).toEqual(["entry-b"]);
    expect(entries("threads")).toEqual(["entry-a"]);
    expect(entries("sick/undo")).toEqual(["entry-a"]);
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
    await tap(card, "dialog .filled-button", "Meld syg");
    await tap(card, "dialog .done-line .text-button", "Fortryd");
    const entries = (kind: string) =>
      sent(hass.callWS.mock.calls, kind).map(
        (message) => (message as { entry_id: string }).entry_id,
      );
    expect(entries("sick/report")).toEqual(["entry-a"]);
    expect(entries("threads")).toEqual(["entry-b"]);
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
    await tap(card, "dialog .filled-button", "Meld syg");
    expect(windowText(card)).toContain("Aula Connects indstillinger tillader ikke dette.");
  });

  it("fills a child's name into the message", () => {
    expect(fillMessage("{name} er syg, {name} bliver hjemme.", IDA)).toBe(
      "Ida er syg, Ida bliver hjemme.",
    );
  });
});
