import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../../src/index.ts";
import { forget } from "../../src/core/memory.ts";
import type { Child, WeekData } from "../../src/core/types.ts";
import { IDLE_RESET_MS } from "../../src/model/focus.ts";
import { present, wsError, type FakeHass } from "../fake-hass.ts";
import { all, mount, text, unmountAll, type Card } from "../fixtures/mount.ts";
import { SCENARIOS, scenarioNamed } from "../fixtures/scenarios.ts";

const DAY = "aula-connect-day-card";
const HOMEWORK = "aula-connect-homework-card";
const WEEK = "aula-connect-card";

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
    expect(texts(card, '[data-block="homework"] .part-who span:last-child')).toEqual([
      "Ida",
      "Oskar",
    ]);
    expect(texts(card, '[data-block="homework"] .empty')).toEqual(["Ingen lektier i ugeplanen."]);
    expect(texts(card, ".lesson.cancelled .subject")).toEqual(["Klassens tid"]);
  });

  it("says the header's facts as words with icons, never as chips", async () => {
    const { card } = await mount(DAY, "thu-1930", { config: { children: [1001] } });
    expect(all(card, ".chip")).toEqual([]);
    expect(all(card, ".hero .fact")).toHaveLength(2);
    expect(spoken(card, ".hero .facts")).toBe("08.00–13.40, Skolefoto, Alma har fødselsdag");
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

  it("ends the timetable's empty text with a full stop, as every block's", async () => {
    const { card } = await mount(DAY, "motionsdag", { config: { children: [1001] } });
    expect(texts(card, ".block .empty")).toEqual([
      "Ingen lektier i ugeplanen.",
      "Intet skema i Aula.",
    ]);
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
    expect(spoken(card, ".child:first-child h2")).toBe(
      "Ida: I morgen, mandag 2. november, næste skoledag",
    );
    expect(spoken(card, ".child:last-child h2")).toBe(
      "Oskar: Tirsdag, 3. november, i overmorgen, næste skoledag",
    );
  });

  it("says a week plan is not in Aula yet, not that there is no homework", async () => {
    const { card } = await mount(DAY, "sun-1800-noplan", { config: { children: [1001] } });
    expect(text(card, '[data-block="homework"] .empty')).toBe(
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
    expect(texts(card, ".hero .fact")).toEqual(["Lejrskole i Thy, Thy Lejren"]);
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
    expect(texts(card, '[data-block="homework"] .empty')).toEqual([
      "Ugeplanen for uge 45 er ikke i Aula endnu.",
    ]);
    expect(all(card, '[data-block="homework"] .part-who')).toEqual([]);
  });

  it("names a child with nothing on one line beside a child who has something", async () => {
    const { card } = await mount(DAY, "thu-1930");
    const parts = all(card, '[data-block="homework"] .part');
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
    expect(text(card, '[data-block="events"] .item-place')).toBe("Kantinen");
    expect(text(card, '[data-block="events"] .item-text')).toBe("HøstfestKantinen");
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
  it("groups by the day homework is for, then by child, and folds the earlier days at once", async () => {
    const { card } = await mount(HOMEWORK, "thu-1530");
    const [tomorrow] = all(card, ".hw-day");
    expect(tomorrow?.classList.contains("focus")).toBe(true);
    expect(texts(card, ".hw-day:first-of-type .day-title")).toEqual(["I morgen"]);
    expect(texts(card, ".hw-day:first-of-type .day-date")).toEqual(["fredag 30. okt."]);
    expect(tomorrow?.querySelectorAll(".part")).toHaveLength(2);
    expect(text(card, ".fold > summary")).toBe("Tidligere lektier (4)");
    expect(all(card, ".earlier-days")).toEqual([]);
    await open(card, ".fold");
    expect(all(card, ".earlier-days .hw-day").length).toBeGreaterThan(0);
  });

  it("puts each note of a day on one surface", async () => {
    const { card } = await mount(HOMEWORK, "thu-1530", { config: { children: [1001] } });
    expect(all(card, ".hw-day:first-of-type .homework")).toHaveLength(1);
    expect(all(card, ".hw-day:first-of-type .hw")).toHaveLength(2);
  });

  it("has a title saying whose homework it is and the weeks it covers, for one child or several", async () => {
    const { card } = await mount(HOMEWORK, "thu-1530", { config: { children: [1001] } });
    expect(spoken(card, ".title-who")).toBe("Ida, Lektier, uge 44–45");
    const { card: both } = await mount(HOMEWORK, "thu-1530", { language: "en" });
    expect(spoken(both, ".title-who")).toBe("Ida and Oskar, Homework, weeks 44–45");
    expect(all(both, ".title-who .avatar")).toHaveLength(2);
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

  it("names the holiday ahead above the earlier homework", async () => {
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
    expect(texts(card, ".day-row:not(.focus-day) .line-1")).toContain(
      "Alle timer aflyst, 2 lektier",
    );
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
    expect(all(card, ".weekend-day").map((day) => spokenOf(day, ".facts"))).toEqual([
      "Spejdertur, Karl har fødselsdag",
      "Spejdertur",
    ]);
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

  it("folds the timetable to each subject and when it begins, keeping what is news", async () => {
    const { card } = await mount(DAY, "thu-0715", { config: { children: [1001] } });
    expect(texts(card, ".lessons.folded .lesson")).toEqual([
      "Idræt 08.00",
      "Dansk 10.05",
      "Engelsk Vikar 12.10",
    ]);
    expect(all(card, '[data-block="timetable"] .break, [data-block="timetable"] .end')).toEqual([]);
    expect(text(card, '[data-block="timetable"] .more')).toBe("Vis hele skemaet");
  });

  it("strikes a cancelled lesson through when folded, with its label", async () => {
    const { card } = await mount(DAY, "thu-1930", { config: { children: [1002] } });
    expect(texts(card, ".lessons.folded .lesson.cancelled")).toEqual(["Klassens tid Aflyst 13.45"]);
  });

  it("sets a folded lesson's label beside its subject, where a long one has the room to wrap", async () => {
    const { card } = await mount(DAY, "thu-1930-stress", { config: { children: [1001] } });
    expect(texts(card, ".lessons.folded .lesson-head .label")).toEqual([
      "Vikar",
      "Flyttet til lokale 117 pga. vandskade",
    ]);
    expect(all(card, ".lessons.folded .lesson > time")).toHaveLength(3);
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
      "Idræt 08.00",
      "Dansk 10.05",
      "Engelsk Vikar 12.10",
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
