/**
 * The children the cards acting for the family show: each child once, with every entry it is in,
 * as each entry is one guardian, and its day as it is now.
 *
 * @packageDocumentation
 */

import { selectChildren } from "../core/children.ts";
import { selection } from "../core/selection.ts";
import type { StoreSnapshot } from "../core/store.ts";
import { childKey, type Child, type TodayData } from "../core/types.ts";

/** A child, the entries it is in, and its day as it is now. */
export interface FamilyChild {
  /** The child, as the first entry has it. */
  readonly child: Child;
  /** The child as each entry has it: one per guardian. */
  readonly entries: readonly Child[];
  /** Its day as it is now, once it has come. */
  readonly today: TodayData | undefined;
  /** Why its day could not be had. */
  readonly error: unknown;
}

/** What a card acting for the family shows. */
export interface FamilyView {
  /** The children. */
  readonly children: readonly FamilyChild[];
  /** The configured child ids no child has. */
  readonly missing: readonly number[];
  /** The card's height in units of 50 pixels, roughly. */
  readonly size: number;
}

/** Returns the entries a child is in: the same child, once for each guardian's entry. */
export function entriesOf(list: readonly Child[], childId: number): Child[] {
  return list.filter((item) => item.child_id === childId);
}

/** Builds the view of a card acting for the family. */
export function familyView(snapshot: StoreSnapshot, ids: readonly number[]): FamilyView {
  const list = snapshot.children.list ?? [];
  const { shown, missing } = selectChildren(list, ids);
  const children = shown.map((child) => {
    const today = snapshot.today.get(childKey(child));
    return {
      child,
      entries: entriesOf(list, child.child_id),
      today: today?.data,
      error: today?.error,
    };
  });
  return { children, missing, size: 1 + children.length };
}

/**
 * Returns the entry to act from for a child: the one of the guardian `sender` names, else the one
 * last acted from, else the first, else the child as it is shown.
 */
export function senderOf(
  family: Pick<FamilyChild, "child" | "entries">,
  sender: string | undefined,
): Child {
  const { child, entries } = family;
  const last = selection().senders.get(child.child_id);
  return (
    entries.find((entry) => sender !== undefined && entry.guardian === sender) ??
    entries.find((entry) => entry.entry_id === last) ??
    entries[0] ??
    child
  );
}
