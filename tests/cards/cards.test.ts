import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../../src/index.ts";
import { AulaConnectDayCard } from "../../src/cards/day-card.ts";
import { AulaConnectHomeworkCard } from "../../src/cards/homework-card.ts";
import { AulaConnectCard } from "../../src/cards/week-card.ts";
import { forget } from "../../src/core/memory.ts";
import { RETRY_WINDOW_MS, STARTING_MS } from "../../src/core/store.ts";
import { IDLE_RESET_MS } from "../../src/model/focus.ts";
import { STUB_WAIT_MS } from "../../src/ui/card.ts";
import { base, blocks, dayStyles, homeworkStyles, weekStyles } from "../../src/ui/styles.ts";
import { FakeConnection, fakeHass, present, settle, wsError, type FakeHass } from "../fake-hass.ts";
import { scenarioNamed } from "../fixtures/scenarios.ts";
import { local } from "../fixtures/week.ts";

type Card = HTMLElement & {
  setConfig(config: unknown): void;
  hass: unknown;
  getCardSize(): number;
  updateComplete: Promise<unknown>;
};

const cards: Card[] = [];

async function mount(
  tag: string,
  scenario: string,
  config: Record<string, unknown> = {},
  setup: (hass: FakeHass) => void = () => undefined,
  clock?: string,
): Promise<{ card: Card; hass: FakeHass }> {
  const item = scenarioNamed(scenario);
  vi.setSystemTime(new Date(clock ?? item.clock));
  const connection = new FakeConnection();
  connection.respond = (message) =>
    item.data(present(item.children.find((child) => child.child_id === message.child_id)));
  const hass = fakeHass({ connection, children: [...item.children], timeZone: item.zone });
  setup(hass);
  const card = document.createElement(tag) as Card;
  card.setConfig({ type: `custom:${tag}`, ...config });
  card.hass = hass;
  document.body.append(card);
  cards.push(card);
  await settle();
  return { card, hass };
}

function text(card: Card, selector = ".body"): string {
  return (present(card.shadowRoot).querySelector(selector)?.textContent ?? "")
    .replace(/\u2060/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns what a screen reader reads of an element: without what is hidden from it. */
function spoken(card: Card, selector: string): string {
  const element = present(present(card.shadowRoot).querySelector(selector)).cloneNode(
    true,
  ) as Element;
  for (const hidden of element.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
  return element.textContent
    .replace(/\u2060/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
});

afterEach(() => {
  for (const card of cards.splice(0)) card.remove();
  forget();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("registration", () => {
  it("defines the three cards and lists them in the card picker", () => {
    expect(customElements.get("aula-connect-day-card")).toBe(AulaConnectDayCard);
    expect(customElements.get("aula-connect-homework-card")).toBe(AulaConnectHomeworkCard);
    expect(customElements.get("aula-connect-card")).toBe(AulaConnectCard);
    const entries = window.customCards ?? [];
    expect(entries.map((entry) => [entry.type, entry.preview, entry.documentationURL])).toEqual([
      [
        "aula-connect-day-card",
        true,
        "https://github.com/HairingX/ha_aula_connect_card#school-day-card",
      ],
      [
        "aula-connect-homework-card",
        true,
        "https://github.com/HairingX/ha_aula_connect_card#homework-card",
      ],
      ["aula-connect-card", false, "https://github.com/HairingX/ha_aula_connect_card#week-card"],
    ]);
  });

  it("names the cards in the page's language each time the picker reads them", () => {
    const [day] = window.customCards ?? [];
    document.documentElement.lang = "da";
    expect(day?.name).toBe("Aula Connect · Skoledag");
    document.documentElement.lang = "en";
    expect(day?.name).toBe("Aula Connect · School day");
    expect(day?.description).toContain("The school day that matters now");
  });

  it("suggests a card for an entity of Aula Connect", () => {
    const [day] = window.customCards ?? [];
    const hass = {
      entities: { "sensor.ida": { platform: "aula_connect" }, "light.x": { platform: "hue" } },
    };
    expect(day?.getEntitySuggestion(hass, "sensor.ida")).toEqual({
      config: { type: "custom:aula-connect-day-card" },
    });
    expect(day?.getEntitySuggestion(hass, "light.x")).toBeNull();
    expect(day?.getEntitySuggestion({}, "sensor.ida")).toBeNull();
  });

  it("defines nothing and logs nothing when the bundle is loaded twice", async () => {
    vi.resetModules();
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const before = window.customCards?.length;
    await import("../../src/index.ts");
    expect(info).not.toHaveBeenCalled();
    expect(window.customCards?.length).toBe(before);
  });

  it("logs its version once when it defines the cards", async () => {
    vi.resetModules();
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(customElements, "get").mockReturnValue(undefined);
    vi.spyOn(customElements, "define").mockImplementation(() => undefined);
    const saved = window.customCards ?? [];
    delete window.customCards;
    await import("../../src/index.ts");
    expect(info).toHaveBeenCalledOnce();
    expect(info.mock.calls[0]?.[0]).toContain("AULA-CONNECT-CARD %c 0.0.0");
    window.customCards = saved;
  });
});

describe("before there is anything to show", () => {
  it("renders nothing without a configuration and hass", async () => {
    const card = document.createElement("aula-connect-day-card") as Card;
    document.body.append(card);
    cards.push(card);
    await card.updateComplete;
    expect(card.shadowRoot?.querySelector("ha-card")).toBeNull();
  });

  it("says it is loading while the children are listed", async () => {
    const { card } = await mount("aula-connect-day-card", "thu-1930", {}, (hass) => {
      hass.callWS.mockReturnValue(new Promise(() => undefined));
    });
    expect(card.shadowRoot?.querySelector('[aria-busy="true"]')?.textContent).toContain(
      "Henter fra Aula",
    );
  });

  it("shows why the children cannot be listed", async () => {
    const { card } = await mount("aula-connect-day-card", "thu-1930", {}, (hass) => {
      hass.callWS.mockRejectedValue(wsError("home_assistant_error", "Timeout"));
    });
    expect(text(card, '[role="alert"]')).toBe("Kunne ikke hente fra Aula: Timeout");
  });

  it("loads while Home Assistant starts, and only then says the integration is not loaded", async () => {
    const { card } = await mount("aula-connect-day-card", "thu-1930", {}, (hass) => {
      hass.callWS.mockRejectedValue(wsError("unknown_command", "Unknown command."));
    });
    expect(card.shadowRoot?.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(card.shadowRoot?.querySelector('[role="alert"]')).toBeNull();
    await vi.advanceTimersByTimeAsync(STARTING_MS + 30_000);
    await card.updateComplete;
    expect(text(card, '[role="alert"]')).toContain("Aula Connect er ikke indlæst");
  });

  it("says when there are no children, or names a missing child, once retries are over", async () => {
    const { card } = await mount("aula-connect-homework-card", "thu-1930", { children: [1001, 9] });
    expect(text(card, '[role="alert"]')).toBe("");
    expect(text(card, '[role="status"]')).toBe("Opdaterer fra Aula…");
    await vi.advanceTimersByTimeAsync(RETRY_WINDOW_MS + 60_000);
    await card.updateComplete;
    expect(text(card, '[role="alert"]')).toBe("Aula Connect har intet barn med id 9.");
    const empty = await mount("aula-connect-card", "thu-1930", {}, (hass) => {
      hass.callWS.mockResolvedValue({ children: [] });
    });
    expect(empty.card.shadowRoot?.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(text(empty.card)).not.toContain("ingen børn");
    await vi.advanceTimersByTimeAsync(RETRY_WINDOW_MS + 60_000);
    await empty.card.updateComplete;
    expect(text(empty.card)).toContain("Aula Connect har ingen børn sat op.");
  });

  it("says what went wrong instead of going blank when a view fails", async () => {
    vi.spyOn(
      AulaConnectDayCard.prototype as unknown as { view: () => unknown },
      "view",
    ).mockImplementation(() => {
      throw new Error("bad data");
    });
    const { card } = await mount("aula-connect-day-card", "thu-1930");
    expect(text(card, '[role="alert"]')).toBe("Kunne ikke hente fra Aula: Error: bad data");
  });
});

describe("the cards", () => {
  it("show tomorrow in the evening, named three ways", async () => {
    const { card } = await mount("aula-connect-day-card", "thu-1930", { children: [1001] });
    expect(spoken(card, "h2")).toBe("I morgen, fredag 30. oktober, næste skoledag");
    expect(card.shadowRoot?.querySelector(".tile.today")).toBeNull();
    expect(text(card, "section")).toContain("Lektier til i morgen");
  });

  it("collapse this week at the weekend", async () => {
    const { card } = await mount("aula-connect-card", "sat-1000", { children: [1001] });
    expect(text(card, ".fold > summary")).toBe("Mandag–fredag (5)");
    expect(card.shadowRoot?.querySelector("details.focus-day")?.hasAttribute("open")).toBe(true);
  });

  it("fold the earlier homework", async () => {
    const { card } = await mount("aula-connect-homework-card", "thu-1530", { children: [1001] });
    expect(text(card, ".fold > summary")).toBe("Tidligere lektier (3)");
  });

  it("size themselves for the masonry view and the sections grid", async () => {
    const day = document.createElement("aula-connect-day-card") as Card & AulaConnectDayCard;
    expect(day.getCardSize()).toBe(9);
    day.setConfig({ size: "large" });
    expect(day.getCardSize()).toBe(14);
    expect(day.getGridOptions()).toEqual({
      columns: "full",
      rows: "auto",
      min_columns: 12,
      min_rows: 4,
    });
    const homework = new AulaConnectHomeworkCard();
    expect(homework.getCardSize()).toBe(6);
    expect(homework.getGridOptions()).toEqual({
      columns: "full",
      rows: "auto",
      min_columns: 12,
      min_rows: 3,
    });
    const week = new AulaConnectCard();
    expect(week.getCardSize()).toBe(17);
    week.setConfig({ weeks: 1 });
    expect(week.getCardSize()).toBe(10);
    expect(week.getGridOptions()).toEqual({
      columns: "full",
      rows: "auto",
      min_columns: 12,
      min_rows: 6,
    });
    const { card } = await mount("aula-connect-day-card", "thu-1930", { children: [1001] });
    expect(card.getCardSize()).toBeGreaterThan(9);
  });

  it("give a stub that follows the defaults, listing the children for the editor once", async () => {
    const hass = fakeHass({ children: [...scenarioNamed("thu-1930").children] });
    expect(await AulaConnectDayCard.getStubConfig(hass)).toEqual({
      type: "custom:aula-connect-day-card",
    });
    expect(AulaConnectDayCard.getConfigForm().schema[0]).toMatchObject({
      selector: { select: { mode: "list" } },
    });
    expect(await AulaConnectCard.getStubConfig(hass)).toEqual({ type: "custom:aula-connect-card" });
    expect(hass.callWS).toHaveBeenCalledOnce();
    expect(hass.connection.subscriptions).toHaveLength(0);
    expect(await AulaConnectHomeworkCard.getStubConfig()).toEqual({
      type: "custom:aula-connect-homework-card",
    });
  });

  it("give the visual editor a form for each card, its children first", () => {
    for (const card of [AulaConnectDayCard, AulaConnectHomeworkCard, AulaConnectCard]) {
      expect(card.getConfigForm().schema[0]).toMatchObject({ name: "children" });
    }
  });

  it("give a stub without waiting long for a listing that does not come", async () => {
    const hass = fakeHass();
    hass.callWS.mockReturnValue(new Promise(() => undefined));
    const stubbed = AulaConnectDayCard.getStubConfig(hass);
    await vi.advanceTimersByTimeAsync(STUB_WAIT_MS);
    expect(await stubbed).toEqual({ type: "custom:aula-connect-day-card" });
  });
});

describe("a shared screen", () => {
  it("holds the day shown for a minute after a touch, then moves on", async () => {
    // A tap at 11:59:40; the ticks at 12:00 and 12:01.
    const halfPast = new Date(local("2026-10-29", "11:59")).getTime() + 30_000;
    const { card } = await mount(
      "aula-connect-day-card",
      "thu-1200",
      { children: [1001] },
      undefined,
      new Date(halfPast).toISOString(),
    );
    expect(text(card, ".title")).toBe("I dag,");
    await vi.advanceTimersByTimeAsync(10_000);
    card.dispatchEvent(new Event("pointerdown"));
    await vi.advanceTimersByTimeAsync(20_050);
    expect(text(card, ".title")).toBe("I dag,");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(text(card, ".title")).toBe("I morgen,");
  });

  it("moves to the next day at the switch time when nobody touched it", async () => {
    const halfPast = new Date(local("2026-10-29", "11:59")).getTime() + 30_000;
    const { card } = await mount(
      "aula-connect-day-card",
      "thu-1200",
      { children: [1001] },
      undefined,
      new Date(halfPast).toISOString(),
    );
    await vi.advanceTimersByTimeAsync(30_050);
    expect(text(card, ".title")).toBe("I morgen,");
  });

  it("closes what was opened after ten minutes without a touch, but not on new data", async () => {
    const { card, hass } = await mount("aula-connect-card", "thu-1000", { children: [1001] });
    const friday = (): HTMLDetailsElement =>
      present(card.shadowRoot?.querySelectorAll<HTMLDetailsElement>("details.day-row")[1]);
    friday().open = true;
    friday().dispatchEvent(new Event("toggle"));
    hass.connection.subscriptions[0]?.callback(
      scenarioNamed("thu-1000").data(present(scenarioNamed("thu-1000").children[0])),
    );
    await settle();
    await card.updateComplete;
    expect(friday().open).toBe(true);
    await vi.advanceTimersByTimeAsync(IDLE_RESET_MS + 60_000);
    await card.updateComplete;
    expect(friday().open).toBe(false);
  });
});

describe("the theme's primary colour", () => {
  it("never colours text: it fills only the marks beside words, and outlines focus", () => {
    const sheets = [base, blocks, dayStyles, homeworkStyles, weekStyles]
      .map((sheet) => sheet.cssText)
      .join("\n");
    const uses = [
      ...sheets.matchAll(/([\w-]+)\s*:\s*[^;{}]*var\(--(?:aula-accent|primary-color)\b[^;{}]*;/g),
    ].map((match) => match[1]);
    expect(new Set(uses)).toEqual(new Set(["--aula-accent", "background", "border-inline-start"]));
    expect(sheets).not.toMatch(/(?:^|[;{\s])color\s*:\s*var\(--(?:aula-accent|primary-color)/);
  });
});
