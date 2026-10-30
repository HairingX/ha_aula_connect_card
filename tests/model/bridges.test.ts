import { describe, expect, it } from "vitest";

import { bridgeRows, fitRows, type BridgeRow } from "../../src/model/bridges.ts";
import { buildDays } from "../../src/model/days.ts";
import type { Focus } from "../../src/model/focus.ts";
import { allDay, local, weekData, without, ZONE } from "../fixtures/week.ts";

const RANGE = { start: "2026-10-26", end: "2026-11-09" };

function focus(today: string, skipped: string[], day: string | undefined): Focus {
  return { today, day, reason: "next_school_day", afterSwitch: true, horizon: day, skipped };
}

describe("the bridge rows", () => {
  it("join a Saturday and a Sunday with something on into one weekend row", () => {
    const data = weekData("2026-10-26");
    const sunday = { ...data, birthdays: [...data.birthdays, { date: "2026-11-01", name: "Bo" }] };
    const rows = bridgeRows(
      buildDays(sunday, RANGE, ZONE),
      focus("2026-10-30", ["2026-10-30", "2026-10-31", "2026-11-01"], "2026-11-02"),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "weekend", days: ["2026-10-31", "2026-11-01"] });
  });

  it("join weekdays in a row without school, and name a holiday once, today included", () => {
    const empty = without(weekData("2026-10-26"), "2026-11-02", "2026-11-03");
    const data = {
      ...empty,
      events: [...empty.events, allDay("h", "Fridag", "holiday", "2026-10-30", "2026-10-30")],
    };
    const rows = bridgeRows(
      buildDays(data, RANGE, ZONE),
      focus(
        "2026-10-30",
        ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"],
        "2026-11-04",
      ),
    );
    expect(rows.map((row) => [row.kind, row.days])).toEqual([
      ["holiday", ["2026-10-30"]],
      ["weekend", ["2026-10-31"]],
      ["empty", ["2026-11-02", "2026-11-03"]],
    ]);
  });

  it("leave today to the rest-of-today row, and skip days outside the range", () => {
    const rows = bridgeRows(
      buildDays(weekData("2026-10-26"), RANGE, ZONE),
      focus("2026-10-29", ["2026-10-29", "2027-01-01"], "2026-10-30"),
    );
    expect(rows).toEqual([]);
  });

  it("make room for the rest of today, counting the days of the rows left out", () => {
    const row = (days: string[]): BridgeRow => ({ kind: "empty", days, cancelled: false });
    const rows = [row(["a"]), row(["b", "c"]), row(["d"]), row(["e"])];
    expect(fitRows(rows, false)).toEqual({ rows: rows.slice(0, 2), moreDays: 2 });
    expect(fitRows(rows, true)).toEqual({ rows: rows.slice(0, 1), moreDays: 4 });
    expect(fitRows(rows.slice(0, 2), true)).toEqual({ rows: rows.slice(0, 2), moreDays: 0 });
    expect(local("2026-10-30", "10:00")).toContain("+01:00");
  });
});
