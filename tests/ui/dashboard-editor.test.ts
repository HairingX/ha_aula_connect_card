import { afterEach, describe, expect, it, vi } from "vitest";

import "../../src/index.ts";
import { assertDashboardConfig, dashboardForm, sharedWith } from "../../src/config/dashboard.ts";
import { forget, knownThreads } from "../../src/core/memory.ts";
import { AulaConnectDashboardEditor, DASHBOARD_EDITOR } from "../../src/ui/dashboard-editor.ts";
import { fakeHass, present, settle } from "../fake-hass.ts";
import { THREADS } from "../fixtures/family.ts";
import { CHILDREN } from "../fixtures/week.ts";

interface Form extends HTMLElement {
  hass?: unknown;
  data?: Record<string, unknown>;
  schema?: { name: string; selector?: { select?: { options?: unknown[] } } }[];
  computeLabel?: (schema: { name: string }) => string | undefined;
}

function editor(): AulaConnectDashboardEditor {
  const element = document.createElement(DASHBOARD_EDITOR) as AulaConnectDashboardEditor;
  document.body.append(element);
  return element;
}

function form(element: HTMLElement): Form {
  return present(element.querySelector<Form>("ha-form"));
}

afterEach(() => {
  document.body.replaceChildren();
  forget();
  vi.restoreAllMocks();
});

describe("the dashboard's editor", () => {
  it("shows the configuration in Home Assistant's form, with the children Aula Connect lists", async () => {
    const element = editor();
    const hass = fakeHass({ children: CHILDREN, language: "da" });
    element.hass = hass;
    element.setConfig({ type: "custom:aula-connect", sick: false });
    expect(form(element).data).toEqual({ type: "custom:aula-connect", sick: false });
    expect(form(element).hass).toBe(hass);
    await settle();
    const shown = form(element);
    expect(shown.schema?.map((field) => field.name)).toEqual([
      "children",
      "sick",
      "vacation",
      "important",
      "clock",
      "packing_group",
      "subject_names_group",
      "switch_time",
      "people",
      "sick_write",
      "sick_message",
      "sick_threads",
      "sender",
    ]);
    expect(shown.schema?.[0]?.selector?.select?.options).toHaveLength(CHILDREN.length);
    expect(shown.computeLabel?.({ name: "sick" })).toBe("Sygemelding");
  });

  it("offers the threads each child can be written about in, asking once for a child", async () => {
    const element = editor();
    const threads = vi.fn((message: Record<string, unknown>) => {
      if (message.child_id === 1002) throw new Error("not reachable");
      return THREADS;
    });
    const hass = fakeHass({
      children: [...CHILDREN, { ...present(CHILDREN[0]), entry_id: "entry-b" }],
      commands: { "aula_connect/threads": threads },
    });
    element.hass = hass;
    element.setConfig({ type: "custom:aula-connect" });
    await settle();
    expect(threads).toHaveBeenCalledTimes(2);
    expect(knownThreads().get(1001)).toEqual(THREADS.threads);
    expect(knownThreads().has(1002)).toBe(false);
  });

  it("tells Home Assistant each change as the whole configuration", () => {
    const element = editor();
    element.setConfig({ type: "custom:aula-connect" });
    const changed = vi.fn();
    element.addEventListener("config-changed", changed);
    const value = {
      type: "custom:aula-connect",
      packing: [{ subject: "Idræt", items: ["Taske"] }],
    };
    form(element).dispatchEvent(new CustomEvent("value-changed", { detail: { value } }));
    expect(changed.mock.calls[0]?.[0]).toMatchObject({ detail: { config: value } });
    expect(form(element).data).toEqual({ type: "custom:aula-connect" });
    element.setConfig(value);
    expect(form(element).data).toEqual(value);
  });

  it("shows the form without the children where Aula Connect cannot list them", async () => {
    const element = editor();
    element.hass = fakeHass({ childrenError: new Error("down") });
    element.hass = fakeHass();
    await settle();
    expect(form(element).schema?.[0]?.selector?.select?.options).toEqual([]);
  });

  it("leaves a configuration it cannot show to YAML", () => {
    expect(() => {
      editor().setConfig({ type: "custom:aula-connect", sick: "no" });
    }).toThrow("sick: must be true or false");
    expect(() => {
      dashboardForm().assertConfig({ switch_time: 1200 });
    }).toThrow("switch_time");
  });
});

describe("the dashboard's configuration", () => {
  it("is checked as each card checks it", () => {
    expect(() => {
      assertDashboardConfig({ vacation: 1 });
    }).toThrow("vacation: must be true or false");
    expect(() => {
      assertDashboardConfig({ people: "Ida" });
    }).toThrow("people");
    expect(() => {
      assertDashboardConfig({ pack_icons: [] });
    }).toThrow("pack_icons");
    expect(() => {
      assertDashboardConfig({ sick_message: 3 });
    }).toThrow("sick_message");
    expect(() => {
      assertDashboardConfig({ sender: 3 });
    }).toThrow("sender");
    expect(() => {
      assertDashboardConfig({ packing: [{ subject: "Idræt" }] }, true);
    }).not.toThrow();
  });

  it("gives a card nothing it does not have", () => {
    expect(sharedWith("aula-connect-day-card", { packing: [] })).toEqual({});
    expect(sharedWith("aula-connect-sick-card", { sender: "Lise", packing: [] })).toEqual({
      sender: "Lise",
    });
  });
});
