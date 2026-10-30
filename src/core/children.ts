/**
 * Choosing the children a card shows from those Aula Connect lists.
 *
 * @packageDocumentation
 */

import type { Child } from "./types.ts";

/**
 * Returns the children to show and the configured ids no child has. A child is listed once, from
 * the first entry that has it, as two parents' entries list the same child. With no ids, every
 * child is shown in the order Aula Connect lists them; otherwise the ids' children, in their
 * order.
 */
export function selectChildren(
  children: readonly Child[],
  ids: readonly number[],
): { shown: Child[]; missing: number[] } {
  const byId = new Map<number, Child>();
  for (const child of children) if (!byId.has(child.child_id)) byId.set(child.child_id, child);
  if (ids.length === 0) return { shown: [...byId.values()], missing: [] };
  const shown: Child[] = [];
  const missing: number[] = [];
  for (const id of new Set(ids)) {
    const child = byId.get(id);
    if (child) shown.push(child);
    else missing.push(id);
  }
  return { shown, missing };
}
