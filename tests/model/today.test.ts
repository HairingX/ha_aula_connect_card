import { describe, expect, it } from "vitest";

import { buildDays } from "../../src/model/days.ts";
import { isRunning, todayRest } from "../../src/model/today.ts";
import { present } from "../fake-hass.ts";
import { oskarData } from "../fixtures/oskar.ts";
import { allDay, local, weekData, ZONE } from "../fixtures/week.ts";

const RANGE = { start: "2026-10-26", end: "2026-11-09" };
const days = buildDays(weekData("2026-10-26"), RANGE, ZONE);
const at = (day: string, time: string): Date => new Date(local(day, time));

describe("the rest of today", () => {
  it("names the lesson going on and when school ends", () => {
    const rest = todayRest(present(days[4]), at("2026-10-30", "12:40"), ZONE);
    expect(rest?.running?.lesson.title).toBe("HIS");
    expect(rest?.ends).toBe(local("2026-10-30", "13:40"));
  });

  it("keeps a timed event still to come after school, and is gone when nothing is left", () => {
    const tuesday = present(days[8]);
    const evening = todayRest(tuesday, at("2026-11-03", "15:00"), ZONE);
    expect(evening).toMatchObject({ running: undefined, ends: undefined });
    expect(evening?.events.map((item) => [item.event.title, item.span])).toEqual([
      ["Forældremøde 3.B", "within"],
    ]);
    expect(isRunning(present(tuesday.events[0]), at("2026-11-03", "17:30"))).toBe(true);
    expect(isRunning(present(tuesday.events[0]), at("2026-11-03", "15:00"))).toBe(false);
    expect(todayRest(tuesday, at("2026-11-03", "18:30"), ZONE)).toBeUndefined();
  });

  it("leaves out all-day events unless it is told to name them", () => {
    const friday = present(days[4]);
    expect(todayRest(friday, at("2026-10-30", "14:00"), ZONE)).toBeUndefined();
    const fact = { kind: "event" as const, event: present(friday.events[0]) };
    expect(todayRest(friday, at("2026-10-30", "14:00"), ZONE, [fact])?.facts).toEqual([fact]);
  });

  it("ends school with the last lesson held, and never runs a cancelled one", () => {
    const oskar = present(buildDays(oskarData("2026-10-26"), RANGE, ZONE)[4]);
    const rest = todayRest(oskar, at("2026-10-30", "13:50"), ZONE);
    expect(rest).toBeUndefined();
    expect(todayRest(oskar, at("2026-10-30", "13:00"), ZONE)?.ends).toBe(
      local("2026-10-30", "13:30"),
    );
  });

  it("names an event over several days from its start, until it ends", () => {
    const camp = {
      ...allDay("c", "Lejrskole", "excursion", "2026-11-03", "2026-11-05"),
      all_day: false,
      start: local("2026-11-03", "08:00"),
      end: local("2026-11-05", "14:00"),
    };
    const week = buildDays({ ...weekData("2026-10-26"), events: [camp] }, RANGE, ZONE);
    const spans = (day: number, time: string): string[] =>
      (todayRest(present(week[day]), at(present(week[day]).day, time), ZONE)?.events ?? []).map(
        (item) => item.span,
      );
    expect(spans(8, "19:30")).toEqual(["from"]);
    expect(spans(9, "19:30")).toEqual([]);
    expect(spans(10, "13:00")).toEqual(["until"]);
  });
});
