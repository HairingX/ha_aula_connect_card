/**
 * What a lesson's or an event's window shows: everything the card knows of it, without what is
 * empty. An event's details come from Aula after the tap; until then the week's data stands in.
 *
 * @packageDocumentation
 */

import { dayOf, instant } from "../core/dates.ts";
import { htmlToText } from "../core/text.ts";
import type { CalendarEvent, Child, Day, EventDetails } from "../core/types.ts";
import type { LessonRow, LessonStatus } from "./blocks.ts";
import { holidaySpan } from "./days.ts";

/** What a tap in the whole timetable opens: a lesson, or one of a child's events. */
export type DetailTarget =
  | {
      /** A lesson. */
      readonly kind: "lesson";
      /** Its row of the timetable. */
      readonly row: LessonRow;
    }
  | {
      /** An event. */
      readonly kind: "event";
      /** The event, as the week gives it. */
      readonly event: CalendarEvent;
      /** The child whose event it is, whom Aula is asked for its details. */
      readonly child: Child;
    };

/** How far an event's details have come. */
export interface EventLoad {
  /** The details, once Aula has given them. */
  readonly details: EventDetails | undefined;
  /** Whether they are on their way. */
  readonly loading: boolean;
  /** Why they could not be had. */
  readonly error: unknown;
}

/** A lesson's window. */
export interface LessonDetail {
  /** A lesson. */
  readonly kind: "lesson";
  /** Its subjects, named, with those of the lessons at its very time. */
  readonly title: string;
  /** The subjects as Aula has them, where that differs from `title`. */
  readonly raw: string | undefined;
  /** The subject's colour. */
  readonly color: string | undefined;
  /** The day it is on. */
  readonly day: Day;
  /** When it begins, ISO 8601. */
  readonly start: string;
  /** When it ends, ISO 8601. */
  readonly end: string;
  /** The room, where Aula has one. */
  readonly room: string | undefined;
  /** The teachers' full names. */
  readonly teachers: readonly string[];
  /** A change Aula reports, such as a substitute. */
  readonly status: LessonStatus | undefined;
}

/** An event's window. */
export interface EventDetail {
  /** An event. */
  readonly kind: "event";
  /** The title. */
  readonly title: string;
  /** Aula's type of the event. */
  readonly type: string;
  /** The institution it is at, once known. */
  readonly institution: string | undefined;
  /** Whether it lasts whole days. */
  readonly allDay: boolean;
  /** Its first day. */
  readonly first: Day;
  /** Its last day. */
  readonly last: Day;
  /** When it begins: a day, or an ISO 8601 time. */
  readonly start: string;
  /** When it ends: the day after the last, or an ISO 8601 time. */
  readonly end: string;
  /** The time booked for the child, on its day, with its place where it has one of its own. */
  readonly booked:
    | {
        readonly day: Day;
        readonly start: string;
        readonly end: string;
        readonly location: string | undefined;
      }
    | undefined;
  /** Where it is, unless the booked time says the same. */
  readonly location: string | undefined;
  /** The description as plain text; empty when there is none. */
  readonly text: string;
  /** Who made it, unless that is a parent or a child, whose names are not shown. */
  readonly creator: { readonly name: string; readonly role: string } | undefined;
  /** Who arrange it with the creator. */
  readonly coOrganizers: readonly string[];
  /** The groups invited. */
  readonly groups: readonly string[];
  /** How many are invited, and how many have answered; undefined when Aula counts none. */
  readonly invited: { readonly invited: number; readonly answered: number } | undefined;
  /** The guardian's answer, as Aula names it, and when it was given. */
  readonly answer: { readonly value: string; readonly at: Moment | undefined } | undefined;
  /** When the answer is due, and whether that has passed. */
  readonly deadline: (Moment & { readonly passed: boolean }) | undefined;
  /** How many files are attached. */
  readonly attachments: number;
  /** Whether it is private. */
  readonly private: boolean;
  /** Whether it is deleted in Aula. */
  readonly deleted: boolean;
  /** Whether the rest is on its way. */
  readonly loading: boolean;
  /** Why the rest could not be had. */
  readonly error: unknown;
}

/** A moment, and the day it is on in the time zone. */
export interface Moment {
  /** ISO 8601 date and time. */
  readonly at: string;
  /** Its day. */
  readonly day: Day;
}

/** A window's content. */
export type DetailView = LessonDetail | EventDetail;

/** Aula's roles of those whose names the cards never show: parents and children. */
export const UNNAMED_ROLES: readonly string[] = [
  "guardian",
  "child",
  "early-student",
  "middle-late-student",
];

function dayAt(text: string, zone: string): Day {
  const at = instant(text);
  return at ? dayOf(at, zone) : text.slice(0, 10);
}

function moment(at: string, zone: string): Moment {
  return { at, day: dayAt(at, zone) };
}

function some(text: string | null | undefined): string | undefined {
  const trimmed = text?.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Returns what a lesson's window shows. */
export function lessonDetail(row: LessonRow, zone: string): LessonDetail {
  const { block, status } = row;
  const subjects = [row.subject, ...row.also];
  const title = subjects.map((subject) => subject.name).join(", ");
  const raw = subjects.map((subject) => subject.raw).join(", ");
  return {
    kind: "lesson",
    title,
    raw: raw === title ? undefined : raw,
    color: row.subject.color,
    day: dayAt(block.start, zone),
    start: block.start,
    end: block.end,
    room: some(block.lesson.location),
    teachers: block.lesson.teachers.map((name) => name.trim()).filter((name) => name !== ""),
    status,
  };
}

/**
 * Returns what an event's window shows: what the week gives, and Aula's details once they have
 * come. The guardian's answer is "waiting" where Aula asks for one and has none.
 */
export function eventDetail(event: CalendarEvent, load: EventLoad, zone: string): EventDetail {
  const details = load.details;
  const shown = details ?? event;
  const allDay = shown.all_day;
  const span = allDay
    ? holidaySpan({ ...event, start: shown.start, end: shown.end }, dayAt(shown.start, zone))
    : { first: dayAt(shown.start, zone), last: dayAt(shown.end, zone) };
  const booked = details?.booked ?? undefined;
  const bookedPlace = some(booked?.location);
  const location = some(shown.location);
  const creator = details?.creator;
  const answer = details?.answer ?? (details?.response_required ? "waiting" : null);
  const answered = details?.answered_at;
  return {
    kind: "event",
    title: shown.title,
    type: shown.type,
    institution: some(details?.institution_name),
    allDay,
    first: span.first,
    last: span.last,
    start: shown.start,
    end: shown.end,
    booked: booked && {
      day: dayAt(booked.start, zone),
      start: booked.start,
      end: booked.end,
      location: bookedPlace,
    },
    location: location === bookedPlace ? undefined : location,
    text: htmlToText(details?.description ?? ""),
    creator:
      creator && !UNNAMED_ROLES.includes(creator.role)
        ? { name: creator.name, role: creator.role }
        : undefined,
    coOrganizers: details?.co_organizers ?? [],
    groups: details?.invited_groups ?? [],
    invited: details?.invited
      ? { invited: details.invited, answered: details.answered }
      : undefined,
    answer:
      answer === null
        ? undefined
        : { value: answer, at: answered ? moment(answered, zone) : undefined },
    deadline: details?.response_deadline
      ? { ...moment(details.response_deadline, zone), passed: details.deadline_passed }
      : undefined,
    attachments: details?.attachments ?? 0,
    private: details?.private ?? false,
    deleted: details?.deleted ?? false,
    loading: load.loading,
    error: load.error,
  };
}

/** Returns what a window shows of what was tapped. */
export function detailView(target: DetailTarget, load: EventLoad, zone: string): DetailView {
  return target.kind === "lesson"
    ? lessonDetail(target.row, zone)
    : eventDetail(target.event, load, zone);
}
