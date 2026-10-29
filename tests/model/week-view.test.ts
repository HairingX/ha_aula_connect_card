import { describe, expect, it } from "vitest";

import { DEFAULT_ORDER } from "../../src/model/blocks.ts";
import { weekCardView, type WeekRow, type WeekViewOptions } from "../../src/model/week-view.ts";
import { scenarioNamed } from "../fixtures/scenarios.ts";
import { contextOf, noHold, snapshotOf } from "../fixtures/snapshot.ts";

const OPTIONS: WeekViewOptions = {
  children: [1001],
  switchAt: 720,
  packing: [],
  subjectNames: [],
  blocks: DEFAULT_ORDER,
  weeks: 2,
};

function rows(id: string, options: Partial<WeekViewOptions> = {}) {
  const item = scenarioNamed(id);
  const view = weekCardView(snapshotOf(item), { ...OPTIONS, ...options }, contextOf(item), noHold);
  return view.children[0]?.weeks ?? [];
}

function shape(row: WeekRow): string {
  switch (row.kind) {
    case "earlier":
      return `earlier ${String(row.days.length)}${row.weekdays ? " weekdays" : ""}`;
    case "today":
    case "focus":
    case "day":
      return `${row.kind} ${row.row.day.slice(8)}${row.row.relation ? ` ${row.row.relation}` : ""}`;
    case "weekend":
      return `weekend ${row.days.map((day) => day.day.slice(8)).join("+")}`;
    case "holiday":
      return `holiday ${row.event.title}`;
  }
}

describe("the week card", () => {
  it("folds the days before today, opens today, and closes the rest (Thursday 10:00)", () => {
    const [thisWeek, nextWeek] = rows("thu-1000");
    expect(thisWeek?.rows.map(shape)).toEqual([
      "earlier 3",
      "focus 29 today",
      "day 30 tomorrow",
      "weekend 31",
    ]);
    expect(thisWeek?.collapsed).toBe(false);
    expect(nextWeek?.rows.map(shape)).toEqual([
      "day 02",
      "day 03",
      "day 04",
      "day 05",
      "day 06",
      "weekend 08",
    ]);
    expect(nextWeek).toMatchObject({ number: 45, relation: "next" });
  });

  it("keeps today as a closed row with its end while school is on after the switch", () => {
    const [thisWeek] = rows("thu-1200");
    expect(thisWeek?.rows.map(shape)).toEqual([
      "earlier 3",
      "today 29 today",
      "focus 30 tomorrow",
      "weekend 31",
    ]);
    const today = thisWeek?.rows[1];
    expect(today?.kind === "today" && today.ends).toBe("2026-10-29T12:55:00+01:00");
  });

  it("folds today once it is over", () => {
    const [thisWeek] = rows("thu-1930");
    expect(thisWeek?.rows.map(shape)).toEqual(["earlier 4", "focus 30 tomorrow", "weekend 31"]);
  });

  it("collapses this week at the weekend, and opens Monday next week", () => {
    const [thisWeek, nextWeek] = rows("sat-1000");
    expect(thisWeek?.rows.map(shape)).toEqual(["earlier 5 weekdays", "weekend 31"]);
    expect(thisWeek?.collapsed).toBe(true);
    expect(nextWeek?.rows[0] && shape(nextWeek.rows[0])).toBe("focus 02");
  });

  it("shows the week of the focus day with weeks: 1, after this week when that is next week", () => {
    expect(rows("thu-1000", { weeks: 1 }).map((week) => week.number)).toEqual([44]);
    expect(rows("fri-1400", { weeks: 1 }).map((week) => week.number)).toEqual([44, 45]);
  });

  it("makes the days a holiday covers one row", () => {
    const [holiday, after] = rows("holiday");
    expect(holiday?.rows.map(shape)).toEqual(["holiday Efterårsferie"]);
    expect(after?.rows[0] && shape(after.rows[0])).toBe("focus 19");
  });
});
