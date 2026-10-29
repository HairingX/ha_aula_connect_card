import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addDays,
  dayOf,
  daysBetween,
  firstWeekday,
  formatDay,
  formatTime,
  isDay,
  startOfWeek,
  timeZone,
  useAmPm,
  weekday,
  weekNumber,
} from "../src/dates";
import type { HassLocale } from "../src/types";
import { fakeHass } from "./fake-hass";

function locale(fields: Partial<HassLocale>): HassLocale {
  return {
    language: "da",
    time_format: "language",
    first_weekday: "language",
    time_zone: "server",
    ...fields,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("isDay", () => {
  it.each([
    ["2026-10-29", true],
    ["2026-13-01", false],
    ["2026-10-29T08:00:00Z", false],
    ["", false],
  ])("tells %j is a day: %s", (text, expected) => {
    expect(isDay(text)).toBe(expected);
  });
});

describe("timeZone", () => {
  it("is Home Assistant's for server time", () => {
    expect(timeZone(fakeHass({ timeZone: "America/New_York" }))).toBe("America/New_York");
  });

  it("is the browser's for local time", () => {
    expect(
      timeZone(fakeHass({ timeZone: "America/New_York", locale: { time_zone: "local" } })),
    ).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });
});

describe("firstWeekday", () => {
  it.each([
    ["monday", 1],
    ["sunday", 0],
    ["saturday", 6],
  ])("takes a weekday the user chose, %s", (first_weekday, expected) => {
    expect(firstWeekday(locale({ first_weekday }))).toBe(expected);
  });

  it("takes the language's: Monday in Danish, Sunday in American English", () => {
    expect(firstWeekday(locale({ language: "da" }))).toBe(1);
    expect(firstWeekday(locale({ language: "en-US" }))).toBe(0);
  });

  it("asks getWeekInfo where the browser has it", () => {
    class WeekInfoLocale {
      getWeekInfo(): { firstDay: number } {
        return { firstDay: 6 };
      }
    }
    vi.stubGlobal("Intl", { ...Intl, Locale: WeekInfoLocale });
    expect(firstWeekday(locale({}))).toBe(6);
  });

  it("is Monday where the browser knows no week", () => {
    class BareLocale {
      readonly language = "da";
    }
    vi.stubGlobal("Intl", { ...Intl, Locale: BareLocale });
    expect(firstWeekday(locale({}))).toBe(1);
  });

  it("is Monday for a language that is no language", () => {
    expect(firstWeekday(locale({ language: "not a language!" }))).toBe(1);
  });
});

describe("useAmPm", () => {
  it.each([
    ["12", "da", true],
    ["24", "en-US", false],
    ["language", "en-US", true],
    ["language", "da", false],
  ])("is right for time format %s in %s", (time_format, language, expected) => {
    expect(useAmPm(locale({ time_format, language }))).toBe(expected);
  });

  it("asks the browser for the system's format", () => {
    const system = new Intl.DateTimeFormat(undefined, { hour: "numeric" })
      .formatToParts(new Date())
      .some((part) => part.type === "dayPeriod");
    expect(useAmPm(locale({ time_format: "system", language: "en-US" }))).toBe(system);
  });
});

describe("dayOf", () => {
  it("gives the day in the time zone, not in UTC", () => {
    const lateEvening = new Date("2026-10-29T23:30:00Z");
    expect(dayOf(lateEvening, "UTC")).toBe("2026-10-29");
    expect(dayOf(lateEvening, "Europe/Copenhagen")).toBe("2026-10-30");
    expect(dayOf(lateEvening, "America/Los_Angeles")).toBe("2026-10-29");
  });

  it("follows daylight saving time", () => {
    // Summer time in Copenhagen ends on 25 October 2026: 22:30 UTC is 23:30 that day, not 00:30.
    expect(dayOf(new Date("2026-10-25T22:30:00Z"), "Europe/Copenhagen")).toBe("2026-10-25");
    expect(dayOf(new Date("2026-10-24T22:30:00Z"), "Europe/Copenhagen")).toBe("2026-10-25");
  });
});

describe("calendar arithmetic", () => {
  it("adds days across months, years and daylight saving time", () => {
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("gives the weekday", () => {
    expect(weekday("2026-10-29")).toBe(4);
    expect(weekday("2026-11-01")).toBe(0);
  });

  it("gives the first day of the week for each first weekday", () => {
    expect(startOfWeek("2026-10-29", 1)).toBe("2026-10-26");
    expect(startOfWeek("2026-11-01", 1)).toBe("2026-10-26");
    expect(startOfWeek("2026-10-26", 1)).toBe("2026-10-26");
    expect(startOfWeek("2026-10-29", 0)).toBe("2026-10-25");
    expect(startOfWeek("2026-10-29", 6)).toBe("2026-10-24");
  });

  it("counts days between two days", () => {
    expect(daysBetween("2026-10-24", "2026-10-27")).toBe(3);
    expect(daysBetween("2026-10-27", "2026-10-27")).toBe(0);
  });

  it.each([
    ["2026-10-26", 44],
    ["2026-10-25", 44],
    ["2026-10-24", 44],
    ["2026-12-28", 53],
    ["2027-01-04", 1],
    ["2024-12-30", 1],
    ["2025-12-29", 1],
    ["2021-01-04", 1],
  ])("numbers the week from %s as %i", (start, expected) => {
    expect(weekNumber(start)).toBe(expected);
  });
});

describe("formatting", () => {
  it("formats a day in the language", () => {
    expect(formatDay("2026-10-29", "da")).toBe("torsdag 29. oktober");
    expect(formatDay("2026-10-29", "en")).toBe("Thursday, October 29");
  });

  it("formats a time in the time zone, in 24 or 12 hours", () => {
    const morning = new Date("2026-10-29T07:05:00Z");
    expect(formatTime(morning, "da", "Europe/Copenhagen", false)).toBe("08.05");
    expect(formatTime(morning, "en", "Europe/Copenhagen", true)).toMatch(/^8:05\sAM$/);
    expect(formatTime(morning, "en", "UTC", false)).toBe("07:05");
  });
});
