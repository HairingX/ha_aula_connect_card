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
  EventCreator,
  EventDetails,
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

function fields(value: unknown): Fields | undefined {
  return typeof value === "object" && value !== null ? value : undefined;
}

// A count Aula cannot have, such as a negative one, is none.
function count(value: unknown): number {
  return typeof value === "number" && value > 0 ? Math.floor(value) : 0;
}

function creator(value: unknown): EventCreator | null {
  const item = fields(value);
  return item && text(item.name) ? { name: item.name, role: or(item.role, "") } : null;
}

function booked(value: unknown): EventDetails["booked"] {
  const item = fields(value);
  return item && text(item.start) && text(item.end)
    ? { start: item.start, end: item.end, location: or(item.location, null) }
    : null;
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

/**
 * Returns Aula's id of an event, which the week gives as a string of digits; undefined for an id
 * Aula would not know, which no request is made for.
 */
export function eventId(event: CalendarEvent): number | undefined {
  const id = Number(event.id);
  return /^\d+$/.test(String(event.id)) && Number.isSafeInteger(id) ? id : undefined;
}

/**
 * Fetches what Aula has of a child's event. What the answer lacks is taken from `event`, as the
 * week gives it, or left empty.
 *
 * @throws The websocket error when the integration cannot answer.
 */
export async function fetchEvent(
  callWS: CallWS,
  child: Child,
  event: CalendarEvent,
  id: number,
): Promise<EventDetails> {
  const item =
    fields(
      await callWS({
        type: "aula_connect/event",
        entry_id: child.entry_id,
        child_id: child.child_id,
        event_id: id,
      }),
    ) ?? {};
  return {
    title: or(item.title, event.title),
    type: or(item.type, event.type),
    all_day: typeof item.all_day === "boolean" ? item.all_day : event.all_day,
    start: or(item.start, event.start),
    end: or(item.end, event.end),
    description: or(item.description, ""),
    location: or(item.location, event.location),
    institution_name: or(item.institution_name, ""),
    creator: creator(item.creator),
    co_organizers: list(item.co_organizers).filter(text),
    invited_groups: list(item.invited_groups).filter(text),
    invited: count(item.invited),
    answered: count(item.answered),
    response_required: item.response_required === true,
    response_deadline: or(item.response_deadline, null),
    deadline_passed: item.deadline_passed === true,
    answer: or(item.answer, null),
    answered_at: or(item.answered_at, null),
    booked: booked(item.booked),
    attachments: count(item.attachments),
    private: item.private === true,
    deleted: item.deleted === true,
  };
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

/** Returns the text to show for an error fetching an event: short, as it stands beside it. */
export function eventErrorText(error: unknown, t: Translate): string {
  switch (errorCode(error)) {
    case "unknown_command":
      return t("eventNotSupported");
    case "not_found":
      return t("eventNotFound");
    default:
      return t("eventUnavailable");
  }
}
