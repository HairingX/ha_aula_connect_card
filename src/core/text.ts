/**
 * Turning the week plan's HTML into plain text, and names into initials.
 *
 * @packageDocumentation
 */

const BLOCKS = "p, div, li, tr, h1, h2, h3, h4, h5, h6, blockquote, pre, ul, ol, table";

/** How many converted texts are kept: every card renders every note again each minute. */
export const TEXT_CACHE_SIZE = 500;

const converted = new Map<string, string>();

/**
 * Returns the text of an HTML fragment, with a line break where its blocks and `<br>`s were and
 * list items marked with a bullet. Nothing in the fragment is run or loaded: a document made by
 * `DOMParser` has no browsing context.
 */
export function htmlToText(html: string): string {
  let text = converted.get(html);
  if (text === undefined) {
    if (converted.size >= TEXT_CACHE_SIZE) converted.clear();
    text = convert(html);
    converted.set(html, text);
  }
  return text;
}

function convert(html: string): string {
  if (!/[<&]/.test(html)) return tidy(html);
  const body = new DOMParser().parseFromString(html, "text/html").body;
  for (const br of body.querySelectorAll("br")) br.replaceWith("\n");
  for (const li of body.querySelectorAll("li")) li.prepend("• ");
  for (const block of body.querySelectorAll(BLOCKS)) {
    block.before("\n");
    block.after("\n");
  }
  return tidy(body.textContent);
}

function tidy(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t\r\f\v]+/g, " ").trim())
    .join("\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** Returns the initials of a full name, as schools refer to teachers by them. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}
