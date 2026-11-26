import { render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../../src/index.ts";
import { forget } from "../../src/core/memory.ts";
import type { CalendarEvent, EventDetails } from "../../src/core/types.ts";
import { eventDetail, type EventLoad, type LessonDetail } from "../../src/model/details.ts";
import { IDLE_RESET_MS } from "../../src/model/focus.ts";
import { detailDialog } from "../../src/ui/details.ts";
import { present, settle, wsError } from "../fake-hass.ts";
import { all, mount, text, unmountAll, type Card } from "../fixtures/mount.ts";
import { scenarioNamed } from "../fixtures/scenarios.ts";
import { contextOf } from "../fixtures/snapshot.ts";
import { EVENT_DETAILS, local, MEETING, ZONE } from "../fixtures/week.ts";

const DAY = "aula-connect-day-card";
const WEEK = "aula-connect-week-card";

/** The start of Thursday's last lesson, which has a substitute. */
const SUBSTITUTE = "|2026-10-29T12:10:00+01:00";

function root(card: Card): ShadowRoot {
  return present(card.shadowRoot);
}

async function unfold(card: Card, scope = ""): Promise<void> {
  present(
    root(card).querySelector<HTMLButtonElement>(`${scope} [data-block="timetable"] .more`),
  ).click();
  await card.updateComplete;
}

function opener(card: Card, end: string): HTMLButtonElement {
  return present(
    [...root(card).querySelectorAll<HTMLButtonElement>(".opens")].find((button) =>
      button.dataset.detail?.endsWith(end),
    ),
  );
}

async function tap(card: Card, end: string): Promise<HTMLButtonElement> {
  const button = opener(card, end);
  button.focus();
  button.click();
  await card.updateComplete;
  return button;
}

function texts(card: Card, selector: string): string[] {
  return all(card, selector).map((element) =>
    element.textContent.replace(/⁠/g, "").replace(/\s+/g, " ").trim(),
  );
}

function dialog(card: Card): HTMLDialogElement | null {
  return root(card).querySelector("dialog");
}

function shown(card: Card): string {
  return text(card, "dialog");
}

/** Holds back `aula_connect/event`'s answer until the test gives it. */
function held(hass: { callWS: { mockImplementation: (fn: () => Promise<unknown>) => unknown } }) {
  const answer: { resolve: (value: unknown) => void; reject: (error: unknown) => void } = {
    resolve: () => undefined,
    reject: () => undefined,
  };
  hass.callWS.mockImplementation(
    () =>
      new Promise((resolve, reject) => {
        answer.resolve = resolve;
        answer.reject = reject;
      }),
  );
  return answer;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
});

afterEach(async () => {
  unmountAll();
  forget();
  vi.useRealTimers();
  vi.restoreAllMocks();
  // What a WeakRef reached in happy-dom stays alive until the job ends, as do the cards removed
  // with it while the tests only await promises; a task ends the job.
  await new Promise((resolve) => setImmediate(resolve));
});

describe("the whole timetable", () => {
  it("makes each lesson and event a button that opens a window", async () => {
    const { card } = await mount(DAY, "thu-1930-meeting", { config: { children: [1001] } });
    expect(all(card, ".opens")).toEqual([]);
    await unfold(card);
    const buttons = all(card, ".opens");
    expect(buttons.map((button) => button.getAttribute("aria-haspopup"))).toEqual(
      buttons.map(() => "dialog"),
    );
    expect(texts(card, ".lesson:not(.event-row) .opens")).toEqual([
      "Matematik",
      "Dansk",
      "Dansk",
      "Engelsk",
      "Historie",
    ]);
    expect(texts(card, ".event-row .opens")).toEqual([
      "Skolefoto",
      "Skole-hjem-samtaler 3.BB12",
      "Halloween-fest i SFOSFO'en",
    ]);
  });
});

describe("an event's window", () => {
  it("shows the week's data at once, asks Aula for the rest, and keeps the timetable open", async () => {
    const { card, hass } = await mount(DAY, "thu-1930-meeting", { config: { children: [1001] } });
    await unfold(card);
    const answer = held(hass);
    await tap(card, "|4711");
    expect(hass.callWS).toHaveBeenLastCalledWith({
      type: "aula_connect/event",
      entry_id: "entry-a",
      child_id: 1001,
      event_id: 4711,
    });
    const window = present(dialog(card));
    expect(window.open).toBe(true);
    expect(window.getAttribute("aria-labelledby")).toBe("detail-title");
    expect(text(card, "#detail-title")).toBe("Skole-hjem-samtaler 3.B");
    expect(text(card, ".detail-ticket")).toBe("fre 30 14.00–17.00 Fredag 30. oktober, B12");
    expect(shown(card)).toContain("Henter fra Aula…");
    expect(all(card, '[data-block="timetable"] .lessons')).toHaveLength(1);
    answer.resolve(EVENT_DETAILS[4711]);
    await settle();
    await card.updateComplete;
    expect(text(card, ".detail-ticket")).toBe(
      "fre 30 Jeres tid 14.15–14.30 Fredag 30. oktober, B12",
    );
    expect(text(card, ".detail-whole")).toBe("Hele begivenheden 14.00–17.00");
    expect(texts(card, ".detail-heading")).toEqual(["Om samtalen", "Deltagere", "Svar"]);
    expect(texts(card, ".detail-row")).toEqual([
      "Oprettet af Karen Lund, lærer",
      "Medarrangører Mette Juhl",
      "Inviterede 3.B21 af 24 har svaret",
      "Dit svar Deltager 19. okt. 20.14",
      "Svarfrist Fredag 23. okt. 23.00",
      "Vedhæftede filer 2 filer – se dem i Aula",
    ]);
    expect(present(root(card).querySelector(".detail-answer ha-icon")).getAttribute("icon")).toBe(
      "mdi:check",
    );
    expect(text(card, ".detail-meta")).toBe("Skole-hjem-samtale, Bakkedal Skole");
    expect(
      present(root(card).querySelector(".detail-text"))
        .textContent.replace(/\u2060/g, "")
        .replace(/\u00a0/g, " "),
    ).toBe(
      "Kære forældre i 3.B\nVi glæder os til at tale med jer om, hvordan det går – fagligt og socialt.\n• Samtalen varer et kvarter.\n• Jeres barn er velkommen til at komme med.",
    );
    expect(root(card).querySelector('dialog [aria-busy="true"]')).toBeNull();
    expect(all(card, "dialog button").map((button) => button.className)).toEqual(["detail-close"]);
  });

  it("is in English where Home Assistant is", async () => {
    const { card } = await mount(DAY, "thu-1930-meeting", {
      config: { children: [1001] },
      language: "en",
    });
    await unfold(card);
    await tap(card, "|4711");
    await settle();
    await card.updateComplete;
    expect(text(card, ".detail-what")).toBe("Your time");
    expect(texts(card, ".detail-heading")).toEqual(["About the meeting", "People", "Reply"]);
    expect(text(card, ".detail-meta")).toBe("Parent–teacher meeting, Bakkedal Skole");
    expect(present(root(card).querySelector(".detail-close")).getAttribute("aria-label")).toBe(
      "Close",
    );
  });

  it.each([
    ["not_found", "Begivenheden findes ikke længere i Aula."],
    ["home_assistant_error", "Resten kunne ikke hentes fra Aula lige nu. Prøv igen senere."],
    ["unknown_command", "Opdatér Aula Connect for at se mere om begivenheder."],
  ])("says kindly when Aula answers %s, still showing what the week gave", async (code, says) => {
    const { card, hass } = await mount(DAY, "thu-1930-meeting", { config: { children: [1001] } });
    await unfold(card);
    const answer = held(hass);
    await tap(card, "|4711");
    answer.reject(wsError(code, "No"));
    await settle();
    await card.updateComplete;
    expect(text(card, "dialog .alert")).toBe(says);
    expect(text(card, "#detail-title")).toBe("Skole-hjem-samtaler 3.B");
    expect(shown(card)).not.toContain("Henter fra Aula…");
  });

  it("asks nothing for an event whose id Aula would not know", async () => {
    const { card, hass } = await mount(DAY, "thu-1930", { config: { children: [1001] } });
    await unfold(card);
    hass.callWS.mockClear();
    await tap(card, "|e1");
    expect(hass.callWS).not.toHaveBeenCalled();
    expect(text(card, ".detail-ticket")).toBe("fre 30 Hele dagen Fredag 30. oktober");
    expect(all(card, ".detail-col")).toHaveLength(1);
    expect(shown(card)).not.toContain("Henter fra Aula…");
  });

  it("asks for the event of the child whose timetable it is in", async () => {
    const { card, hass } = await mount(DAY, "thu-1930-meeting", {
      config: { group_by: "block" },
    });
    await unfold(card);
    await tap(card, "|4711");
    expect(hass.callWS).toHaveBeenLastCalledWith(expect.objectContaining({ child_id: 1001 }));
  });

  it("forgets an answer that comes after the window closed", async () => {
    const { card, hass } = await mount(DAY, "thu-1930-meeting", { config: { children: [1001] } });
    await unfold(card);
    const answer = held(hass);
    await tap(card, "|4711");
    present(root(card).querySelector<HTMLButtonElement>(".detail-close")).click();
    await card.updateComplete;
    answer.resolve(EVENT_DETAILS[4711]);
    await settle();
    await card.updateComplete;
    expect(dialog(card)).toBeNull();
  });
});

describe("a lesson's window", () => {
  it("names the teachers in full and the room, with the substitute marked, asking Aula nothing", async () => {
    const { card, hass } = await mount(DAY, "thu-0715", { config: { children: [1001] } });
    await unfold(card);
    hass.callWS.mockClear();
    await tap(card, SUBSTITUTE);
    expect(hass.callWS).not.toHaveBeenCalled();
    expect(text(card, "#detail-title")).toBe("Engelsk");
    expect(all(card, "#detail-title .detail-dot")).toHaveLength(1);
    expect(text(card, ".detail-meta")).toBe("Lektion, ENG");
    expect(text(card, ".detail-ticket")).toBe("tors 29 12.10–12.55 Torsdag 29. oktober");
    expect(texts(card, ".detail-heading")).toEqual(["Om lektionen"]);
    expect(texts(card, ".detail-row")).toEqual([
      "Lokale B14",
      "Lærere Tina Rask og Bo Vang",
      "Ændring Vikar",
    ]);
    expect(all(card, ".detail-row .label.warning")).toHaveLength(1);
    expect(present(dialog(card)).getAttribute("style")).toMatch(/^--subject: /);
  });

  it("opens from the week card's open day too", async () => {
    const { card } = await mount(WEEK, "thu-1010", { config: { children: [1001] } });
    await unfold(card, ".focus-day");
    await tap(card, SUBSTITUTE);
    expect(text(card, "#detail-title")).toBe("Engelsk");
  });
});

describe("closing the window", () => {
  async function opened(): Promise<{ card: Card; button: HTMLButtonElement }> {
    const { card } = await mount(DAY, "thu-0715", { config: { children: [1001] } });
    await unfold(card);
    const button = await tap(card, SUBSTITUTE);
    root(card).querySelector<HTMLButtonElement>(".detail-close")?.focus();
    return { card, button };
  }

  async function closed(card: Card, button: HTMLButtonElement): Promise<void> {
    await card.updateComplete;
    await settle();
    expect(dialog(card)).toBeNull();
    expect(root(card).activeElement).toBe(button);
    expect(all(card, '[data-block="timetable"] .lessons')).toHaveLength(1);
  }

  it("closes with its button, and the focus goes back to what opened it", async () => {
    const { card, button } = await opened();
    present(root(card).querySelector<HTMLButtonElement>(".detail-close")).click();
    await closed(card, button);
  });

  it("closes once when asked twice before it is gone", async () => {
    const { card, button } = await opened();
    present(root(card).querySelector<HTMLButtonElement>(".detail-close")).click();
    present(dialog(card)).close();
    await closed(card, button);
  });

  it("closes on Escape, as the browser closes a modal dialog", async () => {
    const { card, button } = await opened();
    present(dialog(card)).close();
    await closed(card, button);
  });

  it("closes at a tap outside it, on its backdrop, and not at a tap within", async () => {
    const { card, button } = await opened();
    present(root(card).querySelector<HTMLElement>(".detail-body")).click();
    await card.updateComplete;
    expect(dialog(card)?.open).toBe(true);
    present(dialog(card)).click();
    await closed(card, button);
  });

  it("closes by itself after ten minutes without a touch", async () => {
    const { card } = await opened();
    await vi.advanceTimersByTimeAsync(IDLE_RESET_MS + 60_000);
    await card.updateComplete;
    expect(dialog(card)).toBeNull();
  });
});

describe("the window's content", () => {
  const ctx = contextOf(scenarioNamed("thu-1930"));
  const en = contextOf(scenarioNamed("thu-1930"), "en");

  function view(details: Partial<EventDetails>, event: CalendarEvent = MEETING) {
    const load: EventLoad = {
      details: {
        title: event.title,
        type: event.type,
        all_day: event.all_day,
        start: event.start,
        end: event.end,
        description: "",
        location: event.location,
        institution_name: "",
        creator: null,
        co_organizers: [],
        invited_groups: [],
        invited: 0,
        answered: 0,
        response_required: false,
        response_deadline: null,
        deadline_passed: false,
        answer: null,
        answered_at: null,
        booked: null,
        attachments: 0,
        private: false,
        deleted: false,
        ...details,
      },
      loading: false,
      error: undefined,
    };
    return eventDetail(event, load, ZONE);
  }

  function shownOf(content: ReturnType<typeof detailDialog>): HTMLElement {
    const container = document.createElement("div");
    render(content, container);
    return container;
  }

  function said(container: HTMLElement, selector: string): string[] {
    return [...container.querySelectorAll(selector)].map((element) =>
      element.textContent.replace(/⁠/g, "").replace(/\s+/g, " ").trim(),
    );
  }

  const close = (): void => undefined;

  it("leaves out every line and section Aula has nothing for", () => {
    const container = shownOf(detailDialog(view({ location: null }), ctx, close));
    expect(said(container, ".detail-ticket")).toEqual(["fre 30 14.00–17.00 Fredag 30. oktober"]);
    expect(
      container.querySelectorAll(".detail-section, .detail-labels, .detail-whole"),
    ).toHaveLength(0);
    expect(container.querySelectorAll(".detail-col")).toHaveLength(1);
  });

  it("has no line under the title for a type it does not know at no named institution", () => {
    const container = shownOf(detailDialog(view({ type: "performance" }), ctx, close));
    expect(container.querySelector(".detail-meta")).toBeNull();
  });

  it("names a type and a role it does not know by nothing, and an answer by Aula's word", () => {
    const container = shownOf(
      detailDialog(
        view({
          type: "performance",
          institution_name: "Bakkedal Skole",
          creator: { name: "Lone Bech", role: "other" },
          answer: "forsinket",
          description: "Velkommen.",
        }),
        ctx,
        close,
      ),
    );
    expect(said(container, ".detail-meta")).toEqual(["Bakkedal Skole"]);
    expect(said(container, ".detail-heading")).toEqual(["Om begivenheden", "Deltagere", "Svar"]);
    expect(said(container, ".detail-text")).toEqual(["Velkommen."]);
    expect(said(container, ".detail-row")).toEqual(["Oprettet af Lone Bech", "Dit svar forsinket"]);
    expect(container.querySelector(".detail-answer ha-icon")?.getAttribute("icon")).toBe(
      "mdi:reply-outline",
    );
  });

  it("marks a deadline passed only where no answer was given by it", () => {
    const deadline = {
      response_required: true,
      response_deadline: "2026-10-23T23:00:00+02:00",
      deadline_passed: true,
    };
    const unanswered = shownOf(detailDialog(view(deadline), ctx, close));
    expect(said(unanswered, ".detail-row .label.warning")).toEqual(["Overskredet"]);
    const answered = shownOf(detailDialog(view({ ...deadline, answer: "accepted" }), ctx, close));
    expect(said(answered, ".detail-row .label.warning")).toEqual([]);
  });

  it("calls a parents' meeting a meeting", () => {
    const meeting = { ...MEETING, type: "parental_meeting" };
    const container = shownOf(
      detailDialog(
        view({ type: "parental_meeting", description: "Dagsorden." }, meeting),
        ctx,
        close,
      ),
    );
    expect(said(container, ".detail-heading")).toEqual(["Om mødet"]);
  });

  it.each([
    ["preschool-teacher", "pædagog"],
    ["pedagogue", "pædagog"],
    ["leader", "leder"],
  ])("names the role %s as %s", (role, word) => {
    const container = shownOf(
      detailDialog(view({ creator: { name: "Lone Bech", role } }), ctx, close),
    );
    expect(said(container, ".detail-row")).toContain(`Oprettet af Lone Bech, ${word}`);
  });

  it.each([
    ["accepted", "Deltager", "mdi:check"],
    ["declined", "Deltager ikke", "mdi:close-circle-outline"],
    ["waiting", "Ikke besvaret endnu", "mdi:help-circle-outline"],
    ["tentative", "Måske", "mdi:help-circle-outline"],
  ])("names the answer %s in the card's words, with its mark", (answer, word, mark) => {
    const container = shownOf(detailDialog(view({ answer }), ctx, close));
    expect(said(container, ".detail-answer")).toEqual([word]);
    expect(container.querySelector(".detail-answer ha-icon")?.getAttribute("icon")).toBe(mark);
  });

  it("marks a deleted and a private event, and a deadline still to come without a mark", () => {
    const container = shownOf(
      detailDialog(
        view({
          deleted: true,
          private: true,
          response_deadline: local("2026-11-05", "12:00"),
          attachments: 1,
        }),
        ctx,
        close,
      ),
    );
    expect(said(container, ".detail-labels .label")).toEqual(["Slettet i Aula", "Privat"]);
    expect(said(container, ".detail-row")).toEqual([
      "Svarfrist Torsdag 5. nov. 12.00",
      "Vedhæftede filer 1 fil – se den i Aula",
    ]);
    const one = shownOf(detailDialog(view({ private: true }), en, close));
    expect(said(one, ".detail-labels .label")).toEqual(["Private"]);
    const gone = shownOf(detailDialog(view({ deleted: true }), en, close));
    expect(said(gone, ".detail-labels .label")).toEqual(["Deleted in Aula"]);
  });

  it("names the groups invited without counts, and counts without groups", () => {
    const groups = shownOf(detailDialog(view({ invited_groups: ["3.A", "3.B"] }), ctx, close));
    expect(said(groups, ".detail-row")).toEqual(["Inviterede 3.A og 3.B"]);
    const counted = shownOf(detailDialog(view({ invited: 1, answered: 1 }), en, close));
    expect(said(counted, ".detail-row")).toEqual(["Invited 1 of 1 has answered"]);
  });

  it("names the event's place apart from a booked time without a place of its own", () => {
    const container = shownOf(
      detailDialog(
        view({
          booked: {
            start: local("2026-10-30", "14:15"),
            end: local("2026-10-30", "14:30"),
            location: null,
          },
        }),
        ctx,
        close,
      ),
    );
    expect(said(container, ".detail-ticket")).toEqual([
      "fre 30 Jeres tid 14.15–14.30 Fredag 30. oktober",
    ]);
    expect(said(container, ".detail-row")).toEqual(["Sted B12"]);
  });

  it("gives the whole event its day where the booked time is on another", () => {
    const booked = {
      start: local("2026-10-31", "10:00"),
      end: local("2026-10-31", "10:15"),
      location: null,
    };
    expect(said(shownOf(detailDialog(view({ booked }), ctx, close)), ".detail-whole")).toEqual([
      "Hele begivenheden Fredag 30. oktober 14.00–17.00",
    ]);
    const camp: CalendarEvent = {
      ...MEETING,
      start: local("2026-11-03", "08:00"),
      end: local("2026-11-05", "14:00"),
    };
    expect(
      said(shownOf(detailDialog(view({ booked }, camp), ctx, close)), ".detail-whole"),
    ).toEqual(["Hele begivenheden Tirsdag 3. nov. 08.00 → Torsdag 5. nov. 14.00"]);
    const days: CalendarEvent = {
      ...MEETING,
      all_day: true,
      start: "2026-11-03",
      end: "2026-11-06",
    };
    expect(said(shownOf(detailDialog(view({ booked }, days), en, close)), ".detail-whole")).toEqual(
      ["The whole event Tuesday, Nov 3 → Thursday, Nov 5"],
    );
  });

  it("says when an event over days begins and ends, and an all-day event's days", () => {
    const camp: CalendarEvent = {
      ...MEETING,
      start: local("2026-11-03", "08:00"),
      end: local("2026-11-05", "14:00"),
    };
    expect(said(shownOf(detailDialog(view({}, camp), ctx, close)), ".detail-ticket")).toEqual([
      "tirs 3 08.00 → 14.00 3.–5. november, B12",
    ]);
    const days: CalendarEvent = {
      ...MEETING,
      all_day: true,
      start: "2026-11-03",
      end: "2026-11-06",
      location: null,
    };
    expect(said(shownOf(detailDialog(view({}, days), ctx, close)), ".detail-ticket")).toEqual([
      "tirs 3 3.–5. november Hele dagen",
    ]);
  });

  it("shows a lesson's other news in Aula's words, without a room, teachers or colour it has not", () => {
    const lesson: LessonDetail = {
      kind: "lesson",
      title: "Dansk",
      raw: undefined,
      color: undefined,
      day: "2026-10-30",
      start: local("2026-10-30", "10:05"),
      end: local("2026-10-30", "11:35"),
      room: undefined,
      teachers: [],
      status: { kind: "other", text: "Flyttet til lokale 117" },
    };
    const container = shownOf(detailDialog(lesson, ctx, close));
    expect(said(container, ".detail-row")).toEqual(["Ændring Flyttet til lokale 117"]);
    expect(said(container, ".detail-meta")).toEqual(["Lektion"]);
    expect(container.querySelector(".detail-dot")).toBeNull();
    expect(container.querySelector("dialog")?.getAttribute("style")).toBe("");
    const plain = shownOf(detailDialog({ ...lesson, status: undefined }, ctx, close));
    expect(plain.querySelector(".detail-section")).toBeNull();
  });
});

describe("the page behind a window", () => {
  it("stays still while a window is open, and moves again once it closes", async () => {
    const { card } = await mount(DAY, "thu-0715", { config: { children: [1001] } });
    await unfold(card);
    expect(document.documentElement.style.overflow).toBe("");
    await tap(card, SUBSTITUTE);
    expect(document.documentElement.style.overflow).toBe("hidden");
    present(root(card).querySelector<HTMLButtonElement>(".detail-close")).click();
    await card.updateComplete;
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("moves again when the card is taken away with its window open", async () => {
    const { card } = await mount(DAY, "thu-0715", { config: { children: [1001] } });
    await unfold(card);
    await tap(card, SUBSTITUTE);
    unmountAll();
    expect(document.documentElement.style.overflow).toBe("");
  });
});
