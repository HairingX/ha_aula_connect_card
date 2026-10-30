import { describe, expect, it } from "vitest";

import type { StoreSnapshot } from "../../src/core/store.ts";
import { homeworkCardView, type HomeworkDay } from "../../src/model/homework-view.ts";
import type { ViewOptions } from "../../src/model/child.ts";
import { scenarioNamed } from "../fixtures/scenarios.ts";
import { contextOf, noHold, snapshotOf } from "../fixtures/snapshot.ts";

const OPTIONS: ViewOptions = { children: [], switchAt: 720, packing: [], subjectNames: [] };
const IDA = { ...OPTIONS, children: [1001] };

function view(id: string, options: ViewOptions = OPTIONS, snapshot?: StoreSnapshot) {
  const item = scenarioNamed(id);
  return homeworkCardView(snapshot ?? snapshotOf(item), options, contextOf(item), noHold);
}

function shape(day: HomeworkDay): string {
  const parts = day.parts.map(
    (part) => `${part.child.first_name} ${part.empty ?? String(part.items.length)}`,
  );
  return [day.day, day.relation, day.week ?? "-", day.focus ? "focus" : "-", ...parts].join(" ");
}

/** Returns a scenario's snapshot without Ida's notes from `first` on. */
function withoutNotes(id: string, first: string): StoreSnapshot {
  const snapshot = snapshotOf(scenarioNamed(id));
  const key = "entry-a/1001";
  const entry = snapshot.data.get(key);
  if (!entry?.data) throw new Error("no data");
  const data = new Map(snapshot.data);
  data.set(key, {
    ...entry,
    data: { ...entry.data, tasks: entry.data.tasks.filter((task) => task.date < first) },
  });
  return { ...snapshot, data };
}

describe("the homework card", () => {
  it("starts at the focus day, then every later day with homework, the week named on a new one", () => {
    expect(view("thu-1530", IDA).days.map(shape)).toEqual([
      "2026-10-30 tomorrow - focus Ida 2",
      "2026-11-02 weekday 45 - Ida 1",
      "2026-11-03 weekday - - Ida 1",
      "2026-11-04 weekday - - Ida 1",
    ]);
  });

  it("orders a day's homework by its timetable", () => {
    const [friday] = view("thu-1530", IDA).days;
    expect(friday?.parts[0]?.items.map((item) => item.subject?.name)).toEqual([
      "Matematik",
      "Dansk",
    ]);
  });

  it("gives each day a part for each child: the focus day every child's, later days for homework", () => {
    expect(view("thu-1530").days.map(shape)).toEqual([
      "2026-10-30 tomorrow - focus Ida 2 Oskar noHomework",
      "2026-11-02 weekday 45 - Ida 1 Oskar 1",
      "2026-11-03 weekday - - Ida 1",
      "2026-11-04 weekday - - Ida 1 Oskar 1",
    ]);
  });

  it("folds the days before the focus day, counting their homework", () => {
    const afternoon = view("thu-1530", IDA);
    expect(afternoon.earlier.map((day) => day.day)).toEqual([
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
    ]);
    expect(afternoon.earlierCount).toBe(3);
    const morning = view("thu-0715", IDA);
    expect(morning.days[0]).toMatchObject({ day: "2026-10-29", relation: "today", focus: true });
    expect(morning.earlierCount).toBe(2);
  });

  it("says on the focus day that its week plan is not in Aula yet, and only there", () => {
    const shown = view("sun-1800-noplan");
    expect(shown.days.map(shape)).toEqual([
      "2026-11-02 tomorrow 45 focus Ida planMissing Oskar planMissing",
    ]);
    expect(shown.notYet).toEqual([]);
  });

  it("says when a later week's plan is not in Aula yet", () => {
    const shown = view("thu-1530", OPTIONS, withoutNotes("thu-1530", "2026-11-02"));
    expect(shown.notYet.map((item) => [item.week, item.only.map((c) => c.first_name)])).toEqual([
      [45, ["Ida"]],
    ]);
  });

  it("shows only its reason at a school without a week plan, and loads before anything", () => {
    expect(view("no-week-plan", IDA).days.map(shape)).toEqual([
      "2026-10-30 tomorrow - focus Ida noWeekPlan",
    ]);
    const loading = view("thu-1530", IDA, {
      ...snapshotOf(scenarioNamed("thu-1530")),
      data: new Map(),
    });
    expect(loading.children[0]?.state).toEqual({ kind: "loading" });
    expect(loading.size).toBe(6);
  });

  it("names the holiday ahead at a school without a week plan, and nothing else", () => {
    const snapshot = snapshotOf(scenarioNamed("before-holiday"));
    const key = "entry-a/1001";
    const entry = snapshot.data.get(key);
    if (!entry?.data) throw new Error("no data");
    const data = new Map(snapshot.data);
    data.set(key, { ...entry, data: { ...entry.data, week_plan: false } });
    const shown = view("before-holiday", IDA, { ...snapshot, data });
    expect(shown.heroes).toHaveLength(1);
    expect(shown.days).toEqual([]);
    expect(shown.earlier).toEqual([]);
  });

  it("looks for homework only as far as the data reaches", () => {
    const snapshot = snapshotOf(scenarioNamed("thu-1530"));
    const key = "entry-a/1001";
    const entry = snapshot.data.get(key);
    if (!entry?.data) throw new Error("no data");
    const data = new Map(snapshot.data);
    data.set(key, { ...entry, data: { ...entry.data, end: "2026-11-02" } });
    const shown = view("thu-1530", IDA, { ...snapshot, data });
    expect(shown.days.every((day) => day.day < "2026-11-02")).toBe(true);
    expect(view("thu-1530", IDA).days.some((day) => day.day >= "2026-11-02")).toBe(true);
  });

  it("names the holiday ahead before the earlier homework, and awaits no plan for it", () => {
    const shown = view("before-holiday", IDA);
    expect(shown.heroes).toMatchObject([
      { hero: { kind: "holiday", resumes: "2026-10-19" }, only: [] },
    ]);
    expect(shown.days).toEqual([]);
    expect(shown.earlierCount).toBe(5);
    expect(shown.notYet).toEqual([]);
  });
});
