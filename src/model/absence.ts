/**
 * Fravær: the vacation requests and the vacations of the children shown, each told once for every
 * child it concerns, as a family thinks of them.
 *
 * @packageDocumentation
 */

import type { Child, Day, Vacation, VacationRequest } from "../core/types.ts";
import { openRequests } from "./vacation.ts";

/** A child's own request in a group, with the entry it is answered from. */
export interface RequestFor {
  /** The child. */
  readonly child: Child;
  /** The entry the child's requests were read from, and are answered from. */
  readonly entry: Child;
  /** The child's request. */
  readonly request: VacationRequest;
}

/** The same request, asked of one child or several: the same title, days and deadline. */
export interface RequestGroup {
  /** A key that stays the same while the group does: its first child's id and request's id. */
  readonly key: string;
  /** The holiday's title. */
  readonly title: string;
  /** Its first day. */
  readonly start: Day;
  /** Its last day. */
  readonly end: Day;
  /** The last day to answer; null for none. */
  readonly deadline: Day | null;
  /** Whether it awaits an answer for any of its children. */
  readonly missing: boolean;
  /** Each child's request, in the order the children are shown. */
  readonly items: readonly RequestFor[];
}

/** A child's own vacation in a group, with the entry it was read from. */
export interface VacationFor {
  /** The child. */
  readonly child: Child;
  /** The entry the vacation was read from. */
  readonly entry: Child;
  /** The vacation. */
  readonly vacation: Vacation;
}

/** The same vacation, registered for one child or several: the same days and comment. */
export interface VacationGroup {
  /** A key that stays the same while the group does: its first child's id and vacation's id. */
  readonly key: string;
  /** Its first day. */
  readonly start: Day;
  /** Its last day. */
  readonly end: Day;
  /** What the family wrote with it. */
  readonly comment: string;
  /** Each child's vacation, in the order the children are shown. */
  readonly items: readonly VacationFor[];
}

/** What a child's requests or vacations were read from. */
export interface ChildReads<T> {
  /** The child. */
  readonly child: Child;
  /** The entry they were read from. */
  readonly entry: Child;
  /** What was read; undefined until it has come. */
  readonly data: readonly T[] | undefined;
}

/**
 * Returns the requests that can still be answered, one group for each request asked of one child
 * or several: those awaiting an answer first, then by their first day.
 */
export function requestGroups(
  reads: readonly ChildReads<VacationRequest>[],
  today: Day,
): RequestGroup[] {
  const groups = new Map<string, { group: RequestGroup; items: RequestFor[] }>();
  for (const { child, entry, data } of reads) {
    for (const request of openRequests(data ?? [], today)) {
      const same = [
        request.title,
        request.start,
        request.end,
        request.deadline ?? "",
        String(request.missing_answer),
      ].join("|");
      const known = groups.get(same);
      const item = { child, entry, request };
      if (known) {
        known.items.push(item);
        continue;
      }
      const items = [item];
      groups.set(same, {
        items,
        group: {
          key: `${String(child.child_id)}|${String(request.id)}`,
          title: request.title,
          start: request.start,
          end: request.end,
          deadline: request.deadline,
          missing: request.missing_answer,
          items,
        },
      });
    }
  }
  return [...groups.values()]
    .map(({ group }) => group)
    .sort(
      (a, b) =>
        Number(b.missing) - Number(a.missing) ||
        a.start.localeCompare(b.start) ||
        a.title.localeCompare(b.title),
    );
}

/** Returns the vacations not over yet, one group for each registered for one child or several, by their first day. */
export function vacationGroups(
  reads: readonly ChildReads<Vacation>[],
  today: Day,
): VacationGroup[] {
  const groups = new Map<string, VacationFor[]>();
  for (const { child, entry, data } of reads) {
    for (const vacation of data ?? []) {
      if (vacation.end < today) continue;
      const key = [vacation.start, vacation.end, vacation.comment].join("|");
      const items = groups.get(key) ?? [];
      items.push({ child, entry, vacation });
      groups.set(key, items);
    }
  }
  return [...groups.values()]
    .map((items) => {
      const [{ child, vacation }] = items as [VacationFor, ...VacationFor[]];
      return {
        key: `${String(child.child_id)}|${String(vacation.id)}`,
        start: vacation.start,
        end: vacation.end,
        comment: vacation.comment,
        items,
      };
    })
    .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
}

/** Returns the vacation of `vacations` that `day` is in, the one ending last where several are. */
export function vacationOn(vacations: readonly Vacation[], day: Day): Vacation | undefined {
  return vacations
    .filter((vacation) => vacation.start <= day && day <= vacation.end)
    .sort((a, b) => b.end.localeCompare(a.end))[0];
}

/**
 * Returns the days a child's answered requests say it does not come, each run of them as a
 * vacation the family has registered by its answer: it cannot be deleted, as an answer is not,
 * and its comment is the request's title. A run a vacation registered covers is left out.
 */
export function answeredAway(
  requests: readonly VacationRequest[],
  vacations: readonly Vacation[],
): Vacation[] {
  const away: Vacation[] = [];
  for (const request of requests) {
    if (request.missing_answer) continue;
    let run: Vacation | undefined;
    for (const day of request.days) {
      if (day.is_coming !== false) run = undefined;
      else if (run) run.end = day.date;
      else {
        run = {
          id: `${String(request.id)}|${day.date}`,
          start: day.date,
          end: day.date,
          comment: request.title,
          editable: false,
        };
        away.push(run);
      }
    }
  }
  return away.filter(
    (item) =>
      !vacations.some((vacation) => vacation.start <= item.start && item.end <= vacation.end),
  );
}
