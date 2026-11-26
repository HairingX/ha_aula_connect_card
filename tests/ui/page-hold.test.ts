import { afterEach, describe, expect, it } from "vitest";

import { holdPage, releasePage } from "../../src/ui/page-hold.ts";

afterEach(() => {
  document.documentElement.style.overflow = "";
});

describe("holding the page behind the windows", () => {
  it("holds it while any window is open, and gives it back as it was", () => {
    document.documentElement.style.overflow = "auto";
    holdPage();
    holdPage();
    expect(document.documentElement.style.overflow).toBe("hidden");
    releasePage();
    expect(document.documentElement.style.overflow).toBe("hidden");
    releasePage();
    expect(document.documentElement.style.overflow).toBe("auto");
  });

  it("lets go of nothing more than it holds", () => {
    releasePage();
    expect(document.documentElement.style.overflow).toBe("");
    holdPage();
    releasePage();
    releasePage();
    holdPage();
    expect(document.documentElement.style.overflow).toBe("hidden");
    releasePage();
    expect(document.documentElement.style.overflow).toBe("");
  });
});
