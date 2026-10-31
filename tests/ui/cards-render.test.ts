import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../../src/index.ts";
import { forget } from "../../src/core/memory.ts";
import type { Child, WeekData } from "../../src/core/types.ts";
import { IDLE_RESET_MS } from "../../src/model/focus.ts";
import { present, wsError, type FakeHass } from "../fake-hass.ts";
import { all, mount, text, unmountAll, type Card } from "../fixtures/mount.ts";
import { OSKAR_ELSEWHERE, SCENARIOS, scenarioNamed } from "../fixtures/scenarios.ts";
import { allDay, CHILDREN, local, weekData, without } from "../fixtures/week.ts";

const [IDA] = CHILDREN as [Child, Child];

const DAY = "aula-connect-day-card";
const HOMEWORK = "aula-connect-weekplan-card";
const WEEK = "aula-connect-week-card";

/** Returns what a screen reader reads of an element: without what is hidden from it. */
function spokenOf(root: ParentNode, selector: string): string {
  const element = present(root.querySelector(selector)).cloneNode(true) as Element;
  for (const hidden of element.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
  return element.textContent
    .replace(/\u2060/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function spoken(card: Card, selector: string): string {
  return spokenOf(present(card.shadowRoot), selector);
}

function texts(card: Card, selector: string): string[] {
  return all(card, selector).map((element) =>
    element.textContent
      .replace(/\u2060/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

async function open(card: Card, selector: string): Promise<void> {
  const details = present(card.shadowRoot?.querySelector<HTMLDetailsElement>(selector));
  details.open = true;
  details.dispatchEvent(new Event("toggle"));
  await card.updateComplete;
}

/** Answers a scenario's subscriptions with each child's data changed. */
function changed(scenario: string, change: (data: WeekData, child: Child) => WeekData) {
  const item = scenarioNamed(scenario);
  return {
    setup: (hass: FakeHass) => {
      hass.connection.respond = (message: Record<string, unknown>) => {
        const child = present(item.children.find((c) => c.child_id === message.child_id));
        return change(item.data(child), child);
      };
    },
  };
}

/** Leaves Oskar's subscription unanswered, or refuses it with `error`. */
function oskar(error?: Error) {
  return {
    setup: (hass: FakeHass) => {
      const connection = hass.connection;
      const subscribe = connection.subscribeMessage.bind(connection);
      connection.subscribeMessage = (callback, message, options) => {
        if (message.child_id !== 1002) return subscribe(callback, message, options);
        return error ? Promise.reject(error) : Promise.resolve(() => Promise.resolve());
      };
    },
  };
}

/** Removes everything of some days: lessons, notes and events. */
function withoutDays(...days: string[]) {
  const on = (start: string): boolean => days.some((day) => start.startsWith(day));
  return (data: WeekData): WeekData => ({
    ...data,
    lessons: data.lessons.filter((lesson) => !on(lesson.start)),
    tasks: data.tasks.filter((task) => !on(task.date)),
    events: data.events.filter((event) => !on(event.start)),
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
});

afterEach(() => {
  unmountAll();
  forget();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("every card in every scenario", () => {
  const cases = [DAY, HOMEWORK, WEEK].flatMap((tag) =>
    SCENARIOS.flatMap((item) =>
      ["da", "en"].flatMap((language) =>
        [[1001], []].map((children) => [tag, item.id, language, children] as const),
      ),
    ),
  );

  it.each(cases)("%s at %s in %s for %j shows what it has", async (tag, id, language, children) => {
    const { card } = await mount(tag, id, { config: { children }, language });
    expect(all(card, '[aria-busy="true"]')).toEqual([]);
    expect(all(card, '[role="alert"]')).toEqual([]);
    expect(text(card)).not.toBe("");
  });
});

describe("the school day card", () => {
  it("answers each block for every child, naming the child, and says when one has nothing", async () => {
    const { card } = await mount(DAY, "thu-1930");
    expect(texts(card, ".strip .kid-name")).toEqual(["Ida", "Oskar"]);
    expect(texts(card, '[data-block="task"] .part-who span:last-child')).toEqual(["Ida", "Oskar"]);
    expect(texts(card, '[data-block="task"] .empty')).toEqual(["Intet i ugeplanen."]);
    expect(texts(card, ".lesson.cancelled .subject")).toEqual(["Klassens tid"]);
  });

  it("says birthdays in the header as words with icons, and events in the timetable", async () => {
    const { card } = await mount(DAY, "thu-1930", { config: { children: [1001] } });
    expect(all(card, ".chip")).toEqual([]);
    expect(all(card, ".hero .fact")).toHaveLength(1);
    expect(text(card, ".hero-text > .hours")).toBe("08.00–13.40");
    expect(texts(card, ".hero .facts > li")).toEqual(["Alma har fødselsdag"]);
    expect(texts(card, '[data-block="timetable"] .event-text')).toEqual(["Skolefoto"]);
    expect(all(card, '[data-block="events"], [data-block="birthdays"]')).toEqual([]);
  });

  it("keeps the dots of a line with the part after them, heard as pauses", async () => {
    const { card } = await mount(DAY, "fri-1400", { config: { children: [1001] } });
    expect(texts(card, ".hero .date-line .seg")).toEqual([
      "2. november",
      ", om 3 dage",
      ", næste skoledag",
    ]);
    expect(all(card, '.hero [aria-hidden="true"]').map((item) => item.textContent)).not.toContain(
      "·",
    );
  });

  it("puts a day's events in the timetable when it has no lessons, as a calendar does", async () => {
    const { card } = await mount(DAY, "motionsdag", { config: { children: [1001] } });
    expect(texts(card, ".block .empty")).toEqual(["Intet i ugeplanen."]);
    expect(texts(card, '[data-block="timetable"] .event-text')).toEqual(["Motionsdag"]);
  });

  it("names the weekdays passed over in one row, and counts the days that do not fit", async () => {
    const days = changed("thu-1930", withoutDays("2026-10-30", "2026-11-02", "2026-11-03"));
    const { card } = await mount(DAY, "thu-1930", { config: { children: [1001] }, ...days });
    expect(texts(card, ".bridge .bridge-label")).toEqual(["Fredag", "Lørdag", "Mandag–tirsdag"]);
    unmountAll();
    const { card: noon } = await mount(DAY, "thu-1200", {
      config: { children: [1001] },
      ...changed("thu-1200", withoutDays("2026-10-30", "2026-11-02", "2026-11-03")),
    });
    expect(texts(noon, ".bridge .bridge-label")).toEqual(["I dag", "Fredag"]);
    expect(texts(noon, ".bridge-more")).toEqual(["+ 3 dage uden skole"]);
  });

  it("names the child a row above is for, and a weekend's birthday by its icon", async () => {
    const { card } = await mount(DAY, "fri-1400", {
      ...changed("fri-1400", (data, child) =>
        child.child_id === 1002
          ? data
          : {
              ...data,
              events: data.events.filter((event) => !event.title.startsWith("Loppemarked")),
              birthdays: [...data.birthdays, { date: "2026-11-01", name: "Karl" }],
            },
      ),
    });
    expect(texts(card, ".bridge")).toEqual([
      "Lørdag Loppemarked i skolegården (Oskar) 10.00",
      "Søndag Karl har fødselsdag (Ida)",
    ]);
    expect(all(card, ".bridge ha-icon").map((item) => item.getAttribute("icon"))).toEqual([
      "mdi:calendar-star-outline",
      "mdi:cake-variant-outline",
    ]);
  });

  it("says what it knows when no school day and no holiday are in Aula", async () => {
    const { card } = await mount(DAY, "before-holiday", {
      config: { children: [1001] },
      ...changed("before-holiday", (data) => ({
        ...data,
        events: data.events.filter((event) => event.type !== "holiday"),
      })),
    });
    expect(spoken(card, "h2")).toBe("Ingen skoledage, i Aula til og med søndag 18. oktober");
  });

  it("shows the other children while one is loading, and why one cannot be shown", async () => {
    const { card } = await mount(DAY, "thu-1930", oskar());
    expect(all(card, ".child")).toHaveLength(2);
    expect(all(card, '.child [aria-busy="true"]')).toHaveLength(1);
    unmountAll();
    const { card: refused } = await mount(DAY, "thu-1930", oskar(wsError("not_found", "gone")));
    expect(all(refused, '.child [role="alert"]')).toHaveLength(1);
    expect(texts(refused, ".who-name")).toEqual(["Ida", "Oskar"]);
  });

  it("names the holiday ahead and the day school starts again", async () => {
    const { card } = await mount(DAY, "before-holiday", { config: { children: [1001] } });
    expect(spoken(card, "h2")).toBe(
      "Efterårsferie, 10.–18. oktober, skolen starter mandag 19. oktober",
    );
    expect(all(card, ".block")).toEqual([]);
  });

  it("names each child's header for screen readers when the children's days differ", async () => {
    const { card } = await mount(DAY, "two-schools");
    expect(spoken(card, ".child:first-child h2")).toBe("Ida: I morgen, 2. november");
    expect(spoken(card, ".child:last-child h2")).toBe(
      "Oskar: Tirsdag, 3. november, i overmorgen, næste skoledag",
    );
  });

  it("says a week plan is not in Aula yet, not that there is no homework", async () => {
    const { card } = await mount(DAY, "sun-1800-noplan", { config: { children: [1001] } });
    expect(text(card, '[data-block="task"] .empty')).toBe(
      "Ugeplanen for uge 45 er ikke i Aula endnu.",
    );
  });

  it("names the day's subjects where the bag is packed only while the timetable is hidden", async () => {
    const { card } = await mount(DAY, "thu-1930", {
      config: { children: [1001], show: { timetable: false } },
    });
    expect(text(card, ".pack-subjects")).toBe("Fag: Matematik, Dansk, Engelsk, Historie");
    const shown = await mount(DAY, "thu-1930", { config: { children: [1001] } });
    expect(all(shown.card, ".pack-subjects")).toEqual([]);
    const hidden = await mount(DAY, "thu-1930", {
      config: { children: [1001], show: { pack: false, timetable: false } },
    });
    expect(all(hidden.card, ".pack-subjects")).toEqual([]);
  });

  it("names an event over several days by when it began, and the days between as facts", async () => {
    const { card } = await mount(DAY, "tue-1930-camp", {
      config: { children: [1001] },
      language: "en",
    });
    expect(text(card, ".above")).toContain("Lejrskole i Thy 8:00 AM →");
    expect(all(card, ".hero .fact")).toEqual([]);
    expect(texts(card, '[data-block="timetable"] .event-text')).toEqual([
      "Lejrskole i ThyThy Lejren",
    ]);
  });

  it("puts the hours of each child on the wall in large type", async () => {
    const { card } = await mount(DAY, "thu-0715", {
      config: {
        size: "large",
        packing: [{ subject: "Idræt", items: ["Idrætstøj", "Indendørssko", "Håndklæde"] }],
      },
    });
    expect(all(card, ".aula.large .strip .hours")).toHaveLength(2);
    expect(all(card, ".aula.large .pack-item").map((item) => item.textContent)).toEqual([
      "Idrætstøj",
      "Indendørssko",
      "Håndklæde",
    ]);
  });
});

describe("abbreviations", () => {
  it("are shown as Aula has them while writing out is off, and still match the things to bring", async () => {
    const { card } = await mount(DAY, "thu-1010", {
      config: {
        children: [1001],
        expand_abbreviations: false,
        packing: [{ subject: "Idræt", items: ["Idrætstøj"] }],
      },
    });
    expect(texts(card, ".lessons.folded .subject")).toEqual(["IDR", "DAN", "ENG"]);
    expect(texts(card, ".pack-item")).toEqual(["Idrætstøj"]);
    expect(texts(card, ".pack-source")).toEqual(["IDR"]);
  });
});

describe("the school day card's rows above", () => {
  it("names each child's time when school ends, never one child's as every child's", async () => {
    const { card } = await mount(DAY, "thu-1300");
    expect(text(card, ".above .bridge")).toBe("I dag Oskar fri kl. 14.30");
    unmountAll();
    const { card: both } = await mount(DAY, "fri-1240");
    expect(text(both, ".above .bridge")).toBe("I dag Ida fri kl. 13.40, Oskar fri kl. 13.30");
  });

  it("names what is on now before the day's whole-day events and birthdays", async () => {
    const { card } = await mount(DAY, "sat-1000-birthday", { config: { children: [1001] } });
    expect(text(card, ".above .bridge")).toBe(
      "I dag Loppemarked i skolegården 10.00–13.00, Spejdertur, Karl har fødselsdag",
    );
  });

  it("names a child an event of today is for, when not every child has it", async () => {
    const { card } = await mount(DAY, "sat-1000", {
      ...changed("sat-1000", (data, child) =>
        child.child_id === 1002
          ? { ...data, events: data.events.filter((event) => event.id !== "e3") }
          : data,
      ),
    });
    expect(text(card, ".above .bridge")).toBe("I dag Loppemarked i skolegården 10.00–13.00 (Ida)");
  });

  it("gives a long holiday's dates a line of their own, by short month names", async () => {
    const { card } = await mount(DAY, "juleferie", { config: { children: [1001] } });
    expect(texts(card, ".bridge.alone .bridge-end")).toEqual(["19. dec. 2026–3. jan. 2027"]);
  });

  it("says a weekday passed over has every lesson cancelled", async () => {
    const { card } = await mount(DAY, "thu-1930", {
      config: { children: [1001] },
      ...changed("thu-1930", (data) => ({
        ...data,
        lessons: data.lessons.map((lesson) =>
          lesson.start.startsWith("2026-10-30") ? { ...lesson, status: "Aflyst" } : lesson,
        ),
        events: data.events.filter((event) => !event.start.startsWith("2026-10-30")),
      })),
    });
    expect(texts(card, ".bridge")[0]).toBe("Fredag Alle timer aflyst");
  });
});

describe("the school day card's blocks", () => {
  it("says once what every child lacks, naming no one", async () => {
    const { card } = await mount(DAY, "sun-1800-noplan");
    expect(texts(card, '[data-block="task"] .empty')).toEqual([
      "Ugeplanen for uge 45 er ikke i Aula endnu.",
    ]);
    expect(all(card, '[data-block="task"] .part-who')).toEqual([]);
  });

  it("names a child with nothing on one line beside a child who has something", async () => {
    const { card } = await mount(DAY, "thu-1930");
    const parts = all(card, '[data-block="task"] .part');
    expect(parts.map((part) => part.classList.contains("is-empty"))).toEqual([false, true]);
  });

  it("labels the day's subjects apart from them, in the cards' own language", async () => {
    const { card } = await mount(DAY, "thu-1930", {
      config: { children: [1001], show: { timetable: false } },
      language: "en",
    });
    expect(text(card, ".pack-label")).toBe("Subjects:");
    expect(text(card, '.pack-subjects [lang="da"]')).toBe("Matematik, Dansk, Engelsk, Historie");
  });

  it("puts an event's place on a line under its title, with no dot", async () => {
    const { card } = await mount(DAY, "thu-1930", {
      config: { children: [1001] },
      ...changed("thu-1930", (data) => ({
        ...data,
        events: [
          ...data.events,
          {
            id: "x",
            start: "2026-10-30T17:00:00+01:00",
            end: "2026-10-30T18:30:00+01:00",
            all_day: false,
            title: "Høstfest",
            type: "event",
            location: "Kantinen",
          },
        ],
      })),
    });
    expect(text(card, '[data-block="timetable"] .event-place')).toBe("Kantinen");
    expect(texts(card, '[data-block="timetable"] .event-text')).toContain("HøstfestKantinen");
  });

  it("says a child's every lesson is cancelled in its row", async () => {
    const { card } = await mount(DAY, "thu-1930-allcancelled");
    expect(texts(card, ".strip .kid > .quiet")).toEqual(["Alle timer aflyst"]);
  });

  it("names no day without a timetable under a holiday's header", async () => {
    const { card } = await mount(DAY, "before-holiday");
    expect(texts(card, ".strip .kid-name")).toEqual(["Ida", "Oskar"]);
    expect(all(card, ".strip .kid > .quiet")).toEqual([]);
  });

  it("stands children in two rows when there are more than three", async () => {
    const four = { ...present(scenarioNamed("thu-0715-3child").children[2]), child_id: 1004 };
    const { card } = await mount(DAY, "thu-0715-3child", {
      setup: (hass) => {
        const item = scenarioNamed("thu-0715-3child");
        hass.callWS.mockResolvedValue({ children: [...item.children, four] });
        hass.connection.respond = (message) =>
          item.data(
            present([...item.children, four].find((child) => child.child_id === message.child_id)),
          );
      },
    });
    expect(present(card.shadowRoot?.querySelector(".child")).className).toContain("n-2 tworow");
  });
});

describe("the homework card", () => {
  it("groups by the day homework is for, then by child, with the earlier days folded first", async () => {
    const { card } = await mount(HOMEWORK, "thu-1530");
    const [tomorrow] = all(card, ".hw-day");
    expect(tomorrow?.classList.contains("focus")).toBe(true);
    expect(texts(card, ".hw-day:first-of-type .day-title")).toEqual(["I morgen"]);
    expect(texts(card, ".hw-day:first-of-type .day-date")).toEqual(["fredag 30. okt."]);
    expect(tomorrow?.querySelectorAll(".part")).toHaveLength(2);
    expect(text(card, ".fold > summary")).toBe("Tidligere (4)");
    expect(all(card, ".earlier-days")).toEqual([]);
    expect(all(card, ".fold, .hw-day").map((element) => element.className)).toEqual([
      "fold earlier",
      ...all(card, ".hw-day").map((element) => element.className),
    ]);
    await open(card, ".fold");
    expect(all(card, ".earlier-days .hw-day").length).toBeGreaterThan(0);
  });

  it("puts each note of a day on one surface", async () => {
    const { card } = await mount(HOMEWORK, "thu-1530", { config: { children: [1001] } });
    expect(all(card, ".hw-day:first-of-type .homework")).toHaveLength(1);
    expect(all(card, ".hw-day:first-of-type .hw")).toHaveLength(2);
  });

  it("names the children above their columns, and each day's part for when they are stacked", async () => {
    const { card } = await mount(HOMEWORK, "thu-1530");
    expect(texts(card, ".strip .who-name")).toEqual(["Ida", "Oskar"]);
    expect(texts(card, ".hw-day:first-of-type .part-who")).toEqual(["IIda", "OOskar"]);
  });

  it("names the schools above the columns when the children go to different ones", async () => {
    const { card } = await mount(HOMEWORK, "thu-1530", {
      setup: (hass) => {
        hass.callWS.mockResolvedValue({ children: [IDA, OSKAR_ELSEWHERE] });
      },
    });
    expect(texts(card, ".strip .who-name")).toEqual([IDA.first_name, "Oskar"]);
    expect(texts(card, ".strip .who-meta")).toEqual([IDA.institution_name, "Lindegårdens Skole"]);
  });

  it("has no title of its own, as its section names it, nor a name for one child", async () => {
    const { card } = await mount(HOMEWORK, "thu-1530", { config: { children: [1001] } });
    expect(all(card, "h2, .strip, .part-who")).toEqual([]);
    expect(card.shadowRoot?.querySelector(".homework-card")?.getAttribute("aria-label")).toMatch(
      /^Ugeplan\P{L}+Ida$/u,
    );
  });

  it("shows what is marked, the other notes, or both, the marked on a surface first", async () => {
    const day = async (notes: string): Promise<string[]> => {
      const { card } = await mount(HOMEWORK, "thu-1930", { config: { children: [1001], notes } });
      return all(card, ".hw-day:first-of-type .part > *").map((element) => element.className);
    };
    expect(await day("tasks")).toEqual(["homework"]);
    expect(await day("comments")).toEqual(["plan"]);
    expect(await day("all")).toEqual(["homework", "plan"]);
  });

  it("shows a child's homework while another loads, and why one cannot be shown", async () => {
    const { card } = await mount(HOMEWORK, "thu-1930", oskar());
    expect(all(card, '.pending [aria-busy="true"]')).toHaveLength(1);
    unmountAll();
    const { card: refused } = await mount(
      HOMEWORK,
      "thu-1930",
      oskar(wsError("not_found", "gone")),
    );
    expect(all(refused, '.pending [role="alert"]')).toHaveLength(1);
  });

  it("says what it knows for each child without a school day ahead", async () => {
    const { card } = await mount(HOMEWORK, "before-holiday", {
      ...changed("before-holiday", (data, child) =>
        child.child_id === 1002
          ? data
          : { ...data, events: data.events.filter((event) => event.type !== "holiday") },
      ),
    });
    expect(texts(card, ".day-title")).toEqual(["Ingen skoledage (Ida)", "Efterårsferie (Oskar)"]);
  });

  it("names the holiday ahead, after the earlier homework", async () => {
    const { card } = await mount(HOMEWORK, "before-holiday", { config: { children: [1001] } });
    expect(text(card, ".hw-day.focus .day-title")).toBe("Efterårsferie");
    expect(text(card, ".hw-day.focus .day-date")).toBe(
      "10.–18. okt., skolen starter mandag 19. oktober",
    );
  });

  it("says once what every child lacks on a day, naming no one", async () => {
    const { card } = await mount(HOMEWORK, "sun-1800-noplan");
    const [monday] = all(card, ".hw-day");
    expect(monday?.querySelectorAll(".part-who")).toHaveLength(0);
    expect(texts(card, ".hw-day:first-of-type .empty")).toEqual([
      "Ugeplanen for uge 45 er ikke i Aula endnu.",
    ]);
  });

  it("puts one child's days in a grid that becomes columns where there is room", async () => {
    const { card } = await mount(HOMEWORK, "thu-1530", { config: { children: [1001] } });
    expect(all(card, ".hw-days > .hw-day")).toHaveLength(4);
  });

  it("says next week's plan is not in Aula yet on a line of its own", async () => {
    const { card } = await mount(HOMEWORK, "thu-1530", {
      config: { children: [1001] },
      ...changed("thu-1530", (data) => ({
        ...data,
        tasks: data.tasks.filter((task) => task.date < "2026-11-02"),
      })),
    });
    expect(texts(card, ".not-yet")).toEqual(["Ugeplanen for uge 45 er ikke i Aula endnu."]);
  });
});

describe("the week card", () => {
  it("names what is on now first in today's weekend row", async () => {
    const { card } = await mount(WEEK, "sat-1000-birthday", { config: { children: [1001] } });
    expect(texts(card, ".weekend-row .weekend-item")[0]).toBe(
      "Loppemarked i skolegården 10.00–13.00",
    );
  });

  it("shows a Saturday with a lesson as a day with its hours", async () => {
    const { card } = await mount(WEEK, "thu-1930-satlesson", { config: { children: [1001] } });
    const saturday = all(card, ".day-row:not(.focus-day)").find((row) =>
      row.querySelector(".daycol")?.textContent.includes("31"),
    );
    expect(
      saturday
        ?.querySelector(".line-1")
        ?.textContent.replace(/\u2060/g, "")
        .trim(),
    ).toBe("09.00–12.00");
  });

  it("says when every lesson of a closed day is cancelled", async () => {
    const { card } = await mount(WEEK, "thu-1930-allcancelled", {
      config: { children: [1001] },
      clock: "2026-10-28T19:30:00+01:00",
    });
    expect(texts(card, ".day-row:not(.focus-day) .line-1")).toContain("Alle timer aflyst, 2");
    expect(
      all(card, '.day-row:not(.focus-day) .count ha-icon[icon="mdi:flag-outline"]').length,
    ).toBeGreaterThan(0);
  });

  it("says a holiday's second week is a whole week, rather than its dates again", async () => {
    const { card } = await mount(WEEK, "before-holiday", { config: { children: [1001] } });
    expect(texts(card, ".holiday-row .line-2")).toEqual(["10.–18. okt.", "hele ugen"]);
  });

  it("marks the weekend as today while its event is on, with the event's time", async () => {
    const { card } = await mount(WEEK, "sat-1000", { config: { children: [1001] } });
    expect(text(card, ".weekend-row.today-row .relation")).toBe("I dag");
    expect(text(card, ".weekend-row .line-2")).toBe("Loppemarked i skolegården 10.00–13.00");
  });

  it("names the days of a weekend's events the English way", async () => {
    const { card } = await mount(WEEK, "sat-1000-birthday", {
      config: { children: [1001] },
      language: "en",
    });
    expect(text(card, ".weekend-row .line-2")).toContain("Spejdertur, Sat–Sun");
  });

  it("keeps the dash of a 12-hour span with the time after it, so that no line ends with it", async () => {
    const { card } = await mount(WEEK, "sat-1000", {
      config: { children: [1001] },
      language: "en",
    });
    expect(present(card.shadowRoot?.querySelector(".weekend-row .line-2")).textContent).toContain(
      "AM\u2009\u2013\u2060\u202f1:00",
    );
  });

  it("separates Saturday and Sunday when the weekend is opened, each with what is on it", async () => {
    const { card } = await mount(WEEK, "sat-1000-birthday", { config: { children: [1001] } });
    await open(card, ".weekend-row");
    expect(texts(card, ".weekend-title")).toEqual(["Lørdag 31. okt.", "Søndag 1. nov."]);
    const days = all(card, ".weekend-day");
    expect(
      days.map((day) => day.querySelector('[data-block="timetable"] .event-text')?.textContent),
    ).toEqual(["Spejdertur", "Spejdertur"]);
    expect(spokenOf(present(days[0]), ".facts")).toBe("Karl har fødselsdag");
    expect(days[1]?.querySelector(".facts")).toBeNull();
  });

  it("sets the days of a weekend's item in the run of its title's text", async () => {
    const { card } = await mount(WEEK, "thu-1000", { config: { children: [1001] } });
    const days = all(card, ".weekend-item .quiet").map((item) => item.parentElement);
    expect(days.map((item) => item?.closest(".fact") !== null)).toEqual([true, true]);
    expect(
      days.map((item) => item?.textContent.replace(/\u2060/g, "").replace(/\s+/g, " ")),
    ).toEqual(["Loppemarked i skolegården, lør.", "ViggoViggo har fødselsdag, søn."]);
  });

  it("marks a holiday as today while it lasts", async () => {
    const { card } = await mount(WEEK, "holiday", { config: { children: [1001] } });
    expect(text(card, ".holiday-row.today-row .relation")).toBe("I dag");
  });

  it("renders a closed row's content only once it is opened", async () => {
    const { card } = await mount(WEEK, "thu-1000", { config: { children: [1001] } });
    expect(all(card, "*").length).toBeLessThan(400);
    const row = ".rows > li > details.day-row:not(.focus-day)";
    expect(all(card, `${row} .day-body`)).toEqual([]);
    await open(card, row);
    expect(all(card, `${row} .day-body .block`).length).toBeGreaterThan(0);
  });

  it("folds the days that are over, and shows them as rows once the fold is opened", async () => {
    const { card } = await mount(WEEK, "thu-1000", { config: { children: [1001] } });
    expect(texts(card, ".fold > summary")).toEqual(["Tidligere dage (3)"]);
    await open(card, ".fold");
    expect(all(card, ".fold .day-row.past")).toHaveLength(3);
  });

  it("folds a whole week that is over as one", async () => {
    const { card } = await mount(WEEK, "sun-1800", {
      config: { children: [1001] },
      ...changed("sun-1800", (data) => ({
        ...data,
        events: [
          ...data.events,
          {
            id: "s1",
            start: "2026-11-01T10:00:00+01:00",
            end: "2026-11-01T12:00:00+01:00",
            all_day: false,
            title: "Svømmestævne",
            type: "event",
            location: null,
          },
        ],
      })),
    });
    expect(texts(card, ".fold > summary")).toEqual(["Hele ugen (7)"]);
  });

  it("shows a child's weeks while another loads, and why one cannot be shown", async () => {
    const { card } = await mount(WEEK, "thu-1000", oskar());
    expect(all(card, '[aria-busy="true"]')).toHaveLength(1);
    unmountAll();
    const { card: refused } = await mount(WEEK, "thu-1000", oskar(wsError("not_found", "gone")));
    expect(all(refused, '[role="alert"]')).toHaveLength(1);
    expect(all(refused, ".week-section").length).toBeGreaterThan(0);
  });

  it("loads a week it has no data for yet, rather than call its days empty", async () => {
    const { card } = await mount(WEEK, "thu-1000", {
      config: { children: [1001] },
      ...changed("thu-1000", (data) => ({ ...data, end: "2026-11-02" })),
    });
    const [, next] = all(card, ".week-section");
    expect(next?.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(next?.textContent).not.toContain("Intet skema");
  });

  it("says under its header that a later week's plan is not in Aula yet", async () => {
    const { card } = await mount(WEEK, "thu-1000", {
      config: { children: [1001] },
      ...changed("thu-1000", (data) => ({
        ...data,
        tasks: data.tasks.filter((task) => task.date < "2026-11-02"),
      })),
    });
    expect(texts(card, ".week-section .not-yet")).toEqual([
      "Ugeplanen for uge 45 er ikke i Aula endnu.",
    ]);
  });
});

describe("the folded day", () => {
  const button = (card: Card): HTMLButtonElement =>
    present(card.shadowRoot?.querySelector<HTMLButtonElement>('[data-block="timetable"] .more'));

  it("folds the timetable to each subject's start and end, keeping what is news", async () => {
    const { card } = await mount(DAY, "thu-0715", { config: { children: [1001] } });
    expect(texts(card, ".lessons.folded .lesson")).toEqual([
      "Idræt 08.00–09.30",
      "Dansk 10.05–11.35",
      "Engelsk Vikar 12.10–12.55",
    ]);
    expect(all(card, '[data-block="timetable"] .break, [data-block="timetable"] .end')).toEqual([]);
    expect(text(card, '[data-block="timetable"] .more')).toBe("Vis hele skemaet");
  });

  it("strikes a cancelled lesson through when folded, with its label", async () => {
    const { card } = await mount(DAY, "thu-1930", { config: { children: [1002] } });
    expect(texts(card, ".lessons.folded .lesson.cancelled")).toEqual([
      "Klassens tid Aflyst 13.45–14.30",
    ]);
  });

  it("sets a folded lesson's label beside its subject, where a long one has the room to wrap", async () => {
    const { card } = await mount(DAY, "thu-1930-stress", { config: { children: [1001] } });
    expect(texts(card, ".lessons.folded .lesson-head .label")).toEqual([
      "Vikar",
      "Flyttet til lokale 117 pga. vandskade",
    ]);
    expect(all(card, ".lessons.folded .lesson > .span")).toHaveLength(3);
  });

  it("unfolds the whole timetable on a tap, and folds it again", async () => {
    const { card } = await mount(DAY, "thu-0715", { config: { children: [1001] } });
    button(card).click();
    await card.updateComplete;
    expect(all(card, ".lessons.folded")).toEqual([]);
    expect(texts(card, '[data-block="timetable"] .break')).toEqual([
      "Frikvarter · 35 min",
      "Frikvarter · 35 min",
    ]);
    expect(button(card).getAttribute("aria-expanded")).toBe("true");
    expect(text(card, '[data-block="timetable"] .more')).toBe("Vis mindre");
    button(card).click();
    await card.updateComplete;
    expect(all(card, ".lessons.folded")).toHaveLength(1);
  });

  it("opens the timetable in full with timetable: full, still to be folded", async () => {
    const { card } = await mount(DAY, "thu-0715", {
      config: { children: [1001], timetable: "full" },
    });
    expect(all(card, ".lessons.folded")).toEqual([]);
    button(card).click();
    await card.updateComplete;
    expect(all(card, ".lessons.folded")).toHaveLength(1);
  });

  it("unfolds one timetable for every child of the block", async () => {
    const { card } = await mount(DAY, "thu-1930");
    expect(all(card, '[data-block="timetable"] .more')).toHaveLength(1);
    button(card).click();
    await card.updateComplete;
    expect(all(card, ".lessons.folded")).toEqual([]);
    expect(all(card, '[data-block="timetable"] .lessons')).toHaveLength(2);
  });

  it("folds the timetable again after ten minutes without a touch", async () => {
    const { card } = await mount(DAY, "thu-0715", { config: { children: [1001] } });
    button(card).click();
    await card.updateComplete;
    await vi.advanceTimersByTimeAsync(IDLE_RESET_MS + 60_000);
    await card.updateComplete;
    expect(all(card, ".lessons.folded")).toHaveLength(1);
  });

  it("folds each note of the plan after the configured lines, or never with 0", async () => {
    const { card } = await mount(DAY, "thu-1930-longplan", { config: { children: [1001] } });
    const notes = all(card, ".plan-text");
    expect(notes.map((note) => note.classList.contains("clamp"))).toEqual([true, true, true]);
    expect(notes[0]?.getAttribute("style")).toBe("--lines: 6");
    unmountAll();
    const { card: whole } = await mount(DAY, "thu-1930-longplan", {
      config: { children: [1001], info_lines: 0 },
    });
    expect(all(whole, ".plan-text.clamp")).toEqual([]);
    expect(all(whole, ".plan .more")).toEqual([]);
    expect(texts(whole, ".plan-text")[2]?.split("\n")).toHaveLength(1);
  });

  it("folds the week card's open day as the day card's", async () => {
    const { card } = await mount(WEEK, "thu-0715", { config: { children: [1001] } });
    expect(texts(card, ".focus-day .lessons.folded .lesson")).toEqual([
      "Idræt 08.00–09.30",
      "Dansk 10.05–11.35",
      "Engelsk Vikar 12.10–12.55",
    ]);
  });

  it("names the child on every part of a block, in columns too", async () => {
    const { card } = await mount(DAY, "thu-1930");
    for (const block of all(card, ".block")) {
      const parts = [...block.querySelectorAll(".part")];
      expect(parts.map((part) => part.querySelector(".part-who")?.textContent.trim())).toEqual(
        parts.length > 0 ? ["IIda", "OOskar"] : [],
      );
    }
  });
});

describe("a shared screen", () => {
  it("keeps a row opened without a pointer open across ticks, and closes it after ten minutes", async () => {
    const { card } = await mount(WEEK, "thu-1000", { config: { children: [1001] } });
    const row = ".rows > li > details.day-row:not(.focus-day)";
    await open(card, row);
    await vi.advanceTimersByTimeAsync(2 * 60_000);
    await card.updateComplete;
    expect(card.shadowRoot?.querySelector<HTMLDetailsElement>(row)?.open).toBe(true);
    await vi.advanceTimersByTimeAsync(IDLE_RESET_MS);
    await card.updateComplete;
    expect(card.shadowRoot?.querySelector<HTMLDetailsElement>(row)?.open).toBe(false);
  });

  it("offers Vis mere only when a note is cut short, measuring again when the width changes", async () => {
    let tall = false;
    vi.spyOn(Element.prototype, "scrollHeight", "get").mockImplementation(function (this: Element) {
      return tall && this.classList.contains("plan-text") ? 100 : 0;
    });
    let resized: () => void = () => undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resized = callback;
        }
        observe(): void {
          // The test calls the callback itself.
        }
        disconnect(): void {
          // Nothing to let go of.
        }
      },
    );
    const { card } = await mount(DAY, "thu-1930", { config: { children: [1001] } });
    expect(all(card, ".plan .more")).toEqual([]);
    tall = true;
    resized();
    await card.updateComplete;
    await card.updateComplete;
    expect(texts(card, ".plan .more")).toEqual(["Vis mere", "Vis mere"]);
    present(card.shadowRoot?.querySelector<HTMLButtonElement>(".plan .more")).click();
    await card.updateComplete;
    expect(texts(card, ".plan .more")).toEqual(["Vis mindre", "Vis mere"]);
    expect(all(card, ".plan-text.clamp")).toHaveLength(1);
  });
});

describe("rarer days", () => {
  const event = (id: string, title: string, start: string, end: string) => ({
    id,
    start: local("2026-10-30", start),
    end: local("2026-10-30", end),
    all_day: false,
    title,
    type: "event",
    location: null,
  });

  it("unfolds the week card's timetable with the teachers' initials and the lesson going on", async () => {
    const { card } = await mount(WEEK, "thu-1010", { config: { children: [1001] } });
    present(
      card.shadowRoot?.querySelector<HTMLButtonElement>(
        '.focus-day [data-block="timetable"] .more',
      ),
    ).click();
    await card.updateComplete;
    expect(texts(card, ".focus-day .lesson.now .label")).toEqual(["Nu"]);
    expect(texts(card, ".focus-day .lesson-meta").at(-1)).toContain("TR, BV");
  });

  it("leaves out a room Aula has not, and a title Aula's own name gives", async () => {
    const { card } = await mount(DAY, "thu-0715", {
      config: { children: [1001], subject_names: [{ aula: "IDR", name: "IDR" }] },
      ...changed("thu-0715", (data) => ({
        ...data,
        lessons: data.lessons.map((lesson) => ({ ...lesson, location: null })),
      })),
    });
    present(
      card.shadowRoot?.querySelector<HTMLButtonElement>('[data-block="timetable"] .more'),
    ).click();
    await card.updateComplete;
    expect(all(card, ".lesson-meta")).toEqual([]);
    expect(all(card, ".lesson .subject").map((item) => item.getAttribute("title"))).toEqual([
      null,
      "DAN",
      "ENG",
    ]);
  });

  it("shows notes without a subject: homework by its title and the comment among the notes", async () => {
    const note = (id: number, type: string, title: string | null, content: string) => ({
      id,
      date: "2026-10-30",
      type,
      title,
      content,
      subject: "",
      group: "",
      author: "",
    });
    const { card } = await mount(DAY, "thu-1930", {
      config: { children: [1001] },
      ...changed("thu-1930", (data) => ({
        ...data,
        tasks: [
          ...data.tasks,
          note(901, "comment", null, "Husk regntøj til turen."),
          note(902, "task", "Projekt", "Skriv en side."),
        ],
      })),
    });
    expect(texts(card, '[data-block="pack"]').join(" ")).not.toContain("regntøj");
    expect(texts(card, ".hw-head").at(-1)).toBe("Projekt");
    expect(all(card, ".plan-note").length - all(card, ".plan-subject").length).toBe(1);
  });

  it("shows a timed event without a place, and folds what is left of today after three", async () => {
    const { card } = await mount(DAY, "fri-1240", {
      config: { children: [1001] },
      ...changed("fri-1240", (data) => ({
        ...data,
        events: [
          ...data.events,
          event("e1", "Fodbold", "15:00", "16:00"),
          event("e2", "Koncert", "19:00", "20:00"),
        ],
      })),
    });
    expect(text(card, ".above .bridge")).toContain("+1");
    unmountAll();
    const { card: day } = await mount(DAY, "thu-1930", {
      config: { children: [1001] },
      ...changed("thu-1930", (data) => ({
        ...data,
        events: [...data.events, event("e1", "Fodbold", "15:00", "16:00")],
      })),
    });
    expect(all(day, '[data-block="events"] .item-place')).toEqual([]);
  });

  it("calls a Saturday and a Sunday with something on the weekend", async () => {
    const { card } = await mount(DAY, "fri-1400", {
      config: { children: [1001] },
      ...changed("fri-1400", (data) => ({
        ...data,
        birthdays: [...data.birthdays, { date: "2026-11-01", name: "Bo" }],
      })),
    });
    expect(texts(card, ".above .bridge-label")).toContain("Weekend");
  });

  it("names a holiday without the day school starts when no school day follows in the data", async () => {
    const holiday = (data: WeekData): WeekData => {
      const empty = without(data, "2026-10-30", "2026-11-08");
      return {
        ...empty,
        events: [...empty.events, allDay("s1", "Studiedag", "holiday", "2026-10-30", "2026-10-30")],
      };
    };
    const { card } = await mount(DAY, "thu-1930", {
      config: { children: [1001] },
      ...changed("thu-1930", holiday),
    });
    expect(text(card, ".hero")).toContain("Studiedag");
    expect(text(card, ".hero")).not.toContain("skolen starter");
    unmountAll();
    const { card: homework } = await mount(HOMEWORK, "thu-1930", {
      config: { children: [1001] },
      ...changed("thu-1930", holiday),
    });
    expect(text(homework, ".hw-day.focus")).toContain("Studiedag");
    expect(text(homework, ".hw-day.focus")).not.toContain("skolen starter");
  });

  it("says a day has nothing when every block is hidden", async () => {
    const { card } = await mount(DAY, "thu-1930", {
      config: {
        children: [1001],
        show: { task: false, pack: false, timetable: false, comment: false, events: false },
      },
    });
    expect(text(card, ".child > .empty")).toBe("Intet i Aula for denne dag.");
  });

  it("names each child's school beside the name when two schools share a day", async () => {
    const { card } = await mount(DAY, "thu-1930", {
      setup: (hass) => {
        hass.callWS.mockResolvedValue({ children: [IDA, OSKAR_ELSEWHERE] });
      },
    });
    expect(texts(card, ".strip .kid-who")).toEqual([
      `I${IDA.first_name}, ${IDA.institution_name}`,
      "OOskar, Lindegårdens Skole",
    ]);
  });

  it("keeps showing a child's last data with the error that stopped it", async () => {
    for (const tag of [DAY, WEEK, HOMEWORK]) {
      const { card, hass } = await mount(tag, "thu-1930");
      hass.connection.refuse = wsError("not_found", "gone");
      hass.connection.emit("disconnected");
      hass.connection.emit("ready");
      await vi.advanceTimersByTimeAsync(1_000);
      await card.updateComplete;
      expect(texts(card, '[role="alert"]')).toHaveLength(2);
      expect(all(card, ".hero, .weeks, .hw-days").length).toBeGreaterThan(0);
      unmountAll();
    }
  });

  it("shows a homework card's child that is loading or refused", async () => {
    const { card } = await mount(HOMEWORK, "thu-1930", {
      config: { children: [1002] },
      ...oskar(),
    });
    expect(all(card, ".pending .who")).toEqual([]);
    expect(all(card, '.pending [aria-busy="true"]')).toHaveLength(1);
    unmountAll();
    const { card: refused } = await mount(
      HOMEWORK,
      "thu-1930",
      oskar(wsError("not_found", "gone")),
    );
    expect(text(refused, ".pending .who")).toBe("OOskar");
    expect(all(refused, '.pending [role="alert"]')).toHaveLength(1);
  });

  it("says an opened day has nothing, and closes the focus day when asked", async () => {
    const { card } = await mount(WEEK, "empty-tue", { config: { children: [1001] } });
    await open(card, ".day-row:not(.focus-day)");
    expect(text(card, ".day-row:not(.focus-day) .empty")).toBe("Intet i Aula for denne dag.");
    const focus = present(card.shadowRoot?.querySelector<HTMLDetailsElement>(".focus-day"));
    focus.open = false;
    focus.dispatchEvent(new Event("toggle"));
    await card.updateComplete;
    expect(all(card, ".focus-day .day-body")).toEqual([]);
  });
});

describe("several events and birthdays", () => {
  const facts = (card: Card, selector = ".hero .facts > li"): string[] => texts(card, selector);
  const events = (card: Card, scope = ""): string[] =>
    texts(card, `${scope} [data-block="timetable"] .event-row .event-text`);

  it("give the hours a line of their own and the birthdays one, and the events the timetable", async () => {
    const { card } = await mount(DAY, "thu-1930-events3", { config: { children: [1001] } });
    expect(text(card, ".hero-text > .hours")).toBe("08.00–13.40");
    expect(facts(card)).toEqual(["Alma, Bo og Carl har fødselsdag"]);
    expect(events(card)).toEqual(["Skolefoto", "Motionsdag", "Tur til Naturcenter Vestskoven"]);
  });

  it("list every event in the timetable, never folded", async () => {
    const { card } = await mount(DAY, "thu-1930-events5", { config: { children: [1001] } });
    expect(events(card)).toEqual([
      "Skolefoto",
      "Motionsdag",
      "Tur til Naturcenter Vestskoven",
      "Halloween-fest",
      "Trafikdag med cykelprøve",
    ]);
    expect(texts(card, '[data-block="timetable"] .more')).toEqual(["Vis hele skemaet"]);
  });

  it("keep each child's own birthdays in its part, and its events in its timetable", async () => {
    const { card } = await mount(DAY, "thu-1930-events3");
    expect(facts(card)).toEqual([]);
    expect(texts(card, ".strip .facts > li")).toEqual([
      "Alma, Bo og Carl har fødselsdag",
      "Freja, Malte og Sigrid har fødselsdag",
    ]);
    expect(events(card).slice(0, 3)).toEqual([
      "Skolefoto",
      "Motionsdag",
      "Tur til Naturcenter Vestskoven",
    ]);
  });

  it("are counted in a closed row of the week, and listed once it is opened", async () => {
    const { card } = await mount(WEEK, "thu-1010", {
      config: { children: [1001] },
      ...changed("thu-1010", (data) => ({
        ...data,
        events: [...data.events, allDay("w1", "Motionsdag", "event", "2026-10-30", "2026-10-30")],
        birthdays: [...data.birthdays, { date: "2026-10-30", name: "Bo" }],
      })),
    });
    const friday = ".day-row:not(.focus-day)";
    expect(texts(card, `${friday} .line-2 .fact`).slice(0, 2)).toEqual([
      "2 begivenheder",
      "2 fødselsdage",
    ]);
    await open(card, friday);
    expect(texts(card, `${friday} .day-body .facts > li`)).toEqual(["Alma og Bo har fødselsdag"]);
    expect(events(card, friday)).toEqual(["Skolefoto", "Motionsdag"]);
  });

  it("are counted in the rest of today on a day without school", async () => {
    const { card } = await mount(DAY, "sat-1000", {
      config: { children: [1001] },
      ...changed("sat-1000", (data) => ({
        ...data,
        events: [
          ...data.events,
          allDay("w1", "Høstmarked", "event", "2026-10-31", "2026-10-31"),
          allDay("w2", "Kræmmermarked", "event", "2026-10-31", "2026-10-31"),
        ],
        birthdays: [
          ...data.birthdays,
          { date: "2026-10-31", name: "Bo" },
          { date: "2026-10-31", name: "Carl" },
        ],
      })),
    });
    expect(text(card, ".above .bridge")).toContain("2 begivenheder");
    expect(text(card, ".above .bridge")).toContain("2 fødselsdage");
  });

  it("show a closed open day's facts in its summary", async () => {
    const { card } = await mount(WEEK, "thu-1930-events3", { config: { children: [1001] } });
    const focus = present(card.shadowRoot?.querySelector<HTMLDetailsElement>(".focus-day"));
    expect(texts(card, ".focus-day .day-body .facts > li")).toHaveLength(1);
    expect(events(card, ".focus-day")).toHaveLength(3);
    focus.open = false;
    focus.dispatchEvent(new Event("toggle"));
    await card.updateComplete;
    expect(texts(card, ".focus-day > summary .line-2 .fact")).toEqual([
      "3 begivenheder",
      "3 fødselsdage",
    ]);
  });

  it("give an event lasting past the whole day a line with the events of the whole day", async () => {
    const { card } = await mount(DAY, "thu-1930", {
      config: { children: [1001] },
      ...changed("thu-1930", (data) => ({
        ...data,
        events: [
          ...data.events,
          {
            id: "lejr",
            start: local("2026-10-29", "10:00"),
            end: local("2026-10-31", "10:00"),
            all_day: false,
            title: "Lejrskole",
            type: "excursion",
            location: null,
          },
        ],
      })),
    });
    expect(texts(card, '[data-block="timetable"] .event-row.all-day .event-text')).toContain(
      "Lejrskole",
    );
  });

  it("say there is no timetable on a weekday with something else on it", async () => {
    const { card } = await mount(DAY, "thu-1930", {
      config: { children: [1001] },
      ...changed("thu-1930", (data) => ({
        ...data,
        lessons: data.lessons.filter((lesson) => !lesson.start.startsWith("2026-10-30")),
        events: data.events.filter((event) => !event.start.startsWith("2026-10-30")),
      })),
    });
    expect(text(card, '[data-block="timetable"]')).toContain("Intet skema i Aula.");
  });

  it("name a holiday at the top of a day opened in the week", async () => {
    const { card } = await mount(WEEK, "thu-1930", {
      config: { children: [1001] },
      ...changed("thu-1930", (data) => ({
        ...data,
        events: [...data.events, allDay("f1", "Fridag", "holiday", "2026-10-30", "2026-10-30")],
        birthdays: data.birthdays.filter((birthday) => birthday.date !== "2026-10-30"),
      })),
    });
    expect(texts(card, ".focus-day .day-body .facts > li")).toEqual(["Fridag"]);
    expect(events(card, ".focus-day")).not.toContain("Fridag");
  });

  it("name the place of a closed row's only event", async () => {
    const { card } = await mount(WEEK, "thu-1010", {
      config: { children: [1001] },
      ...changed("thu-1010", (data) => ({
        ...data,
        events: [
          ...data.events.filter((event) => !event.start.startsWith("2026-10-30")),
          {
            ...allDay("w1", "Motionsdag", "event", "2026-10-30", "2026-10-30"),
            location: "Skolegården",
          },
        ],
      })),
    });
    expect(text(card, ".day-row:not(.focus-day) .line-2 .fact")).toContain("Skolegården");
  });

  it("show only the birthdays of a day without blocks to show", async () => {
    const { card } = await mount(WEEK, "thu-1930", {
      config: { children: [1001], show: { timetable: false } },
      ...changed("thu-1930", (data) => ({
        ...data,
        lessons: data.lessons.filter((lesson) => !lesson.start.startsWith("2026-10-30")),
        events: data.events.filter((event) => !event.start.startsWith("2026-10-30")),
        tasks: data.tasks.filter((task) => task.date !== "2026-10-30"),
      })),
    });
    const friday = ".day-row:not(.focus-day)";
    await open(card, friday);
    expect(texts(card, `${friday} .day-body .facts > li`)).toEqual(["Alma har fødselsdag"]);
    expect(all(card, `${friday} .day-body .blocks`)).toHaveLength(0);
  });

  it("put an event that began the day before first, before the lessons", async () => {
    const { card } = await mount(DAY, "thu-1930", {
      config: { children: [1001] },
      ...changed("thu-1930", (data) => ({
        ...data,
        events: [
          ...data.events.filter((event) => !event.start.startsWith("2026-10-30")),
          {
            id: "nat",
            start: local("2026-10-29", "20:00"),
            end: local("2026-10-30", "08:30"),
            all_day: false,
            title: "Overnatning",
            type: "event",
            location: null,
          },
        ],
      })),
    });
    expect(texts(card, '[data-block="timetable"] li').at(0)).toContain("Overnatning");
  });

  it("give an event its time in a column of its own in the whole timetable", async () => {
    const { card } = await mount(DAY, "thu-1930-timed4", { config: { children: [1001] } });
    present(
      card.shadowRoot?.querySelector<HTMLButtonElement>('[data-block="timetable"] .more'),
    ).click();
    await card.updateComplete;
    expect(
      texts(card, '[data-block="timetable"] .event-row:not(.all-day) .lesson-time'),
    ).toHaveLength(4);
  });

  it("put timed events in the timetable among the lessons, by when they begin", async () => {
    const { card } = await mount(DAY, "thu-1930-timed4", { config: { children: [1001] } });
    expect(all(card, '[data-block="timetable"] .event-row:not(.all-day)')).toHaveLength(4);
  });
});

describe("browsing the weeks", () => {
  // Answers a subscription for other days with made-up data for them.
  const browsable = (hass: FakeHass): void => {
    const connection = hass.connection;
    const scenario = connection.respond;
    connection.respond = (message) =>
      message.start === "2026-10-26"
        ? scenario?.(message)
        : {
            ...weekData(String(message.start)),
            start: message.start,
            end: message.end,
          };
  };
  const heads = (card: Card): string[] => texts(card, ".week-head");
  const step = async (card: Card, selector: string): Promise<void> => {
    present(card.shadowRoot?.querySelector<HTMLButtonElement>(selector)).click();
    await vi.advanceTimersByTimeAsync(0);
    await card.updateComplete;
  };
  const BACK = '.nav-step[data-step="-1"]';
  const AHEAD = '.nav-step[data-step="1"]';

  it("steps a week back and ahead, says the weeks shown, and goes back with I dag", async () => {
    const { card } = await mount(WEEK, "thu-1010", {
      config: { children: [1001] },
      setup: browsable,
    });
    expect(heads(card)).toEqual([
      "Uge 44 · Denne uge 26. okt.–1. nov.",
      "Uge 45 · Næste uge 2.–8. nov.",
    ]);
    expect(all(card, ".nav-today")).toHaveLength(0);
    await step(card, BACK);
    expect(heads(card)).toEqual([
      "Uge 43 · Sidste uge 19.–25. okt.",
      "Uge 44 · Denne uge 26. okt.–1. nov.",
    ]);
    expect(text(card, ".week-nav .sr")).toBe("Uge 43 og 44");
    await step(card, BACK);
    expect(heads(card)[0]).toBe("Uge 42 · For 2 uger siden 12.–18. okt.");
    await step(card, ".nav-today");
    await step(card, AHEAD);
    await step(card, AHEAD);
    expect(heads(card)).toEqual([
      "Uge 46 · Om 2 uger 9.–15. nov.",
      "Uge 47 · Om 3 uger 16.–22. nov.",
    ]);
    await step(card, ".nav-today");
    expect(heads(card)[0]).toBe("Uge 44 · Denne uge 26. okt.–1. nov.");
    expect(all(card, ".nav-today")).toHaveLength(0);
  });

  it("names the one week shown when the card shows one", async () => {
    const { card } = await mount(WEEK, "thu-1010", {
      config: { children: [1001], weeks: 1 },
      setup: browsable,
    });
    await step(card, BACK);
    expect(text(card, ".week-nav .sr")).toBe("Uge 43");
  });

  it("waits for a week it has no data for, and says why Aula would not give it", async () => {
    const { card, hass } = await mount(WEEK, "thu-1010", { config: { children: [1001] } });
    hass.connection.respond = undefined;
    await step(card, BACK);
    expect(all(card, ".week-section")[0]?.querySelector('[role="status"]')).not.toBeNull();
    unmountAll();
    const { card: refused, hass: other } = await mount(WEEK, "thu-1010", {
      config: { children: [1001] },
    });
    other.connection.refuse = wsError("not_found", "gone");
    await step(refused, BACK);
    expect(all(refused, ".week-section")[0]?.querySelector(".alert")).not.toBeNull();
  });

  it("goes back to this week after ten minutes without a touch", async () => {
    const { card } = await mount(WEEK, "thu-1010", {
      config: { children: [1001] },
      setup: browsable,
    });
    await step(card, BACK);
    await vi.advanceTimersByTimeAsync(IDLE_RESET_MS + 60_000);
    await card.updateComplete;
    expect(heads(card)[0]).toBe("Uge 44 · Denne uge 26. okt.–1. nov.");
  });

  it("keeps the week shown when a new week begins while browsed", async () => {
    const { card, hass } = await mount(WEEK, "sun-1800", {
      config: { children: [1001] },
      setup: browsable,
      clock: "2026-11-01T23:55:00+01:00",
    });
    await step(card, BACK);
    expect(heads(card)[0]).toBe("Uge 43 · Sidste uge 19.–25. okt.");
    await vi.advanceTimersByTimeAsync(6 * 60_000);
    await card.updateComplete;
    expect(
      hass.connection.subscriptions
        .map((item) => `${String(item.message.start)}/${String(item.message.end)}`)
        .slice(-2),
    ).toEqual(["2026-11-02/2026-11-16", "2026-10-26/2026-11-02"]);
    expect(heads(card)[0]).toBe("Uge 44 · Sidste uge 26. okt.–1. nov.");
  });
});
