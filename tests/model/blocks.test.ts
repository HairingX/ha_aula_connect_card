import { describe, expect, it } from "vitest";

import { orderBlocks, type BlockId, type ShowConfig } from "../../src/model/blocks.ts";

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
});
