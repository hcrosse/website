import { describe, expect, test } from "bun:test";
import * as hegel from "@hegeldev/hegel";
import * as generators from "@hegeldev/hegel/generators";
import { generalResume, parseResumeContent, sortToolItems } from "./content";

describe("parseResumeContent", () => {
  test("accepts the general resume", () => {
    expect(parseResumeContent(generalResume)).toEqual(generalResume);
  });

  test("sorts rendered tool items without losing or mutating values", () =>
    hegel.test((testCase) => {
      const items = testCase.draw(
        generators.arrays(
          generators.text({
            alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -_",
            minSize: 0,
            maxSize: 20,
          }),
          { maxSize: 30 },
        ),
      );
      const original = [...items];
      const sorted = sortToolItems(items);

      expect(items).toEqual(original);
      expect(sorted).toEqual(
        sorted.toSorted((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })),
      );
      expect(sorted.toSorted()).toEqual(original.toSorted());
      expect(sortToolItems(sorted)).toEqual(sorted);
    }));

  test.each([
    ["missing name", { ...generalResume, identity: { ...generalResume.identity, name: "" } }],
    ["missing phone", { ...generalResume, identity: { ...generalResume.identity, phone: "" } }],
    ["empty employment", { ...generalResume, employment: [] }],
    [
      "empty role title",
      {
        ...generalResume,
        employment: [
          {
            ...generalResume.employment[0],
            roles: [{ ...generalResume.employment[0].roles[0], title: "" }],
          },
        ],
      },
    ],
    [
      "empty highlight",
      {
        ...generalResume,
        employment: [{ ...generalResume.employment[0], highlights: [""] }],
      },
    ],
    ["empty tools", { ...generalResume, tools: [] }],
    [
      "empty education minor",
      {
        ...generalResume,
        education: { ...generalResume.education, minor: "" },
      },
    ],
    [
      "empty selected-work links",
      {
        ...generalResume,
        selectedWork: [{ ...generalResume.selectedWork[0], links: [] }],
      },
    ],
    [
      "empty selected-work link URL",
      {
        ...generalResume,
        selectedWork: [
          {
            ...generalResume.selectedWork[0],
            links: [{ ...generalResume.selectedWork[0].links[0], url: "" }],
          },
        ],
      },
    ],
    [
      "empty tool item",
      {
        ...generalResume,
        tools: [{ category: "Languages", items: [""] }],
      },
    ],
  ])("rejects %s", (_name, value) => {
    expect(() => parseResumeContent(value)).toThrow();
  });
});
