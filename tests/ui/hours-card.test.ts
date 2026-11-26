import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../../src/index.ts";
import { AulaConnectHoursCard } from "../../src/cards/hours-card.ts";
import { fetchOpeningHours } from "../../src/core/api.ts";
import { forget } from "../../src/core/memory.ts";
import { reloadSelection } from "../../src/core/selection.ts";
import type { OpeningHours } from "../../src/core/types.ts";
import { hoursPeriod, hoursView } from "../../src/model/hours.ts";
import { present, wsError } from "../fake-hass.ts";
import { OPENING_HOURS } from "../fixtures/family.ts";
import { all, mount, unmountAll } from "../fixtures/mount.ts";
import { CHILDREN } from "../fixtures/week.ts";
import { settled, texts } from "./family-helpers.ts";

const HOURS = "aula-connect-hours-card";
const IDA = present(CHILDREN[0]);
const OSKAR = present(CHILDREN[1]);

const open = (date: string, from: string | null = "07:00", to: string | null = "16:00") => ({
  date,
  closed: false,
  open: from,
  close: to,
});
const shut = (date: string) => ({ date, closed: true, open: null, close: null });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  window.localStorage.clear();
  reloadSelection();
});

afterEach(() => {
  unmountAll();
  forget();
  window.localStorage.clear();
  vi.useRealTimers();
});

describe("the opening hours", () => {
  it("shows today's hours, each week with the days alike together, and the closed days ahead", async () => {
    const { card, hass } = await mount(HOURS, "thu-1000", {
      commands: { "aula_connect/opening_hours": () => OPENING_HOURS },
    });
    expect(card).toBeInstanceOf(AulaConnectHoursCard);
    expect(all(card, ".hours-only")).toEqual([]);
    expect(texts(card, ".hours-place-head .family-title")).toEqual(["Bakkedal Skole"]);
    expect(texts(card, ".hours-place-head .family-sub")).toEqual(["Ida og Oskar"]);
    expect(texts(card, ".hours-today")).toEqual(["I dag 06.30–17.00"]);
    expect(texts(card, ".hours-week-head")).toEqual(["Denne uge", "Næste uge"]);
    expect(texts(card, ".hours-when")).toEqual(["Man–Tors", "Fre", "Man–Tors", "Fre"]);
    expect(texts(card, ".hours-time")).toEqual([
      "06.30–17.00",
      "06.30–16.00",
      "06.30–17.00",
      "Lukket · Planlægningsdag",
    ]);
    expect(all(card, ".hours-days .is-today")).toHaveLength(1);
    expect(texts(card, ".family-rows .family-title")).toEqual([
      "Planlægningsdag",
      "Juleferie",
      "Vinterferie",
      "Påskeferie",
      "Grundlovsdag",
    ]);
    expect(texts(card, ".family-fold summary")).toEqual(["Senere (1)"]);
    const asked = hass.callWS.mock.calls
      .map(([message]) => message)
      .filter((message) => message.type === "aula_connect/opening_hours");
    expect(asked).toEqual([
      expect.objectContaining({ child_id: IDA.child_id, start: "2026-10-26", end: "2026-11-08" }),
      expect.objectContaining({ child_id: OSKAR.child_id, start: "2026-10-26", end: "2026-11-08" }),
    ]);
  });

  it("says today is closed and why, and marks a closure that has begun", async () => {
    const hours: OpeningHours = {
      closed_days: [
        { name: "Efterårsferie", start: "2026-10-26", end: "2026-10-30" },
        { name: "", start: "2026-11-04", end: "2026-11-04" },
      ],
      days: [
        ...["26", "27", "28", "29", "30"].map((day) => shut(`2026-10-${day}`)),
        open("2026-11-02"),
        open("2026-11-03"),
        shut("2026-11-04"),
        open("2026-11-05", null, null),
        open("2026-11-07", "09:00", "12:00"),
        shut("2026-11-08"),
      ],
    };
    const { card } = await mount(HOURS, "thu-1000", {
      children: [IDA],
      commands: { "aula_connect/opening_hours": () => hours },
    });
    expect(texts(card, ".hours-only")).toEqual(["Bakkedal Skole"]);
    expect(all(card, ".hours-place-head")).toEqual([]);
    expect(texts(card, ".hours-today")).toEqual(["I dag Lukket · Efterårsferie"]);
    expect(all(card, ".hours-today.is-closed")).toHaveLength(1);
    expect(texts(card, ".hours-when")).toEqual(["Man–Fre", "Man–Tirs", "Ons", "Tors", "Lør"]);
    expect(texts(card, ".hours-time")).toEqual([
      "Lukket · Efterårsferie",
      "07.00–16.00",
      "Lukket",
      "Åbent",
      "09.00–12.00",
    ]);
    expect(texts(card, ".family-title")).toEqual(["Efterårsferie", "Lukket"]);
    expect(texts(card, ".family-row .label")).toEqual(["I gang"]);
    expect(all(card, ".family-fold")).toEqual([]);
  });

  it("leaves out a day Aula tells nothing of, and says when a week has none", async () => {
    const hours: OpeningHours = { closed_days: [], days: [open("2026-10-26")] };
    const { card } = await mount(HOURS, "thu-1000", {
      commands: { "aula_connect/opening_hours": () => hours },
    });
    expect(all(card, ".hours-today")).toEqual([]);
    expect(texts(card, ".hours-when")).toEqual(["Man"]);
    expect(texts(card, ".hours-none")).toEqual([
      "Aula oplyser ingen tider",
      "Ingen lukkedage forude",
    ]);
  });

  it("shows each institution once, with the children who go there", async () => {
    const nursery = { ...OSKAR, institution_name: "Lærkereden" };
    const { card } = await mount(HOURS, "thu-1000", {
      children: [IDA, nursery],
      commands: {
        "aula_connect/opening_hours": (message) =>
          message.child_id === IDA.child_id
            ? OPENING_HOURS
            : { closed_days: [], days: [open("2026-10-29")] },
      },
    });
    expect(all(card, ".hours-only")).toEqual([]);
    expect(texts(card, ".hours-place-head .family-title")).toEqual([
      "Bakkedal Skole",
      "Lærkereden",
    ]);
    expect(texts(card, ".hours-place-head .family-sub")).toEqual(["Ida", "Oskar"]);
  });

  it("says while the hours come, why they could not be read, and when Aula tells none", async () => {
    const { card: waiting } = await mount(HOURS, "thu-1000", {
      commands: { "aula_connect/opening_hours": () => new Promise(() => undefined) },
    });
    expect(all(waiting, ".status")).toHaveLength(1);
    unmountAll();
    const { card: broken } = await mount(HOURS, "thu-1000", {
      commands: {
        "aula_connect/opening_hours": () => {
          throw wsError("home_assistant_error", "Aula could not be reached");
        },
      },
    });
    await settled(broken);
    expect(all(broken, ".alert")).toHaveLength(1);
    expect(all(broken, ".empty")).toEqual([]);
    unmountAll();
    const { card: none } = await mount(HOURS, "thu-1000", {
      commands: {
        "aula_connect/opening_hours": () => ({
          closed_days: [{ name: "Efterårsferie", start: "2026-10-12", end: "2026-10-16" }],
          days: [],
        }),
      },
    });
    expect(texts(none, ".empty")).toEqual(["Aula oplyser ingen åbningstider"]);
  });
});

describe("the hours as the card reads them", () => {
  it("are asked from Monday this week to Sunday next week", () => {
    expect(hoursPeriod("2026-11-01")).toEqual({ start: "2026-10-26", end: "2026-11-08" });
  });

  it("put children together only where their institution tells the same hours", () => {
    const other = { ...OPENING_HOURS, closed_days: [] };
    const view = hoursView(
      [
        { child: IDA, data: OPENING_HOURS, error: undefined, loading: false },
        { child: OSKAR, data: other, error: undefined, loading: false },
        { child: { ...OSKAR, child_id: 3 }, data: other, error: undefined, loading: false },
      ],
      "2026-10-29",
    );
    expect(view.places.map((place) => place.children.map((child) => child.child_id))).toEqual([
      [IDA.child_id],
      [OSKAR.child_id, 3],
    ]);
  });

  it("take a day only with a date, its times only when it is open", async () => {
    const hours = await fetchOpeningHours(
      () =>
        Promise.resolve({
          closed_days: [
            { name: "Juleferie", start: "2026-12-21", end: "2027-01-03" },
            { name: 7, start: "2026-11-06", end: "2026-11-06" },
            { name: "Uden slut", start: "2026-11-06" },
            { name: "Forkert", start: "snart", end: "2026-11-06" },
            { name: "Forkert", start: "2026-11-06", end: "senere" },
          ],
          days: [
            { date: "2026-10-29", closed: false, open: "6:30", close: "17:00:00" },
            { date: "2026-10-30", closed: true, open: "06:30", close: "16:00" },
            { date: "2026-10-31", open: "ni", close: 12 },
            { date: "fredag", closed: false },
            { closed: true },
          ],
        }),
      IDA,
      "2026-10-26",
      "2026-11-08",
    );
    expect(hours).toEqual({
      closed_days: [
        { name: "Juleferie", start: "2026-12-21", end: "2027-01-03" },
        { name: "", start: "2026-11-06", end: "2026-11-06" },
      ],
      days: [
        { date: "2026-10-29", closed: false, open: "06:30", close: "17:00" },
        { date: "2026-10-30", closed: true, open: null, close: null },
        { date: "2026-10-31", closed: false, open: null, close: null },
      ],
    });
    await expect(
      fetchOpeningHours(() => Promise.resolve(null), IDA, "2026-10-26", "2026-11-08"),
    ).resolves.toEqual({ closed_days: [], days: [] });
  });
});
