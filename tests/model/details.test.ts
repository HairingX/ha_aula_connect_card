import { describe, expect, it } from "vitest";

import type { EventDetails } from "../../src/core/types.ts";
import type { LessonRow } from "../../src/model/blocks.ts";
import { detailView, eventDetail, lessonDetail, type EventLoad } from "../../src/model/details.ts";
import type { SubjectLabel } from "../../src/model/subjects.ts";
import { local, MEETING, ZONE } from "../fixtures/week.ts";

const ENGLISH: SubjectLabel = {
  name: "Engelsk",
  raw: "ENG",
  key: "engelsk",
  short: "ENG",
  color: "#81c784",
  merge: "overlap",
};

const ROW: LessonRow = {
  kind: "lesson",
  block: {
    lesson: {
      id: "l1",
      start: local("2026-10-29", "12:10"),
      end: local("2026-10-29", "12:55"),
      title: "ENG",
      teachers: [" Tina Rask ", "", "Bo Vang"],
      location: " B14 ",
      status: "substitute",
    },
    start: local("2026-10-29", "12:10"),
    end: local("2026-10-29", "13:40"),
  },
  subject: ENGLISH,
  also: [],
  time: undefined,
  status: { kind: "substitute" },
  cancelled: false,
};

const LOADING: EventLoad = { details: undefined, loading: true, error: undefined };

const DETAILS: EventDetails = {
  title: "Skole-hjem-samtaler 3.B",
  type: "school_home_meeting",
  all_day: false,
  start: local("2026-12-29", "08:00"),
  end: local("2026-12-30", "16:00"),
  description: "<p>Kære forældre</p><p>Velkommen.</p>",
  location: "B12",
  institution_name: " Bakkedal Skole ",
  creator: { name: "Karen Lund", role: "teacher" },
  co_organizers: ["Mette Juhl"],
  invited_groups: ["3.B"],
  invited: 24,
  answered: 21,
  response_required: true,
  response_deadline: local("2026-12-25", "23:00"),
  deadline_passed: true,
  answer: null,
  answered_at: null,
  booked: {
    start: local("2026-12-30", "14:15"),
    end: local("2026-12-30", "14:30"),
    location: "B12",
  },
  attachments: 2,
  private: true,
  deleted: false,
};

const loaded = (details: Partial<EventDetails> = {}): EventLoad => ({
  details: { ...DETAILS, ...details },
  loading: false,
  error: undefined,
});

describe("a lesson's window", () => {
  it("gives the lessons' span, the room and the teachers as Aula has them, trimmed", () => {
    expect(lessonDetail(ROW, ZONE)).toEqual({
      kind: "lesson",
      title: "Engelsk",
      raw: "ENG",
      color: "#81c784",
      day: "2026-10-29",
      start: ROW.block.start,
      end: ROW.block.end,
      room: "B14",
      teachers: ["Tina Rask", "Bo Vang"],
      status: { kind: "substitute" },
    });
  });

  it("names the subjects at its very time, and leaves out Aula's name and a room it has not", () => {
    const view = lessonDetail(
      {
        ...ROW,
        subject: { ...ENGLISH, raw: "Engelsk" },
        also: [{ ...ENGLISH, name: "2 lærere", raw: "2 lærere" }],
        block: { ...ROW.block, lesson: { ...ROW.block.lesson, location: null } },
      },
      ZONE,
    );
    expect(view.title).toBe("Engelsk, 2 lærere");
    expect(view.raw).toBeUndefined();
    expect(view.room).toBeUndefined();
  });

  it("is what a lesson's target shows, whatever an event's load", () => {
    expect(detailView({ kind: "lesson", row: ROW }, LOADING, ZONE)).toEqual(
      lessonDetail(ROW, ZONE),
    );
  });
});

describe("an event's window", () => {
  it("shows the week's data while Aula's details are on their way", () => {
    expect(eventDetail(MEETING, LOADING, ZONE)).toEqual({
      kind: "event",
      title: MEETING.title,
      type: MEETING.type,
      institution: undefined,
      allDay: false,
      first: "2026-10-30",
      last: "2026-10-30",
      start: MEETING.start,
      end: MEETING.end,
      booked: undefined,
      location: "B12",
      text: "",
      creator: undefined,
      coOrganizers: [],
      groups: [],
      invited: undefined,
      answer: undefined,
      deadline: undefined,
      attachments: 0,
      private: false,
      deleted: false,
      loading: true,
      error: undefined,
    });
  });

  it("fills in Aula's details: the booked time, the description as text, who and the answer", () => {
    const view = eventDetail(MEETING, loaded(), ZONE);
    expect(view).toMatchObject({
      institution: "Bakkedal Skole",
      first: "2026-12-29",
      last: "2026-12-30",
      booked: {
        day: "2026-12-30",
        start: DETAILS.booked?.start,
        end: DETAILS.booked?.end,
        location: "B12",
      },
      text: "Kære forældre\nVelkommen.",
      creator: { name: "Karen Lund", role: "teacher" },
      coOrganizers: ["Mette Juhl"],
      groups: ["3.B"],
      invited: { invited: 24, answered: 21 },
      deadline: { at: DETAILS.response_deadline, day: "2026-12-25", passed: true },
      attachments: 2,
      private: true,
      loading: false,
    });
  });

  it("names the place once where the booked time has the same", () => {
    expect(eventDetail(MEETING, loaded(), ZONE).location).toBeUndefined();
    expect(eventDetail(MEETING, loaded({ location: "Kantinen" }), ZONE).location).toBe("Kantinen");
  });

  it("says the guardian has not answered where Aula asks for an answer", () => {
    expect(eventDetail(MEETING, loaded(), ZONE).answer).toEqual({
      value: "waiting",
      at: undefined,
    });
    expect(eventDetail(MEETING, loaded({ response_required: false }), ZONE).answer).toBeUndefined();
    expect(
      eventDetail(
        MEETING,
        loaded({ answer: "accepted", answered_at: local("2026-12-20", "18:03") }),
        ZONE,
      ).answer,
    ).toEqual({ value: "accepted", at: { at: local("2026-12-20", "18:03"), day: "2026-12-20" } });
  });

  it("says a deadline passed only where no answer was given by it", () => {
    const passed = (answer: string | null, response_required = true): boolean | undefined =>
      eventDetail(MEETING, loaded({ answer, response_required }), ZONE).deadline?.passed;
    expect(passed(null)).toBe(true);
    expect(passed("waiting")).toBe(true);
    expect(passed(null, false)).toBe(true);
    expect(passed("accepted")).toBe(false);
    expect(passed("declined")).toBe(false);
    expect(eventDetail(MEETING, loaded({ deadline_passed: false }), ZONE).deadline?.passed).toBe(
      false,
    );
  });

  it.each(["guardian", "child", "early-student", "middle-late-student"])(
    "never names a creator who is a %s",
    (role) => {
      expect(
        eventDetail(MEETING, loaded({ creator: { name: "A Parent", role } }), ZONE).creator,
      ).toBeUndefined();
    },
  );

  it("counts no one where Aula invites no one, and leaves out a deadline it has not", () => {
    const view = eventDetail(
      MEETING,
      loaded({ invited: 0, response_deadline: null, booked: null }),
      ZONE,
    );
    expect(view.invited).toBeUndefined();
    expect(view.deadline).toBeUndefined();
    expect(view.booked).toBeUndefined();
  });

  it("gives an all-day event's first and last day, the end being the day after", () => {
    const camp = { ...MEETING, all_day: true, start: "2026-11-03", end: "2026-11-06" };
    expect(eventDetail(camp, LOADING, ZONE)).toMatchObject({
      allDay: true,
      first: "2026-11-03",
      last: "2026-11-05",
    });
  });

  it("takes the day of a time it cannot read from its text", () => {
    const odd = { ...MEETING, start: "2026-11-03 soon", end: "2026-11-03 later" };
    expect(eventDetail(odd, LOADING, ZONE)).toMatchObject({
      first: "2026-11-03",
      last: "2026-11-03",
    });
  });

  it("keeps why the details could not be had", () => {
    const error = { code: "not_found" };
    expect(
      detailView(
        {
          kind: "event",
          event: MEETING,
          child: {
            entry_id: "a",
            child_id: 1,
            first_name: "",
            name: "",
            institution_name: "",
            picture_entity: null,
            guardian: "",
          },
        },
        { details: undefined, loading: false, error },
        ZONE,
      ),
    ).toMatchObject({ kind: "event", error, loading: false });
  });
});
