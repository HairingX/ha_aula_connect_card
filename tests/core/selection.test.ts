import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_LOOK,
  onSelection,
  rememberSender,
  reloadSelection,
  resetSelection,
  selection,
  setLook,
  setPeople,
  shownIds,
  STORAGE_KEY,
  toggleChild,
} from "../../src/core/selection.ts";

function saved(): unknown {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
}

beforeEach(() => {
  window.localStorage.clear();
  reloadSelection();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the choice", () => {
  it("starts with every child shown and the default look", () => {
    expect(selection()).toEqual({
      hidden: [],
      look: DEFAULT_LOOK,
      people: new Map(),
      senders: new Map(),
    });
  });

  it("hides a child and shows it again, keeping it in the browser", () => {
    toggleChild(1001, [1001, 1002]);
    expect(selection().hidden).toEqual([1001]);
    expect(saved()).toEqual({ hidden: [1001], look: "rows", senders: [] });
    toggleChild(1001, [1001, 1002]);
    expect(selection().hidden).toEqual([]);
  });

  it("never hides the last child shown", () => {
    toggleChild(1001, [1001, 1002]);
    toggleChild(1002, [1001, 1002]);
    expect(selection().hidden).toEqual([1001]);
  });

  it("sets the look, and tells its listeners only of a change", () => {
    const listener = vi.fn();
    const stop = onSelection(listener);
    setLook("board");
    setLook("board");
    expect(selection().look).toBe("board");
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    setLook("columns");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("resets to every child and the default look, unless it is there already", () => {
    const listener = vi.fn();
    onSelection(listener);
    resetSelection();
    expect(listener).not.toHaveBeenCalled();
    toggleChild(1001, [1001, 1002]);
    setLook("columns");
    resetSelection();
    expect(selection()).toMatchObject({ hidden: [], look: "rows" });
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("keeps the people standing in for children for the page only", () => {
    const listener = vi.fn();
    onSelection(listener);
    setPeople(new Map([[1001, "person.ida"]]));
    setPeople(new Map([[1001, "person.ida"]]));
    expect(selection().people.get(1001)).toBe("person.ida");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(saved()).toBeNull();
    setPeople(new Map([[1001, "person.lille_ida"]]));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("remembers the entry each child was last acted on from", () => {
    rememberSender(1001, "entry-b");
    rememberSender(1001, "entry-b");
    expect(selection().senders.get(1001)).toBe("entry-b");
    expect(saved()).toEqual({ hidden: [], look: "rows", senders: [[1001, "entry-b"]] });
  });
});

describe("reading the choice kept", () => {
  it("reads what was kept, leaving out what it does not know", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        hidden: [1002, "x"],
        look: "board",
        senders: [[1001, "entry-b"], ["x", "entry-a"], "bad"],
      }),
    );
    reloadSelection();
    expect(selection()).toEqual({
      hidden: [1002],
      look: "board",
      people: new Map(),
      senders: new Map([[1001, "entry-b"]]),
    });
  });

  it("takes the defaults for what is missing or wrong", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ hidden: 3, look: "grid", senders: {} }),
    );
    reloadSelection();
    expect(selection()).toMatchObject({ hidden: [], look: "rows", senders: new Map() });
  });

  it.each(["null", "7", "{not json"])("starts afresh from %s", (raw) => {
    window.localStorage.setItem(STORAGE_KEY, raw);
    reloadSelection();
    expect(selection().look).toBe("rows");
  });

  it("keeps the choice in memory where the browser refuses its storage", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("denied");
    });
    reloadSelection();
    setLook("columns");
    expect(selection().look).toBe("columns");
  });

  it("keeps the choice in memory where the storage is full", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    setLook("columns");
    expect(selection().look).toBe("columns");
  });
});

describe("the children a card shows", () => {
  it("shows those configured, or every child, without those hidden", () => {
    expect(shownIds([1002], [1001, 1002], [1001])).toEqual([1002]);
    expect(shownIds([], [1001, 1002], [1001])).toEqual([1002]);
    expect(shownIds([1001], [1001, 1002], [1001])).toEqual([]);
  });
});
