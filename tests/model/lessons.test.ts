import { describe, expect, it } from "vitest";

import type { Lesson } from "../../src/core/types.ts";
import { inTimetableOrder } from "../../src/model/notes.ts";
import {
  lessonTime,
  mergeLessons,
  schoolHours,
  timeline,
  type LessonBlock,
} from "../../src/model/lessons.ts";

function lesson(start: string, end: string, fields: Partial<Lesson> = {}): Lesson {
  return {
    id: start,
    start: `2026-10-29T${start}:00+01:00`,
    end: `2026-10-29T${end}:00+01:00`,
    title: "DAN",
    teachers: ["Karen Lund"],
    location: "B12",
    status: null,
    ...fields,
  };
}

describe("merging lessons", () => {
  it("joins the halves of a double lesson, at most 10 minutes apart", () => {
    const blocks = mergeLessons([lesson("08:00", "08:45"), lesson("08:55", "09:40")]);
    expect(blocks.map((block) => [block.start.slice(11, 16), block.end.slice(11, 16)])).toEqual([
      ["08:00", "09:40"],
    ]);
  });

  it("keeps lessons apart that differ, or come later", () => {
    const blocks = mergeLessons([
      lesson("08:00", "08:45"),
      lesson("08:45", "09:30", { teachers: ["Bo Vang"] }),
      lesson("09:30", "10:15", { teachers: ["Bo Vang"], status: "substitute" }),
      lesson("10:30", "11:15", { teachers: ["Bo Vang"], status: "substitute" }),
      lesson("11:15", "12:00", { teachers: ["Bo Vang"], status: "substitute", location: "B14" }),
    ]);
    expect(blocks).toHaveLength(5);
  });

  it("joins the halves of a double lesson without a room", () => {
    expect(
      mergeLessons([
        lesson("08:00", "08:45", { location: null }),
        lesson("08:45", "09:30", { location: null }),
      ]),
    ).toHaveLength(1);
  });

  it("puts what has no subject after what the timetable orders", () => {
    expect(
      inTimetableOrder(["none", "eng", "dan"], (item) => (item === "none" ? undefined : item), [
        "dan",
        "eng",
      ]),
    ).toEqual(["dan", "eng", "none"]);
  });

  it("takes no status and the normal status as the same", () => {
    expect(
      mergeLessons([lesson("08:00", "08:45"), lesson("08:45", "09:30", { status: "normal" })]),
    ).toHaveLength(1);
  });
});

describe("the timeline", () => {
  it("puts a break of 20 minutes or more between lessons, with its length", () => {
    const rows = timeline(
      mergeLessons([lesson("08:00", "09:30"), lesson("09:50", "10:35", { title: "MAT" })]),
    );
    expect(
      rows.map((row) =>
        row.kind === "break" ? `break ${String(row.minutes)}` : row.block.lesson.title,
      ),
    ).toEqual(["DAN", "break 20", "MAT"]);
  });

  it("makes no break while a long lesson beside shorter ones lasts, nor from times it cannot read", () => {
    const blocks: LessonBlock[] = [
      {
        lesson: lesson("08:00", "12:00"),
        start: lesson("08:00", "12:00").start,
        end: lesson("08:00", "12:00").end,
      },
      {
        lesson: lesson("08:00", "08:45", { title: "MAT" }),
        start: lesson("08:00", "08:45").start,
        end: lesson("08:00", "08:45").end,
      },
      {
        lesson: lesson("11:00", "11:45", { title: "ENG" }),
        start: lesson("11:00", "11:45").start,
        end: lesson("11:00", "11:45").end,
      },
      { lesson: lesson("13:00", "13:45", { title: "HIS" }), start: "soon", end: "later" },
    ];
    expect(timeline(blocks).map((row) => row.kind)).toEqual([
      "lessons",
      "lessons",
      "lessons",
      "lessons",
    ]);
  });
});

describe("school hours and the time of lessons", () => {
  it("runs from the first lesson's start to the latest end", () => {
    expect(schoolHours([lesson("08:00", "12:00"), lesson("09:00", "09:45")])).toEqual({
      start: "2026-10-29T08:00:00+01:00",
      end: "2026-10-29T12:00:00+01:00",
    });
    expect(schoolHours([])).toBeUndefined();
  });

  it("tells a lesson over, going on, and to come", () => {
    const [block] = mergeLessons([lesson("10:05", "11:35")]);
    if (!block) throw new Error("no block");
    expect(lessonTime(block, new Date("2026-10-29T10:04:59+01:00"))).toBe("future");
    expect(lessonTime(block, new Date("2026-10-29T10:05:00+01:00"))).toBe("now");
    expect(lessonTime(block, new Date("2026-10-29T11:35:00+01:00"))).toBe("past");
  });
});
