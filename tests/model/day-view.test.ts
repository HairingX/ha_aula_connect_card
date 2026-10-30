import { describe, expect, it } from "vitest";

import { dayCardView, type DayGroup, type DayViewOptions } from "../../src/model/day-view.ts";
import { DEFAULT_ORDER, type Fact } from "../../src/model/blocks.ts";
import type { StoreSnapshot } from "../../src/core/store.ts";
import { scenarioNamed } from "../fixtures/scenarios.ts";
import { contextOf, noHold, snapshotOf } from "../fixtures/snapshot.ts";
import { weekData } from "../fixtures/week.ts";

const OPTIONS: DayViewOptions = {
  children: [1001],
  switchAt: 720,
  packing: [{ subject: "Svømning", items: ["Badetøj"] }],
  subjectNames: [],
  blocks: DEFAULT_ORDER,
};

function view(id: string, options: Partial<DayViewOptions> = {}, snapshot?: StoreSnapshot) {
  const item = scenarioNamed(id);
  return dayCardView(
    snapshot ?? snapshotOf(item),
    { ...OPTIONS, ...options },
    contextOf(item),
    noHold,
  );
}

function group(id: string, options: Partial<DayViewOptions> = {}): DayGroup {
  const [first] = view(id, options).groups;
  if (!first) throw new Error("no group");
  return first;
}

function above(id: string) {
  const rows = group(id).above;
  if (!rows) throw new Error("no rows above");
  return rows;
}

function named(facts: readonly Fact[]): string[] {
  return facts.map((fact) => (fact.kind === "event" ? fact.event.title : fact.birthday.name));
}

function blocks(item: DayGroup): string[] {
  return item.blocks.map(
    (block) => `${block.id}: ${block.parts.map((part) => part.empty ?? "content").join(", ")}`,
  );
}

describe("the rows above the school day's header", () => {
  it("has none in the morning: today is the day", () => {
    expect(above("thu-0715")).toMatchObject({ today: [], bridges: [], moreDays: 0 });
  });

  it("keeps the rest of today after the switch: school ends 12.55", () => {
    const [entry] = above("thu-1200").today;
    expect(entry?.rest.running).toBeUndefined();
    expect(entry?.rest.ends).toBe("2026-10-29T12:55:00+01:00");
  });

  it("drops it once today is over", () => {
    expect(above("thu-1930").today).toEqual([]);
  });

  it("names the lesson going on, and bridges a weekend day with something on", () => {
    const rows = above("fri-1240");
    expect(rows.today[0]?.rest.running?.lesson.title).toBe("HIS");
    expect(rows.today[0]?.rest.ends).toBe("2026-10-30T13:40:00+01:00");
    expect(rows.bridges.map((line) => [line.row.kind, line.row.days])).toEqual([
      ["weekend", ["2026-10-31"]],
    ]);
  });

  it("shows Saturday's event going on as the rest of today", () => {
    const rows = above("sat-1000");
    expect(rows.events.map(({ item }) => [item.event.title, item.span])).toEqual([
      ["Loppemarked i skolegården", "within"],
    ]);
    expect(rows.bridges).toEqual([]);
  });

  it("names today's whole-day events and birthdays on a day without school, and not again later", () => {
    const rows = above("sat-1000-birthday");
    expect(named(rows.facts.map(({ item }) => item))).toEqual(["Spejdertur", "Karl"]);
    expect(rows.bridges).toEqual([]);
  });

  it("has nothing on Sunday evening: an empty weekend needs no row", () => {
    expect(above("sun-1800")).toMatchObject({ today: [], bridges: [] });
  });

  it("says a weekday has no timetable in Aula", () => {
    expect(above("empty-tue").bridges.map((line) => [line.row.kind, line.row.days])).toEqual([
      ["empty", ["2026-10-27"]],
    ]);
  });

  it("names a holiday by its own dates, even beyond the range", () => {
    const [line] = above("holiday").bridges;
    expect(line?.row).toMatchObject({ kind: "holiday", first: "2026-10-10", last: "2026-10-18" });
  });

  it("leaves out hidden events and birthdays, today and on the days passed over", () => {
    const show = { blocks: DEFAULT_ORDER.filter((id) => id !== "events" && id !== "birthdays") };
    const saturday = group("sat-1000-birthday", show).above;
    expect(saturday).toMatchObject({ today: [], events: [], facts: [], bridges: [] });
    expect(group("fri-1400", show).above?.bridges).toEqual([]);
  });

  it("says a weekday passed over has every lesson cancelled", () => {
    const item = scenarioNamed("thu-1930");
    const snapshot = snapshotOf(item);
    const key = "entry-a/1001";
    const entry = snapshot.data.get(key);
    if (!entry?.data) throw new Error("no data");
    const data = new Map(snapshot.data);
    const friday = (start: string): boolean => start.startsWith("2026-10-30");
    data.set(key, {
      ...entry,
      data: {
        ...entry.data,
        lessons: entry.data.lessons.map((lesson) =>
          friday(lesson.start) ? { ...lesson, status: "Aflyst" } : lesson,
        ),
        events: entry.data.events.filter((event) => !friday(event.start)),
      },
    });
    const [first] = view("thu-1930", {}, { ...snapshot, data }).groups;
    expect(first?.hero).toMatchObject({ kind: "day", focus: { day: "2026-11-02" } });
    expect(first?.above?.bridges[0]?.row).toEqual({
      kind: "empty",
      days: ["2026-10-30"],
      cancelled: true,
    });
  });

  it("names a holiday going on today once, by its dates rather than in the rest of today", () => {
    const rows = above("holiday");
    expect(rows.today).toEqual([]);
    expect(rows.facts).toEqual([]);
    expect(rows.bridges.map((line) => line.row.kind)).toEqual(["holiday"]);
  });
});

describe("the header", () => {
  it("names a sports day without lessons in the timetable, as a calendar does", () => {
    const item = group("motionsdag");
    expect(item.hero).toMatchObject({
      kind: "day",
      focus: { day: "2026-10-27", reason: "tomorrow" },
    });
    expect(named(item.facts)).toEqual([]);
    expect(blocks(item)).toEqual(["task: noHomework", "timetable: content"]);
  });

  it("says birthdays in the header and events in the timetable, no block for either", () => {
    const item = group("thu-1930");
    expect(named(item.facts)).toEqual(["Alma"]);
    expect(item.blocks.map((block) => block.id)).toEqual(["task", "timetable", "comment"]);
  });

  it("names the holiday ahead and the day school starts again", () => {
    const item = group("before-holiday");
    expect(item.hero).toMatchObject({
      kind: "holiday",
      event: { title: "Efterårsferie" },
      first: "2026-10-10",
      last: "2026-10-18",
      resumes: "2026-10-19",
    });
    expect(item.above?.bridges).toEqual([]);
    expect(item.blocks).toEqual([]);
  });

  it("finds the holiday and the day school starts again when the holiday ends on a Friday", () => {
    expect(group("before-weekday-holiday").hero).toMatchObject({
      kind: "holiday",
      first: "2026-10-12",
      last: "2026-10-16",
      resumes: "2026-10-19",
    });
  });

  it("says what it knows when no holiday explains the days without school", () => {
    const item = scenarioNamed("before-holiday");
    const snapshot = snapshotOf(item);
    const key = "entry-a/1001";
    const entry = snapshot.data.get(key);
    if (!entry?.data) throw new Error("no data");
    const data = new Map(snapshot.data);
    data.set(key, {
      ...entry,
      data: { ...entry.data, events: entry.data.events.filter((event) => event.id !== "h42") },
    });
    const [first] = view("before-holiday", {}, { ...snapshot, data }).groups;
    expect(first?.hero).toEqual({ kind: "none", horizon: "2026-10-18" });
  });
});

describe("before the data", () => {
  it("shows no child before the children are listed", () => {
    const snapshot = snapshotOf(scenarioNamed("thu-1930"));
    const shown = view(
      "thu-1930",
      {},
      {
        ...snapshot,
        children: { list: undefined, error: undefined, refreshing: false },
      },
    );
    expect(shown).toMatchObject({ groups: [], missing: [1001] });
  });

  it("loads a child whose data does not reach today yet, and sizes the card for a day", () => {
    const item = scenarioNamed("thu-1930");
    const snapshot = snapshotOf(item);
    const data = new Map(snapshot.data);
    data.set("entry-a/1001", {
      range: snapshot.range,
      data: weekData("2026-10-12"),
      error: undefined,
      stale: true,
    });
    const shown = view("thu-1930", {}, { ...snapshot, data });
    expect(shown.groups[0]?.children[0]?.state).toEqual({ kind: "loading" });
    expect(shown.size).toBe(9);
  });
});

describe("several children", () => {
  it("share one header when their day is the same, with the facts every child has there", () => {
    const shown = view("thu-1930", { children: [] });
    expect(shown.groups).toHaveLength(1);
    const [item] = shown.groups;
    expect(named(item?.facts ?? [])).toEqual([]);
    expect(item?.children.map((child) => named(child.facts))).toEqual([["Alma"], []]);
  });

  it("answer each block for every child in turn, saying when a child has nothing", () => {
    expect(blocks(group("thu-1930", { children: [] }))).toEqual([
      "task: content, noHomework",
      "pack: none, content",
      "timetable: content, content",
      "comment: content, content",
    ]);
  });

  it("keep their own headers when their days differ", () => {
    const shown = view("two-schools", { children: [] });
    expect(shown.differentSchools).toBe(true);
    expect(
      shown.groups.map((item) => [
        item.children.map((child) => child.child.first_name),
        item.hero?.kind === "day" ? item.hero.focus.day : undefined,
      ]),
    ).toEqual([
      [["Ida"], "2026-11-02"],
      [["Oskar"], "2026-11-03"],
    ]);
    expect(shown.groups[1]?.above?.bridges.map((line) => line.row.kind)).toEqual(["holiday"]);
  });

  it("keep a header of their own for each holiday and the day each school starts again", () => {
    const shown = view("two-holidays", { children: [] });
    expect(
      shown.groups.map((item) => [
        item.children.map((child) => child.child.first_name),
        item.hero?.kind === "holiday" ? item.hero.resumes : undefined,
      ]),
    ).toEqual([
      [["Ida"], "2026-10-19"],
      [["Oskar"], "2026-10-21"],
    ]);
  });

  it("share a holiday's header when it says the same for each", () => {
    const shown = view("before-holiday", { children: [] });
    expect(shown.groups).toHaveLength(1);
    expect(shown.groups[0]?.children).toHaveLength(2);
  });

  it("list each school's end time in one row of today, leaving out a cancelled lesson", () => {
    const rows = group("fri-1240", { children: [] }).above;
    expect(rows?.today.map((entry) => [entry.child.first_name, entry.rest.ends])).toEqual([
      ["Ida", "2026-10-30T13:40:00+01:00"],
      ["Oskar", "2026-10-30T13:30:00+01:00"],
    ]);
  });

  it("stand alone until every child can be shown", () => {
    const item = scenarioNamed("thu-1930");
    const snapshot = snapshotOf(item);
    const data = new Map(snapshot.data);
    data.delete("entry-a/1002");
    const shown = view("thu-1930", { children: [] }, { ...snapshot, data });
    expect(shown.groups.map((entry) => [entry.children.length, entry.hero?.kind])).toEqual([
      [1, "day"],
      [1, undefined],
    ]);
    expect(named(shown.groups[0]?.facts ?? [])).toEqual(["Alma"]);
  });
});

describe("the school day's blocks", () => {
  it("say homework is not shown without a week plan, and leave birthdays out", () => {
    const item = group("no-week-plan");
    expect(blocks(item)).toEqual(["task: noWeekPlan", "timetable: content"]);
    expect(named(item.facts)).toEqual([]);
  });

  it("put what is marked first, and name the day's subjects", () => {
    const [child] = group("thu-1930").children;
    expect(child?.content?.subjects.map((subject) => subject.name)).toEqual([
      "Matematik",
      "Dansk",
      "Engelsk",
      "Historie",
    ]);
  });

  it("say the week plan is not in Aula yet instead of no homework", () => {
    const item = group("sun-1800-noplan");
    expect(blocks(item)[0]).toBe("task: planMissing");
    expect(item.children[0]?.content?.planMissing).toBe(45);
  });

  it("count no cancelled lesson in the hours, the subjects or what to bring", () => {
    const [, oskar] = group("thu-1930", { children: [] }).children;
    expect(oskar?.content?.hours?.end).toBe("2026-10-30T13:30:00+01:00");
    expect(oskar?.content?.subjects.map((subject) => subject.name)).toEqual([
      "Matematik",
      "Svømning",
      "Historie",
    ]);
    const cancelled = oskar?.content?.timetable.find(
      (row) => row.kind === "lesson" && row.cancelled,
    );
    expect(cancelled?.kind === "lesson" && cancelled.subject.name).toBe("Klassens tid");
  });

  it("show a camp's middle day in the timetable, and its first day by when it began", () => {
    const item = group("tue-1930-camp");
    expect(item.hero).toMatchObject({ focus: { day: "2026-11-04", reason: "tomorrow" } });
    expect(named(item.facts)).toEqual([]);
    expect(item.children[0]?.plan?.allDay.map((event) => event.title)).toEqual(["Lejrskole i Thy"]);
    expect(item.above?.events.map(({ item: entry }) => [entry.event.title, entry.span])).toEqual([
      ["Lejrskole i Thy", "from"],
    ]);
  });
});
