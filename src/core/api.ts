/**
 * The Aula Connect websocket API: the commands the cards send and the errors they give. What the
 * API sends is normalised here, once, so that nothing after it needs to guard against it.
 *
 * @packageDocumentation
 */

import type { Translate } from "./i18n.ts";
import type { CallWS, Child, DayRange, HassConnection, Unsubscribe, WeekData } from "./types.ts";

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? (value as unknown[]) : [];
}

function isChild(value: unknown): value is Child {
  if (typeof value !== "object" || value === null) return false;
  const child = value as Record<string, unknown>;
  return (
    typeof child.entry_id === "string" &&
    typeof child.child_id === "number" &&
    typeof child.first_name === "string" &&
    typeof child.name === "string" &&
    typeof child.institution_name === "string"
  );
}

/** Lists the children of every Aula Connect entry, leaving out any the cards could not show. */
export async function fetchChildren(callWS: CallWS): Promise<Child[]> {
  const result = await callWS({ type: "aula_connect/children" });
  const children =
    typeof result === "object" && result !== null
      ? (result as Record<string, unknown>).children
      : undefined;
  return list(children).filter(isChild);
}

/**
 * Subscribes to a child's lessons, events, notes and birthdays in a range. `onData` gets the
 * whole range on every change; `onEnded` is called instead when the integration ends the
 * subscription, as when its entry is reloaded, and nothing follows. The subscription is not
 * renewed after the connection is lost: the caller makes it again.
 *
 * @throws The websocket error when the subscription is refused.
 */
export function subscribeWeek(
  connection: HassConnection,
  child: Child,
  range: DayRange,
  onData: (data: WeekData) => void,
  onEnded: () => void,
): Promise<Unsubscribe> {
  return connection.subscribeMessage(
    (message) => {
      const data = (typeof message === "object" && message !== null ? message : {}) as Partial<
        Record<keyof WeekData | "ended", unknown>
      >;
      if (data.ended === true) {
        onEnded();
        return;
      }
      onData({
        week_plan: data.week_plan !== false,
        start: typeof data.start === "string" ? data.start : range.start,
        end: typeof data.end === "string" ? data.end : range.end,
        lessons: list(data.lessons),
        events: list(data.events),
        tasks: list(data.tasks),
        birthdays: list(data.birthdays),
      } as WeekData);
    },
    {
      type: "aula_connect/week/subscribe",
      entry_id: child.entry_id,
      child_id: child.child_id,
      start: range.start,
      end: range.end,
    },
    { resubscribe: false },
  );
}

function errorField(error: unknown, field: "code" | "message"): string | undefined {
  if (typeof error !== "object" || error === null || !(field in error)) return undefined;
  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" ? value : undefined;
}

/** Returns the text to show for an error from the API. */
export function errorText(error: unknown, t: Translate): string {
  const message = errorField(error, "message") ?? String(error);
  switch (errorField(error, "code")) {
    case "unknown_command":
      return t("notLoaded");
    case "not_found":
      return t("errorNotFound");
    case "invalid_format":
      return t("errorInvalidFormat", { message });
    default:
      return t("errorGeneric", { message });
  }
}
