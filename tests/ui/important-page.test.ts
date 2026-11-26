import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../../src/index.ts";
import { forget } from "../../src/core/memory.ts";
import { reloadSelection } from "../../src/core/selection.ts";
import { IDLE_RESET_MS } from "../../src/model/focus.ts";
import { wsError } from "../fake-hass.ts";
import { STATES } from "../fixtures/family.ts";
import { all, mount, text, unmountAll } from "../fixtures/mount.ts";
import { weekData } from "../fixtures/week.ts";
import { find, settled, tap, texts } from "./family-helpers.ts";

const PAGE = "aula-connect-important-card";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  window.localStorage.clear();
  reloadSelection();
});

afterEach(async () => {
  unmountAll();
  forget();
  reloadSelection();
  vi.useRealTimers();
  vi.restoreAllMocks();
  await new Promise((resolve) => setImmediate(resolve));
});

describe("the Important page", () => {
  it("shows the week's important notes by the day they are for, the days before today folded", async () => {
    const { card } = await mount(PAGE, "thu-1000", { states: STATES });
    expect(find(card, ".note-page", undefined, HTMLElement).getAttribute("aria-label")).toMatch(
      /^Vigtigt\W+Ida\W+og\W+Oskar$/,
    );
    expect(texts(card, ".note-week")).toEqual(["Uge 44 26. okt.–1. nov. · Denne uge"]);
    expect(texts(card, ".note-day-head")).toEqual(["I dag 29. okt.", "I morgen 30. okt."]);
    expect(texts(card, ".note-day .note-who")).toEqual(["Ida", "Ida", "Ida"]);
    expect(texts(card, ".note-none > span:not(.face)")).toEqual([
      "Oskar har ikke mere vigtigt i uge 44",
    ]);
    expect(all(card, ".nav-today")).toEqual([]);
    expect(texts(card, ".fold summary")).toEqual(["Tidligere i ugen (3)"]);
    await tap(card, ".fold summary");
    const fold = find(card, ".fold", undefined, HTMLDetailsElement);
    fold.open = true;
    fold.dispatchEvent(new Event("toggle"));
    await settled(card);
    expect(texts(card, ".fold .note-who")).toEqual(["Ida", "Ida", "Oskar"]);
  });

  it("browses a week at a time, and back to this week", async () => {
    const { card } = await mount(PAGE, "thu-1000");
    await tap(card, '.nav-step[aria-label="Næste uge"]');
    expect(texts(card, ".note-week")).toEqual(["Uge 45 2.–8. nov. · Næste uge"]);
    expect(all(card, ".fold")).toEqual([]);
    expect(texts(card, ".note-day-head")[0]).toBe("Mandag 2. nov. · om 4 dage");
    await tap(card, '.nav-step[aria-label="Næste uge"]');
    await settled(card);
    expect(texts(card, ".note-week")).toEqual(["Uge 46 9.–15. nov. · Om 2 uger"]);
    await tap(card, ".nav-today");
    expect(texts(card, ".note-week")[0]).toContain("Denne uge");
    await tap(card, '.nav-step[aria-label="Forrige uge"]');
    await settled(card);
    expect(texts(card, ".note-week")).toEqual(["Uge 43 19.–25. okt. · Sidste uge"]);
    await tap(card, '.nav-step[aria-label="Forrige uge"]');
    await settled(card);
    expect(texts(card, ".note-week")[0]).toContain("For 2 uger siden");
    expect(texts(card, ".note-none > span:not(.face)")[0]).toBe("Ida har intet vigtigt i uge 42");
    await vi.advanceTimersByTimeAsync(IDLE_RESET_MS + 60_000);
    await settled(card);
    expect(texts(card, ".note-week")[0]).toContain("Denne uge");
  });

  it("waits for a week, or says why it cannot have it", async () => {
    const { card, hass } = await mount(PAGE, "thu-1000", {
      week: (_child, start) => (start === "2026-10-26" ? weekData(start) : undefined),
    });
    await tap(card, '.nav-step[aria-label="Forrige uge"]');
    expect(text(card)).toContain("Henter");
    expect(all(card, ".note-none")).toEqual([]);
    hass.connection.refuse = wsError("home_assistant_error", "Aula is down");
    await tap(card, '.nav-step[aria-label="Forrige uge"]');
    await settled(card);
    expect(text(card)).toContain("Aula");
  });

  it("says the size of what it shows, and stays on this week when left alone", async () => {
    const { card } = await mount(PAGE, "thu-1000");
    expect(card.getCardSize()).toBe(11);
    await vi.advanceTimersByTimeAsync(IDLE_RESET_MS + 60_000);
    expect(texts(card, ".note-week")[0]).toContain("Denne uge");
  });

  it("shows important notes without a subject or a text", async () => {
    const { card } = await mount(PAGE, "thu-1000", {
      week: (_child, start) => {
        const data = weekData(start);
        const [first] = data.tasks;
        return {
          ...data,
          tasks: first
            ? [{ ...first, date: "2026-10-30", subject: "", title: "Madpakke", content: "" }]
            : [],
        };
      },
    });
    expect(texts(card, ".note-day .note-head")).toEqual(["Ida Madpakke", "Oskar Madpakke"]);
    expect(all(card, ".note-day .note-text")).toEqual([]);
  });
});
