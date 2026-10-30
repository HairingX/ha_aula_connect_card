import { describe, expect, it } from "vitest";

import { viewContext } from "../../src/core/context.ts";
import { fakeHass } from "../fake-hass.ts";

describe("the view context", () => {
  it("formats in Home Assistant's language until the user's profile has loaded", () => {
    const hass = fakeHass({ language: "en", locale: { language: "" } });
    expect(viewContext(hass, new Date("2026-10-29T08:00:00Z")).language).toBe("en");
  });
});
