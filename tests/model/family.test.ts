import { describe, expect, it } from "vitest";

import { resolveOverviewConfig } from "../../src/config/family.ts";
import { reloadSelection, rememberSender } from "../../src/core/selection.ts";
import { extraKey, type StoreSnapshot } from "../../src/core/store.ts";
import {
  childKey,
  type Child,
  type Presence,
  type SickState,
  type TodayData,
  type VacationRequest,
} from "../../src/core/types.ts";
import { allowing, entriesOf, familyView, senderOf } from "../../src/model/family.ts";
import { homeworkPageView } from "../../src/model/homework-page.ts";
import { clockOf, overviewView, presenceOf } from "../../src/model/overview.ts";
import {
  answerableDays,
  answerReady,
  comingVacations,
  deadlinePassed,
  openRequests,
  vacationValid,
} from "../../src/model/vacation.ts";
import { REQUESTS, SECOND_ENTRY, todayOf, VACATIONS } from "../fixtures/family.ts";
import { scenarioNamed } from "../fixtures/scenarios.ts";
import { contextOf, noHold, snapshotOf } from "../fixtures/snapshot.ts";
import { allDay, CHILDREN, local, weekData } from "../fixtures/week.ts";
import { present } from "../fake-hass.ts";

const [IDA, OSKAR] = CHILDREN as [Child, Child];
const OPTIONS = resolveOverviewConfig({});

function withToday(snapshot: StoreSnapshot, today: (child: Child) => unknown): StoreSnapshot {
  return {
    ...snapshot,
    today: new Map(
      CHILDREN.map((child) => [
        childKey(child),
        { data: today(child) as TodayData, error: undefined },
      ]),
    ),
  };
}

/** A child's day as it is now, with what a test sets. */
interface TodayFields {
  presence?: Partial<Presence> | null;
  sick?: Partial<SickState>;
  vacation_requests_pending?: number;
}

function today(fields: TodayFields = {}): TodayData {
  const presence =
    fields.presence === null
      ? null
      : {
          status: 3,
          check_in: null,
          check_out: null,
          planned_in: null,
          planned_out: null,
          exit_with: null,
          ...fields.presence,
        };
  return {
    vacation_requests_pending: 0,
    ...fields,
    sick: { route: "aula", today: false, since: null, wrote_yesterday: false, ...fields.sick },
    presence,
  };
}

describe("the family", () => {
  it("shows each child once, with every entry it is in and its day", () => {
    const item = scenarioNamed("thu-1000");
    const base = snapshotOf(item);
    const snapshot = withToday(
      { ...base, children: { ...base.children, list: [...CHILDREN, ...SECOND_ENTRY] } },
      todayOf,
    );
    const view = familyView(snapshot, []);
    expect(view.children.map((family) => [family.child.child_id, family.entries.length])).toEqual([
      [1001, 2],
      [1002, 2],
    ]);
    expect(view.children[0]?.today?.vacation_requests_pending).toBe(0);
    expect(view.size).toBe(3);
    expect(familyView(snapshotOf(item), [1002, 4004])).toMatchObject({
      children: [{ child: OSKAR, today: undefined, error: undefined }],
      missing: [4004],
    });
    const empty = {
      ...snapshotOf(item),
      children: { list: undefined, error: undefined, refreshing: false },
    };
    expect(familyView(empty, []).children).toEqual([]);
  });

  it("acts as the guardian named, else the one acted as last, else the first", () => {
    const entries = entriesOf([...CHILDREN, ...SECOND_ENTRY], 1001);
    const family = { child: IDA, entries };
    expect(senderOf(family, "Peter Testesen", "vacations").entry_id).toBe("entry-b");
    expect(senderOf(family, undefined, "vacations").entry_id).toBe("entry-a");
    rememberSender(1001, "entry-b");
    expect(senderOf(family, "Nobody", "vacations").entry_id).toBe("entry-b");
    expect(senderOf({ child: IDA, entries: [] }, undefined, "vacations")).toBe(IDA);
    reloadSelection();
  });

  it("acts from an entry that allows the change, where any does", () => {
    const [lise, peter] = entriesOf([...CHILDREN, ...SECOND_ENTRY], 1001) as [Child, Child];
    const family = { child: IDA, entries: [{ ...lise, allowed: [] }, peter] };
    expect(allowing(family, "messages")).toEqual([peter]);
    expect(senderOf(family, "Lise Testesen", "messages")).toBe(peter);
    expect(allowing({ entries: [{ ...lise, allowed: ["vacations"] }] }, "messages")).toEqual([]);
    const none = {
      child: IDA,
      entries: [
        { ...lise, allowed: [] },
        { ...peter, allowed: [] },
      ],
    };
    expect(senderOf(none, "Peter Testesen", "messages").entry_id).toBe("entry-b");
  });
});

describe("a child's presence", () => {
  const item = scenarioNamed("thu-1000");
  const ctx = contextOf(item);
  const hours = { start: local("2026-10-29", "08:00"), end: local("2026-10-29", "12:55") };
  const after = contextOf(scenarioNamed("thu-1530"));

  it("reads a time of day in the time zone", () => {
    expect(clockOf(hours.end, ctx.zone)).toBe("12:55");
    expect(clockOf("later", ctx.zone)).toBe("00:00");
  });

  it.each<[string, TodayFields, object | undefined]>([
    ["nothing without the day", {}, undefined],
    [
      "sick when reported sick",
      { sick: { route: "aula", today: true, since: null, wrote_yesterday: false } },
      { kind: "sick", key: "presenceSick" },
    ],
    ["nothing without a presence", { presence: null }, undefined],
    ["nothing without a status", { presence: { status: null } }, undefined],
    [
      "gone home",
      { presence: { status: 0, check_out: "14:10" } },
      { kind: "home", key: "presenceGone", time: "14:10" },
    ],
    [
      "coming",
      { presence: { status: 0, planned_in: "07:45" } },
      { kind: "coming", key: "presenceComing", time: "07:45" },
    ],
    ["not arrived", { presence: { status: 0 } }, { kind: "coming", key: "presenceNotArrived" }],
    ["sick by the institution", { presence: { status: 1 } }, { kind: "sick", key: "presenceSick" }],
    ["absent", { presence: { status: 2 } }, { kind: "away", key: "presenceAbsent" }],
    [
      "at school while it goes on",
      { presence: { status: 3, check_in: "07:05" } },
      { kind: "school", key: "presenceSchool", time: "12:55" },
    ],
    ["on a trip", { presence: { status: 4 } }, { kind: "away", key: "presenceTrip" }],
    ["sleeping", { presence: { status: 5 } }, { kind: "here", key: "presenceSleeping" }],
    ["at an activity", { presence: { status: 6 } }, { kind: "away", key: "presenceActivity" }],
    ["here for another status", { presence: { status: 7 } }, { kind: "here", key: "presenceHere" }],
    [
      "gone home by its status",
      { presence: { status: 8, check_out: "15:00" } },
      { kind: "home", key: "presenceGone", time: "15:00" },
    ],
    [
      "gone home without a time",
      { presence: { status: 8 } },
      { kind: "home", key: "presenceGone", time: undefined },
    ],
  ])("is %s", (_name, fields, expected) => {
    const data = Object.keys(fields).length === 0 ? undefined : today(fields);
    const presence = presenceOf(data, hours, ctx);
    if (expected === undefined) expect(presence).toBeUndefined();
    else expect(presence).toMatchObject(expected);
  });

  it("is here after school: until it leaves, since it came, or just here", () => {
    expect(
      presenceOf(today({ presence: { status: 3, planned_out: "16:00" } }), hours, after),
    ).toMatchObject({
      kind: "here",
      key: "presenceUntil",
      time: "16:00",
    });
    expect(
      presenceOf(today({ presence: { status: 3, check_in: "07:05" } }), undefined, after),
    ).toMatchObject({
      kind: "here",
      key: "presenceSince",
      time: "07:05",
    });
    expect(presenceOf(today({ presence: { status: 3 } }), undefined, ctx)).toMatchObject({
      kind: "here",
      key: "presenceHere",
      time: undefined,
    });
    const early = contextOf(scenarioNamed("thu-0715"));
    expect(
      presenceOf(
        today({ presence: { status: 3, check_in: "07:05", planned_out: "16:00" } }),
        hours,
        early,
      ),
    ).toMatchObject({
      key: "presenceSince",
    });
  });
});

describe("the overview", () => {
  it("shows each child's day, its homework from it, and what is coming the next week", () => {
    const item = scenarioNamed("thu-1000");
    const view = overviewView(
      withToday(snapshotOf(item), todayOf),
      OPTIONS,
      contextOf(item),
      noHold,
    );
    expect(view.sameDay).toBe("2026-10-29");
    expect(view.homeworkSoon).toBe(8);
    expect(view.size).toBe(17);
    expect(
      view.children.map((child) => [child.child.first_name, child.homework.map((due) => due.day)]),
    ).toEqual([
      ["Ida", ["2026-10-29", "2026-10-30", "2026-10-30", "2026-11-02", "2026-11-03", "2026-11-04"]],
      ["Oskar", ["2026-11-02", "2026-11-04"]],
    ]);
    expect(view.children[0]?.presence).toMatchObject({ kind: "school", time: "12:55" });
    expect(view.children[1]?.presence).toMatchObject({ kind: "coming", time: "07:45" });
    expect(view.children[0]?.content?.view.day).toBe("2026-10-29");
    expect(
      view.coming.map((coming) => [
        coming.day,
        coming.kind === "event" ? coming.event.title : coming.name,
        coming.children.map((child) => child.first_name),
      ]),
    ).toEqual([
      ["2026-10-30", "Skolefoto", ["Ida", "Oskar"]],
      ["2026-10-30", "Alma", ["Ida"]],
      ["2026-10-31", "Loppemarked i skolegården", ["Ida", "Oskar"]],
      ["2026-11-03", "Forældremøde 3.B", ["Ida"]],
      ["2026-11-04", "Karla", ["Oskar"]],
    ]);
  });

  it("has no shared day when the children's days differ, and nothing while they load", () => {
    const item = scenarioNamed("thu-1530");
    const snapshot = snapshotOf(item);
    const loading = { ...snapshot, data: new Map([...snapshot.data].slice(0, 1)) };
    const view = overviewView(loading, OPTIONS, contextOf(item), noHold);
    expect(view.sameDay).toBeUndefined();
    expect(view.children[1]).toMatchObject({
      content: undefined,
      today: undefined,
      presence: undefined,
    });
  });

  it("shows an event of several days once, on its first day in the week", () => {
    const item = scenarioNamed("thu-1000");
    const snapshot = snapshotOf(item, [IDA]);
    const camp = allDay("camp", "Lejrskole", "event", "2026-10-30", "2026-11-02");
    const data = new Map(
      [...snapshot.data].map(([key, entry]) => [
        key,
        {
          ...entry,
          data: { ...present(entry.data), events: [...present(entry.data).events, camp] },
        },
      ]),
    );
    const view = overviewView(
      { ...snapshot, data },
      { ...OPTIONS, children: [1001] },
      contextOf(item),
      noHold,
    );
    expect(
      view.coming.filter((coming) => coming.kind === "event" && coming.event.title === "Lejrskole"),
    ).toMatchObject([{ day: "2026-10-30", children: [IDA] }]);
  });

  it("has no school hours today on a day beyond the children's days", () => {
    const item = scenarioNamed("thu-1000");
    const view = overviewView(
      snapshotOf(item),
      OPTIONS,
      contextOf(scenarioNamed("holiday")),
      noHold,
    );
    expect(view.children[0]?.hoursToday).toBeUndefined();
  });

  it("shows nobody before the children are listed", () => {
    const snapshot = snapshotOf(scenarioNamed("thu-1000"));
    const unlisted = {
      ...snapshot,
      children: { list: undefined, error: undefined, refreshing: true },
    };
    expect(
      overviewView(unlisted, OPTIONS, contextOf(scenarioNamed("thu-1000")), noHold).children,
    ).toEqual([]);
  });

  it("leaves birthdays out without a week plan", () => {
    const item = scenarioNamed("thu-1000");
    const snapshot = snapshotOf(item);
    const noPlan = {
      ...snapshot,
      data: new Map(
        [...snapshot.data].map(([key, entry]) => [
          key,
          { ...entry, data: { ...present(entry.data), week_plan: false } },
        ]),
      ),
    };
    const view = overviewView(noPlan, OPTIONS, contextOf(item), noHold);
    expect(view.coming.every((coming) => coming.kind === "event")).toBe(true);
    expect(view.homeworkSoon).toBe(0);
  });
});

describe("the homework page", () => {
  const item = scenarioNamed("thu-1000");
  const ctx = contextOf(item);

  it("folds this week's days before today, and names a child with nothing more due", () => {
    const view = homeworkPageView(snapshotOf(item), OPTIONS, ctx, noHold, 0);
    expect(view).toMatchObject({
      week: "2026-10-26",
      number: 44,
      offset: 0,
      loading: false,
      size: 11,
    });
    expect(view.earlier.map((entry) => [entry.child.first_name, entry.day])).toEqual([
      ["Ida", "2026-10-27"],
      ["Ida", "2026-10-28"],
      ["Oskar", "2026-10-27"],
    ]);
    expect(view.days.map((day) => [day.day, day.items.length])).toEqual([
      ["2026-10-29", 1],
      ["2026-10-30", 2],
    ]);
    expect(view.none).toEqual([OSKAR]);
  });

  it("shows every day of another week in the store's range", () => {
    const view = homeworkPageView(snapshotOf(item), OPTIONS, ctx, noHold, 1);
    expect(view.earlier).toEqual([]);
    expect(view.days.map((day) => day.day)).toEqual(
      ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-06"].filter((day) =>
        view.days.some((shown) => shown.day === day),
      ),
    );
    expect(view.days[0]?.day).toBe("2026-11-02");
  });

  it("waits for a week beyond the store's range, or says why it cannot have it", () => {
    const snapshot = snapshotOf(item);
    expect(homeworkPageView(snapshot, OPTIONS, ctx, noHold, 2)).toMatchObject({
      loading: true,
      days: [],
    });
    const days = { start: "2026-11-09", end: "2026-11-16" };
    const error = new Error("down");
    const failed: StoreSnapshot = {
      ...snapshot,
      data: new Map([
        ...snapshot.data,
        [extraKey(childKey(IDA), days), { range: days, data: undefined, error, stale: false }],
        [
          extraKey(childKey(OSKAR), days),
          { range: days, data: weekData("2026-11-09"), error: undefined, stale: false },
        ],
      ]),
    };
    const view = homeworkPageView(failed, OPTIONS, ctx, noHold, 2);
    expect(view).toMatchObject({ loading: false, error, week: "2026-11-09", number: 46 });
    expect(view.days.length).toBeGreaterThan(0);
  });

  it("waits for this week's data, or says why it cannot have it", () => {
    const snapshot = snapshotOf(item);
    const loading = { ...snapshot, data: new Map() };
    expect(homeworkPageView(loading, OPTIONS, ctx, noHold, 0)).toMatchObject({ loading: true });
    const error = new Error("down");
    const failed = {
      ...snapshot,
      data: new Map(
        [...snapshot.data].map(([key, entry]) => [key, { ...entry, data: undefined, error }]),
      ),
    };
    expect(homeworkPageView(failed, OPTIONS, ctx, noHold, 0)).toMatchObject({
      loading: false,
      error,
    });
  });

  it("has no homework without a week plan", () => {
    const snapshot = snapshotOf(item);
    const noPlan = {
      ...snapshot,
      data: new Map(
        [...snapshot.data].map(([key, entry]) => [
          key,
          { ...entry, data: { ...present(entry.data), week_plan: false } },
        ]),
      ),
    };
    expect(homeworkPageView(noPlan, OPTIONS, ctx, noHold, 0).none).toEqual([IDA, OSKAR]);
  });
});

describe("vacations and vacation requests", () => {
  const requests = REQUESTS.requests as VacationRequest[];
  const [christmas, winter] = requests as [VacationRequest, VacationRequest];

  it("keeps the requests that can still be answered, those awaiting an answer first", () => {
    expect(openRequests([winter, christmas], "2026-10-29")).toEqual([christmas, winter]);
    expect(openRequests(requests, "2026-11-21")).toEqual([christmas, winter]);
    const over = { ...winter, end: "2026-10-01" };
    const closed = { ...winter, deadline: "2026-11-01" };
    expect(openRequests([over, closed], "2026-11-02")).toEqual([]);
    expect(openRequests([{ ...christmas, start: "2026-12-22" }, christmas], "2026-10-29")[0]).toBe(
      christmas,
    );
  });

  it("tells whether the deadline has passed", () => {
    expect(deadlinePassed(christmas, "2026-11-20")).toBe(false);
    expect(deadlinePassed(christmas, "2026-11-21")).toBe(true);
    expect(deadlinePassed(winter, "2027-03-01")).toBe(false);
  });

  it("is whole when every day is answered, with times where asked for", () => {
    const day = { date: "2026-12-21", is_coming: true, entry_time: "08:00", exit_time: "15:00" };
    expect(answerReady([], false, "2026-12-01")).toBe(false);
    expect(answerReady([{ ...day, is_coming: null }], false, "2026-12-01")).toBe(false);
    expect(answerReady([{ ...day, entry_time: null }], false, "2026-12-01")).toBe(true);
    expect(answerReady([{ ...day, is_coming: false, entry_time: null }], true, "2026-12-01")).toBe(
      true,
    );
    expect(answerReady([day], true, "2026-12-01")).toBe(true);
    expect(answerReady([{ ...day, exit_time: "07:00" }], true, "2026-12-01")).toBe(false);
    expect(answerReady([{ ...day, exit_time: null }], true, "2026-12-01")).toBe(false);
    expect(answerReady([{ ...day, entry_time: "8" }], true, "2026-12-01")).toBe(false);
  });

  it("answers only the days from today", () => {
    const days = [
      { date: "2026-12-01", is_coming: null, entry_time: null, exit_time: null },
      { date: "2026-12-02", is_coming: false, entry_time: null, exit_time: null },
    ];
    expect(answerableDays(days, "2026-12-02")).toEqual([days[1]]);
    expect(answerReady(days, false, "2026-12-02")).toBe(true);
    expect(answerReady(days, false, "2026-12-03")).toBe(false);
  });

  it("registers a vacation from today, within a year", () => {
    expect(vacationValid("2026-10-29", "2026-10-29", "2026-10-29")).toBe(true);
    expect(vacationValid("2026-10-28", "2026-10-29", "2026-10-29")).toBe(false);
    expect(vacationValid("2026-11-02", "2026-11-01", "2026-10-29")).toBe(false);
    expect(vacationValid("2026-11-02", "2027-10-30", "2026-10-29")).toBe(false);
    expect(vacationValid("", "2026-11-01", "2026-10-29")).toBe(false);
    expect(vacationValid("2026-11-02", "2026-11-31", "2026-10-29")).toBe(false);
  });

  it("keeps the vacations not over yet, by their first day", () => {
    expect(
      comingVacations(VACATIONS.vacations, "2026-10-29").map((vacation) => vacation.id),
    ).toEqual([73, 71]);
  });
});
