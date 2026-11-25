import { describe, expect, it, vi } from "vitest";

import {
  actionErrorText,
  addVacation,
  answerVacationRequest,
  deleteVacation,
  fetchChildren,
  fetchThreads,
  fetchVacationRequests,
  fetchVacations,
  replyMessage,
  reportSick,
  subscribeToday,
  undoSick,
} from "../../src/core/api.ts";
import { translator } from "../../src/core/i18n.ts";
import type { CallWS } from "../../src/core/types.ts";
import { REQUESTS, THREADS, todayOf, VACATIONS } from "../fixtures/family.ts";
import { CHILDREN } from "../fixtures/week.ts";
import { FakeConnection, present, wsError } from "../fake-hass.ts";

const t = translator("en");
const IDA = present(CHILDREN[0]);
const OSKAR = present(CHILDREN[1]);

function answering(reply: unknown): ReturnType<typeof vi.fn<CallWS>> {
  return vi.fn<CallWS>(() => Promise.resolve(reply as never));
}

describe("the children's listing", () => {
  it("takes a child without a picture or a guardian as having none", async () => {
    const bare: Record<string, unknown> = { ...IDA };
    delete bare.picture_entity;
    delete bare.guardian;
    await expect(fetchChildren(answering({ children: [bare] }))).resolves.toEqual([
      { ...bare, picture_entity: null, guardian: "" },
    ]);
  });

  it("keeps the changes an entry allows that the cards know, and none without a list", async () => {
    const listed = await fetchChildren(
      answering({
        children: [
          { ...IDA, allowed: ["messages", "teleport", 3, "sick_reports", "messages"] },
          { ...OSKAR, allowed: "messages" },
          { ...OSKAR, allowed: undefined },
        ],
      }),
    );
    expect(listed.map((child) => child.allowed)).toEqual([["sick_reports", "messages"], [], []]);
  });
});

describe("subscribeToday", () => {
  it("subscribes to a child's day as it is now, not renewed on reconnect", async () => {
    const connection = new FakeConnection();
    const onData = vi.fn();
    const onEnded = vi.fn();
    await subscribeToday(connection, IDA, onData, onEnded);
    const [subscription] = connection.subscriptions;
    expect(subscription?.message).toEqual({
      type: "aula_connect/today/subscribe",
      entry_id: "entry-a",
      child_id: 1001,
    });
    expect(subscription?.options).toEqual({ resubscribe: false });
    subscription?.callback(todayOf(IDA));
    expect(onData).toHaveBeenCalledWith({
      presence: {
        status: 3,
        check_in: "07:05",
        check_out: null,
        planned_in: "07:00",
        planned_out: "15:30",
        exit_with: "Mor",
      },
      sick: { route: "aula", today: false, since: null, wrote_yesterday: false },
      vacation_requests_pending: 0,
    });
    subscription?.callback({ ended: true });
    expect(onEnded).toHaveBeenCalledOnce();
  });

  it("reads what it does not know as nothing", async () => {
    const connection = new FakeConnection();
    const onData = vi.fn();
    await subscribeToday(connection, IDA, onData, vi.fn());
    const callback = present(connection.subscriptions[0]).callback;
    callback(null);
    expect(onData).toHaveBeenLastCalledWith({
      presence: null,
      sick: { route: "none", today: false, since: null, wrote_yesterday: false },
      vacation_requests_pending: 0,
    });
    callback({
      presence: { status: 2.5, check_in: "7:05:30", check_out: "late", exit_with: 3 },
      sick: { route: "email", today: true, since: "2026-10-28", wrote_yesterday: true },
      vacation_requests_pending: -1,
    });
    expect(onData).toHaveBeenLastCalledWith({
      presence: {
        status: null,
        check_in: "07:05",
        check_out: null,
        planned_in: null,
        planned_out: null,
        exit_with: null,
      },
      sick: { route: "none", today: true, since: "2026-10-28", wrote_yesterday: true },
      vacation_requests_pending: 0,
    });
  });
});

describe("the commands that act", () => {
  it("reports a child sick, and takes it back", async () => {
    const callWS = answering({ route: "aula" });
    await reportSick(callWS, IDA);
    await undoSick(callWS, IDA);
    expect(callWS.mock.calls).toEqual([
      [{ type: "aula_connect/sick/report", entry_id: "entry-a", child_id: 1001 }],
      [{ type: "aula_connect/sick/undo", entry_id: "entry-a", child_id: 1001 }],
    ]);
  });

  it("lists the threads, leaving out what is not one", async () => {
    const callWS = answering({
      ...THREADS,
      threads: [...THREADS.threads, { thread_id: 3 }, { subject: "x" }, "x"],
    });
    const threads = await fetchThreads(callWS, IDA);
    expect(callWS).toHaveBeenCalledWith({
      type: "aula_connect/threads",
      entry_id: "entry-a",
      child_id: 1001,
    });
    expect(threads).toEqual(THREADS);
  });

  it("takes threads it cannot read as none, and one without its fields as open", async () => {
    await expect(fetchThreads(answering(null), IDA)).resolves.toEqual({
      threads: [],
      remembered: null,
      remembered_stale: false,
    });
    await expect(
      fetchThreads(
        answering({
          threads: [{ thread_id: 7, subject: "Hej", employees: [1, "Bo"] }],
          remembered: Number.NaN,
        }),
        IDA,
      ),
    ).resolves.toEqual({
      threads: [
        { thread_id: 7, subject: "Hej", last_activity: "", employees: ["Bo"], can_reply: true },
      ],
      remembered: null,
      remembered_stale: false,
    });
  });

  it("writes in a thread", async () => {
    const callWS = answering(null);
    await replyMessage(callWS, IDA, 501, "Ida er syg.");
    expect(callWS).toHaveBeenCalledWith({
      type: "aula_connect/message/reply",
      entry_id: "entry-a",
      child_id: 1001,
      thread_id: 501,
      text: "Ida er syg.",
    });
  });

  it("lists, adds and deletes vacations", async () => {
    const callWS = answering({ vacations: [...VACATIONS.vacations, { id: 1 }] });
    await expect(fetchVacations(callWS, OSKAR)).resolves.toEqual(VACATIONS.vacations);
    await expect(
      fetchVacations(
        answering({ vacations: [{ id: "a", start: "2026-12-01", end: "2026-12-02" }] }),
        OSKAR,
      ),
    ).resolves.toEqual([
      { id: "a", start: "2026-12-01", end: "2026-12-02", comment: "", editable: true },
    ]);
    await addVacation(callWS, "entry-a", [1001, 1002], "2026-12-21", "2026-12-23", "Jul");
    await deleteVacation(callWS, "entry-a", 71);
    expect(callWS.mock.calls.slice(1)).toEqual([
      [
        {
          type: "aula_connect/vacation/add",
          entry_id: "entry-a",
          child_ids: [1001, 1002],
          start: "2026-12-21",
          end: "2026-12-23",
          comment: "Jul",
        },
      ],
      [{ type: "aula_connect/vacation/delete", entry_id: "entry-a", vacation_id: 71 }],
    ]);
  });

  it("lists vacation requests, leaving out what is not one", async () => {
    const callWS = answering({
      requests: [
        ...REQUESTS.requests,
        { id: 3, start: "2026-12-01" },
        {
          id: 4,
          start: "2026-12-01",
          end: "2026-12-02",
          days: [{ date: 3 }, { date: "2026-12-01", is_coming: "yes" }],
        },
      ],
    });
    const requests = await fetchVacationRequests(callWS, OSKAR);
    expect(callWS).toHaveBeenCalledWith({
      type: "aula_connect/vacation_requests",
      entry_id: "entry-a",
      child_id: 1002,
    });
    expect(requests.slice(0, 2)).toEqual(REQUESTS.requests);
    expect(requests[2]).toEqual({
      id: 4,
      title: "",
      start: "2026-12-01",
      end: "2026-12-02",
      deadline: null,
      missing_answer: false,
      note: "",
      times_required: false,
      days: [{ date: "2026-12-01", is_coming: null, entry_time: null, exit_time: null }],
    });
  });

  it("answers a request with times only for the days the child comes, and a comment only when written", async () => {
    const callWS = answering(null);
    const days = [
      { date: "2026-12-21", is_coming: true, entry_time: "08:00", exit_time: "15:00" },
      { date: "2026-12-22", is_coming: false, entry_time: "08:00", exit_time: "15:00" },
      { date: "2026-12-23", is_coming: true, entry_time: null, exit_time: null },
    ];
    await answerVacationRequest(callWS, OSKAR, 91, days, "  Tak  ");
    await answerVacationRequest(callWS, OSKAR, 91, days.slice(1, 2), " ");
    expect(callWS.mock.calls).toEqual([
      [
        {
          type: "aula_connect/vacation_request/answer",
          entry_id: "entry-a",
          child_id: 1002,
          request_id: 91,
          days: [
            { date: "2026-12-21", is_coming: true, entry_time: "08:00", exit_time: "15:00" },
            { date: "2026-12-22", is_coming: false },
            { date: "2026-12-23", is_coming: true },
          ],
          comment: "Tak",
        },
      ],
      [
        {
          type: "aula_connect/vacation_request/answer",
          entry_id: "entry-a",
          child_id: 1002,
          request_id: 91,
          days: [{ date: "2026-12-22", is_coming: false }],
        },
      ],
    ]);
  });
});

describe("actionErrorText", () => {
  it.each([
    [wsError("unknown_command", "Unknown command."), "Update Aula Connect to do this from here."],
    [wsError("not_supported", "No"), "Aula Connect can't do this for this child yet."],
    [
      wsError("not_allowed", "Off"),
      "Aula Connect's options don't allow this. Turn it on there, and try again.",
    ],
    [wsError("not_found", "Gone"), "Aula no longer knows it. Reload, and try again."],
    [wsError("invalid_format", "bad day"), "Aula Connect could not read it: bad day"],
    [{ code: "invalid_format" }, "Aula Connect could not read it: "],
    [
      wsError("home_assistant_error", "Aula is down"),
      "It could not be done in Aula just now. Try again later.",
    ],
  ])("says what went wrong with %o", (error, said) => {
    expect(actionErrorText(error, t)).toBe(said);
  });
});
