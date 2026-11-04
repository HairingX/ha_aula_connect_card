import { describe, expect, it } from "vitest";

import { dayContent, type LessonRow, type TimetableRow } from "../../src/model/blocks.ts";
import { barLessons, dayBar } from "../../src/model/daybar.ts";
import { buildDays } from "../../src/model/days.ts";
import { subjectNamer } from "../../src/model/subjects.ts";
import { present } from "../fake-hass.ts";
import { scenarioNamed } from "../fixtures/scenarios.ts";
import { CHILDREN, ZONE } from "../fixtures/week.ts";

const RANGE = { start: "2026-10-26", end: "2026-11-09" };

describe("the bar's lessons", () => {
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
    barLessons(
      change([...dayContent(present(days[day]), rules, new Date(item.clock), false).timetable]),
      ZONE,
    ).map(
      ({ row }) =>
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
    expect(cancelled.slice(0, 2)).toEqual(["Matematik 08:00–08:45", "2 lærere 08:00–09:30"]);
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

describe("how a lesson at another's time goes into it", () => {
  const item = scenarioNamed("thu-1930");
  const days = buildDays(item.data(present(CHILDREN[0])), RANGE, ZONE);
  const content = (names = subjectNamer([])) =>
    dayContent(
      present(days[4]),
      {
        namer: names,
        packing: [],
        weekPlan: true,
        timetabled: true,
        planMissing: new Set<string>(),
        zone: ZONE,
      },
      new Date(item.clock),
      false,
    ).timetable;
  // Friday: Matematik 08:00–08:45, Dansk 08:45–09:30, Dansk 10:05–10:50, Engelsk, Historie.
  const lesson = (
    rows: readonly TimetableRow[],
    title: string,
    start: string,
    end: string,
    names = subjectNamer([]),
  ): LessonRow => {
    const first = rows.find((row): row is LessonRow => row.kind === "lesson");
    if (!first) throw new Error("no lesson");
    return {
      ...first,
      subject: names(title),
      also: [],
      block: {
        ...first.block,
        start: `2026-10-30T${start}:00+01:00`,
        end: `2026-10-30T${end}:00+01:00`,
      },
    };
  };
  const lanes = (rows: TimetableRow[]) =>
    dayBar(rows, [], [], ZONE, undefined).lanes.map((lane) =>
      lane.map((entry) =>
        entry.kind === "lesson"
          ? [entry.row.subject, ...entry.row.also].map((subject) => subject.name).join(", ")
          : entry.event.title,
      ),
    );

  it("joins a second teacher into every lesson it overlaps, however far it runs", () => {
    const rows = content();
    expect(lanes([...rows, lesson(rows, "2Lær", "08:30", "10:30")])).toEqual([
      ["Matematik, 2 lærere", "Dansk, 2 lærere", "Dansk, 2 lærere", "Engelsk", "Historie"],
    ]);
  });

  it("gives a lesson that only overlaps another a lane of its own, unless told to join it", () => {
    const rows = content();
    expect(lanes([...rows, lesson(rows, "UUV", "08:30", "09:00")])).toEqual([
      ["Matematik", "Dansk", "Dansk", "Engelsk", "Historie"],
      ["Understøttende undervisning"],
    ]);
    const names = subjectNamer([{ aula: "UUV", merge: "overlap" }]);
    expect(lanes([...content(names), lesson(rows, "UUV", "08:30", "09:00", names)])[0]?.[0]).toBe(
      "Matematik, Understøttende undervisning",
    );
  });

  it("joins a lesson at the very same time, unless its subject never joins", () => {
    const rows = content();
    expect(lanes([...rows, lesson(rows, "Tysk", "08:00", "08:45")])[0]?.[0]).toBe(
      "Matematik, Tysk",
    );
    const names = subjectNamer([
      { aula: "Tysk", merge: "never" },
      { aula: "2Lær", merge: "never" },
    ]);
    expect(
      lanes([
        ...content(names),
        lesson(rows, "Tysk", "08:00", "08:45", names),
        lesson(rows, "2Lær", "08:00", "08:45", names),
      ]),
    ).toEqual([["Matematik", "Dansk", "Dansk", "Engelsk", "Historie"], ["Tysk"], ["2 lærere"]]);
  });

  it("keeps a second teacher with no lesson to join as a lesson of its own", () => {
    const rows = content();
    expect(lanes([lesson(rows, "2Lær", "14:00", "15:00")])).toEqual([["2 lærere"]]);
  });
});

describe("the day's bar", () => {
  const item = scenarioNamed("thu-1930-timed4");
  const days = buildDays(item.data(present(CHILDREN[0])), RANGE, ZONE);
  const friday = present(days[4]);
  const rows = dayContent(
    friday,
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

  it("runs from the first thing of the day to the last, its full hours marked between", () => {
    const bar = dayBar(rows.timetable, rows.timed, [], ZONE, undefined);
    expect([bar.start / 60, bar.end / 60]).toEqual([8, 15.5]);
    expect([present(bar.from).slice(11, 16), present(bar.until).slice(11, 16)]).toEqual([
      "08:00",
      "15:30",
    ]);
    expect(bar.hours.map((minute) => minute / 60)).toEqual([9, 10, 11, 12, 13, 14, 15]);
    expect(bar.now).toBeUndefined();
  });

  it("puts the events with a time in lanes of their own under the lessons", () => {
    const bar = dayBar(rows.timetable, rows.timed, [], ZONE, undefined);
    expect(bar.lanes.map((lane) => lane.map((entry) => entry.kind))).toEqual([
      ["lesson", "lesson", "lesson", "lesson", "lesson"],
      ["event", "event", "event", "event"],
    ]);
  });

  it("marks now while it is within the bar", () => {
    const at = (time: string) =>
      dayBar(rows.timetable, [], [], ZONE, new Date(`2026-10-30T${time}:00+01:00`)).now;
    expect(at("10:00")).toBe(600);
    expect(at("07:00")).toBeUndefined();
  });

  it("lets an event from another day or into the next reach the bar's ends, not stretch them", () => {
    const [first] = rows.timed;
    const event = present(first).event;
    const bar = present(
      dayBar(
        rows.timetable,
        [
          { event, span: "until" },
          { event, span: "from" },
        ],
        [],
        ZONE,
        undefined,
      ),
    );
    const [until] = present(bar.lanes[1]);
    const [from] = present(bar.lanes[2]);
    expect([until?.from, from?.to]).toEqual([bar.start, bar.end]);
    expect(bar.end).toBe(13 * 60 + 40);
  });

  it("has nothing to show without lessons or events, and only lanes with events of the whole day", () => {
    const [event] = rows.timed;
    const only = dayBar([], [], [present(event).event], ZONE, undefined);
    expect([only.lanes, only.hours, only.from, only.until]).toEqual([[], [], undefined, undefined]);
  });

  it("leaves a lesson whose time cannot be read off the bar's ends", () => {
    const [first] = rows.timetable;
    const lesson = present(first);
    if (lesson.kind !== "lesson") throw new Error("not a lesson");
    const broken = { ...lesson, block: { ...lesson.block, start: "", end: "" } };
    const bar = dayBar([...rows.timetable, broken], [], [], ZONE, undefined);
    expect(bar.start).toBe(8 * 60);
  });
});
