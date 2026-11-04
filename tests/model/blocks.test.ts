import { describe, expect, it } from "vitest";

import {
  dayContent,
  DEFAULT_ORDER,
  orderBlocks,
  planBlocks,
  type BlockId,
  type ShowConfig,
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

  it("hold Husk in Vigtigt, which says why it has no task where the week plan marks none", () => {
    const pack = [{ subject: subjectNamer([])("IDR"), items: ["Idrætstøj"] }];
    const bare = { ...content, homework: [], pack };
    const plan = planBlocks(bare, DEFAULT_ORDER);
    expect(plan.blocks.map((block) => block.id)).toEqual(["task", "timetable", "comment"]);
    expect([plan.pack, plan.homework, plan.noHomework]).toEqual([pack, [], "noHomework"]);
    const hidden = planBlocks(bare, ["pack", "timetable"]);
    expect([hidden.blocks[0], hidden.noHomework]).toEqual([
      { id: "task", empty: undefined },
      undefined,
    ]);
    const none = planBlocks(bare, ["task", "timetable"]);
    expect([none.pack, none.blocks[0]]).toEqual([[], { id: "task", empty: "noHomework" }]);
    expect(
      planBlocks(content, ["comment", "pack", "task"]).blocks.map((block) => block.id),
    ).toEqual(["comment", "task"]);
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
