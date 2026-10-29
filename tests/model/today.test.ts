import { describe, expect, it } from "vitest";

import { buildDays } from "../../src/model/days.ts";
import { isRunning, todayRest } from "../../src/model/today.ts";
import { present } from "../fake-hass.ts";
import { local, weekData, ZONE } from "../fixtures/week.ts";

const days = buildDays(weekData("2026-10-26"), { start: "2026-10-26", end: "2026-11-09" }, ZONE);
const at = (day: string, time: string): Date => new Date(local(day, time));

describe("the rest of today", () => {
  it("names the lesson going on and when school ends", () => {
    const rest = todayRest(present(days[4]), at("2026-10-30", "12:40"));
    expect(rest?.running?.lesson.title).toBe("HIS");
    expect(rest?.ends).toBe(local("2026-10-30", "13:40"));
  });

  it("keeps a timed event still to come after school, and is gone when nothing is left", () => {
    const tuesday = days[8];
    if (!tuesday) throw new Error("no day");
    const evening = todayRest(tuesday, at("2026-11-03", "15:00"));
    expect(evening).toMatchObject({ running: undefined, ends: undefined });
    expect(evening?.events.map((event) => event.title)).toEqual(["Forældremøde 3.B"]);
    expect(isRunning(present(tuesday.events[0]), at("2026-11-03", "17:30"))).toBe(true);
    expect(isRunning(present(tuesday.events[0]), at("2026-11-03", "15:00"))).toBe(false);
    expect(todayRest(tuesday, at("2026-11-03", "18:30"))).toBeUndefined();
  });

  it("leaves out all-day events", () => {
    const friday = days[4];
    if (!friday) throw new Error("no day");
    expect(todayRest(friday, at("2026-10-30", "14:00"))).toBeUndefined();
  });
});
