/**
 * The parts of Home Assistant's frontend objects and of the Aula Connect websocket API the card
 * reads. Home Assistant passes much more; only what is used is typed.
 *
 * @packageDocumentation
 */

/** A function that ends a websocket subscription. */
export type Unsubscribe = () => Promise<void>;

/** The connection events the card listens to. */
export type ConnectionEvent = "ready" | "disconnected";

/** The websocket connection of `hass.connection`, as far as the card uses it. */
export interface HassConnection {
  /** Sends a subscription message and calls `callback` with every event it gives. */
  subscribeMessage(
    callback: (message: unknown) => void,
    message: Record<string, unknown>,
    options?: { resubscribe?: boolean },
  ): Promise<Unsubscribe>;
  /** Calls `callback` when the connection reaches `event`. */
  addEventListener(event: ConnectionEvent, callback: () => void): void;
  /** Stops calling `callback` for `event`. */
  removeEventListener(event: ConnectionEvent, callback: () => void): void;
}

/** The user's display preferences, `hass.locale`. */
export interface HassLocale {
  /** The language dates and times are formatted in; empty until the profile has loaded. */
  language: string;
  /** "language", "system", "12" or "24". */
  time_format: string;
  /** "language" or a weekday in English, lower case. */
  first_weekday: string;
  /** "local" for the browser's time zone, "server" for Home Assistant's. */
  time_zone: string;
}

/** The `hass` object Home Assistant gives every card. */
export interface HomeAssistant {
  /** The user's language. */
  language: string;
  /** The user's display preferences. */
  locale: HassLocale;
  /** Home Assistant's configuration; its time zone, as far as the card uses it. */
  config: { time_zone: string };
  /** The websocket connection. */
  connection: HassConnection;
  /** Sends a command and resolves with its result. */
  callWS: <T>(message: Record<string, unknown>) => Promise<T>;
}

/** A child as `aula_connect/children` lists it. */
export interface Child {
  /** The Aula Connect entry the child is in. */
  entry_id: string;
  /** Aula's id of the child. */
  child_id: number;
  /** The child's first name. */
  first_name: string;
  /** The child's full name. */
  name: string;
  /** The child's school or institution. */
  institution_name: string;
}

/** The result of `aula_connect/children`. */
export interface ChildrenResult {
  /** The children. */
  children: Child[];
}

/** A lesson in the timetable. */
export interface Lesson {
  /** Aula's id of the lesson. */
  id: string | number;
  /** ISO 8601 date and time with offset. */
  start: string;
  /** ISO 8601 date and time with offset. */
  end: string;
  /** The subject. */
  title: string;
  /** The teachers, as initials or full names. */
  teachers: string[];
  /** The room. */
  location: string | null;
  /** Null or "normal" for a normal lesson; else, as "cancelled" or "substitute", what is different. */
  status: string | null;
}

/** A calendar event other than a lesson. */
export interface CalendarEvent {
  /** Aula's id of the event. */
  id: string | number;
  /** A date (`YYYY-MM-DD`) for an all-day event, else an ISO 8601 date and time. */
  start: string;
  /** The day after the last of an all-day event, else the ISO 8601 date and time it ends. */
  end: string;
  /** Whether the event lasts whole days. */
  all_day: boolean;
  /** The event's title, as Aula gives it. */
  title: string;
  /** Aula's type of the event. */
  type: string;
  /** Where the event is. */
  location: string | null;
}

/** A note for a day from the school's week plan: homework, something to bring, information. */
export interface Task {
  /** The note's id. */
  id: string | number;
  /** The day the task is for, `YYYY-MM-DD`. */
  date: string;
  /** "task" for an assignment, "comment" for information; others are possible. */
  type: string;
  /** The note's title, if it has one. */
  title: string | null;
  /** May hold HTML; shown as plain text. */
  content: string;
  /** The subject the note is for. */
  subject: string;
  /** The class or group the note is for. */
  group: string;
  /** Who wrote the note. */
  author: string;
}

/** A birthday in a child's group. */
export interface Birthday {
  /** The day, `YYYY-MM-DD`. */
  date: string;
  /** Whose birthday it is. */
  name: string;
}

/** An event of `aula_connect/week/subscribe`: everything in the range, replacing the last. */
export interface WeekData {
  /** The first day of the range, `YYYY-MM-DD`. */
  start: string;
  /** The day after the last of the range. */
  end: string;
  /** The lessons in the range. */
  lessons: Lesson[];
  /** The events in the range. */
  events: CalendarEvent[];
  /** The week plan's notes in the range; empty without a week plan. */
  tasks: Task[];
  /** The birthdays in the range; empty without a week plan. */
  birthdays: Birthday[];
}
