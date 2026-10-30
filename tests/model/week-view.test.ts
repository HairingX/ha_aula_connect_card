import { describe, expect, it } from "vitest";

import type { StoreSnapshot } from "../../src/core/store.ts";
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

function weeks(id: string, options: Partial<WeekViewOptions> = {}, snapshot?: StoreSnapshot) {
  const item = scenarioNamed(id);
  const view = weekCardView(
    snapshot ?? snapshotOf(item),
    { ...OPTIONS, ...options },
    contextOf(item),
    noHold,
  );
  return view.children[0]?.weeks ?? [];
}

function shape(row: WeekRow): string {
  switch (row.kind) {
    case "earlier":
      return `earlier ${String(row.days.length)}${row.span ? ` ${row.span}` : ""}`;
    case "today":
    case "focus":
    case "day":
      return `${row.kind} ${row.row.day.slice(8)}${row.row.relation ? ` ${row.row.relation}` : ""}`;
    case "weekend":
      return `weekend ${row.days.map((day) => day.day.slice(8)).join("+")}${row.today ? " today" : ""}`;
    case "holiday":
      return `holiday ${row.event.title}${row.today ? " today" : ""}`;
  }
}

/** Returns a scenario's snapshot with Ida's data cut at `end`, or without notes from `notes`. */
function changed(id: string, change: { end?: string; notes?: string }): StoreSnapshot {
  const snapshot = snapshotOf(scenarioNamed(id));
  const key = "entry-a/1001";
  const entry = snapshot.data.get(key);
  if (!entry?.data) throw new Error("no data");
  const data = new Map(snapshot.data);
  const { notes, end } = change;
  data.set(key, {
    ...entry,
    data: {
      ...entry.data,
      end: end ?? entry.data.end,
      tasks: entry.data.tasks.filter((task) => notes === undefined || task.date < notes),
    },
  });
  return { ...snapshot, data };
}

describe("the week card", () => {
  it("folds the days before today, opens today, and closes the rest (Thursday 10:00)", () => {
    const [thisWeek, nextWeek] = weeks("thu-1000");
    expect(thisWeek?.rows.map(shape)).toEqual([
      "earlier 3",
      "focus 29 today",
      "day 30 tomorrow",
      "weekend 31",
    ]);
    expect(nextWeek?.rows.map(shape)).toEqual([
      "day 02",
      "day 03",
      "day 04",
      "day 05",
      "day 06",
      "weekend 08",
    ]);
    expect(nextWeek).toMatchObject({ number: 45, relation: "next", loading: false });
  });

  it("keeps today as a closed row with its end while school is on after the switch", () => {
    const [thisWeek] = weeks("thu-1200");
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
    const [thisWeek] = weeks("thu-1930");
    expect(thisWeek?.rows.map(shape)).toEqual(["earlier 4", "focus 30 tomorrow", "weekend 31"]);
  });

  it("marks the weekend today while its event is on, and opens Monday next week", () => {
    const [thisWeek, nextWeek] = weeks("sat-1000");
    expect(thisWeek?.rows.map(shape)).toEqual(["earlier 5 weekdays", "weekend 31 today"]);
    expect(nextWeek?.rows[0] && shape(nextWeek.rows[0])).toBe("focus 02");
  });

  it("folds a weekend day that is over with the rest of the week", () => {
    const [thisWeek] = weeks("sun-1800");
    expect(thisWeek?.rows.map(shape)).toEqual(["earlier 6 toSaturday"]);
  });

  it("joins both weekend days with something on into one row, today first", () => {
    const [thisWeek] = weeks("sat-1000-birthday");
    expect(thisWeek?.rows.map(shape)).toEqual(["earlier 5 weekdays", "weekend 31+01 today"]);
  });

  it("opens a Saturday with a lesson as the focus day", () => {
    const [thisWeek] = weeks("sat-1000-lesson");
    expect(thisWeek?.rows.map(shape)).toEqual(["earlier 5 weekdays", "focus 31 today"]);
  });

  it("shows the week of the focus day with weeks: 1, after this week when that is next week", () => {
    expect(weeks("thu-1000", { weeks: 1 }).map((week) => week.number)).toEqual([44]);
    expect(weeks("fri-1400", { weeks: 1 }).map((week) => week.number)).toEqual([44, 45]);
  });

  it("makes the days a holiday covers one row, marked when today is one of them", () => {
    const [holiday, after] = weeks("holiday");
    expect(holiday?.rows.map(shape)).toEqual(["holiday Efterårsferie today"]);
    expect(weeks("before-holiday").flatMap((week) => week.rows.map(shape))).toContain(
      "holiday Efterårsferie",
    );
    expect(after?.rows[0] && shape(after.rows[0])).toBe("focus 19");
  });

  it("loads a week the data does not cover yet, rather than call its days empty", () => {
    const [thisWeek, nextWeek] = weeks("thu-1000", {}, changed("thu-1000", { end: "2026-11-02" }));
    expect(thisWeek?.loading).toBe(false);
    expect(nextWeek).toMatchObject({ loading: true, rows: [] });
  });

  it("says a later week's plan is not in Aula yet, once, and not where its open day says so", () => {
    const [, nextWeek] = weeks("thu-1000", {}, changed("thu-1000", { notes: "2026-11-02" }));
    expect(nextWeek?.notYet).toBe(45);
    const [, monday] = weeks("fri-1400-noplan");
    expect(monday?.notYet).toBeUndefined();
    const focus = monday?.rows[0];
    expect(focus?.kind === "focus" && focus.row.plan.blocks[0]).toEqual({
      id: "homework",
      empty: "planMissing",
    });
  });

  it("shows a Saturday with a lesson as a day of its own, with its hours", () => {
    const [thisWeek] = weeks("thu-1930-satlesson");
    expect(thisWeek?.rows.map(shape)).toEqual(["earlier 4", "focus 30 tomorrow", "day 31"]);
    const saturday = thisWeek?.rows[2];
    expect(saturday?.kind === "day" && saturday.row.content.hours).toBeTruthy();
  });

  it("keeps a holiday's own dates on its first row, and the next week's days on the next", () => {
    const [first, second] = weeks("before-holiday");
    const holidays = [first, second].flatMap((week) =>
      (week?.rows ?? []).flatMap((row) =>
        row.kind === "holiday" ? [[row.first, row.last, row.whole]] : [],
      ),
    );
    expect(holidays).toEqual([
      ["2026-10-10", "2026-10-18", false],
      ["2026-10-12", "2026-10-18", true],
    ]);
  });

  it("names the days a holiday covers in its second week, when not the whole week", () => {
    const [, second] = weeks("two-holidays", { children: [1002] });
    const row = second?.rows.find((item) => item.kind === "holiday");
    expect(row?.kind === "holiday" && [row.first, row.last, row.whole]).toEqual([
      "2026-10-12",
      "2026-10-18",
      true,
    ]);
  });

  it("keeps a day whose every lesson is cancelled open for its school event, without hours", () => {
    const [thisWeek] = weeks("thu-1930-allcancelled");
    const friday = thisWeek?.rows[1];
    expect(friday && shape(friday)).toBe("focus 30 tomorrow");
    expect(friday?.kind === "focus" && friday.row.content.hours).toBeUndefined();
  });

  it("shows a camp on its last day by when it ends", () => {
    const [thisWeek] = weeks("tue-1930-camp");
    const thursday = thisWeek?.rows.find(
      (row) => row.kind === "day" && row.row.day === "2026-11-05",
    );
    expect(thursday?.kind === "day" && thursday.row.content.timed.map((item) => item.span)).toEqual(
      ["until"],
    );
  });
});
