import { describe, expect, it } from "vitest";

import { homeworkCardView } from "../../src/model/homework-view.ts";
import { scenarioNamed } from "../fixtures/scenarios.ts";
import { contextOf, noHold, snapshotOf } from "../fixtures/snapshot.ts";

const OPTIONS = { children: [], switchAt: 720, packing: [], subjectNames: [] };

function view(id: string, snapshot = snapshotOf(scenarioNamed(id))) {
  return homeworkCardView(snapshot, OPTIONS, contextOf(scenarioNamed(id)), noHold);
}

describe("the homework card", () => {
  it("starts at the focus day, then every later day with homework, the week named on a new one", () => {
    const [ida] = view("thu-1530").children;
    expect(
      ida?.groups.map((group) => [group.day, group.relation, group.week, group.items.length]),
    ).toEqual([
      ["2026-10-30", "tomorrow", undefined, 2],
      ["2026-11-02", "weekday", 45, 1],
      ["2026-11-03", "weekday", undefined, 1],
      ["2026-11-04", "weekday", undefined, 1],
    ]);
  });

  it("orders a day's homework by its timetable", () => {
    const [ida] = view("thu-1530").children;
    expect(ida?.groups[0]?.items.map((item) => item.subject?.name)).toEqual(["Matematik", "Dansk"]);
  });

  it("shows the focus day even without homework", () => {
    const [, oskar] = view("thu-1530").children;
    expect(oskar?.groups[0]).toMatchObject({ day: "2026-10-30", items: [] });
  });

  it("folds the days before the focus day, counting their homework", () => {
    const [ida] = view("thu-1530").children;
    expect(ida?.earlier.map((group) => group.day)).toEqual([
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
    ]);
    expect(ida?.earlierCount).toBe(3);
    const [morning] = view("thu-0715").children;
    expect(morning?.groups[0]).toMatchObject({ day: "2026-10-29", relation: "today" });
    expect(morning?.earlierCount).toBe(2);
  });

  it("says when next week's plan is not in Aula yet", () => {
    const item = scenarioNamed("thu-1530");
    const snapshot = snapshotOf(item);
    const key = "entry-a/1001";
    const entry = snapshot.data.get(key);
    if (!entry?.data) throw new Error("no data");
    const data = new Map(snapshot.data);
    data.set(key, {
      ...entry,
      data: { ...entry.data, tasks: entry.data.tasks.filter((task) => task.date < "2026-11-02") },
    });
    const [ida] = view("thu-1530", { ...snapshot, data }).children;
    expect(ida?.notYet).toEqual([45]);
  });

  it("shows nothing but its reason at a school without a week plan, and while loading", () => {
    const [ida] = view("no-week-plan").children;
    expect(ida).toMatchObject({ weekPlan: false, groups: [], earlier: [] });
    const loading = homeworkCardView(
      { ...snapshotOf(scenarioNamed("thu-1530")), data: new Map() },
      OPTIONS,
      contextOf(scenarioNamed("thu-1530")),
      noHold,
    );
    expect(loading.children[0]?.state).toEqual({ kind: "loading" });
    expect(loading.size).toBe(6);
  });

  it("has no focus day before a holiday, folds the week's homework, and awaits no plan for it", () => {
    const [ida] = view("before-holiday").children;
    expect(ida?.focus).toMatchObject({ reason: "none", horizon: "2026-10-18" });
    expect(ida?.groups).toEqual([]);
    expect(ida?.earlierCount).toBe(5);
    expect(ida?.notYet).toEqual([]);
  });
});
