/**
 * The Aula Connect websocket API: the commands the card sends and the errors they give.
 *
 * @packageDocumentation
 */

import type { Translate } from "./i18n";
import type {
  Child,
  ChildrenResult,
  HassConnection,
  HomeAssistant,
  Unsubscribe,
  WeekData,
} from "./types";

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? (value as unknown[]) : [];
}

/** Lists the children of every Aula Connect entry. */
export async function fetchChildren(hass: HomeAssistant): Promise<Child[]> {
  const result = await hass.callWS<ChildrenResult>({ type: "aula_connect/children" });
  return result.children;
}

/**
 * Subscribes to a child's lessons, events, notes and birthdays from `start` up to, not including,
 * `end`. `callback` gets the whole range on every change; `ended` is called instead when the
 * integration ends the subscription, as when its entry is reloaded, and nothing follows. The
 * subscription is not renewed after the connection is lost.
 *
 * @throws The websocket error when the subscription is refused.
 */
export function subscribeWeek(
  connection: HassConnection,
  child: Child,
  start: string,
  end: string,
  callback: (data: WeekData) => void,
  ended: () => void,
): Promise<Unsubscribe> {
  return connection.subscribeMessage(
    (message) => {
      const data = (typeof message === "object" && message !== null ? message : {}) as Partial<
        Record<keyof WeekData | "ended", unknown>
      >;
      if (data.ended === true) {
        ended();
        return;
      }
      callback({
        start: typeof data.start === "string" ? data.start : start,
        end: typeof data.end === "string" ? data.end : end,
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
      start,
      end,
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
