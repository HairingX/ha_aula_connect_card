import { describe, expect, it } from "vitest";

import type { SectionConfig } from "../src/config";
import { groupTasks, matchesSection } from "../src/sections";
import type { Task } from "../src/core/types.ts";

function task(fields: Partial<Task>): Task {
  return {
    id: 1,
    date: "2026-10-29",
    type: "task",
    title: null,
    content: "",
    subject: "Dansk",
    group: "3.B",
    author: "Lærer Test",
    ...fields,
  };
}

const OTHER: SectionConfig = { title: "Andet" };

describe("matchesSection", () => {
  it("matches every note when the section sets no rule", () => {
    expect(matchesSection(task({}), { title: "Alt" })).toBe(true);
  });

  it("matches the type ignoring case and spaces", () => {
    expect(matchesSection(task({ type: "Task" }), { title: "A", type: " task " })).toBe(true);
    expect(matchesSection(task({ type: "comment" }), { title: "A", type: "task" })).toBe(false);
  });

  it("matches the subject ignoring case", () => {
    expect(
      matchesSection(task({ subject: "Matematik" }), { title: "A", subject: "matematik" }),
    ).toBe(true);
    expect(matchesSection(task({ subject: "Dansk" }), { title: "A", subject: "Matematik" })).toBe(
      false,
    );
  });

  it("matches a text the title contains, ignoring case", () => {
    expect(matchesSection(task({ title: "Glosetest fredag" }), { title: "A", text: "TEST" })).toBe(
      true,
    );
    expect(matchesSection(task({ title: "Læs" }), { title: "A", text: "test" })).toBe(false);
    expect(matchesSection(task({ title: null }), { title: "A", text: "test" })).toBe(false);
  });

  it("needs every rule a section sets to hold", () => {
    const section = { title: "A", type: "task", subject: "Engelsk" };
    expect(matchesSection(task({ type: "task", subject: "Engelsk" }), section)).toBe(true);
    expect(matchesSection(task({ type: "task", subject: "Dansk" }), section)).toBe(false);
  });
});

describe("groupTasks", () => {
  const sections: SectionConfig[] = [
    { title: "Tests", text: "test" },
    { title: "Lektier", type: "task" },
    { title: "Husk", type: "comment" },
  ];

  it("puts each note in the first section it matches, in the sections' order", () => {
    const notes = [
      task({ id: 1, type: "comment" }),
      task({ id: 2, type: "task", title: "Glosetest" }),
      task({ id: 3, type: "task" }),
    ];
    expect(
      groupTasks(notes, sections, OTHER).map((group) => [
        group.section.title,
        group.tasks.map((item) => item.id),
      ]),
    ).toEqual([
      ["Tests", [2]],
      ["Lektier", [3]],
      ["Husk", [1]],
    ]);
  });

  it("puts notes no section matches last, in the other section", () => {
    const groups = groupTasks([task({ type: "survey" })], sections, OTHER);
    expect(groups.map((group) => group.section.title)).toEqual(["Andet"]);
  });

  it("gives no groups for no notes", () => {
    expect(groupTasks([], sections, OTHER)).toEqual([]);
  });
});
