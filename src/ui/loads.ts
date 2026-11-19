/**
 * What a card asks Aula Connect for itself, outside the store: each answer kept by its key, and
 * asked again when what it depends on changes.
 *
 * @packageDocumentation
 */

/** An answer as it stands: what came, or why it did not, and whether it is on its way. */
export interface Load<T> {
  /** What came last; undefined until something has. */
  readonly data: T | undefined;
  /** Why the last request failed; undefined when it did not. */
  readonly error: unknown;
  /** Whether a request is on its way. */
  readonly loading: boolean;
}

interface Entry<T> {
  version: string;
  data: T | undefined;
  error: unknown;
  loading: boolean;
}

/** The answers a card asked for, by key. */
export class Loads<T> {
  readonly #entries = new Map<string, Entry<T>>();
  readonly #changed: () => void;
  #generation = 0;

  /** Keeps answers; `changed` is called whenever one comes. */
  constructor(changed: () => void) {
    this.#changed = changed;
  }

  /**
   * Returns the answer for `key`, asking for it with `fetch` the first time and whenever
   * `version` differs from the one it was asked for at. The data that came stays while it is
   * asked again.
   */
  get(key: string, version: string, fetch: () => Promise<T>): Load<T> {
    const wanted = `${String(this.#generation)}|${version}`;
    const known = this.#entries.get(key);
    if (known?.version === wanted) return known;
    const entry: Entry<T> = { version: wanted, data: known?.data, error: undefined, loading: true };
    this.#entries.set(key, entry);
    fetch().then(
      (data) => {
        if (this.#entries.get(key) !== entry) return;
        entry.data = data;
        entry.loading = false;
        this.#changed();
      },
      (error: unknown) => {
        if (this.#entries.get(key) !== entry) return;
        entry.error = error;
        entry.loading = false;
        this.#changed();
      },
    );
    return entry;
  }

  /** Asks for every answer again the next time it is wanted. */
  refresh(): void {
    this.#generation += 1;
    this.#changed();
  }
}
