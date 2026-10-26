import { expect, test } from "bun:test"

import { type Box, bandOf, distance } from "../art/testing"
import { resumeMountains, textLayout } from "./mountains"

const { employmentBottom, ruleBottom, ruleX, toolsBottom } = textLayout

const obstacles: readonly Box[] = [
  [0, 0, ruleX, employmentBottom],
  [ruleX, 0, 816, toolsBottom],
  // The column rule is a 1pt border.
  [ruleX, 0, ruleX + 4 / 3, ruleBottom],
]

test("keeps every dot 0.3 in from the text and the column rule", () => {
  const { bottom, runs, dots } = bandOf(resumeMountains(), 816)

  // The SVG sits at the page's bottom-left, so its coordinates are page px when the viewBox ends at the page bottom.
  expect(bottom).toBe(1056)
  expect(dots).toBeGreaterThan(1000)

  for (const obstacle of obstacles) {
    expect(runs.filter((run) => distance(run, obstacle) < 28.8)).toEqual([])
  }
})
