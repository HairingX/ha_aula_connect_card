import { describe, expect, it, vi } from "vitest";

import { errorText, fetchChildren, subscribeWeek } from "../../src/core/api.ts";
import { translator } from "../../src/core/i18n.ts";
import { CHILDREN } from "../fixtures/week.ts";
import { fakeHass, FakeConnection, present } from "../fake-hass.ts";

const t = translator("en");
const IDA = present(CHILDREN[0]);
const RANGE = { start: "2026-10-26", end: "2026-11-09" };

describe("fetchChildren", () => {
  it("lists the children with aula_connect/children", async () => {
    const hass = fakeHass({ children: CHILDREN });
    await expect(fetchChildren(hass.callWS)).resolves.toEqual(CHILDREN);
    expect(hass.callWS).toHaveBeenCalledWith({ type: "aula_connect/children" });
  });

  it("leaves out what is not a child, and takes a reply without children as none", async () => {
    const odd = [{ ...CHILDREN[0], child_id: "1001" }, null, "Ida", CHILDREN[1]];
    await expect(fetchChildren(() => Promise.resolve({ children: odd }))).resolves.toEqual([
      CHILDREN[1],
    ]);
    await expect(fetchChildren(() => Promise.resolve(null))).resolves.toEqual([]);
    await expect(fetchChildren(() => Promise.resolve({ children: {} }))).resolves.toEqual([]);
  });
});

describe("subscribeWeek", () => {
  it("subscribes to the child's range, not renewed on reconnect", async () => {
    const connection = new FakeConnection();
    await subscribeWeek(connection, IDA, RANGE, vi.fn(), vi.fn());
    expect(connection.subscriptions[0]?.message).toEqual({
      type: "aula_connect/week/subscribe",
      entry_id: "entry-a",
      child_id: 1001,
      start: "2026-10-26",
      end: "2026-11-09",
    });
    expect(connection.subscriptions[0]?.options).toEqual({ resubscribe: false });
  });

  it("gives every event as a whole range, filling in what is missing", async () => {
    const connection = new FakeConnection();
    const callback = vi.fn();
    await subscribeWeek(connection, IDA, RANGE, callback, vi.fn());
    const send = (message: unknown): void => connection.subscriptions[0]?.callback(message);
    send({
      week_plan: false,
      start: "2026-10-26",
      end: "2026-11-09",
      lessons: [],
      events: [],
      tasks: "none",
      birthdays: [],
    });
    send(null);
    expect(callback.mock.calls).toEqual([
      [
        {
          week_plan: false,
          start: "2026-10-26",
          end: "2026-11-09",
          lessons: [],
          events: [],
          tasks: [],
          birthdays: [],
        },
      ],
      [
        {
          week_plan: true,
          start: "2026-10-26",
          end: "2026-11-09",
          lessons: [],
          events: [],
          tasks: [],
          birthdays: [],
        },
      ],
    ]);
  });

  it("tells when the integration ends the subscription", async () => {
    const connection = new FakeConnection();
    const callback = vi.fn();
    const ended = vi.fn();
    await subscribeWeek(connection, IDA, RANGE, callback, ended);
    connection.subscriptions[0]?.callback({ ended: true });
    expect(ended).toHaveBeenCalledOnce();
    expect(callback).not.toHaveBeenCalled();
  });
});

describe("errors", () => {
  it.each([
    [{ code: "unknown_command", message: "Unknown command." }, t("notLoaded")],
    [{ code: "not_found", message: "Child not found" }, t("errorNotFound")],
    [
      { code: "invalid_format", message: "end before start" },
      "Aula Connect could not read the request: end before start",
    ],
    [{ code: "home_assistant_error", message: "Timeout" }, "Could not load from Aula: Timeout"],
    [{ code: 500, message: 42 }, "Could not load from Aula: [object Object]"],
    ["Connection lost", "Could not load from Aula: Connection lost"],
    [null, "Could not load from Aula: null"],
  ])("gives %j as %j", (error, text) => {
    expect(errorText(error, t)).toBe(text);
  });
});
