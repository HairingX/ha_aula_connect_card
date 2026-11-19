/**
 * What the children's bar chooses for every Aula card on the page: the children it hides, the
 * overview's look, the people that stand in for children, and the entry each child was last
 * reported sick or written about from. The children hidden and the look are kept per device in
 * the browser's storage, where it can; they are ids and a word, never a child's data.
 *
 * @packageDocumentation
 */

/** The overview's looks: a row per child, a column per child, or a board of large tiles. */
export const LOOKS = ["rows", "columns", "board"] as const;

/** One of the overview's looks. */
export type Look = (typeof LOOKS)[number];

/** The look the overview has until one is chosen. */
export const DEFAULT_LOOK: Look = "rows";

/** What is chosen. */
export interface Selection {
  /** The child ids hidden from every card. */
  readonly hidden: readonly number[];
  /** The overview's look. */
  readonly look: Look;
  /** A `person` entity for a child, by its id, whose name and picture stand in for the child's. */
  readonly people: ReadonlyMap<number, string>;
  /** The entry a child was last acted on from, by its id: the guardian it was sent as. */
  readonly senders: ReadonlyMap<number, string>;
}

/** Where the choice is kept in the browser's storage. */
export const STORAGE_KEY = "aula-connect-card";

const listeners = new Set<() => void>();

let current: Selection = {
  hidden: [],
  look: DEFAULT_LOOK,
  people: new Map(),
  senders: new Map(),
};

// A private window, or storage the browser refuses, keeps the choice in memory only.
function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function load(): void {
  try {
    const raw: unknown = JSON.parse(storage()?.getItem(STORAGE_KEY) ?? "null");
    if (typeof raw !== "object" || raw === null) return;
    const saved = raw as { hidden?: unknown; look?: unknown; senders?: unknown };
    const hidden = Array.isArray(saved.hidden)
      ? saved.hidden.filter((id): id is number => typeof id === "number")
      : [];
    const look = LOOKS.find((item) => item === saved.look) ?? DEFAULT_LOOK;
    const senders = new Map<number, string>(
      Array.isArray(saved.senders)
        ? (saved.senders as unknown[]).flatMap((pair) =>
            Array.isArray(pair) && typeof pair[0] === "number" && typeof pair[1] === "string"
              ? [[pair[0], pair[1]] as const]
              : [],
          )
        : [],
    );
    current = { ...current, hidden, look, senders };
  } catch {
    // What cannot be read is as if nothing was chosen.
  }
}

function save(): void {
  try {
    storage()?.setItem(
      STORAGE_KEY,
      JSON.stringify({
        hidden: current.hidden,
        look: current.look,
        senders: [...current.senders],
      }),
    );
  } catch {
    // A full or refused storage keeps the choice for the page only.
  }
}

load();

function change(next: Selection, persist = true): void {
  current = next;
  if (persist) save();
  for (const listener of [...listeners]) listener();
}

/** Returns what is chosen now. */
export function selection(): Selection {
  return current;
}

/** Calls `listener` whenever the choice changes, until the returned function is called. */
export function onSelection(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Hides a child, or shows it again, on every card. The last child shown of `all` stays: a card
 * with no child would show nothing.
 */
export function toggleChild(id: number, all: readonly number[]): void {
  const hidden = current.hidden.includes(id)
    ? current.hidden.filter((item) => item !== id)
    : [...current.hidden, id];
  if (all.every((child) => hidden.includes(child))) return;
  change({ ...current, hidden });
}

/** Sets the overview's look. */
export function setLook(look: Look): void {
  if (look !== current.look) change({ ...current, look });
}

/** Shows every child again with the default look, as a shared screen does after a while. */
export function resetSelection(): void {
  if (current.hidden.length === 0 && current.look === DEFAULT_LOOK) return;
  change({ ...current, hidden: [], look: DEFAULT_LOOK });
}

/** Sets the people that stand in for children; they come from a card's configuration. */
export function setPeople(people: ReadonlyMap<number, string>): void {
  const same =
    people.size === current.people.size &&
    [...people].every(([id, person]) => current.people.get(id) === person);
  if (!same) change({ ...current, people: new Map(people) }, false);
}

/** Remembers the entry a child was last acted on from. */
export function rememberSender(childId: number, entryId: string): void {
  if (current.senders.get(childId) === entryId) return;
  change({ ...current, senders: new Map([...current.senders, [childId, entryId]]) });
}

/**
 * Returns the ids a card shows: those configured, or every child's, without those hidden. Empty
 * when every child the card shows is hidden.
 */
export function shownIds(
  configured: readonly number[],
  all: readonly number[],
  hidden: readonly number[],
): number[] {
  return (configured.length > 0 ? configured : all).filter((id) => !hidden.includes(id));
}

/** Forgets the choice and reads it from the storage again; for tests. */
export function reloadSelection(): void {
  current = { hidden: [], look: DEFAULT_LOOK, people: new Map(), senders: new Map() };
  listeners.clear();
  load();
}
