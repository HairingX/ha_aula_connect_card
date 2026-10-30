import { render } from "lit";
import { describe, expect, it } from "vitest";

import {
  birthdays,
  eventIcon,
  eventWhen,
  headingOf,
  time,
  timeText,
} from "../../src/ui/primitives.ts";
import { scenarioNamed } from "../fixtures/scenarios.ts";
import { contextOf } from "../fixtures/snapshot.ts";
import { allDay } from "../fixtures/week.ts";

const ctx = contextOf(scenarioNamed("thu-1930"));

function shown(content: unknown): HTMLElement {
  const container = document.createElement("div");
  render(content, container);
  return container;
}

describe("an event's icon", () => {
  it("follows Aula's type, with a plain calendar for a type it does not know", () => {
    expect(
      [
        "event",
        "excursion",
        "school_home_meeting",
        "parental_meeting",
        "performance_meeting",
        "holiday",
        "presence_holiday",
        "vacation_registration",
        "lesson",
      ].map(eventIcon),
    ).toEqual([
      "mdi:calendar-star-outline",
      "mdi:bus",
      "mdi:account-group-outline",
      "mdi:account-group-outline",
      "mdi:account-group-outline",
      "mdi:beach",
      "mdi:beach",
      "mdi:calendar-check-outline",
      "mdi:calendar-blank-outline",
    ]);
  });
});

describe("a heading", () => {
  it("takes the level it is given, from 3 to 5", () => {
    expect(
      [3, 4, 5].map((level) => shown(headingOf(level, "Lektier")).firstElementChild?.tagName),
    ).toEqual(["H3", "H4", "H5"]);
  });
});

describe("a time", () => {
  it("shows nothing for a time it cannot read", () => {
    expect(shown(time("soon", ctx)).textContent).toBe("");
    expect(timeText("soon", ctx)).toBe("");
  });

  it("calls a day within an event over several days the whole day", () => {
    const camp = allDay("c", "Lejrskole", "excursion", "2026-11-03", "2026-11-05");
    expect(eventWhen({ event: camp, span: "through" }, ctx)).toBe("Hele dagen");
  });
});

describe("a day's birthdays", () => {
  const item = scenarioNamed("thu-1930");

  it.each<[string, string[], string]>([
    ["da", ["Alma"], "Alma har fødselsdag"],
    ["da", ["Alma", "Bo"], "Alma og Bo har fødselsdag"],
    ["da", ["Alma", "Bo", "Carl"], "Alma, Bo og Carl har fødselsdag"],
    ["en", ["Alma"], "Alma's birthday"],
    ["en", ["Alma", "Bo"], "Alma and Bo's birthdays"],
    ["en", ["Alma", "Bo", "Carl"], "Alma, Bo, and Carl's birthdays"],
  ])("are one sentence in %s: %j", (language, people, sentence) => {
    expect(birthdays(people, contextOf(item, language))).toBe(sentence);
  });
});
