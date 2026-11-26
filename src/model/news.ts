/**
 * The news feed: the posts of every login the children are read through, each once, the newest
 * first, as plain text.
 *
 * @packageDocumentation
 */

import { dayOf, instant } from "../core/dates.ts";
import { htmlToText } from "../core/text.ts";
import type { Day, Post } from "../core/types.ts";

/** A post as the news feed shows it. */
export interface NewsItem {
  /** The post as Aula Connect gives it. */
  readonly post: Post;
  /** Its text, without HTML. */
  readonly text: string;
  /** The day it was written, in the time zone shown. */
  readonly day: Day;
  /** When it was written. */
  readonly at: Date;
  /** Whether a guardian has not seen it in Aula yet. */
  readonly fresh: boolean;
}

/** The news feed. */
export interface NewsView {
  /** The posts, the newest first. */
  readonly items: readonly NewsItem[];
  /** How many of them are new. */
  readonly fresh: number;
  /** Whether a login's posts are still on their way, and none has come. */
  readonly loading: boolean;
  /** Why a login's posts could not be read. */
  readonly errors: readonly unknown[];
}

/** What came of one login's posts. */
export interface PostsLoad {
  /** The posts that came; undefined until some have. */
  readonly data: readonly Post[] | undefined;
  /** Why the last request failed. */
  readonly error: unknown;
  /** Whether a request is on its way. */
  readonly loading: boolean;
}

/**
 * Returns the news feed of the logins' posts: a post two logins share once, new where either
 * guardian has not seen it.
 */
export function newsView(loads: readonly PostsLoad[], zone: string): NewsView {
  const byId = new Map<number, NewsItem>();
  for (const load of loads) {
    for (const post of load.data ?? []) {
      const known = byId.get(post.id);
      const at = instant(post.time);
      if (!at) continue;
      byId.set(post.id, {
        post,
        text: htmlToText(post.html),
        day: dayOf(at, zone),
        at,
        fresh: post.new || (known?.fresh ?? false),
      });
    }
  }
  const items = [...byId.values()].sort((a, b) => b.at.getTime() - a.at.getTime());
  return {
    items,
    fresh: items.filter((item) => item.fresh).length,
    loading: items.length === 0 && loads.some((load) => load.loading),
    errors: loads.flatMap((load) => (load.error !== undefined ? [load.error] : [])),
  };
}
