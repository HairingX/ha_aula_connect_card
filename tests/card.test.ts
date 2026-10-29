import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AulaConnectCard, CARD_VERSION, RELOAD_DELAY_MS, TICK_MS } from "../src/aula-connect-card";
import type { CardConfig } from "../src/config";
import { configForm, rememberChildren } from "../src/editor";
import type { CalendarEvent, Lesson, Task, WeekData } from "../src/types";
import {
  FakeConnection,
  fakeHass,
  present,
  settle,
  wsError,
  type FakeHass,
  type FakeHassOptions,
} from "./fake-hass";
import { CHILDREN, weekData } from "./fixtures/week";

const CONFIG: CardConfig = { type: "custom:aula-connect-card" };
const IDA = present(CHILDREN[0]);
// Thursday of week 44, 2026, during the third lesson.
const NOW = "2026-10-29T10:05:00+01:00";

const cards: AulaConnectCard[] = [];

async function mount(
  options: FakeHassOptions = {},
  config: CardConfig = CONFIG,
): Promise<{ card: AulaConnectCard; hass: FakeHass }> {
  const card = document.createElement("aula-connect-card");
  const hass = fakeHass({ children: [IDA], ...options });
  card.setConfig(config);
  card.hass = hass;
  document.body.append(card);
  cards.push(card);
  await settle();
  return { card, hass };
}

async function send(hass: FakeHass, data: unknown, index = 0): Promise<void> {
  hass.connection.subscriptions[index]?.callback(data);
  await settle();
}

function root(card: AulaConnectCard): ShadowRoot {
  return present(card.shadowRoot);
}

function scope(within: AulaConnectCard | Element): ParentNode {
  return within instanceof AulaConnectCard ? root(within) : within;
}

function text(within: AulaConnectCard | Element, selector = ".card"): string {
  return (scope(within).querySelector(selector)?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function texts(within: AulaConnectCard | Element, selector: string): string[] {
  return [...scope(within).querySelectorAll(selector)].map((element) =>
    element.textContent.replace(/\s+/g, " ").trim(),
  );
}

function dayAt(card: AulaConnectCard, index: number): HTMLElement {
  return present(root(card).querySelectorAll<HTMLElement>("li.day")[index]);
}

function lesson(fields: Partial<Lesson>): Lesson {
  return {
    id: "l",
    start: "2026-10-29T08:00:00+01:00",
    end: "2026-10-29T08:45:00+01:00",
    title: "Dansk",
    teachers: [],
    location: null,
    status: null,
    ...fields,
  };
}

function note(fields: Partial<Task>): Task {
  return {
    id: "t",
    date: "2026-10-29",
    type: "task",
    title: null,
    content: "",
    subject: "",
    group: "",
    author: "",
    ...fields,
  };
}

function calendarEvent(fields: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "e",
    start: "2026-10-29",
    end: "2026-10-30",
    all_day: true,
    title: "Begivenhed",
    type: "event",
    location: null,
    ...fields,
  };
}

function week(fields: Partial<WeekData>): WeekData {
  return {
    week_plan: true,
    start: "2026-10-26",
    end: "2026-11-09",
    lessons: [],
    events: [],
    tasks: [],
    birthdays: [],
    ...fields,
  };
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["Date", "setInterval", "clearInterval", "setTimeout", "clearTimeout"],
  });
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  for (const card of cards.splice(0)) card.remove();
  rememberChildren([]);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("registration", () => {
  it("defines the element and lists the card in the card picker", () => {
    expect(customElements.get("aula-connect-card")).toBe(AulaConnectCard);
    expect(window.customCards).toContainEqual({
      type: "aula-connect-card",
      name: "Aula Connect",
      description: expect.stringContaining("timetable") as string,
      preview: true,
      documentationURL: "https://github.com/HairingX/ha_aula_connect_card",
    });
  });

  it("embeds the version, 0.0.0 outside a release", () => {
    expect(CARD_VERSION).toBe("0.0.0");
  });

  it("logs its version once, and defines nothing again when loaded twice", async () => {
    vi.resetModules();
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const define = vi.spyOn(customElements, "define");
    const before = window.customCards?.length;
    await import("../src/aula-connect-card");
    expect(define).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(window.customCards?.length).toBe(before);
  });

  it("logs its version when it defines the element", async () => {
    vi.resetModules();
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(customElements, "get").mockReturnValue(undefined);
    const define = vi.spyOn(customElements, "define").mockImplementation(() => undefined);
    const saved = window.customCards ?? [];
    delete window.customCards;
    await import("../src/aula-connect-card");
    expect(define).toHaveBeenCalledWith("aula-connect-card", expect.any(Function));
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("AULA-CONNECT-CARD %c 0.0.0"),
      expect.any(String),
      expect.any(String),
    );
    expect(window.customCards).toHaveLength(1);
    window.customCards = saved;
  });
});

describe("card API", () => {
  it("gives a stub configuration in the user's language, and remembers the children", async () => {
    const hass = fakeHass({ language: "en", children: CHILDREN });
    const config = await AulaConnectCard.getStubConfig(hass);
    expect(config.sections?.map((section) => section.title)).toEqual(["Homework", "Remember"]);
    expect(configForm().computeLabel({ name: "children" })).toBe("Children");
    expect(AulaConnectCard.getConfigForm().schema[0]).toMatchObject({
      selector: { select: { mode: "list" } },
    });
  });

  it("gives a stub configuration when the children cannot be listed", async () => {
    const hass = fakeHass({ childrenError: wsError("unknown_command", "Unknown command.") });
    const config = await AulaConnectCard.getStubConfig(hass);
    expect(config.sections?.map((section) => section.title)).toEqual(["Lektier", "Husk"]);
  });

  it("gives a stub configuration without hass", async () => {
    const config = await AulaConnectCard.getStubConfig();
    expect(config.type).toBe("custom:aula-connect-card");
  });

  it("throws for an invalid configuration", () => {
    const card = document.createElement("aula-connect-card");
    expect(() => {
      card.setConfig({ type: "custom:aula-connect-card", weeks: 5 });
    }).toThrow("weeks: must be 1 or 2, not 5");
  });

  it("sizes itself by the number of weeks", () => {
    const card = document.createElement("aula-connect-card");
    expect(card.getCardSize()).toBe(10);
    card.setConfig({ type: "custom:aula-connect-card", weeks: 1 });
    expect(card.getCardSize()).toBe(6);
    expect(card.getGridOptions()).toEqual({ columns: 12, rows: "auto", min_columns: 6 });
  });
});

describe("states", () => {
  it("renders nothing without a configuration or hass", async () => {
    const card = document.createElement("aula-connect-card");
    document.body.append(card);
    cards.push(card);
    await settle();
    expect(root(card).querySelector("ha-card")).toBeNull();
    card.setConfig(CONFIG);
    await settle();
    expect(root(card).querySelector("ha-card")).toBeNull();
  });

  it("shows that it is loading while the children are listed", async () => {
    const hass = fakeHass();
    hass.callWS.mockReturnValue(new Promise(() => undefined));
    const card = document.createElement("aula-connect-card");
    card.setConfig(CONFIG);
    card.hass = hass;
    document.body.append(card);
    cards.push(card);
    await settle();
    expect(text(card, "[role=status]")).toBe("Henter fra Aula…");
  });

  it("says the integration is not loaded when Home Assistant does not know its commands", async () => {
    const { card } = await mount({
      language: "en",
      childrenError: wsError("unknown_command", "Unknown command."),
    });
    expect(text(card, ".alert.error")).toContain("Aula Connect is not loaded");
    expect(root(card).querySelector(".alert")?.getAttribute("role")).toBe("alert");
  });

  it("says when the integration has no children", async () => {
    const { card } = await mount({ children: [] });
    expect(text(card, ".alert.info")).toBe("Aula Connect har ingen børn sat op.");
  });

  it("warns of a configured child the integration does not have", async () => {
    const { card, hass } = await mount({}, { ...CONFIG, children: [1001, 4242] });
    expect(text(card, ".alert.warning")).toBe("Aula Connect har intet barn med id 4242.");
    expect(hass.connection.subscriptions).toHaveLength(1);
  });

  it("shows a child as loading until its first event", async () => {
    const { card } = await mount();
    expect(text(card, "h2")).toBe("Ida");
    expect(text(card, ".institution")).toBe("Bakkedal Skole");
    expect(text(card, ".child [role=status]")).toBe("Henter fra Aula…");
  });

  it("shows a child's error, in the child's place", async () => {
    const connection = new FakeConnection();
    connection.refuse = wsError("not_found", "Unknown child");
    const { card } = await mount({ connection, children: CHILDREN });
    expect(texts(card, ".child .alert.error")).toEqual([
      "Aula Connect kender ikke længere dette barn. Genindlæs integrationen.",
      "Aula Connect kender ikke længere dette barn. Genindlæs integrationen.",
    ]);
  });

  it("says when Aula has nothing for the weeks", async () => {
    const { card, hass } = await mount();
    await send(hass, week({}));
    expect(text(card, ".week-empty")).toBe("Intet fra Aula i denne uge.");
    expect(texts(card, ".day-summary")).toContain("Intet planlagt");
  });

  it("shows the content still when listing the children again fails", async () => {
    const { card, hass } = await mount();
    hass.callWS.mockRejectedValueOnce(wsError("home_assistant_error", "Timeout"));
    hass.connection.emit("ready");
    await settle();
    expect(text(card, ".alert.error")).toBe("Kunne ikke hente fra Aula: Timeout");
    expect(text(card, "h2")).toBe("Ida");
  });
});

describe("the week", () => {
  async function full(options: FakeHassOptions = {}, config: CardConfig = CONFIG) {
    const mounted = await mount(options, config);
    await send(mounted.hass, weekData("2026-10-26"));
    return mounted;
  }

  it("shows this week and next with their week numbers", async () => {
    const { card } = await full();
    expect(texts(card, ".week-title")).toEqual(["Denne uge Uge 44", "Næste uge Uge 45"]);
    expect(root(card).querySelectorAll("li.day")).toHaveLength(14);
    expect(root(card).querySelector(".weeks")?.classList.contains("two")).toBe(true);
  });

  it("shows this week only when configured so", async () => {
    const { card, hass } = await full({}, { ...CONFIG, weeks: 1 });
    expect(texts(card, ".week-title")).toEqual(["Denne uge Uge 44"]);
    expect(hass.connection.subscriptions[0]?.message).toMatchObject({
      start: "2026-10-26",
      end: "2026-11-02",
    });
  });

  it("opens and marks today, de-emphasises the days before and names tomorrow", async () => {
    const { card } = await full();
    const days = [...root(card).querySelectorAll("li.day")];
    expect(days.map((element) => element.className.replace("day ", ""))).toEqual([
      "past",
      "past",
      "past",
      "today",
      ...Array<string>(10).fill("future"),
    ]);
    expect(days.map((element) => element.querySelector("details")?.open)).toEqual([
      false,
      false,
      false,
      true,
      ...Array<boolean>(10).fill(false),
    ]);
    expect(text(card, ".today .day-name")).toBe("torsdag 29. oktober");
    expect(text(card, ".today .badge")).toBe("I dag");
    expect(text(dayAt(card, 4), ".badge")).toBe("I morgen");
  });

  it("shows the lessons as a timeline, with initials, rooms and their state", async () => {
    const { card } = await full();
    const lessons = [...dayAt(card, 3).querySelectorAll(".lesson")];
    expect(lessons.map((element) => element.querySelector("time")?.textContent)).toEqual([
      "08.00",
      "08.45",
      "09.50",
      "10.35",
      "12.00",
      "12.45",
    ]);
    const now = present(lessons[2]);
    expect(now.classList.contains("now")).toBe(true);
    expect(now.querySelector(".tag")?.textContent).toBe("Nu");
    const mathematics = present(lessons[4]);
    expect(mathematics.querySelector("abbr")?.getAttribute("title")).toBe("Mette Juhl");
    expect(mathematics.querySelector("abbr")?.textContent).toBe("MJ");
    expect(text(card, ".today .lesson:nth-child(5) .lesson-meta")).toBe("Lærere: MJ · Lokale: B12");
    expect(present(lessons[5]).querySelector(".tag")?.textContent).toBe("Vikar");
  });

  it("sorts notes into the sections, with subject chips and their HTML as text", async () => {
    const { card } = await full();
    const today = dayAt(card, 3);
    expect(texts(today, ".block-title")).toEqual(["Lektier", "Husk"]);
    expect(texts(today, ".chip")).toEqual(["Dansk", "Matematik", "Idræt"]);
    const content = today.querySelector(".task-content");
    expect(content?.textContent).toBe("Læs kapitel 4 i Rejsen til Saturn.\nSkriv tre spørgsmål.");
    expect(content?.querySelector("b, p")).toBeNull();
    expect(texts(today, ".task-author")).toEqual(["Karen Lund", "Mette Juhl", "Jonas Berg"]);
  });

  it("sums up a closed day: its school hours, notes, events and birthdays", async () => {
    const { card } = await full();
    expect(texts(dayAt(card, 4), ".day-summary .count")).toEqual([
      "08.00–13.30",
      "Husk: 1",
      "Begivenheder: 1",
      "Alma har fødselsdag",
    ]);
    expect(text(dayAt(card, 5), ".day-summary")).toBe("Intet planlagt");
  });

  it("shows events and birthdays with their times", async () => {
    const { card } = await full();
    expect(texts(dayAt(card, 4), ".items .item")).toEqual([
      "Hele dagen Skolefoto",
      "Alma har fødselsdag",
    ]);
    expect(texts(dayAt(card, 8), ".items .item")).toEqual([
      "17.00–18.30 Forældremøde 3.B Kantinen",
    ]);
  });

  it("says there is no homework on a school day without notes", async () => {
    const { card } = await full();
    expect(text(dayAt(card, 0), ".day-body .quiet")).toBe("Ingen lektier");
    expect(text(dayAt(card, 5), ".day-body .quiet")).toBe("Intet planlagt");
  });

  it("shows a time of day for the first day of a timed event only", async () => {
    const { card, hass } = await mount();
    await send(
      hass,
      week({
        events: [
          calendarEvent({
            all_day: false,
            start: "2026-10-29T18:00:00+01:00",
            end: "2026-10-30T10:00:00+01:00",
            title: "Lejrtur",
          }),
          calendarEvent({
            all_day: false,
            start: "2026-10-29T12:00:00+01:00",
            end: "later",
            title: "Uden slut",
          }),
        ],
      }),
    );
    expect(texts(dayAt(card, 3), ".item")).toEqual(["12.00– Uden slut", "18.00–10.00 Lejrtur"]);
    expect(texts(dayAt(card, 4), ".item")).toEqual(["Hele dagen Lejrtur"]);
  });

  it("shows a lesson's teachers, room or status only when there are some", async () => {
    const { card, hass } = await mount({ language: "en", locale: { first_weekday: "monday" } });
    await send(
      hass,
      week({
        lessons: [
          lesson({ id: 1, title: "Bare", teachers: [" "] }),
          lesson({ id: 2, title: "Teacher", teachers: ["Karen Lund"], status: "normal" }),
          lesson({ id: 3, title: "Room", location: "B12", status: "substitute" }),
          lesson({ id: 4, title: "Odd", status: "moved" }),
          lesson({ id: 5, title: "Off", status: "cancelled" }),
        ],
      }),
    );
    const lessons = [...dayAt(card, 3).querySelectorAll(".lesson")];
    expect(
      lessons.map((element) =>
        element.querySelector(".lesson-meta")?.textContent.replace(/\s+/g, " ").trim(),
      ),
    ).toEqual([undefined, "Teachers: KL", "Room: B12", undefined, undefined]);
    expect(lessons.map((element) => element.querySelector(".tag")?.textContent)).toEqual([
      undefined,
      undefined,
      "Substitute",
      "moved",
      "cancelled",
    ]);
    expect(present(lessons[1]).querySelector("abbr")?.getAttribute("title")).toBe("Karen Lund");
    expect(root(card).querySelector(".cancelled, s, del")).toBeNull();
  });

  it("shows an all-day event on each day it covers", async () => {
    const { card, hass } = await mount();
    await send(
      hass,
      week({
        events: [calendarEvent({ start: "2026-10-29", end: "2026-10-31", title: "Lejrskole" })],
      }),
    );
    expect(texts(dayAt(card, 3), ".item")).toEqual(["Hele dagen Lejrskole"]);
    expect(texts(dayAt(card, 4), ".day-summary .count")).toEqual(["Begivenheder: 1"]);
    expect(texts(dayAt(card, 5), ".day-summary .count")).toEqual([]);
  });

  it("implies nothing about homework or birthdays where the school has no week plan", async () => {
    const { card, hass } = await mount();
    const data = weekData("2026-10-26");
    await send(hass, { ...data, week_plan: false });
    expect(root(card).querySelector(".task, .block-title")).toBeNull();
    expect(texts(card, ".quiet")).not.toContain("Ingen lektier");
    expect(texts(dayAt(card, 4), ".day-summary .count")).toEqual([
      "08.00–13.30",
      "Begivenheder: 1",
    ]);
    expect(texts(dayAt(card, 3), ".lesson").length).toBe(6);
  });

  it("says there is no homework where the school has a week plan without notes", async () => {
    const { card, hass } = await mount();
    await send(hass, { ...weekData("2026-10-26"), tasks: [], birthdays: [] });
    expect(text(dayAt(card, 3), ".day-body > .quiet")).toBe("Ingen lektier");
  });

  it("leaves out the parts of a note it does not have", async () => {
    const { card, hass } = await mount();
    await send(hass, week({ tasks: [note({ type: "survey" })] }));
    const today = dayAt(card, 3);
    expect(texts(today, ".block-title")).toEqual(["Andet"]);
    expect(today.querySelector(".task")?.children).toHaveLength(1);
    expect(texts(today, ".day-summary .count")).toEqual(["Andet: 1"]);
  });

  it("uses configured sections", async () => {
    const { card, hass } = await mount(
      {},
      {
        ...CONFIG,
        sections: [{ title: "Prøver", icon: "mdi:school", text: "test" }, { title: "Alt andet" }],
      },
    );
    await send(
      hass,
      week({ tasks: [note({ id: 1, title: "Glosetest" }), note({ id: 2, title: "Læs" })] }),
    );
    const today = dayAt(card, 3);
    expect(texts(today, ".block-title")).toEqual(["Prøver", "Alt andet"]);
    expect(today.querySelector(".block-title ha-icon")?.getAttribute("icon")).toBe("mdi:school");
  });

  it("hides the parts switched off", async () => {
    const { card } = await full(
      {},
      { ...CONFIG, show: { timetable: false, tasks: false, events: false, birthdays: false } },
    );
    expect(root(card).querySelector(".lesson, .task, .item")).toBeNull();
    expect(text(dayAt(card, 4), ".day-summary")).toBe("Intet planlagt");
    expect(text(dayAt(card, 3), ".day-body")).toBe("Intet planlagt");
  });

  it("is in English, with times as the user's locale says", async () => {
    const { card } = await full({
      language: "en",
      locale: { time_format: "12", first_weekday: "monday" },
    });
    expect(texts(card, ".week-title")).toEqual(["This week Week 44", "Next week Week 45"]);
    expect(text(card, ".today .day-name")).toBe("Thursday, October 29");
    expect(text(card, ".today .badge")).toBe("Today");
    expect(texts(dayAt(card, 3), ".lesson-time > time")[0]).toMatch(/^8:00\sAM$/);
    expect(texts(dayAt(card, 3), ".block-title")).toEqual(["Homework", "Remember"]);
  });

  it("formats dates in the language of hass when the locale names none", async () => {
    const { card } = await full({ language: "en", locale: { language: "" } });
    expect(text(card, ".today .day-name")).toBe("Thursday, October 29");
  });

  it("starts the week on the user's first weekday", async () => {
    const { card, hass } = await full({ locale: { first_weekday: "sunday" } });
    expect(hass.connection.subscriptions[0]?.message).toMatchObject({
      start: "2026-10-25",
      end: "2026-11-08",
    });
    expect(text(dayAt(card, 0), ".day-name")).toBe("søndag 25. oktober");
  });

  it("takes today in Home Assistant's time zone", async () => {
    vi.setSystemTime(new Date("2026-11-01T23:30:00Z"));
    const { hass } = await mount({ timeZone: "Europe/Copenhagen" });
    // Monday 00:30 in Copenhagen, while still Sunday in UTC.
    expect(hass.connection.subscriptions[0]?.message).toMatchObject({ start: "2026-11-02" });
  });
});

describe("subscriptions", () => {
  it("subscribes to each child chosen, from the first day of this week", async () => {
    const { hass } = await mount({ children: CHILDREN });
    expect(hass.connection.subscriptions.map((item) => item.message)).toEqual(
      CHILDREN.map((child) => ({
        type: "aula_connect/week/subscribe",
        entry_id: child.entry_id,
        child_id: child.child_id,
        start: "2026-10-26",
        end: "2026-11-09",
      })),
    );
  });

  it("ends its subscriptions when removed, and makes them again when added back", async () => {
    const { card, hass } = await mount();
    const [first] = hass.connection.subscriptions;
    card.remove();
    await settle();
    expect(first?.unsubscribe).toHaveBeenCalledOnce();
    expect(hass.connection.listeners.get("ready")?.size).toBe(0);
    document.body.append(card);
    await settle();
    expect(hass.connection.active).toHaveLength(1);
    expect(hass.callWS).toHaveBeenCalledTimes(2);
  });

  it("keeps showing a child's data while subscribing again for the same weeks", async () => {
    const { card, hass } = await mount();
    await send(hass, weekData("2026-10-26"));
    card.remove();
    document.body.append(card);
    await settle();
    expect(root(card).querySelectorAll(".lesson").length).toBeGreaterThan(0);
  });

  it("subscribes again when other children are chosen", async () => {
    const { card, hass } = await mount({ children: CHILDREN });
    card.setConfig({ ...CONFIG, children: ["1002"] });
    await settle();
    expect(hass.connection.active.map((item) => item.message.child_id)).toEqual([1002]);
    expect(text(card, "h2")).toBe("Oskar");
  });

  it("keeps its subscriptions when hass changes but not its connection or settings", async () => {
    const { card, hass } = await mount();
    card.hass = { ...hass };
    await settle();
    expect(hass.connection.subscriptions).toHaveLength(1);
    expect(hass.callWS).toHaveBeenCalledOnce();
  });

  it("subscribes again for another first weekday", async () => {
    const { card, hass } = await mount();
    card.hass = { ...hass, locale: { ...hass.locale, first_weekday: "sunday" } };
    await settle();
    expect(hass.connection.active.map((item) => item.message.start)).toEqual(["2026-10-25"]);
  });

  it("moves today at midnight without waiting for an event", async () => {
    const { card, hass } = await mount();
    await send(hass, weekData("2026-10-26"));
    vi.setSystemTime(new Date("2026-10-30T00:00:30+01:00"));
    vi.advanceTimersByTime(TICK_MS);
    await settle();
    expect(text(card, ".today .day-name")).toBe("fredag 30. oktober");
    expect(hass.connection.subscriptions).toHaveLength(1);
  });

  it("subscribes for the new week after midnight on Sunday", async () => {
    const { card, hass } = await mount();
    await send(hass, weekData("2026-10-26"));
    vi.setSystemTime(new Date("2026-11-02T00:00:30+01:00"));
    vi.advanceTimersByTime(TICK_MS);
    await settle();
    expect(hass.connection.subscriptions[0]?.unsubscribe).toHaveBeenCalledOnce();
    expect(hass.connection.active.map((item) => item.message)).toEqual([
      expect.objectContaining({ start: "2026-11-02", end: "2026-11-16" }),
    ]);
    expect(text(card, ".child [role=status]")).toBe("Henter fra Aula…");
    await send(hass, weekData("2026-11-02"), 1);
    expect(texts(card, ".week-title")).toEqual(["Denne uge Uge 45", "Næste uge Uge 46"]);
  });

  it("makes its subscriptions again on the connection's return, without ending the lost ones", async () => {
    const { card, hass } = await mount();
    await send(hass, weekData("2026-10-26"));
    hass.connection.emit("disconnected");
    hass.connection.emit("ready");
    await settle();
    expect(hass.callWS).toHaveBeenCalledTimes(2);
    expect(hass.connection.subscriptions).toHaveLength(2);
    expect(hass.connection.subscriptions[0]?.unsubscribe).not.toHaveBeenCalled();
    expect(root(card).querySelectorAll(".lesson").length).toBeGreaterThan(0);
  });

  it("moves to a new connection", async () => {
    const { card, hass } = await mount();
    const connection = new FakeConnection();
    card.hass = { ...hass, connection };
    await settle();
    expect(hass.connection.subscriptions[0]?.unsubscribe).toHaveBeenCalledOnce();
    expect(hass.connection.listeners.get("ready")?.size).toBe(0);
    expect(connection.active).toHaveLength(1);
  });

  it("ignores children listed on a connection it has left", async () => {
    const hass = fakeHass({ children: [IDA] });
    let answer: (value: unknown) => void = () => undefined;
    let refuse: (reason: unknown) => void = () => undefined;
    hass.callWS
      .mockReturnValueOnce(new Promise((resolve) => (answer = resolve)))
      .mockReturnValueOnce(new Promise((_, reject) => (refuse = reject)));
    const card = document.createElement("aula-connect-card");
    card.setConfig(CONFIG);
    card.hass = hass;
    document.body.append(card);
    cards.push(card);
    const connection = new FakeConnection();
    card.hass = { ...hass, connection };
    card.hass = { ...hass, connection: new FakeConnection() };
    answer({ children: [IDA] });
    refuse(wsError("home_assistant_error", "late"));
    await settle();
    expect(hass.connection.subscriptions).toHaveLength(0);
    expect(connection.subscriptions).toHaveLength(0);
    expect(root(card).querySelector(".alert")).toBeNull();
  });

  it("ignores events and errors of subscriptions it has ended", async () => {
    const connection = new FakeConnection();
    let resolve: (value: () => Promise<void>) => void = () => undefined;
    let reject: (reason: unknown) => void = () => undefined;
    const unsubscribe = vi.fn(() => Promise.resolve());
    const subscribe = vi.spyOn(connection, "subscribeMessage");
    subscribe
      .mockReturnValueOnce(new Promise((ok) => (resolve = ok)))
      .mockReturnValueOnce(new Promise((_, fail) => (reject = fail)));
    const { card, hass } = await mount({ connection, children: CHILDREN });
    const callbacks = subscribe.mock.calls.map((call) => call[0]);
    card.setConfig({ ...CONFIG, children: [1002] });
    resolve(unsubscribe);
    reject(wsError("not_found", "gone"));
    for (const callback of callbacks) callback(weekData("2026-10-26"));
    for (const callback of callbacks) callback({ ended: true });
    await settle();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(root(card).querySelector(".alert, .lesson")).toBeNull();
    vi.advanceTimersByTime(RELOAD_DELAY_MS);
    await settle();
    expect(hass.callWS).toHaveBeenCalledOnce();
  });

  it("ends a subscription that failed without trying to end it again", async () => {
    const connection = new FakeConnection();
    connection.refuse = wsError("invalid_format", "bad range");
    const { card } = await mount({ connection, language: "en" });
    expect(text(card, ".child .alert")).toBe("Aula Connect could not read the request: bad range");
    card.remove();
    await settle();
  });

  it("swallows a failure to end a subscription", async () => {
    const { card, hass } = await mount();
    hass.connection.subscriptions[0]?.unsubscribe.mockRejectedValue(new Error("Connection lost"));
    card.remove();
    await settle();
    expect(hass.connection.subscriptions[0]?.unsubscribe).toHaveBeenCalledOnce();
  });

  it("lists the children and subscribes again, quietly, when the integration ends the subscription", async () => {
    const { card, hass } = await mount({ children: CHILDREN });
    await send(hass, weekData("2026-10-26"));
    await send(hass, { ended: true });
    await send(hass, { ended: true }, 1);
    expect(hass.connection.active).toHaveLength(0);
    expect(text(card, ".card > [role=status]")).toBe("Opdaterer fra Aula…");
    expect(root(card).querySelector(".alert")).toBeNull();
    expect(root(card).querySelectorAll(".lesson").length).toBeGreaterThan(0);
    vi.advanceTimersByTime(RELOAD_DELAY_MS - 1);
    await settle();
    expect(hass.callWS).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1);
    await settle();
    expect(hass.callWS).toHaveBeenCalledTimes(2);
    expect(hass.connection.active).toHaveLength(2);
    expect(root(card).querySelector(".card > [role=status]")).toBeNull();
  });

  it("shows the error when listing the children again fails after the subscription ended", async () => {
    const { card, hass } = await mount();
    await send(hass, { ended: true });
    hass.callWS.mockRejectedValueOnce(wsError("unknown_command", "Unknown command."));
    vi.advanceTimersByTime(RELOAD_DELAY_MS);
    await settle();
    expect(text(card, ".alert.error")).toContain("Aula Connect er ikke indlæst");
    expect(root(card).querySelector(".card > [role=status]")).toBeNull();
  });

  it("stops waiting to subscribe again when removed", async () => {
    const { card, hass } = await mount();
    await send(hass, { ended: true });
    card.remove();
    vi.advanceTimersByTime(RELOAD_DELAY_MS);
    await settle();
    expect(hass.callWS).toHaveBeenCalledOnce();
  });
});
