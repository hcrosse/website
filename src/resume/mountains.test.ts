import { expect, test } from "bun:test"

import { resumeMountains, textLayout } from "./mountains"

/** Left, top, right, and bottom in CSS px from the page's top-left. */
type Box = readonly [number, number, number, number]

const { employmentBottom, ruleBottom, ruleX, toolsBottom } = textLayout

const obstacles: readonly Box[] = [
  [0, 0, ruleX, employmentBottom],
  [ruleX, 0, 816, toolsBottom],
  // The column rule is a 1pt border.
  [ruleX, 0, ruleX + 4 / 3, ruleBottom],
]

function distance(a: Box, b: Box): number {
  const across = Math.max(0, b[0] - a[2], a[0] - b[2])
  const down = Math.max(0, b[1] - a[3], a[1] - b[3])

  return Math.hypot(across, down)
}

function dotsOf(svg: string): Box[] {
  const dots: Box[] = []

  for (const [, x = "", y = "", n = ""] of svg.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/gu)) {
    for (let i = 0; i < Number(n); i += 1) {
      dots.push([Number(x) + i, Number(y), Number(x) + i + 1, Number(y) + 1])
    }
  }

  return dots
}

test("keeps every dot 0.3 in from the text and the column rule", () => {
  const svg = resumeMountains()
  const [, top = "", height = ""] = /viewBox="0 (\d+) 816 (\d+)"/u.exec(svg) ?? []
  const dots = dotsOf(svg)

  // The SVG sits at the page's bottom-left, so its coordinates are page px when the viewBox ends at the page bottom.
  expect(Number(top) + Number(height)).toBe(1056)
  expect(dots.length).toBeGreaterThan(1000)

  for (const obstacle of obstacles) {
    expect(dots.filter((dot) => distance(dot, obstacle) < 28.8)).toEqual([])
  }
})
