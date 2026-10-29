/**
 * One clock for the page: every card re-renders at the start of each minute, so that the lesson
 * going on now, the switch to the next school day and a new day or week show on time.
 *
 * @packageDocumentation
 */

/** A minute, in milliseconds. */
export const MINUTE_MS = 60_000;

/** How long after a minute starts the clock ticks, so that the new minute is the one read. */
export const TICK_DELAY_MS = 50;

const listeners = new Set<(now: Date) => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function schedule(): void {
  clearTimeout(timer);
  timer =
    listeners.size === 0
      ? undefined
      : setTimeout(tick, MINUTE_MS - (Date.now() % MINUTE_MS) + TICK_DELAY_MS);
}

function tick(): void {
  const now = new Date();
  for (const listener of [...listeners]) listener(now);
  schedule();
}

// A tablet that slept, or a tab in the background, catches up at once when it is shown again.
function visible(): void {
  if (document.visibilityState === "visible") tick();
}

/**
 * Calls `listener` at the start of every minute, and at once when the page is shown again, until
 * the returned function is called. One timer serves every listener; it runs only while there is
 * one.
 */
export function onMinute(listener: (now: Date) => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", visible);
    schedule();
  }
  return () => {
    if (!listeners.delete(listener) || listeners.size > 0) return;
    clearTimeout(timer);
    timer = undefined;
    document.removeEventListener("visibilitychange", visible);
  };
}
