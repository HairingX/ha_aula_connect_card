import { describe, expect, it } from "vitest";

import { selectChildren } from "../../src/core/children.ts";
import { CHILDREN } from "../fixtures/week.ts";
import { present } from "../fake-hass.ts";

const IDA = present(CHILDREN[0]);
const OSKAR = present(CHILDREN[1]);

describe("selectChildren", () => {
  it("shows every child, once, in the order listed when no ids are given", () => {
    const twice = { ...IDA, entry_id: "entry-b" };
    expect(selectChildren([IDA, OSKAR, twice], [])).toEqual({ shown: [IDA, OSKAR], missing: [] });
  });

  it("shows the configured children in the configured order, and names the missing", () => {
    expect(selectChildren([IDA, OSKAR], [1002, 9, 1001, 1002])).toEqual({
      shown: [OSKAR, IDA],
      missing: [9],
    });
  });
});
