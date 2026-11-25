import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../../src/index.ts";
import { AulaConnectChildrenCard } from "../../src/cards/children-card.ts";
import { AulaConnectHomeworkCard } from "../../src/cards/homework-card.ts";
import { AulaConnectOverviewCard } from "../../src/cards/overview-card.ts";
import { AulaConnectSickCard } from "../../src/cards/sick-card.ts";
import { AulaConnectVacationCard } from "../../src/cards/vacation-card.ts";
import { AulaConnectVacationRequestsCard } from "../../src/cards/vacation-requests-card.ts";
import { forget } from "../../src/core/memory.ts";
import { reloadSelection, selection, setLook } from "../../src/core/selection.ts";
import type { Child } from "../../src/core/types.ts";
import { IDLE_RESET_MS } from "../../src/model/focus.ts";
import { subjectNamer } from "../../src/model/subjects.ts";
import { childrenBarView } from "../../src/ui/children-bar.ts";
import { packIcon, subjectIcon } from "../../src/ui/overview.ts";
import { fakeHass } from "../fake-hass.ts";
import { STATES, todayOf } from "../fixtures/family.ts";
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
        AulaConnectHomeworkCard,
        { columns: "full", rows: "auto", min_columns: 6, min_rows: 4 },
        "aula-connect-homework-card",
      ],
      [
        AulaConnectSickCard,
        { columns: 6, rows: "auto", min_columns: 4, min_rows: 2 },
        "aula-connect-sick-card",
      ],
      [
        AulaConnectVacationRequestsCard,
        { columns: 6, rows: "auto", min_columns: 4, min_rows: 2 },
        "aula-connect-vacation-requests-card",
      ],
      [
        AulaConnectVacationCard,
        { columns: 6, rows: "auto", min_columns: 4, min_rows: 2 },
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
    expect(new AulaConnectHomeworkCard().getCardSize()).toBe(6);
    expect(new AulaConnectSickCard().getCardSize()).toBe(3);
    expect(new AulaConnectVacationCard().getCardSize()).toBe(3);
    expect(new AulaConnectVacationRequestsCard().getCardSize()).toBe(3);
  });

  it("send nothing without Home Assistant", async () => {
    await expect(new AulaConnectSickCard().callWS({ type: "x" })).rejects.toThrow(
      "Home Assistant is not connected",
    );
  });
});

describe("the overview", () => {
  it("shows each child's day, presence and homework on one axis, and what is coming", async () => {
    const { card } = await mount(OVERVIEW, "thu-1000", { today: todayOf, states: STATES });
    expect(texts(card, ".ov-title")).toEqual(["I dag torsdag 29. oktober"]);
    expect(texts(card, ".ov-name")).toEqual(["Ida", "Oskar"]);
    expect(texts(card, ".presence")).toEqual(["I skole til 12.55", "Kommer 07.45"]);
    expect(texts(card, ".ov-homework")).toEqual([
      "1 lektie til i dag · 2 til i morgen",
      "1 lektie til mandag",
    ]);
    expect(texts(card, ".ov-tile")).toEqual(["8 Lektier", "Ugeplan", "Uge"]);
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
    expect(texts(card, ".presence")).toEqual(["I dag: I SFO · går 15.30", "I dag: Syg"]);
    expect(texts(card, ".ov-top .label.warning")).toEqual(["Meldt syg i dag"]);
  });

  it("opens a child's homework, and goes from it to the homework page", async () => {
    const { card } = await mount(OVERVIEW, "thu-1000", { today: todayOf });
    await tap(card, ".ov-homework", "1 lektie til i dag");
    expect(windowText(card)).toContain("Idas lektier");
    expect(windowText(card)).toContain("I dag · 29. okt.");
    expect(windowText(card)).toContain("Lektie til i dag: Læsebogen s. 38+39");
    const heard = vi.fn();
    window.addEventListener("location-changed", heard);
    await tap(card, "dialog .filled-button");
    window.removeEventListener("location-changed", heard);
    expect(location.pathname).toBe("/aula/lektier");
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
    expect(windowText(card)).toContain("Nu I skole til 12.55");
    expect(windowText(card)).toContain("Planlagt 07.00–15.30");
    expect(windowText(card)).toContain("I dag kom 07.05");
    expect(windowText(card)).toContain("Hentes af Mor");
    expect(windowText(card)).toContain("Skole 08.00–12.55");
    await tap(card, "dialog .filled-button");
    expect(windowText(card)).toContain("Meld Ida syg");
    await tap(card, "dialog .filled-button", "Meld syg");
    expect(hass.callWS).toHaveBeenCalledWith({
      type: "aula_connect/sick/report",
      entry_id: "entry-a",
      child_id: 1001,
    });
  });

  it("opens the teachers' message from the presence of a child reported sick", async () => {
    const { card } = await mount(OVERVIEW, "thu-1000", {
      today: sickToday,
      commands: { "aula_connect/threads": () => ({ threads: [] }) },
    });
    await tap(card, ".presence", "Syg");
    expect(windowText(card)).toContain("Nu Syg");
    await tap(card, "dialog .filled-button");
    expect(windowText(card)).toContain("Skriv til lærerne");
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

  it("shows a column per child, with the homework soon", async () => {
    setLook("columns");
    const { card } = await mount(OVERVIEW, "thu-1000", { today: todayOf });
    expect(all(card, ".ov-col")).toHaveLength(2);
    expect(texts(card, ".ov-soon .ov-more")).toEqual(["+ 2 mere"]);
    expect(texts(card, ".ov-soon-head")).toEqual(["Lektier snart", "Lektier snart"]);
    await tap(card, ".ov-soon");
    expect(windowText(card)).toContain("Idas lektier");
  });

  it("says in a column when a child has no homework", async () => {
    setLook("columns");
    const { card } = await mount(OVERVIEW, "no-week-plan");
    expect(texts(card, ".ov-col .ov-homework.none")).toEqual(["Ingen lektier", "Ingen lektier"]);
  });

  it("shows a board of large tiles: the subjects, what to pack, and the homework", async () => {
    setLook("board");
    const { card } = await mount(OVERVIEW, "thu-1000", {
      config: {
        packing: [{ subject: "Idræt", items: ["Idrætstøj", "Fløjte"] }],
        pack_icons: { fløjte: "mdi:whistle" },
      },
    });
    expect(texts(card, ".board-subject")[0]).toBe("Idræt");
    expect(texts(card, ".board-thing")).toEqual(["Idrætstøj", "Fløjte"]);
    expect(all(card, ".board-thing ha-icon").map((icon) => icon.getAttribute("icon"))).toEqual([
      "mdi:tshirt-crew-outline",
      "mdi:whistle",
    ]);
    expect(texts(card, ".board-none")).toEqual(["Intet særligt"]);
    expect(texts(card, ".board-head")[0]).toBe("I dag har du");
    await tap(card, ".board-homework");
    expect(windowText(card)).toContain("Idas lektier");
  });

  it("names a board's day tomorrow by its weekday, and a long subject by its abbreviation", async () => {
    setLook("board");
    const { card } = await mount(OVERVIEW, "thu-1530");
    expect(texts(card, ".board-head")[0]).toBe("Fredag har du");
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
    expect(texts(card, ".ov-homework.none")).toEqual(["Ingen lektier", "Ingen lektier"]);
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

  it("shows homework without a subject or a text, and homework a week ahead by its date", async () => {
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
    await tap(card, ".ov-homework");
    expect(windowText(card)).toContain("Mandag · 2. nov.");
    expect(windowText(card)).toContain("Madpakke");
    setLook("columns");
    await settled(card);
    expect(texts(card, ".ov-soon-item b")).toContain("");
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
    const { card: board } = await mount(OVERVIEW, "no-week-plan");
    expect(all(board, ".board-homework")).toEqual([]);
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
    expect(windowText(card)).toContain(
      "Aula Connect har endnu ikke fundet ud af, hvordan Oskar meldes syg herfra",
    );
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
