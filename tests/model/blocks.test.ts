import { describe, expect, it } from "vitest";

import {
  dayContent,
  DEFAULT_ORDER,
  foldTimetable,
  orderBlocks,
  planBlocks,
  type BlockId,
  type LessonRow,
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
    [[], {}, ["task", "pack", "timetable", "comment", "events", "birthdays"]],
    [["timetable"], {}, ["timetable", "task", "pack", "comment", "events", "birthdays"]],
    [["events", "task"], {}, ["events", "task", "pack", "timetable", "comment", "birthdays"]],
    [["task"], { task: false }, ["pack", "timetable", "comment", "events", "birthdays"]],
  ])("order %j and show %j give %j", (order, show, blocks) => {
    expect(orderBlocks(order, show)).toEqual(blocks);
  });

  it.each<[BlockId[], ShowConfig, BlockId[]]>([
    [[], {}, ["pack", "task", "timetable", "comment", "events", "birthdays"]],
    [["timetable"], {}, ["timetable", "pack", "task", "comment", "events", "birthdays"]],
    [["task", "pack"], {}, ["task", "pack", "timetable", "comment", "events", "birthdays"]],
    [[], { pack: false }, ["task", "timetable", "comment", "events", "birthdays"]],
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
    ).map(
      (row) =>
        `${[row.subject, ...row.also].map((subject) => subject.name).join(", ")} ${row.block.start.slice(11, 16)}–${row.block.end.slice(11, 16)}`,
    );

  it("gives each lesson a line from its start to its end, so the breaks show between the times", () => {
    expect(lines(4)).toEqual([
      "Matematik 08:00–08:45",
      "Dansk 08:45–09:30",
      "Dansk 10:05–10:50",
      "Engelsk 10:50–11:35",
      "Historie 12:10–13:40",
    ]);
  });

  // The first lesson becomes the second's subject, so that the two follow each other.
  const joined = (change: (row: TimetableRow) => TimetableRow) =>
    lines(4, (rows) =>
      rows.map((row, index) => {
        const second = rows[1];
        if (index === 0 && row.kind === "lesson" && second?.kind === "lesson")
          return { ...row, subject: second.subject };
        return index === 1 ? change(row) : row;
      }),
    );

  it("joins a subject's lessons with no break between them into one line", () => {
    expect(joined((row) => row)).toEqual([
      "Dansk 08:00–09:30",
      "Dansk 10:05–10:50",
      "Engelsk 10:50–11:35",
      "Historie 12:10–13:40",
    ]);
  });

  // A copy of each lesson at the very same time, as Aula lists a second teacher's.
  const withSecond = (
    rows: TimetableRow[],
    change: (row: LessonRow) => LessonRow = (row) => row,
  ): TimetableRow[] =>
    rows.flatMap((row): TimetableRow[] =>
      row.kind === "lesson" ? [row, change({ ...row, subject: subjectNamer([])("2Lær") })] : [row],
    );

  it("puts lessons at the very same time on one line", () => {
    expect(lines(4, (rows) => withSecond(rows))).toEqual([
      "Matematik, 2 lærere 08:00–08:45",
      "Dansk, 2 lærere 08:45–09:30",
      "Dansk, 2 lærere 10:05–10:50",
      "Engelsk, 2 lærere 10:50–11:35",
      "Historie, 2 lærere 12:10–13:40",
    ]);
  });

  it("joins a subject's lessons with a second teacher, listed between them, into one line", () => {
    expect(
      lines(4, (rows) =>
        withSecond(
          rows.map((row, index) => {
            const second = rows[1];
            return index === 0 && row.kind === "lesson" && second?.kind === "lesson"
              ? { ...row, subject: second.subject }
              : row;
          }),
        ),
      ).slice(0, 2),
    ).toEqual(["Dansk, 2 lærere 08:00–09:30", "Dansk, 2 lærere 10:05–10:50"]);
  });

  it("keeps a lesson at the same time apart when its status differs, and names a subject once", () => {
    const cancelled = lines(4, (rows) => withSecond(rows, (row) => ({ ...row, cancelled: true })));
    expect(cancelled.slice(0, 2)).toEqual(["Matematik 08:00–08:45", "2 lærere 08:00–08:45"]);
    const twice = lines(4, (rows) =>
      rows.flatMap((row): TimetableRow[] => (row.kind === "lesson" ? [row, row] : [row])),
    );
    expect(twice[0]).toBe("Matematik 08:00–08:45");
  });

  it("gives a lesson a line of its own when its status is news", () => {
    const news = (status: Partial<LessonRow>) =>
      joined((row) => (row.kind === "lesson" ? { ...row, ...status } : row));
    expect(news({ status: { kind: "substitute" } })).toHaveLength(5);
    expect(news({ cancelled: true })).toHaveLength(5);
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

  it("give the timetable the day's events while events are shown, as a calendar has them", () => {
    const shown = (blocks: BlockId[]): number => {
      const plan = planBlocks(content, blocks);
      return plan.allDay.length + plan.timed.length;
    };
    expect(shown(["timetable", "events"])).toBeGreaterThan(0);
    expect(shown(["timetable"])).toBe(0);
    expect(planBlocks(content, ["timetable", "events"]).blocks.map((block) => block.id)).toEqual([
      "timetable",
    ]);
  });

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
