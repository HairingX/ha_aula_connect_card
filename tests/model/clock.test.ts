import { describe, expect, it } from "vitest";

import { arcPath, clockFace, MAX_SWEEP, pointAt } from "../../src/model/clock.ts";

describe("a school day on a clock face", () => {
  it("puts the hour hand where school begins, sweeps it to where it ends, and shows the time now", () => {
    expect(clockFace("08:00", "12:55", 10 * 60 + 15)).toEqual({
      from: 240,
      sweep: 147.5,
      hour: 307.5,
      minute: 90,
    });
  });

  it("reads an afternoon on the same face as a morning", () => {
    expect(clockFace("13:00", "14:00", 14 * 60).from).toBe(30);
  });

  it("never sweeps a whole turn, nor backwards", () => {
    expect(clockFace("06:00", "20:00", 0).sweep).toBe(MAX_SWEEP);
    expect(clockFace("12:00", "08:00", 0).sweep).toBe(0);
  });

  it("finds points on the face clockwise from twelve", () => {
    expect(pointAt(0, 40)).toEqual({ x: 50, y: 10 });
    expect(pointAt(90, 40)).toEqual({ x: 90, y: 50 });
    expect(pointAt(180, 40)).toEqual({ x: 50, y: 90 });
  });

  it("draws the arc the long way round only beyond half a turn", () => {
    expect(arcPath(0, 90, 40)).toBe("M 50 10 A 40 40 0 0 1 90 50");
    expect(arcPath(0, 270, 40)).toBe("M 50 10 A 40 40 0 1 1 10 50");
  });
});
