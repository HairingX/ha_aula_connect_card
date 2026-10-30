/**
 * The Aula Connect websocket API: the commands the cards send and the errors they give. What the
 * API sends is normalised here, once, so that nothing after it needs to guard against it.
 *
 * @packageDocumentation
 */

import type { Translate } from "./i18n.ts";
import type {
  Birthday,
  CalendarEvent,
  CallWS,
  Child,
  DayRange,
  HassConnection,
  Lesson,
  Task,
  Unsubscribe,
  WeekData,
} from "./types.ts";

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? (value as unknown[]) : [];
}

type Fields = Partial<Record<string, unknown>>;

const text = (value: unknown): value is string => typeof value === "string";
const or = <T>(value: unknown, fallback: T): string | T => (text(value) ? value : fallback);

// Each item is taken only with the fields the cards read as the types they have; an item
// without a time, a day or a title cannot be shown and is left out.
function items<T>(value: unknown, make: (item: Fields) => T | undefined): T[] {
  return list(value).flatMap((item) => {
    const made = typeof item === "object" && item !== null ? make(item) : undefined;
    return made === undefined ? [] : [made];
  });
}

function id(item: Fields): string | number {
  return typeof item.id === "number" ? item.id : or(item.id, "");
}

function lesson(item: Fields): Lesson | undefined {
  if (!text(item.start) || !text(item.end) || !text(item.title)) return undefined;
  return {
    id: id(item),
    start: item.start,
    end: item.end,
    title: item.title,
    teachers: list(item.teachers).filter(text),
    location: or(item.location, null),
    status: or(item.status, null),
  };
}

function event(item: Fields): CalendarEvent | undefined {
  if (!text(item.start) || !text(item.end) || !text(item.title)) return undefined;
  return {
    id: id(item),
    start: item.start,
    end: item.end,
    all_day: item.all_day === true,
    title: item.title,
    type: or(item.type, ""),
    location: or(item.location, null),
  };
}

function task(item: Fields): Task | undefined {
  if (!text(item.date)) return undefined;
  return {
    id: id(item),
    date: item.date,
    type: or(item.type, ""),
    title: or(item.title, null),
    content: or(item.content, ""),
    subject: or(item.subject, ""),
    group: or(item.group, ""),
    author: or(item.author, ""),
  };
}

function birthday(item: Fields): Birthday | undefined {
  return text(item.date) && text(item.name) ? { date: item.date, name: item.name } : undefined;
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
        start: or(data.start, range.start),
        end: or(data.end, range.end),
        lessons: items(data.lessons, lesson),
        events: items(data.events, event),
        tasks: items(data.tasks, task),
        birthdays: items(data.birthdays, birthday),
      });
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

/** Returns the code of an error from the API, such as `unknown_command`. */
export function errorCode(error: unknown): string | undefined {
  return errorField(error, "code");
}

/** Returns the text to show for an error from the API. */
export function errorText(error: unknown, t: Translate): string {
  const message = errorField(error, "message") ?? String(error);
  switch (errorCode(error)) {
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
