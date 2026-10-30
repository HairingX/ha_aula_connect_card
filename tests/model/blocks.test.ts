import { describe, expect, it } from "vitest";

import {
  dayContent,
  DEFAULT_ORDER,
  foldTimetable,
  orderBlocks,
  planBlocks,
  type BlockId,
  type ShowConfig,
  type TimetableRow,
} from "../../src/model/blocks.ts";
import { buildDays } from "../../src/model/days.ts";
import { subjectNamer } from "../../src/model/subjects.ts";
import { present } from "../fake-hass.ts";
import { scenarioNamed } from "../fixtures/scenarios.ts";
import { CHILDREN, ZONE } from "../fixtures/week.ts";

const RANGE = { start: "2026-10-26", end: "2026-11-09" };

describe("the order of the blocks", () => {
  it.each<[BlockId[], ShowConfig, BlockId[]]>([
    [[], {}, ["homework", "pack", "timetable", "plan", "events", "birthdays"]],
    [["timetable"], {}, ["timetable", "homework", "pack", "plan", "events", "birthdays"]],
    [["events", "homework"], {}, ["events", "homework", "pack", "timetable", "plan", "birthdays"]],
    [["homework"], { homework: false }, ["pack", "timetable", "plan", "events", "birthdays"]],
    [[], { tasks: false }, ["pack", "timetable", "events", "birthdays"]],
    [[], { tasks: false, plan: true }, ["pack", "timetable", "plan", "events", "birthdays"]],
  ])("order %j and show %j give %j", (order, show, blocks) => {
    expect(orderBlocks(order, show)).toEqual(blocks);
  });

  it.each<[BlockId[], ShowConfig, BlockId[]]>([
    [[], {}, ["pack", "homework", "timetable", "plan", "events", "birthdays"]],
    [["timetable"], {}, ["timetable", "pack", "homework", "plan", "events", "birthdays"]],
    [["homework", "pack"], {}, ["homework", "pack", "timetable", "plan", "events", "birthdays"]],
    [[], { pack: false }, ["homework", "timetable", "plan", "events", "birthdays"]],
  ])("on a wall screen, order %j and show %j give %j", (order, show, blocks) => {
    expect(orderBlocks(order, show, true)).toEqual(blocks);
  });
});

describe("the folded timetable", () => {
  const item = scenarioNamed("thu-1930");
  const days = buildDays(item.data(present(CHILDREN[0])), RANGE, ZONE);
  const rules = {
    namer: subjectNamer([]),
    packing: [],
    weekPlan: true,
    timetabled: true,
    planMissing: new Set<string>(),
    zone: ZONE,
  };
  const lines = (day: number, change = (rows: TimetableRow[]) => rows): string[] =>
    foldTimetable(
      change([...dayContent(present(days[day]), rules, new Date(item.clock), false).timetable]),
    ).map((row) => `${row.subject.name} ${row.block.start.slice(11, 16)}`);

  it("gives each subject a line from when it begins, its lessons in a row as one across a break", () => {
    expect(lines(4)).toEqual(["Matematik 08:00", "Dansk 08:45", "Engelsk 10:50", "Historie 12:10"]);
    expect(lines(3)).toEqual(["Idræt 08:00", "Dansk 10:05", "Engelsk 12:10"]);
  });

  it("gives a lesson a line of its own when its status is news", () => {
    expect(
      lines(4, (rows) =>
        rows.map((row, index) =>
          row.kind === "lesson" && index === 3 ? { ...row, status: { kind: "substitute" } } : row,
        ),
      ),
    ).toEqual(["Matematik 08:00", "Dansk 08:45", "Dansk 10:05", "Engelsk 10:50", "Historie 12:10"]);
    expect(
      lines(4, (rows) =>
        rows.map((row, index) =>
          row.kind === "lesson" && index === 3 ? { ...row, cancelled: true } : row,
        ),
      ),
    ).toHaveLength(5);
  });
});

describe("the subjects in Husk", () => {
  const item = scenarioNamed("thu-1930");
  const days = buildDays(item.data(present(CHILDREN[0])), RANGE, ZONE);
  const content = dayContent(
    present(days[4]),
    {
      namer: subjectNamer([]),
      packing: [],
      weekPlan: true,
      timetabled: true,
      planMissing: new Set<string>(),
      zone: ZONE,
    },
    new Date(item.clock),
    false,
  );

  it("are named only while the timetable, which lists them, is hidden", () => {
    expect(planBlocks(content, DEFAULT_ORDER).subjects).toEqual([]);
    expect(
      planBlocks(
        content,
        DEFAULT_ORDER.filter((id) => id !== "timetable"),
      ).subjects.map((subject) => subject.name),
    ).toEqual(["Matematik", "Dansk", "Engelsk", "Historie"]);
  });
});
