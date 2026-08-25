import { expect, test } from "bun:test";
import * as hegel from "@hegeldev/hegel";
import * as generators from "@hegeldev/hegel/generators";
import { sortToolItems } from "./content";

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
