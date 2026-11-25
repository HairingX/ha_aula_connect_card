/**
 * The parts of Home Assistant's frontend objects and of the Aula Connect websocket API the cards
 * read. Home Assistant passes much more; only what is used is typed.
 *
 * @packageDocumentation
 */

/** A calendar day, `YYYY-MM-DD`. */
export type Day = string;

/** The days from `start` up to, not including, `end`. */
export interface DayRange {
  /** The first day. */
  readonly start: Day;
  /** The day after the last. */
  readonly end: Day;
}

/** A child's key across the entries of Aula Connect: its entry's id and its own. */
export type ChildKey = `${string}/${string}`;

/** Returns a child's key. */
export function childKey(child: Pick<Child, "entry_id" | "child_id">): ChildKey {
  return `${child.entry_id}/${String(child.child_id)}`;
}

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
  /** "local" for the browser's time zone, "server" for Home Assistant's. */
  time_zone: string;
}

/** Sends a command over the websocket and resolves with its result. */
export type CallWS = (message: Record<string, unknown>) => Promise<unknown>;

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
  /** The entities' states, as far as the cards read them: pictures and names. */
  states?: Readonly<Record<string, HassEntity | undefined>>;
}

/** An entity's state, as far as the cards read it. */
export interface HassEntity {
  /** The state. */
  readonly state: string;
  /** The attributes, such as `entity_picture` and `friendly_name`. */
  readonly attributes: Readonly<Record<string, unknown>>;
}

/** The changes in Aula an entry of Aula Connect can allow, each off until its options allow it. */
export const CHANGES = ["sick_reports", "vacations", "vacation_requests", "messages"] as const;

/**
 * A change in Aula: reporting a child sick and taking it back, registering and deleting a
 * vacation, answering a vacation request, or writing in a thread to the teachers.
 */
export type Change = (typeof CHANGES)[number];

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
  /** The `image` entity with the child's picture from Aula; null without one. */
  picture_entity: string | null;
  /** The display name of the guardian whose entry this is; empty when Aula Connect names none. */
  guardian: string;
  /** The changes in Aula the entry allows; a command for any other is refused. */
  allowed: readonly Change[];
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
  /** The teachers' full names. */
  teachers: string[];
  /** The room. */
  location: string | null;
  /** Null or "normal" for a normal lesson, "substitute" for one with a substitute teacher, or another state as Aula names it. */
  status: string | null;
}

/** A calendar event other than a lesson. */
export interface CalendarEvent {
  /** Aula's id of the event. */
  id: string | number;
  /** The first day of an all-day event, `YYYY-MM-DD`, else an ISO 8601 date and time. */
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
  /** Whether the institution has a week plan, which is where notes and birthdays come from. */
  week_plan: boolean;
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

/** Who made an event: a name and Aula's institution role, such as "teacher" or "other". */
export interface EventCreator {
  /** The full name. */
  name: string;
  /** Aula's institution role. */
  role: string;
}

/** The time a parents' meeting has booked for the child. */
export interface BookedTime {
  /** ISO 8601 date and time with offset. */
  start: string;
  /** ISO 8601 date and time with offset. */
  end: string;
  /** Where the meeting is. */
  location: string | null;
}

/** An event as `aula_connect/event` gives it: what the week gives, and the rest Aula has. */
export interface EventDetails {
  /** The event's title. */
  title: string;
  /** Aula's type of the event. */
  type: string;
  /** Whether the event lasts whole days. */
  all_day: boolean;
  /** The first day of an all-day event, `YYYY-MM-DD`, else an ISO 8601 date and time. */
  start: string;
  /** The day after the last of an all-day event, else the ISO 8601 date and time it ends. */
  end: string;
  /** May hold HTML; shown as plain text. Empty when there is none. */
  description: string;
  /** Where the event is. */
  location: string | null;
  /** The institution the event is at; empty when Aula names none. */
  institution_name: string;
  /** Who made the event. */
  creator: EventCreator | null;
  /** The full names of those who arrange it with the creator. */
  co_organizers: string[];
  /** The groups invited, by name. */
  invited_groups: string[];
  /** How many are invited. */
  invited: number;
  /** How many of them have answered. */
  answered: number;
  /** Whether Aula asks for an answer. */
  response_required: boolean;
  /** When the answer is due, ISO 8601. */
  response_deadline: string | null;
  /** Whether the answer is overdue. */
  deadline_passed: boolean;
  /** The guardian's own answer: "accepted", "waiting", "declined" or another as Aula names it. */
  answer: string | null;
  /** When the guardian answered, ISO 8601. */
  answered_at: string | null;
  /** The time booked for the child in a parents' meeting. */
  booked: BookedTime | null;
  /** How many files are attached; the files are seen in Aula. */
  attachments: number;
  /** Whether the event is private. */
  private: boolean;
  /** Whether the event is deleted in Aula. */
  deleted: boolean;
}

/** A child's presence today, as the institution's check-in registers it. */
export interface Presence {
  /** Aula's presence status: 0 not arrived, 1 sick, 2 reported absent, 3 present, 4 on a field
   * trip, 5 sleeping, 6 at a spare-time activity, 7 placed somewhere else, 8 gone home. */
  status: number | null;
  /** When the child came, "HH:MM". */
  check_in: string | null;
  /** When the child went, "HH:MM". */
  check_out: string | null;
  /** When the child is planned to come, "HH:MM". */
  planned_in: string | null;
  /** When the child is planned to go, "HH:MM". */
  planned_out: string | null;
  /** Who collects the child, as the family wrote it in Aula. */
  exit_with: string | null;
}

/** How a child is reported sick: Aula's own presence module, IST Tabulex, or not at all. */
export type SickRoute = "aula" | "tabulex" | "none";

/** What is known of a child's sickness. */
export interface SickState {
  /** The route a report takes; `none` also until Aula Connect has first looked for one. */
  route: SickRoute;
  /** Whether the child is reported sick today. */
  today: boolean;
  /** The first day of the sickness, while it lasts. */
  since: Day | null;
  /** Whether the family wrote to the teachers through Home Assistant on the weekday before. */
  wrote_yesterday: boolean;
}

/** An event of `aula_connect/today/subscribe`: the child's day as it is now. */
export interface TodayData {
  /** The presence; null where the institution registers none. */
  presence: Presence | null;
  /** The sickness. */
  sick: SickState;
  /** How many vacation requests await an answer. */
  vacation_requests_pending: number;
}

/** A message thread a family can write to the teachers in. */
export interface Thread {
  /** Aula's id of the thread. */
  thread_id: string | number;
  /** Its subject. */
  subject: string;
  /** When something last happened in it, ISO 8601. */
  last_activity: string;
  /** Its recipients other than the family's guardians, by name: the teachers, mostly. */
  employees: string[];
  /** Whether a reply can be written in it: it is not deleted. */
  can_reply: boolean;
}

/** The threads of `aula_connect/threads`: the newest first, and the one remembered. */
export interface ThreadList {
  /** The threads. */
  threads: Thread[];
  /** The thread last written in for the child; null for none. */
  remembered: string | number | null;
  /** Whether the remembered thread should be chosen again: from before the school year, left,
   * or closed to replies. */
  remembered_stale: boolean;
}

/** A vacation registered for a child. */
export interface Vacation {
  /** Aula's id of it. */
  id: string | number;
  /** Its first day. */
  start: Day;
  /** Its last day. */
  end: Day;
  /** What the family wrote with it. */
  comment: string;
  /** Whether it can be deleted. */
  editable: boolean;
}

/** A day of a vacation request, and the answer given for it. */
export interface VacationDay {
  /** The day. */
  date: Day;
  /** Whether the child comes; null while it is not answered. */
  is_coming: boolean | null;
  /** When the child comes, "HH:MM", where times are asked for. */
  entry_time: string | null;
  /** When the child goes, "HH:MM", where times are asked for. */
  exit_time: string | null;
}

/** A vacation request from the institution: which days of a holiday the child comes. */
export interface VacationRequest {
  /** Aula's id of the answer it awaits. */
  id: string | number;
  /** The holiday's title. */
  title: string;
  /** Its first day. */
  start: Day;
  /** Its last day. */
  end: Day;
  /** The last day to answer; null for none. */
  deadline: Day | null;
  /** Whether it is not answered yet. */
  missing_answer: boolean;
  /** The institution's note to the family. */
  note: string;
  /** Whether the times a child comes and goes are asked for. */
  times_required: boolean;
  /** The days asked about: Monday to Friday. */
  days: VacationDay[];
}
