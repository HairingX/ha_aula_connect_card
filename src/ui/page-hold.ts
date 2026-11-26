/**
 * Holds the page behind the cards' windows still, while any of them is open.
 *
 * @packageDocumentation
 */

let holders = 0;
let before = "";

/**
 * Holds the page still for one more open window: the page stops scrolling, so that a finger
 * dragging a window moves the window's own content and never the page behind it.
 */
export function holdPage(): void {
  holders += 1;
  if (holders > 1) return;
  const { style } = document.documentElement;
  before = style.overflow;
  style.overflow = "hidden";
}

/** Lets the page go for one window that closed, and scroll again once none is open. */
export function releasePage(): void {
  if (holders === 0) return;
  holders -= 1;
  if (holders === 0) document.documentElement.style.overflow = before;
}
