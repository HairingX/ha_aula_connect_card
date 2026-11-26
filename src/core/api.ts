/**
 * The Aula Connect websocket API: the commands the cards send and the errors they give. What the
 * API sends is normalised here, once, so that nothing after it needs to guard against it.
 *
 * @packageDocumentation
 */

import type { Translate } from "./i18n.ts";
import {
  CHANGES,
  type Birthday,
  type CalendarEvent,
  type CallWS,
  type Child,
  type DayRange,
  type EventCreator,
  type EventDetails,
  type HassConnection,
  type Lesson,
  type Presence,
  type SickCheck,
  type SickRoute,
  type Task,
  type Thread,
  type ThreadList,
  type TodayData,
  type Unsubscribe,
  type Vacation,
  type VacationDay,
  type ClosedDays,
  type OpeningDay,
  type OpeningHours,
  type Post,
  type PostAttachment,
  type VacationRequest,
  type WeekData,
} from "./types.ts";
import { isDay } from "./dates.ts";

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

function child(value: unknown): Child | undefined {
  const item = fields(value);
  if (
    !item ||
    !text(item.entry_id) ||
    typeof item.child_id !== "number" ||
    !text(item.first_name) ||
    !text(item.name) ||
    !text(item.institution_name)
  )
    return undefined;
  return {
    entry_id: item.entry_id,
    child_id: item.child_id,
    first_name: item.first_name,
    name: item.name,
    institution_name: item.institution_name,
    picture_entity: or(item.picture_entity, null),
    guardian: or(item.guardian, ""),
    allowed: CHANGES.filter((change) => list(item.allowed).includes(change)),
  };
}

/**
 * Lists the children of every Aula Connect entry, leaving out any the cards could not show. A
 * child two guardians' entries both have is listed once for each.
 */
export async function fetchChildren(callWS: CallWS): Promise<Child[]> {
  const result = await callWS({ type: "aula_connect/children" });
  return items(fields(result)?.children, child);
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

const SICK_ROUTES: readonly SickRoute[] = ["aula", "tabulex", "none"];

// Aula writes a time of day "7:05", "07:05" or "07:05:00"; the cards read "07:05".
function time(value: unknown): string | null {
  if (!text(value) || !/^\d{1,2}:\d{2}/.test(value)) return null;
  return value.replace(
    /^(\d{1,2}):(\d{2}).*$/s,
    (_whole, hours: string, minutes: string) => `${hours.padStart(2, "0")}:${minutes}`,
  );
}

function presence(value: unknown): Presence | null {
  const item = fields(value);
  if (!item) return null;
  return {
    status: typeof item.status === "number" && Number.isInteger(item.status) ? item.status : null,
    check_in: time(item.check_in),
    check_out: time(item.check_out),
    planned_in: time(item.planned_in),
    planned_out: time(item.planned_out),
    exit_with: or(item.exit_with, null),
  };
}

function today(value: unknown): TodayData {
  const item = fields(value) ?? {};
  const sick = fields(item.sick) ?? {};
  const route = SICK_ROUTES.find((known) => known === sick.route) ?? "none";
  return {
    presence: presence(item.presence),
    sick: {
      route,
      today: sick.today === true,
      since: or(sick.since, null),
      wrote_yesterday: sick.wrote_yesterday === true,
    },
    vacation_requests_pending: count(item.vacation_requests_pending),
  };
}

/**
 * Subscribes to a child's day as it is now: the presence, the sickness and the vacation requests
 * awaiting an answer. `onData` gets it whenever the integration reads it anew; `onEnded` is
 * called instead when the integration ends the subscription, and nothing follows.
 *
 * @throws The websocket error when the subscription is refused.
 */
export function subscribeToday(
  connection: HassConnection,
  child: Child,
  onData: (data: TodayData) => void,
  onEnded: () => void,
): Promise<Unsubscribe> {
  return connection.subscribeMessage(
    (message) => {
      if (fields(message)?.ended === true) onEnded();
      else onData(today(message));
    },
    { type: "aula_connect/today/subscribe", entry_id: child.entry_id, child_id: child.child_id },
    { resubscribe: false },
  );
}

const anId = (value: unknown): value is string | number =>
  text(value) || (typeof value === "number" && Number.isFinite(value));

// A command about one of an entry's children.
function about(child: Child, type: string): Record<string, unknown> {
  return { type: `aula_connect/${type}`, entry_id: child.entry_id, child_id: child.child_id };
}

const maybe = (value: unknown): boolean | null => (typeof value === "boolean" ? value : null);

/**
 * Asks the integration whether a child can be reported sick now, and along which route; it sends
 * nothing to Aula. A child the answer does not say is found is not.
 *
 * @throws The websocket error.
 */
export async function checkSick(callWS: CallWS, child: Child): Promise<SickCheck> {
  const item = fields(await callWS(about(child, "sick/check"))) ?? {};
  return {
    route: SICK_ROUTES.find((known) => known === item.route) ?? "none",
    child_found: item.child_found === true,
    same_institution: maybe(item.same_institution),
    sick_today: maybe(item.sick_today),
    would_send: or(item.would_send, null),
  };
}

/**
 * Reports a child sick today, along the route the integration finds for it.
 *
 * @throws The websocket error: `not_supported` for a route not supported yet.
 */
export async function reportSick(callWS: CallWS, child: Child): Promise<void> {
  await callWS(about(child, "sick/report"));
}

/**
 * Takes back today's report of a child's sickness.
 *
 * @throws The websocket error.
 */
export async function undoSick(callWS: CallWS, child: Child): Promise<void> {
  await callWS(about(child, "sick/undo"));
}

function thread(item: Fields): Thread | undefined {
  if (!anId(item.thread_id) || !text(item.subject)) return undefined;
  return {
    thread_id: item.thread_id,
    subject: item.subject,
    last_activity: or(item.last_activity, ""),
    employees: list(item.employees).filter(text),
    can_reply: item.can_reply !== false,
  };
}

/**
 * Lists the threads a family can write about a child in, the newest first.
 *
 * @throws The websocket error.
 */
export async function fetchThreads(callWS: CallWS, child: Child): Promise<ThreadList> {
  const item = fields(await callWS(about(child, "threads"))) ?? {};
  return {
    threads: items(item.threads, thread),
    remembered: anId(item.remembered) ? item.remembered : null,
    remembered_stale: item.remembered_stale === true,
  };
}

/**
 * Writes a message in a thread about a child; the integration remembers the thread for the child.
 *
 * @throws The websocket error.
 */
export async function replyMessage(
  callWS: CallWS,
  child: Child,
  threadId: string | number,
  message: string,
): Promise<void> {
  await callWS({ ...about(child, "message/reply"), thread_id: threadId, text: message });
}

function vacation(item: Fields): Vacation | undefined {
  if (!anId(item.id) || !text(item.start) || !text(item.end)) return undefined;
  return {
    id: item.id,
    start: item.start,
    end: item.end,
    comment: or(item.comment, ""),
    editable: item.editable !== false,
  };
}

/**
 * Lists the vacations registered for a child.
 *
 * @throws The websocket error.
 */
export async function fetchVacations(callWS: CallWS, child: Child): Promise<Vacation[]> {
  return items(fields(await callWS(about(child, "vacations")))?.vacations, vacation);
}

/**
 * Registers a vacation for children of one entry, from `start` to `end`, both included.
 *
 * @throws The websocket error.
 */
export async function addVacation(
  callWS: CallWS,
  entryId: string,
  childIds: readonly number[],
  start: string,
  end: string,
  comment: string,
): Promise<void> {
  await callWS({
    type: "aula_connect/vacation/add",
    entry_id: entryId,
    child_ids: childIds,
    start,
    end,
    comment,
  });
}

/**
 * Deletes a registered vacation.
 *
 * @throws The websocket error.
 */
export async function deleteVacation(
  callWS: CallWS,
  entryId: string,
  id: string | number,
): Promise<void> {
  // A message's own `id` is the websocket's: the vacation is named apart.
  await callWS({ type: "aula_connect/vacation/delete", entry_id: entryId, vacation_id: id });
}

function vacationDay(item: Fields): VacationDay | undefined {
  if (!text(item.date)) return undefined;
  return {
    date: item.date,
    is_coming: typeof item.is_coming === "boolean" ? item.is_coming : null,
    entry_time: time(item.entry_time),
    exit_time: time(item.exit_time),
  };
}

function vacationRequest(item: Fields): VacationRequest | undefined {
  if (!anId(item.id) || !text(item.start) || !text(item.end)) return undefined;
  return {
    id: item.id,
    title: or(item.title, ""),
    start: item.start,
    end: item.end,
    deadline: or(item.deadline, null),
    missing_answer: item.missing_answer === true,
    note: or(item.note, ""),
    times_required: item.times_required === true,
    days: items(item.days, vacationDay),
  };
}

/**
 * Lists a child's vacation requests.
 *
 * @throws The websocket error.
 */
export async function fetchVacationRequests(
  callWS: CallWS,
  child: Child,
): Promise<VacationRequest[]> {
  return items(fields(await callWS(about(child, "vacation_requests")))?.requests, vacationRequest);
}

/**
 * Answers a vacation request: for each day whether the child comes, with the times where they are
 * asked for, and a comment.
 *
 * @throws The websocket error.
 */
export async function answerVacationRequest(
  callWS: CallWS,
  child: Child,
  id: string | number,
  days: readonly VacationDay[],
  comment: string,
): Promise<void> {
  await callWS({
    ...about(child, "vacation_request/answer"),
    request_id: id,
    days: days.map((day) => ({
      date: day.date,
      is_coming: day.is_coming === true,
      ...(day.is_coming === true && day.entry_time ? { entry_time: day.entry_time } : {}),
      ...(day.is_coming === true && day.exit_time ? { exit_time: day.exit_time } : {}),
    })),
    ...(comment.trim() === "" ? {} : { comment: comment.trim() }),
  });
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

/** Returns the text to show for an error of something the cards asked Aula to do. */
export function actionErrorText(error: unknown, t: Translate): string {
  switch (errorCode(error)) {
    case "unknown_command":
      return t("actionNeedsUpdate");
    case "not_supported":
      return t("actionNotSupported");
    case "not_allowed":
      return t("actionNotAllowed");
    case "not_found":
      return t("actionNotFound");
    case "invalid_format":
      return t("actionInvalid", { message: errorField(error, "message") ?? "" });
    default:
      return t("actionFailed");
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

function attachment(item: Fields): PostAttachment | undefined {
  if (!text(item.name)) return undefined;
  return {
    name: item.name,
    url: text(item.url) ? item.url : null,
    thumbnail: text(item.thumbnail) ? item.thumbnail : null,
    media: item.media === true,
  };
}

function post(item: Fields): Post | undefined {
  if (typeof item.id !== "number" || !text(item.time)) return undefined;
  const day = (value: unknown): string | null => (text(value) ? value : null);
  return {
    id: item.id,
    title: or(item.title, ""),
    html: or(item.html, ""),
    time: item.time,
    new: item.new === true,
    important: item.important === true,
    important_from: day(item.important_from),
    important_to: day(item.important_to),
    author: text(item.author) ? item.author : null,
    institution: text(item.institution) ? item.institution : null,
    groups: list(item.groups).filter(text),
    comments: count(item.comments),
    attachments: items(item.attachments, attachment),
  };
}

/**
 * Lists the newest posts of an entry's news feed, the newest first.
 *
 * @throws The websocket error.
 */
export async function fetchPosts(callWS: CallWS, entryId: string): Promise<Post[]> {
  return items(
    fields(await callWS({ type: "aula_connect/posts", entry_id: entryId }))?.posts,
    post,
  );
}

function closedDays(item: Fields): ClosedDays | undefined {
  if (!text(item.start) || !isDay(item.start) || !text(item.end) || !isDay(item.end)) {
    return undefined;
  }
  return { name: or(item.name, ""), start: item.start, end: item.end };
}

function openingDay(item: Fields): OpeningDay | undefined {
  if (!text(item.date) || !isDay(item.date)) return undefined;
  const closed = item.closed === true;
  return {
    date: item.date,
    closed,
    open: closed ? null : time(item.open),
    close: closed ? null : time(item.close),
  };
}

/**
 * Tells the days a child's institution is closed, and its hours from `start` to `end`, both
 * included.
 *
 * @throws The websocket error.
 */
export async function fetchOpeningHours(
  callWS: CallWS,
  child: Child,
  start: string,
  end: string,
): Promise<OpeningHours> {
  const answer = fields(await callWS({ ...about(child, "opening_hours"), start, end }));
  return {
    closed_days: items(answer?.closed_days, closedDays),
    days: items(answer?.days, openingDay),
  };
}
