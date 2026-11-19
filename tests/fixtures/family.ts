/**
 * Made-up data of the cards that act for the family: the children's day as it is now, their
 * pictures, the threads to the teachers, vacations and vacation requests.
 *
 * @packageDocumentation
 */

import type { Child, HassEntity } from "../../src/core/types.ts";
import { CHILDREN } from "./week.ts";

const [IDA_CHILD] = CHILDREN as [Child, Child];

/** Ida and Oskar as a second guardian's entry has them. */
export const SECOND_ENTRY: readonly Child[] = CHILDREN.map((child) => ({
  ...child,
  entry_id: "entry-b",
  guardian: "Peter Testesen",
}));

/** A drawn face, in a colour, as a data address: no real child's picture. */
export function drawnFace(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${color}"/><circle cx="32" cy="26" r="13" fill="#f2d3b3"/><rect x="14" y="44" width="36" height="20" rx="10" fill="#7d8fb3"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** The children's pictures, and a person standing in for Ida. */
export const STATES: Readonly<Record<string, HassEntity>> = {
  "image.ida_testesen": {
    state: "2026-10-01T08:00:00+00:00",
    attributes: { entity_picture: drawnFace("#e8d9c5"), friendly_name: "Ida Testesen" },
  },
  "image.oskar_testesen": {
    state: "2026-10-01T08:00:00+00:00",
    attributes: { entity_picture: drawnFace("#cfe0d0"), friendly_name: "Oskar Testesen" },
  },
  "person.lille_ida": {
    state: "home",
    attributes: { entity_picture: drawnFace("#d7d2ea"), friendly_name: "Lille Ida" },
  },
};

/** Ida's and Oskar's day as it is now: Ida in after-school care, Oskar on his way. */
export function todayOf(child: Child): Record<string, unknown> {
  return child.child_id === IDA_CHILD.child_id
    ? {
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
      }
    : {
        presence: {
          status: 0,
          check_in: null,
          check_out: null,
          planned_in: "07:45",
          planned_out: "14:30",
          exit_with: null,
        },
        sick: { route: "aula", today: false, since: null, wrote_yesterday: false },
        vacation_requests_pending: 1,
      };
}

/** The threads a family can write to Ida's teachers in, the newest first. */
export const THREADS = {
  threads: [
    {
      thread_id: 501,
      subject: "Sygdom 3.B",
      last_activity: "2026-10-20T07:30:00+00:00",
      employees: ["Karen Lund"],
      can_reply: true,
    },
    {
      thread_id: "502",
      subject: "Ugebrev",
      last_activity: "2026-10-16T12:00:00+00:00",
      employees: ["Karen Lund", "Bo Holm"],
      can_reply: false,
    },
  ],
  remembered: 501,
  remembered_stale: false,
};

/** The vacations registered for Oskar. */
export const VACATIONS = {
  vacations: [
    {
      id: 71,
      start: "2026-12-21",
      end: "2026-12-23",
      comment: "Til bedsteforældre",
      editable: true,
    },
    { id: 72, start: "2026-10-01", end: "2026-10-02", comment: "", editable: true },
    { id: 73, start: "2026-10-29", end: "2026-10-30", comment: "", editable: false },
  ],
};

/** The vacation requests to Oskar: the Christmas holiday awaiting an answer, and the winter one answered. */
export const REQUESTS = {
  requests: [
    {
      id: 91,
      title: "Juleferie",
      start: "2026-12-21",
      end: "2026-12-23",
      deadline: "2026-11-20",
      missing_answer: true,
      note: "Giv besked om, hvilke dage jeres barn kommer i SFO.",
      times_required: true,
      days: [
        { date: "2026-12-21", is_coming: null, entry_time: null, exit_time: null },
        { date: "2026-12-22", is_coming: null, entry_time: null, exit_time: null },
        { date: "2026-12-23", is_coming: null, entry_time: null, exit_time: null },
      ],
    },
    {
      id: 92,
      title: "",
      start: "2027-02-15",
      end: "2027-02-16",
      deadline: null,
      missing_answer: false,
      note: "",
      times_required: false,
      days: [
        { date: "2027-02-15", is_coming: true, entry_time: null, exit_time: null },
        { date: "2027-02-16", is_coming: false, entry_time: null, exit_time: null },
      ],
    },
  ],
};
