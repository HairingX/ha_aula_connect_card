import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../../src/index.ts";
import { AulaConnectNewsCard } from "../../src/cards/news-card.ts";
import { fetchPosts, markPostSeen } from "../../src/core/api.ts";
import { forget } from "../../src/core/memory.ts";
import { reloadSelection } from "../../src/core/selection.ts";
import type { Post } from "../../src/core/types.ts";
import { newsView } from "../../src/model/news.ts";
import { present, wsError } from "../fake-hass.ts";
import { POSTS } from "../fixtures/family.ts";
import { all, mount, unmountAll } from "../fixtures/mount.ts";
import { CHILDREN } from "../fixtures/week.ts";
import { find, settled, tap, texts, windowText } from "./family-helpers.ts";

const NEWS = "aula-connect-news-card";
const OVERVIEW = "aula-connect-overview-card";
const IDA = present(CHILDREN[0]);
const OSKAR = present(CHILDREN[1]);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  window.localStorage.clear();
  reloadSelection();
});

afterEach(() => {
  unmountAll();
  forget();
  window.localStorage.clear();
  vi.useRealTimers();
});

describe("the news feed", () => {
  it("lists the posts the newest first, the new and the important marked", async () => {
    const today = {
      ...POSTS.posts[2],
      id: 9004,
      title: "Frugt i dag",
      time: "2026-10-29T08:00:00+01:00",
      html: "Æbler\nog pærer",
    };
    const { card } = await mount(NEWS, "thu-1000", {
      commands: { "aula_connect/posts": () => ({ ...POSTS, posts: [...POSTS.posts, today] }) },
    });
    expect(card).toBeInstanceOf(AulaConnectNewsCard);
    expect(texts(card, ".news-when")).toEqual(["I dag", "I går", "Tirsdag", "20. okt."]);
    expect(texts(card, ".news-title")).toEqual([
      "Frugt i dag",
      "Juleklip for hele skolen fredag Ny Vigtigt",
      "Kor for 3.-5. klasse Ny",
      "Skolefoto torsdag",
    ]);
    expect(texts(card, ".news-excerpt")[0]).toBe("Æbler og pærer");
    expect(texts(card, ".news-excerpt")[1]).toBe(
      "Kære forældre Fredag klipper hele skolen julepynt i 3. og 4. lektion. Husk en saks og gerne lidt glanspapir. Hilsen kontoret",
    );
    expect(all(card, ".news-item.is-new")).toHaveLength(2);
    expect(texts(card, ".news-list > li")).toContain("Uge 43");
    expect(
      find(card, ".week-break", undefined, HTMLElement).nextElementSibling?.textContent,
    ).toContain("Skolefoto torsdag");
    expect(all(card, ".news-clip")).toHaveLength(1);
    expect(texts(card, ".news-by > span:last-child")).toEqual([
      "Oskar · Karen Lund",
      "Ida og Oskar · Kontoret",
      "Ida · Mette Juhl",
      "Oskar · Karen Lund",
    ]);
    expect(all(card, ".news-item")[2]?.querySelectorAll(".news-faces .face")).toHaveLength(1);
  });

  it("opens a post whole, with when it is important until, its files and its groups", async () => {
    const { card } = await mount(NEWS, "thu-1000", {
      commands: { "aula_connect/posts": () => POSTS },
    });
    await tap(card, '[data-detail="post|9001"]');
    expect(windowText(card)).toContain("Juleklip for hele skolen fredag");
    expect(windowText(card)).toContain("I går 09.15");
    expect(windowText(card)).toContain("Bakkedal Skole");
    expect(windowText(card)).toContain("Vigtigt til og med 30. okt.");
    expect(windowText(card)).toContain("Husk en saks");
    expect(windowText(card)).toContain("Hele skolen");
    expect(windowText(card)).not.toContain("Vedhæftet");
    await tap(card, ".detail-close");
    await tap(card, '[data-detail="post|9002"]');
    expect(windowText(card)).toContain("Vedhæftet tilmelding.pdf");
    expect(find(card, "dialog .news-files a", undefined, HTMLAnchorElement).href).toBe(
      "https://files.example.org/tilmelding.pdf",
    );
    expect(windowText(card)).not.toContain("Vigtigt til og med");
  });

  it("shows a file without a link, and a post without an author or groups", async () => {
    const bare: Post = {
      ...present(POSTS.posts[0]),
      id: 1,
      author: null,
      institution: null,
      groups: [],
      important: true,
      important_to: null,
      attachments: [{ name: "billede.jpg", url: null, thumbnail: null, media: true }],
    };
    const { card } = await mount(NEWS, "thu-1000", {
      children: [IDA],
      commands: { "aula_connect/posts": () => ({ posts: [bare] }) },
    });
    expect(all(card, ".news-by")).toEqual([]);
    await tap(card, '[data-detail="post|1"]');
    expect(windowText(card)).toContain("Vedhæftet billede.jpg");
    expect(all(card, "dialog .news-files a")).toEqual([]);
    expect(windowText(card)).not.toContain("Delt med");
    expect(all(card, "dialog .news-period")).toEqual([]);
  });

  it("shows a post two logins share once, new where either guardian has not seen it", async () => {
    const other = { ...IDA, entry_id: "entry-b" };
    const { card, hass } = await mount(NEWS, "thu-1000", {
      children: [IDA, OSKAR, other],
      commands: {
        "aula_connect/posts": (message) =>
          message.entry_id === "entry-b"
            ? { posts: [{ ...POSTS.posts[2], new: true, children: [IDA.child_id] }] }
            : POSTS,
      },
    });
    expect(texts(card, ".news-title")).toHaveLength(3);
    expect(all(card, ".news-item.is-new")).toHaveLength(3);
    expect(texts(card, ".news-by > span:last-child")[2]).toBe("Ida og Oskar · Karen Lund");
    expect(
      hass.callWS.mock.calls.filter(([message]) => message.type === "aula_connect/posts"),
    ).toHaveLength(2);
  });

  it("says when there are no posts, while they come, and why they could not be read", async () => {
    const { card: none } = await mount(NEWS, "thu-1000", {
      commands: { "aula_connect/posts": () => ({ posts: [] }) },
    });
    expect(texts(none, ".empty")).toEqual(["Ingen opslag"]);
    unmountAll();
    const { card: waiting } = await mount(NEWS, "thu-1000", {
      commands: { "aula_connect/posts": () => new Promise(() => undefined) },
    });
    expect(all(waiting, ".status")).toHaveLength(1);
    unmountAll();
    const { card: broken } = await mount(NEWS, "thu-1000", {
      commands: {
        "aula_connect/posts": () => {
          throw wsError("home_assistant_error", "Aula could not be reached");
        },
      },
    });
    await settled(broken);
    expect(all(broken, ".alert")).toHaveLength(1);
    expect(all(broken, ".empty")).toEqual([]);
  });

  it("counts the new posts on the overview's tile", async () => {
    const { card } = await mount(OVERVIEW, "thu-1000", {
      commands: { "aula_connect/posts": () => POSTS },
    });
    expect(texts(card, ".ov-tile").at(-1)).toBe("2 Nyheder");
  });

  it("shows only the posts for the children shown, and then says no names", async () => {
    const { card } = await mount(NEWS, "thu-1000", {
      config: { children: [OSKAR.child_id] },
      commands: { "aula_connect/posts": () => POSTS },
    });
    expect(texts(card, ".news-title")).toEqual([
      "Juleklip for hele skolen fredag Ny Vigtigt",
      "Skolefoto torsdag",
    ]);
    expect(texts(card, ".news-by > span:last-child")).toEqual(["Kontoret", "Karen Lund"]);
    expect(all(card, ".news-faces")).toEqual([]);
    unmountAll();
    const { card: overview } = await mount(OVERVIEW, "thu-1000", {
      config: { children: [OSKAR.child_id] },
      commands: { "aula_connect/posts": () => POSTS },
    });
    expect(texts(overview, ".ov-tile").at(-1)).toBe("1 Nyheder");
  });
});

describe("marking a post read", () => {
  it("tells Aula once, on a tap, through each login the post is new to, and reads the posts again", async () => {
    const posts = vi.fn(() => POSTS);
    const seen = vi.fn(() => ({ marked: 1 }));
    const { card, hass } = await mount(NEWS, "thu-1000", {
      commands: { "aula_connect/posts": posts, "aula_connect/post/seen": seen },
    });
    await tap(card, '[data-detail="post|9001"]');
    expect(windowText(card)).not.toContain("Aula får besked");
    expect(seen).not.toHaveBeenCalled();
    await tap(card, "dialog .window-actions .filled-button");
    await settled(card);
    expect(seen).toHaveBeenCalledTimes(1);
    expect(
      hass.callWS.mock.calls.filter(([message]) => message.type === "aula_connect/post/seen"),
    ).toEqual([[{ type: "aula_connect/post/seen", entry_id: IDA.entry_id, post_id: 9001 }]]);
    expect(windowText(card)).toContain("Markeret som læst");
    expect(all(card, "dialog .window-actions .filled-button")).toEqual([]);
    expect(posts.mock.calls.length).toBeGreaterThan(1);
  });

  it("offers nothing for a post that is not new, and says where the options turn it off", async () => {
    const { card } = await mount(NEWS, "thu-1000", {
      commands: { "aula_connect/posts": () => POSTS },
    });
    await tap(card, '[data-detail="post|9003"]');
    expect(windowText(card)).not.toContain("Markér som læst");
    expect(all(card, "dialog .window-note")).toEqual([]);
    unmountAll();
    const { card: off } = await mount(NEWS, "thu-1000", {
      children: [
        { ...IDA, allowed: [] },
        { ...OSKAR, allowed: [] },
      ],
      commands: { "aula_connect/posts": () => POSTS },
    });
    await tap(off, '[data-detail="post|9001"]');
    expect(windowText(off)).toContain("Markering af nyheder som set er slået fra");
    expect(all(off, "dialog .filled-button")).toEqual([]);
  });

  it("says Aula may or may not have it where marking failed, and lets it be tried again", async () => {
    const seen = vi.fn(() => {
      throw wsError("home_assistant_error", "Aula could not be reached");
    });
    const { card } = await mount(NEWS, "thu-1000", {
      commands: { "aula_connect/posts": () => POSTS, "aula_connect/post/seen": seen },
    });
    await tap(card, '[data-detail="post|9001"]');
    await tap(card, "dialog .window-actions .filled-button");
    await settled(card);
    expect(all(card, "dialog .alert")).toHaveLength(1);
    expect(all(card, "dialog .window-actions .filled-button")).toHaveLength(1);
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("reads how many were marked as a count", async () => {
    await expect(markPostSeen(() => Promise.resolve({ marked: 2 }), "entry-a", 1)).resolves.toBe(2);
    await expect(markPostSeen(() => Promise.resolve(null), "entry-a", 1)).resolves.toBe(0);
  });
});

describe("reading the posts", () => {
  it("takes a post only with an id and a time, and its fields only with their types", async () => {
    const posts = await fetchPosts(
      () =>
        Promise.resolve({
          posts: [
            {
              id: 1,
              time: "2026-10-29T08:00:00+01:00",
              groups: ["3.B", 7],
              children: [1001, "1002", 1.5],
              attachments: [
                { name: "a.pdf" },
                { url: "x" },
                { name: "b.jpg", url: "u", thumbnail: "t", media: true },
              ],
            },
            { id: "2", time: "2026-10-29T08:00:00+01:00" },
            { id: 3 },
          ],
        }),
      "entry-a",
    );
    expect(posts).toEqual([
      {
        id: 1,
        title: "",
        html: "",
        time: "2026-10-29T08:00:00+01:00",
        new: false,
        important: false,
        important_from: null,
        important_to: null,
        author: null,
        institution: null,
        groups: ["3.B"],
        comments: 0,
        attachments: [
          { name: "a.pdf", url: null, thumbnail: null, media: false },
          { name: "b.jpg", url: "u", thumbnail: "t", media: true },
        ],
        children: [1001],
      },
    ]);
  });

  it("leaves out a post whose time is no time", () => {
    const post = { ...POSTS.posts[0], time: "soon" } as Post;
    expect(
      newsView(
        [{ entry: IDA, data: [post], error: undefined, loading: false }],
        "Europe/Copenhagen",
        [IDA],
      ).items,
    ).toEqual([]);
  });

  it("takes a post that names no child as for every child", () => {
    const post: Post = { ...present(POSTS.posts[2]), children: [] };
    const [item] = newsView(
      [{ entry: IDA, data: [post], error: undefined, loading: false }],
      "Europe/Copenhagen",
      [IDA, OSKAR],
    ).items;
    expect(item?.children).toEqual([IDA, OSKAR]);
  });
});
