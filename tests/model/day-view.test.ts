import { describe, expect, it } from "vitest";

import { dayCardView, type DayViewOptions } from "../../src/model/day-view.ts";
import { DEFAULT_ORDER } from "../../src/model/blocks.ts";
import { CHILDREN } from "../fixtures/week.ts";
import { scenarioNamed } from "../fixtures/scenarios.ts";
import { contextOf, noHold, snapshotOf } from "../fixtures/snapshot.ts";

const IDA = [CHILDREN[0]?.child_id ?? 0];
const OPTIONS: DayViewOptions = {
  children: IDA,
  switchAt: 720,
  packing: [],
  subjectNames: [],
  blocks: DEFAULT_ORDER,
};

function view(id: string, options: Partial<DayViewOptions> = {}) {
  const item = scenarioNamed(id);
  return dayCardView(snapshotOf(item), { ...OPTIONS, ...options }, contextOf(item), noHold);
}

function above(id: string) {
  const first = view(id).children[0];
  if (!first?.above) throw new Error("no rows above");
  return first.above;
}

describe("the rows above the school day's header", () => {
  it("has none in the morning: today is the day", () => {
    expect(above("thu-0715")).toMatchObject({ today: [], bridges: [], moreDays: 0 });
  });

  it("keeps the rest of today after the switch: school ends 12.55 (row 3)", () => {
    const [entry] = above("thu-1200").today;
    expect(entry?.rest.running).toBeUndefined();
    expect(entry?.rest.ends).toBe("2026-10-29T12:55:00+01:00");
  });

  it("drops it once today is over (row 4)", () => {
    expect(above("thu-1930").today).toEqual([]);
  });

  it("names the lesson going on, and bridges a weekend day with something on (row 8)", () => {
    const rows = above("fri-1240");
    expect(rows.today[0]?.rest.running?.lesson.title).toBe("HIS");
    expect(rows.today[0]?.rest.ends).toBe("2026-10-30T13:40:00+01:00");
    expect(rows.bridges.map((line) => [line.row.kind, line.row.days])).toEqual([
      ["weekend", ["2026-10-31"]],
    ]);
  });

  it("shows Saturday's event going on as the rest of today (row 9)", () => {
    const rows = above("sat-1000");
    expect(rows.today[0]?.rest.events.map((event) => event.title)).toEqual([
      "Loppemarked i skolegården",
    ]);
    expect(rows.bridges).toEqual([]);
  });

  it("has nothing on Sunday evening: an empty weekend needs no row (row 11)", () => {
    expect(above("sun-1800")).toMatchObject({ today: [], bridges: [] });
  });

  it("says a weekday has no timetable in Aula (row 13)", () => {
    expect(above("empty-tue").bridges.map((line) => [line.row.kind, line.row.days])).toEqual([
      ["empty", ["2026-10-27"]],
    ]);
  });

  it("focuses a sports day without lessons, with its chip (row 14)", () => {
    const [child] = view("motionsdag").children;
    expect(child?.focus).toMatchObject({ day: "2026-10-27", reason: "tomorrow" });
    expect(child?.chips.map((chip) => (chip.kind === "event" ? chip.event.title : ""))).toEqual([
      "Motionsdag",
    ]);
    expect(child?.plan?.blocks).toEqual([
      { id: "timetable", empty: true },
      { id: "events", empty: false },
    ]);
  });

  it("names a holiday by its own dates, even beyond the range (row 20)", () => {
    const [line] = above("holiday").bridges;
    expect(line?.row).toMatchObject({ kind: "holiday", first: "2026-10-10", last: "2026-10-18" });
  });

  it("says there is no school day up to the range's end (row 23)", () => {
    const rows = above("before-holiday");
    expect(rows.none).toBe("2026-10-18");
    expect(rows.bridges.map((line) => line.row.kind)).toEqual(["holiday"]);
  });
});

describe("several children", () => {
  it("share one header when their day is the same, with the common chips there", () => {
    const shown = view("fri-1400", { children: [] });
    expect(shown.layout).toBe("shared");
    expect(shown.shared?.focus.day).toBe("2026-11-02");
    const friday = view("thu-1930", { children: [] });
    expect(friday.shared?.chips.map((chip) => chip.kind)).toEqual(["event"]);
    expect(friday.children.map((child) => child.chips.map((chip) => chip.kind))).toEqual([
      ["birthday"],
      [],
    ]);
    expect(friday.children.every((child) => child.above === undefined)).toBe(true);
  });

  it("keep their own headers when their days differ (row 29)", () => {
    const shown = view("two-schools", { children: [] });
    expect(shown.layout).toBe("separate");
    expect(shown.differentSchools).toBe(true);
    expect(shown.children.map((child) => [child.focus.day, child.focus.reason])).toEqual([
      ["2026-11-02", "tomorrow"],
      ["2026-11-03", "next_school_day"],
    ]);
    expect(shown.children[1]?.above?.bridges.map((line) => line.row.kind)).toEqual(["holiday"]);
  });

  it("list each school's end time in one row of today", () => {
    const shown = view("fri-1240", { children: [] });
    expect(shown.shared?.above.today.map((entry) => entry.child.first_name)).toEqual([
      "Ida",
      "Oskar",
    ]);
  });
});

describe("the school day's blocks", () => {
  it("leave homework and birthdays out silently without a week plan", () => {
    const [child] = view("no-week-plan").children;
    expect(child?.plan?.blocks.map((block) => block.id)).toEqual(["timetable", "events"]);
    expect(child?.chips.map((chip) => chip.kind)).toEqual(["event"]);
  });

  it("put homework first and quote the week plan's reminders", () => {
    const [child] = view("thu-1930").children;
    expect(child?.plan?.blocks.map((block) => block.id)).toEqual([
      "homework",
      "pack",
      "timetable",
      "plan",
      "events",
      "birthdays",
    ]);
    expect(child?.plan?.quotes.map((quote) => quote.text)).toEqual([
      "Husk madpakke – vi spiser i klassen.",
    ]);
  });
});
