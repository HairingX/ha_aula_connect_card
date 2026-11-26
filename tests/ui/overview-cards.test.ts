import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../../src/index.ts";
import { AulaConnectChildrenCard } from "../../src/cards/children-card.ts";
import { AulaConnectImportantCard } from "../../src/cards/important-card.ts";
import { AulaConnectOverviewCard } from "../../src/cards/overview-card.ts";
import { AulaConnectSickCard } from "../../src/cards/sick-card.ts";
import { AulaConnectVacationCard } from "../../src/cards/vacation-card.ts";
import { forget } from "../../src/core/memory.ts";
import { reloadSelection, selection, setLook } from "../../src/core/selection.ts";
import type { Change, Child } from "../../src/core/types.ts";
import { IDLE_RESET_MS } from "../../src/model/focus.ts";
import { subjectNamer } from "../../src/model/subjects.ts";
import { childrenBarView } from "../../src/ui/children-bar.ts";
import { packIcon, subjectIcon } from "../../src/ui/overview.ts";
import { fakeHass, present, wsError } from "../fake-hass.ts";
import { REQUESTS, STATES, todayOf } from "../fixtures/family.ts";
import { all, mount, text, unmountAll } from "../fixtures/mount.ts";
import { scenarioNamed } from "../fixtures/scenarios.ts";
import { snapshotOf } from "../fixtures/snapshot.ts";
import { allDay, CHILDREN, plusDays, weekData } from "../fixtures/week.ts";
import { find, settled, tap, texts, windowText } from "./family-helpers.ts";

const BAR = "aula-connect-children-card";
const OVERVIEW = "aula-connect-overview-card";

function sickToday(child: Child): Record<string, unknown> {
  const day = todayOf(child);
  return { ...day, sick: { route: "aula", today: true, since: null, wrote_yesterday: false } };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  window.localStorage.clear();
  reloadSelection();
  history.replaceState(null, "", "/aula/aula");
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

describe("the children's bar", () => {
  it("shows each child's picture, or its initial without one, and the looks", async () => {
    const { card } = await mount(BAR, "thu-1000", { states: STATES });
    expect(all(card, ".kid-face img.face")).toHaveLength(2);
    expect(texts(card, ".kid-label")).toEqual(["Ida", "Oskar"]);
    expect(all(card, ".kid-face").map((face) => face.getAttribute("aria-pressed"))).toEqual([
      "true",
      "true",
    ]);
    expect(texts(card, ".look")).toEqual(["Rækker", "Kolonner", "Tavle"]);
    const { card: plain } = await mount(BAR, "thu-1000", { config: { look_switch: false } });
    expect(texts(plain, ".face.initial")).toEqual(["I", "O"]);
    expect(all(plain, ".looks")).toEqual([]);
  });

  it("hides a child on every card, but never the last one", async () => {
    const { card } = await mount(BAR, "thu-1000");
    const { card: overview } = await mount(OVERVIEW, "thu-1000");
    await tap(card, ".kid-face", "Ida");
    await settled(overview);
    expect(selection().hidden).toEqual([1001]);
    expect(texts(overview, ".ov-name")).toEqual(["Oskar"]);
    expect(find(card, ".kid-face", "Ida").getAttribute("aria-pressed")).toBe("false");
    await tap(card, ".kid-face", "Oskar");
    expect(selection().hidden).toEqual([1001]);
    const { card: idaOnly } = await mount(OVERVIEW, "thu-1000", { config: { children: [1001] } });
    expect(text(idaOnly)).toBe("Alle kortets børn er slået fra i børnebjælken.");
  });

  it("switches the overview's look, unless the overview keeps one of its own", async () => {
    const { card } = await mount(BAR, "thu-1000");
    const { card: overview } = await mount(OVERVIEW, "thu-1000");
    const { card: own } = await mount(OVERVIEW, "thu-1000", { config: { look: "columns" } });
    await tap(card, ".look", "Tavle");
    await settled(overview);
    await settled(own);
    expect(find(card, ".look", "Tavle").getAttribute("aria-pressed")).toBe("true");
    expect(all(overview, ".overview.look-board")).toHaveLength(1);
    expect(all(own, ".overview.look-columns")).toHaveLength(1);
  });

  it("names and pictures a child by the person standing in for it", async () => {
    const { card } = await mount(BAR, "thu-1000", {
      states: STATES,
      config: { people: [{ child: 1001, person: "person.lille_ida" }] },
    });
    const { card: overview } = await mount(OVERVIEW, "thu-1000", { states: STATES });
    expect(texts(card, ".kid-label")).toEqual(["Lille Ida", "Oskar"]);
    expect(texts(overview, ".ov-name")).toEqual(["Lille Ida", "Oskar"]);
    expect(find(card, ".kid-face img", undefined, HTMLElement).getAttribute("src")).toBe(
      STATES["person.lille_ida"]?.attributes.entity_picture,
    );
  });

  it("takes the child's own name and picture where the person has none", async () => {
    const states = {
      ...STATES,
      "person.lille_ida": { state: "home", attributes: { friendly_name: " " } },
    };
    const { card } = await mount(BAR, "thu-1000", {
      states,
      config: { people: [{ child: 1001, person: "person.lille_ida" }] },
    });
    expect(texts(card, ".kid-label")).toEqual(["Ida", "Oskar"]);
    expect(find(card, ".kid-face img", undefined, HTMLElement).getAttribute("src")).toBe(
      STATES["image.ida_testesen"]?.attributes.entity_picture,
    );
  });

  it("shows the initial of a child without a picture", async () => {
    const { card, hass } = await mount(BAR, "thu-1000", {
      states: STATES,
      children: CHILDREN.map((child) =>
        child.child_id === 1002 ? { ...child, picture_entity: null } : child,
      ),
    });
    expect(all(card, "img.face")).toHaveLength(1);
    expect(texts(card, ".face.initial")).toEqual(["O"]);
    card.hass = { ...hass };
    await settled(card);
    expect(texts(card, ".face.initial")).toEqual(["O"]);
  });

  it("shows a picture once Home Assistant has it", async () => {
    const { card, hass } = await mount(BAR, "thu-1000");
    expect(all(card, "img.face")).toEqual([]);
    card.hass = { ...hass, states: STATES };
    await settled(card);
    expect(all(card, "img.face")).toHaveLength(2);
  });

  it("shows every child again with the default look after a while on a wall", async () => {
    const { card } = await mount(BAR, "thu-1000", { config: { size: "large" } });
    await tap(card, ".kid-face", "Ida");
    await tap(card, ".look", "Tavle");
    await vi.advanceTimersByTimeAsync(IDLE_RESET_MS + 60_000);
    expect(selection()).toMatchObject({ hidden: [], look: "rows" });
    unmountAll();
    const { card: phone } = await mount(BAR, "thu-1000");
    await tap(phone, ".look", "Tavle");
    await vi.advanceTimersByTimeAsync(IDLE_RESET_MS + 60_000);
    expect(selection().look).toBe("board");
  });
});

describe("the children's bar's view", () => {
  it("has nobody before the children are listed", () => {
    const snapshot = snapshotOf(scenarioNamed("thu-1000"));
    expect(
      childrenBarView(
        { ...snapshot, children: { list: undefined, error: undefined, refreshing: true } },
        [],
      ),
    ).toEqual({ children: [], missing: [], size: 2 });
  });
});

describe("the cards in a sections view", () => {
  it("say their size and their editor", async () => {
    const hass = fakeHass({ children: CHILDREN });
    for (const [element, grid, tag] of [
      [
        AulaConnectChildrenCard,
        { columns: "full", rows: "auto", min_columns: 6, min_rows: 1 },
        BAR,
      ],
      [
        AulaConnectOverviewCard,
        { columns: "full", rows: "auto", min_columns: 6, min_rows: 4 },
        OVERVIEW,
      ],
      [
        AulaConnectImportantCard,
        { columns: "full", rows: "auto", min_columns: 6, min_rows: 4 },
        "aula-connect-important-card",
      ],
      [
        AulaConnectSickCard,
        { columns: "full", rows: "auto", min_columns: 4, min_rows: 2 },
        "aula-connect-sick-card",
      ],
      [
        AulaConnectVacationCard,
        { columns: "full", rows: "auto", min_columns: 4, min_rows: 2 },
        "aula-connect-vacation-card",
      ],
    ] as const) {
      expect(new element().getGridOptions()).toEqual(grid);
      expect(element.getConfigForm().schema[0]?.name).toBe("children");
      await expect(element.getStubConfig(hass)).resolves.toEqual({ type: `custom:${tag}` });
    }
  });

  it("say their height before their data has come", () => {
    expect(new AulaConnectChildrenCard().getCardSize()).toBe(2);
    expect(new AulaConnectOverviewCard().getCardSize()).toBe(10);
    expect(new AulaConnectImportantCard().getCardSize()).toBe(6);
    expect(new AulaConnectSickCard().getCardSize()).toBe(3);
    expect(new AulaConnectVacationCard().getCardSize()).toBe(3);
  });

  it("send nothing without Home Assistant", async () => {
    await expect(new AulaConnectSickCard().callWS({ type: "x" })).rejects.toThrow(
      "Home Assistant is not connected",
    );
  });
});

describe("the overview", () => {
  it("shows each child's day, presence and important notes on one axis, and what is coming", async () => {
    const { card } = await mount(OVERVIEW, "thu-1000", { today: todayOf, states: STATES });
    expect(texts(card, ".ov-title")).toEqual(["I dag torsdag 29. oktober"]);
    expect(texts(card, ".ov-name")).toEqual(["Ida", "Oskar"]);
    expect(texts(card, ".presence")).toEqual(["I skole", "Kommer 07.45"]);
    expect(texts(card, ".ov-important-sum")).toEqual([
      "1 vigtig ting til i dag · 2 til i morgen",
      "1 vigtig ting til mandag",
    ]);
    expect(texts(card, ".ov-tile")).toEqual(["8 Vigtigt", "Ugeplan", "Uge", "Fravær"]);
    expect(texts(card, ".ov-coming-text")).toEqual([
      "Skolefoto",
      "Alma har fødselsdag",
      "Loppemarked i skolegården",
      "Forældremøde 3.B",
      "Karla har fødselsdag",
    ]);
    expect(card.getCardSize()).toBe(17);
  });

  it("marks the presence as today's beside tomorrow, and a child reported sick", async () => {
    const { card } = await mount(OVERVIEW, "thu-1530", {
      today: (child) => (child.child_id === 1001 ? todayOf(child) : sickToday(child)),
    });
    expect(texts(card, ".ov-title")).toEqual(["I morgen fredag 30. oktober"]);
    expect(texts(card, ".presence")).toEqual(["I dag: Til stede · går 15.30", "I dag: Syg"]);
    expect(texts(card, ".ov-top .label.warning")).toEqual(["Meldt syg i dag"]);
  });

  it("opens a child's important notes, and goes from them to the Important page", async () => {
    const { card } = await mount(OVERVIEW, "thu-1000", { today: todayOf });
    await tap(card, ".ov-important", "1 vigtig ting til i dag");
    expect(windowText(card)).toContain("Vigtigt for Ida");
    expect(windowText(card)).toContain("I dag · 29. okt.");
    expect(windowText(card)).toContain("Lektie til i dag: Læsebogen s. 38+39");
    const heard = vi.fn();
    window.addEventListener("location-changed", heard);
    await tap(card, "dialog .filled-button");
    window.removeEventListener("location-changed", heard);
    expect(location.pathname).toBe("/aula/vigtigt");
    expect(heard).toHaveBeenCalledOnce();
    expect(windowText(card)).toBe("");
  });

  it("opens a child's presence, with its times and reporting it sick", async () => {
    const { card, hass } = await mount(OVERVIEW, "thu-1000", {
      today: todayOf,
      commands: {
        "aula_connect/sick/report": () => ({ route: "aula" }),
        "aula_connect/threads": () => ({ threads: [] }),
      },
    });
    await tap(card, ".presence", "I skole");
    expect(windowText(card)).toContain("Ida i dag");
    expect(windowText(card)).toContain("Nu I skole");
    expect(windowText(card)).toContain("Planlagt 07.00–15.30");
    expect(windowText(card)).toContain("I dag kom 07.05");
    expect(windowText(card)).toContain("Hentes af Mor");
    expect(windowText(card)).toContain("Skema 08.00–12.55");
    await tap(card, "dialog .filled-button");
    expect(windowText(card)).toContain("Meld Ida syg");
    await tap(card, "dialog .filled-button", "Meld syg");
    expect(hass.callWS).toHaveBeenCalledWith({
      type: "aula_connect/sick/report",
      entry_id: "entry-a",
      child_id: 1001,
    });
  });

  it("opens the message from the presence of a child reported sick", async () => {
    const { card } = await mount(OVERVIEW, "thu-1000", {
      today: sickToday,
      commands: { "aula_connect/threads": () => ({ threads: [] }) },
    });
    await tap(card, ".presence", "Syg");
    expect(windowText(card)).toContain("Nu Syg");
    await tap(card, "dialog .filled-button");
    expect(windowText(card)).toContain("Skriv en besked?");
  });

  it("opens an event coming, and goes to the pages", async () => {
    const { card } = await mount(OVERVIEW, "thu-1000");
    await tap(card, ".ov-coming-row .opens", "Skolefoto");
    expect(windowText(card)).toContain("Skolefoto");
    await tap(card, ".detail-close");
    await tap(card, ".ov-tile:nth-child(3)");
    expect(location.pathname).toBe("/aula/uge");
    const { card: away } = await mount(OVERVIEW, "thu-1000", {
      config: { paths: { week: "/kiosk/uge" } },
    });
    await tap(away, ".ov-tile:nth-child(3)");
    expect(location.pathname).toBe("/kiosk/uge");
  });

  it("shows a column per child, with the next important notes", async () => {
    setLook("columns");
    const { card } = await mount(OVERVIEW, "thu-1000", { today: todayOf });
    expect(all(card, ".ov-col")).toHaveLength(2);
    expect(all(card, ".ov-col:nth-child(1) .ov-important-line")).toHaveLength(3);
    expect(texts(card, ".ov-col .ov-more")).toEqual(["+ 3 mere"]);
    await tap(card, ".ov-col .ov-important");
    expect(windowText(card)).toContain("Vigtigt for Ida");
  });

  it("leaves out what is important where a child has nothing", async () => {
    setLook("columns");
    const { card } = await mount(OVERVIEW, "no-week-plan");
    expect(all(card, ".ov-col")).toHaveLength(2);
    expect(all(card, ".ov-important")).toEqual([]);
  });

  it("shows a board of large tiles: the subjects, what to pack, and what is important", async () => {
    setLook("board");
    const { card } = await mount(OVERVIEW, "thu-1000", {
      config: {
        packing: [{ subject: "Idræt", items: ["Idrætstøj", "Fløjte"] }],
        pack_icons: { fløjte: "mdi:whistle" },
        board: { important: "button" },
      },
    });
    expect(texts(card, ".board-subject")[0]).toBe("Idræt");
    expect(texts(card, ".board-thing")).toEqual(["Idrætstøj til Idræt", "Fløjte til Idræt"]);
    expect(all(card, ".board-thing > ha-icon").map((icon) => icon.getAttribute("icon"))).toEqual([
      "mdi:tshirt-crew-outline",
      "mdi:whistle",
    ]);
    expect(all(card, ".board-thing-for ha-icon").map((icon) => icon.getAttribute("icon"))).toEqual([
      "mdi:run",
      "mdi:run",
    ]);
    expect(texts(card, ".board-head")).toEqual(["I dag har du", "Husk at pakke", "I dag har du"]);
    expect(texts(card, ".board-head")[0]).toBe("I dag har du");
    expect(all(card, ".ov-panel .ov-important.is-button")).toHaveLength(2);
    expect(all(card, ".ov-important-lines")).toEqual([]);
    await tap(card, ".ov-important.is-button");
    expect(windowText(card)).toContain("Vigtigt for Ida");
  });

  it("says on the board from when to when, and opens a subject's first lesson from its tile", async () => {
    setLook("board");
    const { card } = await mount(OVERVIEW, "thu-1000", { today: todayOf });
    expect(texts(card, ".ov-free")).toEqual(["08.00–12.55", "08.00–14.30"]);
    expect(all(card, ".ov-clock")).toEqual([]);
    expect(texts(card, ".presence")).toEqual(["I skole", "Kommer 07.45"]);
    expect(texts(card, "button.board-subject")).toEqual([
      "Idræt",
      "Dansk",
      "Engelsk",
      "Matematik",
      "Tysk",
      "Geografi",
      "Klassens tid",
    ]);
    await tap(card, "button.board-subject", "Dansk");
    expect(windowText(card)).toContain("Dansk");
    expect(windowText(card)).toContain("10.05");
  });

  it("shows a child's school hours on a clock where asked, which a tap shows large", async () => {
    setLook("board");
    const { card } = await mount(OVERVIEW, "thu-1000", {
      today: (child) => (child.child_id === 1001 ? todayOf(child) : sickToday(child)),
      config: { board: { clock: "analog" } },
    });
    expect(all(card, "button.ov-clock").map((clock) => clock.getAttribute("aria-label"))).toEqual([
      "Skole 08.00–\u206012.55; klokken er 10.00",
    ]);
    expect(all(card, ".ov-clock .clock-hour")).toHaveLength(12);
    expect(texts(card, ".presence")).toEqual(["Syg"]);
    await tap(card, "button.ov-clock");
    expect(texts(card, "dialog .clock-zoom-hours")).toEqual(["08.00–12.55"]);
    expect(all(card, "dialog .clock-zoom .clock-hour")).toHaveLength(12);
    await tap(card, "dialog .clock-zoom");
    expect(windowText(card)).toBe("");
  });

  it("shows the clock without a presence, and the vacation instead of it", async () => {
    setLook("board");
    const { card } = await mount(OVERVIEW, "thu-1000", {
      config: { board: { clock: "analog" } },
      commands: {
        "aula_connect/vacations": (message) =>
          message.child_id === 1002
            ? {
                vacations: [
                  { id: 1, start: "2026-10-29", end: "2026-10-30", comment: "", editable: true },
                ],
              }
            : { vacations: [] },
      },
    });
    expect(all(card, "button.ov-clock")).toHaveLength(1);
    expect(texts(card, ".presence")).toEqual(["Ferie/fri til fre. 30. okt."]);
  });

  it("names a board's day tomorrow by its weekday", async () => {
    setLook("board");
    const { card } = await mount(OVERVIEW, "thu-1530");
    expect(texts(card, ".board-head")[0]).toBe("Fredag har du");
  });

  it("lists the next important notes, each with its subject and day, and opens them all", async () => {
    const { card } = await mount(OVERVIEW, "thu-1000", { today: todayOf });
    expect(all(card, ".ov-row:nth-child(1) .ov-important-line")).toHaveLength(3);
    expect(texts(card, ".ov-row:nth-child(1) .ov-when")).toEqual(["i dag", "i morgen", "i morgen"]);
    expect(texts(card, ".ov-row:nth-child(1) .ov-important-text")[0]).toBe(
      "Lektie til i dag: Læsebogen s. 38+39",
    );
    expect(
      all(card, ".ov-important-line .label.subject").map((chip) => chip.getAttribute("style")),
    ).toContain("--subject: #e57373");
    expect(texts(card, ".ov-row .ov-more")).toEqual(["+ 3 mere"]);
    await tap(card, ".ov-row .ov-important");
    expect(windowText(card)).toContain("Vigtigt for Ida");
    setLook("board");
    await settled(card);
    expect(all(card, ".ov-panel .ov-important.is-list")).toHaveLength(2);
  });

  it("lists as many important notes as a look is set to, and says how many more there are", async () => {
    setLook("columns");
    const { card } = await mount(OVERVIEW, "thu-1000", {
      config: { columns: { important_max: 1 } },
      week: (_child, start) => {
        const data = weekData(start);
        return { ...data, tasks: data.tasks.filter((task) => task.date === "2026-10-29") };
      },
    });
    expect(all(card, ".ov-col:nth-child(1) .ov-important-line")).toHaveLength(1);
    expect(texts(card, ".ov-col:nth-child(1) .ov-more")).toEqual([]);
    unmountAll();
    const { card: more } = await mount(OVERVIEW, "thu-1000", {
      config: { columns: { important_max: 1 } },
    });
    expect(texts(more, ".ov-col:nth-child(1) .ov-more")).toEqual(["+ 5 mere"]);
  });

  it("opens a lesson or an event from a child's day bar", async () => {
    const { card } = await mount(OVERVIEW, "thu-1000", { today: todayOf });
    const items = all(card, ".ov-bar button.bar-item");
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]?.getAttribute("aria-label")).toBe("Idræt 08.00–09.30");
    await tap(card, ".ov-bar button.bar-item");
    expect(windowText(card)).toContain("Idræt");
    const { card: evening } = await mount(OVERVIEW, "thu-1930");
    await tap(evening, ".ov-bar button.bar-item.ev", "Skolefoto");
    expect(windowText(evening)).toContain("Skolefoto");
  });

  it("puts what to pack in each row, with an icon by what it is", async () => {
    const { card } = await mount(OVERVIEW, "thu-1000", {
      config: { packing: [{ subject: "Idræt", items: ["Badetøj", "Ting"] }] },
    });
    expect(texts(card, ".ov-pack")).toEqual(["Husk: Badetøj Ting"]);
    expect(all(card, ".ov-pack ha-icon").map((icon) => icon.getAttribute("icon"))).toEqual([
      "mdi:swim",
      "mdi:bag-personal-outline",
    ]);
    expect(packIcon("Håndklæde", {})).toBe("mdi:shower");
  });
});

/** A fortnight from `monday` with no lessons, and the week plan and the events as asked. */
function bare(monday: string, plan: boolean, events = false): Record<string, unknown> {
  const data = weekData(monday);
  return {
    ...data,
    lessons: [],
    week_plan: plan,
    tasks: plan ? data.tasks : [],
    events: events ? data.events : [],
    birthdays: [],
  };
}

describe("the overview's other days", () => {
  it("names a day shared further on by its weekday, and gives each child its own day otherwise", async () => {
    const { card } = await mount(OVERVIEW, "holiday", { today: todayOf });
    expect(texts(card, ".ov-title")).toEqual(["Mandag 19. oktober"]);
    expect(texts(card, ".ov-coming-day")[0]).toBe("I dag 14. okt.");
    expect(texts(card, ".ov-coming-row .sr")[0]).toBe("Ida og Oskar");
    const { card: apart } = await mount(OVERVIEW, "empty-tue");
    expect(texts(apart, ".ov-title")).toEqual([]);
    expect(texts(apart, ".ov-day")).toEqual(["Onsdag 28. oktober", "Tirsdag 27. oktober"]);
  });

  it("says when every lesson is cancelled, or a day has no timetable", async () => {
    const { card } = await mount(OVERVIEW, "thu-1930-allcancelled");
    expect(texts(card, ".ov-hours")[0]).toBe("Alle timer aflyst");
    const { card: none } = await mount(OVERVIEW, "thu-1000", {
      week: (_child, start) => bare(start, true, true),
    });
    expect(texts(none, ".ov-hours")).toEqual(["Intet skema", "Intet skema"]);
    expect(all(none, ".ov-bar")).toEqual([]);
    expect(all(none, ".ov-free")).toEqual([]);
  });

  it("says when a child has no school days", async () => {
    const holiday = (start: string): Record<string, unknown> => ({
      ...bare(start, false),
      events: [allDay("h", "Ferie", "holiday", start, plusDays(start, 13))],
    });
    const { card } = await mount(OVERVIEW, "thu-1000", {
      week: (child, start) => (child.child_id === 1001 ? holiday(start) : bare(start, false)),
    });
    expect(texts(card, ".ov-row .empty")).toEqual(["Ingen skoledage"]);
  });

  it("says when there is nothing in the calendar", async () => {
    const { card } = await mount(OVERVIEW, "thu-1000", {
      week: (_child, start) => bare(start, false),
    });
    expect(texts(card, ".ov-coming .empty")).toEqual(["Intet i kalenderen"]);
    expect(all(card, ".ov-important")).toEqual([]);
  });

  it("waits for a child's data in every look", async () => {
    for (const look of ["rows", "columns", "board"] as const) {
      setLook(look);
      const { card } = await mount(OVERVIEW, "thu-1000", {
        week: (child, start) => (child.child_id === 1001 ? weekData(start) : undefined),
      });
      expect(texts(card, ".ov-name")).toEqual(["Ida", "Oskar"]);
      expect(text(card)).toContain("Henter");
      unmountAll();
    }
  });

  it("shows important notes without a subject or a text, and one a week ahead by its date", async () => {
    const { card } = await mount(OVERVIEW, "empty-tue", {
      week: (child, start) => {
        const data = weekData(start);
        return child.child_id === 1001
          ? {
              ...data,
              tasks: [
                ...data.tasks,
                { ...data.tasks[0], id: "x1", subject: "", title: "Madpakke", content: "" },
              ],
            }
          : { ...data, tasks: data.tasks.filter((task) => task.date >= plusDays(start, 8)) };
      },
    });
    await tap(card, ".ov-important");
    expect(windowText(card)).toContain("Mandag · 2. nov.");
    expect(windowText(card)).toContain("Madpakke");
    setLook("columns");
    await settled(card);
    expect(
      all(card, ".ov-col:nth-child(1) .ov-important-line").filter(
        (line) => !line.querySelector(".label.subject"),
      ),
    ).not.toEqual([]);
    expect(texts(card, ".ov-col:nth-child(2) .ov-when")).toEqual(["3. nov.", "4. nov."]);
  });

  it("names an unknown subject's tile by a book", () => {
    const namer = subjectNamer([]);
    expect(subjectIcon(namer("Kinesisk"))).toBe("mdi:book-outline");
    expect(subjectIcon(namer("Dansk"))).toBe("mdi:book-open-variant");
  });

  it("shows what to pack in a column without icons, and a board with nothing due", async () => {
    setLook("columns");
    const { card } = await mount(OVERVIEW, "thu-1000", {
      config: { packing: [{ subject: "Idræt", items: ["Badetøj"] }] },
    });
    expect(texts(card, ".ov-pack")).toEqual(["Husk: Badetøj"]);
    expect(all(card, ".ov-pack ha-icon")).toEqual([]);
    unmountAll();
    setLook("board");
    const { card: board } = await mount(OVERVIEW, "no-week-plan", {
      config: { board: { important: "button" } },
    });
    expect(all(board, ".ov-important")).toEqual([]);
    expect(texts(board, ".board-head")[0]).toBe("Fredag har du");
  });
});

describe("a child's presence window", () => {
  it("shows the times there are, and how the child is reported sick", async () => {
    const { card } = await mount(OVERVIEW, "thu-1000", {
      today: (child) =>
        child.child_id === 1001
          ? {
              presence: { status: 8, check_out: "14:10", planned_out: "15:00" },
              sick: { route: "tabulex" },
            }
          : { presence: { status: 0, planned_in: "07:45" }, sick: { route: "none" } },
    });
    await tap(card, ".presence", "Gået hjem");
    expect(windowText(card)).toContain("Planlagt 15.00");
    expect(windowText(card)).toContain("I dag gik 14.10");
    expect(windowText(card)).not.toContain("Hentes af");
    expect(texts(card, "dialog .filled-button")).toContain("Meld Ida syg");
    await tap(card, ".detail-close");
    await tap(card, ".presence", "Kommer");
    expect(windowText(card)).toContain("Planlagt 07.45");
    expect(windowText(card)).not.toContain("I dag kom");
    expect(windowText(card)).toContain("Oskar kan ikke meldes syg herfra. Meld syg i Aula.");
  });

  it("offers reporting sick and writing only where Aula Connect's options allow them", async () => {
    const only = (allowed: readonly Change[]): Child[] =>
      CHILDREN.map((child) => ({ ...child, allowed }));
    const { card } = await mount(OVERVIEW, "thu-1000", {
      children: only(["messages"]),
      today: todayOf,
    });
    await tap(card, ".presence", "I skole");
    expect(all(card, "dialog .window-actions button")).toEqual([]);
    expect(texts(card, "dialog .off")).toEqual([
      "Sygemelding er slået fra i Aula Connects indstillinger.",
    ]);
    unmountAll();
    const { card: sick } = await mount(OVERVIEW, "thu-1000", {
      children: only(["sick_reports"]),
      today: sickToday,
    });
    await tap(sick, ".presence", "Syg");
    expect(all(sick, "dialog .window-actions button")).toEqual([]);
    expect(texts(sick, "dialog .off")).toEqual([
      "Svar i tråde er slået fra i Aula Connects indstillinger.",
    ]);
  });

  it("shows a child reported sick without times, on a day without school", async () => {
    const { card } = await mount(OVERVIEW, "thu-1000", {
      week: (_child, start) => bare(start, false),
      today: () => ({ presence: null, sick: { route: "aula", today: true } }),
    });
    await tap(card, ".presence");
    expect(windowText(card)).not.toContain("Tider");
    expect(windowText(card)).toContain("Nu Syg");
  });
});

describe("Fravær on the overview", () => {
  const pending = (child: Child): Record<string, unknown> => ({
    ...todayOf(child),
    vacation_requests_pending: 1,
  });
  const quiet = { "aula_connect/vacations": () => ({ vacations: [] }) };

  it("shows a request awaiting an answer once for both children, and answers it for both", async () => {
    const { card, hass } = await mount(OVERVIEW, "thu-1000", {
      today: pending,
      commands: {
        ...quiet,
        "aula_connect/vacation_requests": () => REQUESTS,
        "aula_connect/vacation_request/answer": () => null,
      },
    });
    expect(texts(card, ".ov-band .family-title")).toEqual(["Juleferie"]);
    expect(all(card, ".ov-band .face")).toHaveLength(2);
    expect(texts(card, ".ov-tile")).toContain("1 Fravær");
    await tap(card, ".ov-band .family-row", "Juleferie");
    expect(windowText(card)).toContain("Ida og Oskar");
    for (const row of [1, 2, 3]) {
      present(
        all(card, `dialog .answer-day:nth-child(${String(row)}) .choice`)[1] as
          HTMLButtonElement | undefined,
      ).click();
      await settled(card);
    }
    const asked = hass.callWS.mock.calls.length;
    await tap(card, "dialog .filled-button", "Send svar");
    const sent = hass.callWS.mock.calls
      .map(([message]) => message)
      .filter((message) => message.type === "aula_connect/vacation_request/answer");
    expect(sent.map((message) => message.child_id)).toEqual([1001, 1002]);
    expect(hass.callWS.mock.calls.length).toBeGreaterThan(asked + 2);
  });

  it("shows two requests, and a way to Fravær for the rest", async () => {
    const request = present(REQUESTS.requests[0]);
    const three = {
      requests: ["Juleferie", "Vinterferie", "Påskeferie"].map((title, index) => ({
        ...request,
        id: 100 + index,
        title,
      })),
    };
    const { card } = await mount(OVERVIEW, "thu-1000", {
      today: pending,
      commands: { ...quiet, "aula_connect/vacation_requests": () => three },
    });
    expect(texts(card, ".ov-band .family-title")).toEqual(["Juleferie", "Påskeferie"]);
    await tap(card, ".ov-band-more", "+ 1 mere");
    expect(location.pathname).toBe("/aula/fravaer");
  });

  it("says the requests awaiting an answer could not be read, and nothing where none awaits", async () => {
    const { card } = await mount(OVERVIEW, "thu-1000", {
      today: pending,
      commands: {
        ...quiet,
        "aula_connect/vacation_requests": () => {
          throw wsError("home_assistant_error", "Aula is down");
        },
      },
    });
    expect(texts(card, ".ov-band-note")).toEqual(["Ferieanmodningerne kunne ikke hentes"]);
    expect(all(card, ".ov-band")).toEqual([]);
    unmountAll();
    const { card: none } = await mount(OVERVIEW, "thu-1000", {
      today: (child) => ({ ...todayOf(child), vacation_requests_pending: 0 }),
      commands: quiet,
    });
    expect(all(none, ".ov-band, .ov-band-note")).toEqual([]);
  });

  it("shows a vacation on the child's chip, and one coming in Det sker", async () => {
    const vacation = (id: number, start: string, end: string) => ({
      id,
      start,
      end,
      comment: "",
      editable: true,
    });
    const { card } = await mount(OVERVIEW, "thu-1000", {
      today: todayOf,
      commands: {
        "aula_connect/vacations": (message) =>
          message.child_id === 1002
            ? {
                vacations: [
                  vacation(1, "2026-10-28", "2026-10-29"),
                  vacation(2, "2026-10-29", "2026-10-30"),
                  vacation(3, "2026-11-02", "2026-11-04"),
                  vacation(4, "2026-11-03", "2026-11-03"),
                ],
              }
            : { vacations: [vacation(5, "2026-10-29", "2026-10-29")] },
      },
    });
    expect(texts(card, ".presence")).toEqual(["Ferie/fri i dag", "Ferie/fri til fre. 30. okt."]);
    expect(texts(card, ".ov-coming-text")).toContain("Ferie/fri til ons. 4. nov.");
    expect(texts(card, ".ov-coming-text")).toContain("Ferie/fri");
  });

  it("asks about a child sick the school day before, until it is checked in or the day switches", async () => {
    // Ida came in this morning; Oskar's institution registers no presence.
    const yesterday = (child: Child): Record<string, unknown> => ({
      ...todayOf(child),
      ...(child.child_id === 1002 ? { presence: null } : {}),
      sick: { route: "aula", today: false, since: "2026-10-28", wrote_yesterday: false },
    });
    const { card } = await mount(OVERVIEW, "thu-1000", { today: yesterday, commands: quiet });
    expect(texts(card, ".presence")).toEqual(["I skole", "Syg i går – stadig syg?"]);
    await tap(card, ".presence.ask");
    expect(windowText(card)).toContain("Meld Oskar syg");
    unmountAll();
    const { card: switched } = await mount(OVERVIEW, "thu-1000", {
      today: yesterday,
      commands: quiet,
      config: { switch_time: "09:00" },
    });
    expect(all(switched, ".presence.ask")).toEqual([]);
  });

  it("shows a child answered not to come today as on a vacation", async () => {
    const today = {
      ...present(REQUESTS.requests[1]),
      title: "Efterårsferie",
      days: [{ date: "2026-10-29", is_coming: false, entry_time: null, exit_time: null }],
    };
    const { card } = await mount(OVERVIEW, "thu-1000", {
      today: (child) => ({ ...todayOf(child), vacation_requests_pending: 0 }),
      commands: { ...quiet, "aula_connect/vacation_requests": () => ({ requests: [today] }) },
    });
    expect(texts(card, ".presence")).toEqual(["Ferie/fri i dag", "Ferie/fri i dag"]);
  });

  it("shows a child reported sick as sick, though on a vacation", async () => {
    const { card } = await mount(OVERVIEW, "thu-1000", {
      today: sickToday,
      commands: {
        "aula_connect/vacations": () => ({
          vacations: [
            { id: 1, start: "2026-10-29", end: "2026-10-30", comment: "", editable: true },
          ],
        }),
      },
    });
    expect(texts(card, ".presence")).toEqual(["Syg", "Syg"]);
  });

  it("leaves out the tiles set to false, and the window's way to the Important page", async () => {
    const { card } = await mount(OVERVIEW, "thu-1000", {
      config: { paths: { important: false, absence: false } },
    });
    expect(texts(card, ".ov-tile")).toEqual(["Ugeplan", "Uge"]);
    await tap(card, ".ov-important");
    expect(all(card, "dialog .window-actions")).toEqual([]);
    unmountAll();
    const { card: bare } = await mount(OVERVIEW, "thu-1000", {
      config: { paths: { important: false, weekplan: false, week: false, absence: false } },
    });
    expect(all(bare, ".ov-nav")).toEqual([]);
  });
});
