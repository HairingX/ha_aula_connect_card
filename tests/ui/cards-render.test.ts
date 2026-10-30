import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../../src/index.ts";
import { forget } from "../../src/core/memory.ts";
import type { WeekData } from "../../src/core/types.ts";
import { IDLE_RESET_MS } from "../../src/model/focus.ts";
import { present } from "../fake-hass.ts";
import { all, mount, text, unmountAll, type Card } from "../fixtures/mount.ts";
import { SCENARIOS, scenarioNamed } from "../fixtures/scenarios.ts";

const DAY = "aula-connect-day-card";
const HOMEWORK = "aula-connect-homework-card";
const WEEK = "aula-connect-card";

/** Returns what a screen reader reads of an element: without what is hidden from it. */
function spokenOf(root: ParentNode, selector: string): string {
  const element = present(root.querySelector(selector)).cloneNode(true) as Element;
  for (const hidden of element.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
  return element.textContent.replace(/\s+/g, " ").trim();
}

function spoken(card: Card, selector: string): string {
  return spokenOf(present(card.shadowRoot), selector);
}

function texts(card: Card, selector: string): string[] {
  return all(card, selector).map((element) => element.textContent.replace(/\s+/g, " ").trim());
}

async function open(card: Card, selector: string): Promise<void> {
  const details = present(card.shadowRoot?.querySelector<HTMLDetailsElement>(selector));
  details.open = true;
  details.dispatchEvent(new Event("toggle"));
  await card.updateComplete;
}

/** Answers a scenario's subscriptions with its data changed. */
function changed(scenario: string, change: (data: WeekData) => WeekData) {
  const item = scenarioNamed(scenario);
  return {
    setup: (hass: { connection: { respond: unknown } }) => {
      hass.connection.respond = (message: Record<string, unknown>) =>
        change(item.data(present(item.children.find((c) => c.child_id === message.child_id))));
    },
  };
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

  it("names the subjects of the day where the bag is packed, and nowhere when Husk is hidden", async () => {
    const { card } = await mount(DAY, "thu-1930", { config: { children: [1001] } });
    expect(text(card, ".pack-subjects")).toBe("Fag: Matematik, Dansk, Engelsk, Historie");
    const hidden = await mount(DAY, "thu-1930", {
      config: { children: [1001], show: { pack: false } },
    });
    expect(all(hidden.card, ".pack-subjects")).toEqual([]);
  });

  it("names an event over several days by when it began, and the days between as facts", async () => {
    const { card } = await mount(DAY, "tue-1930-camp", {
      config: { children: [1001] },
      language: "en",
    });
    expect(text(card, ".above")).toContain("Lejrskole i Thy 8:00 AM →");
    expect(texts(card, ".hero .fact")).toEqual(["Lejrskole i Thy · Thy Lejren"]);
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
    expect(spoken(card, ".title-who")).toBe("Ida, Lektier");
  });

  it("names the holiday ahead above the earlier homework", async () => {
    const { card } = await mount(HOMEWORK, "before-holiday", { config: { children: [1001] } });
    expect(text(card, ".hw-day.focus .day-title")).toBe("Efterårsferie");
    expect(text(card, ".hw-day.focus .day-date")).toBe(
      "10.–18. okt., skolen starter mandag 19. oktober",
    );
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
      "AM\u2009\u2013\u202f1:00",
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
    expect(days.map((item) => item?.textContent.replace(/\s+/g, " "))).toEqual([
      "Loppemarked i skolegården, lør.",
      "ViggoViggo har fødselsdag, søn.",
    ]);
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
    expect(all(card, ".more")).toEqual([]);
    tall = true;
    resized();
    await card.updateComplete;
    await card.updateComplete;
    expect(text(card, ".more")).toBe("Vis mere");
    present(card.shadowRoot?.querySelector<HTMLButtonElement>(".more")).click();
    await card.updateComplete;
    expect(text(card, ".more")).toBe("Vis mindre");
    expect(all(card, ".plan.open")).toHaveLength(1);
  });
});
