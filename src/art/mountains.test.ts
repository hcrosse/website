import { expect, test } from "bun:test"

import { backAndForth } from "../resume/mountains"
import { type MountainComposition, type MountainRange, mountainSvg } from "./mountains"

type Mark = {
  readonly x: number
  readonly y: number
  readonly opacity: string
}

// Roughly the résumé's free space: low under Employment, tall under Tools.
const underText = (x: number): number => (x + 0.5 < 544.5 ? 1009.5 : 932.9)

const teeth = (x: number): number => underText(x) + (Math.floor(x / 3) % 2) * 20

const shallow = (x: number): number => 1040 + (x % 7) * 0.13

const limitOf = (limitAt: (x: number) => number): number[] =>
  Array.from({ length: 816 }, (_, x) => limitAt(x))

function compose(
  limit: readonly number[],
  ranges: readonly MountainRange[] = backAndForth.ranges,
): MountainComposition {
  return {
    width: 816,
    height: 1056,
    limit,
    camera: backAndForth.camera,
    ranges,
    dither: backAndForth.dither,
  }
}

function runMarks(d: string, opacity: string): Mark[] {
  const found: Mark[] = []

  for (const [, x = "", y = "", n = ""] of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/gu)) {
    for (let i = 0; i < Number(n); i += 1) found.push({ x: Number(x) + i, y: Number(y), opacity })
  }

  return found
}

/** Every 1 px dot drawn, from the path rectangles. */
function marks(svg: string): Mark[] {
  const found: Mark[] = []

  const paths = svg.matchAll(
    /<path fill="currentColor"(?: fill-opacity="([\d.]+)")? d="([^"]*)"\/>/gu,
  )

  for (const [, opacity = "1", d = ""] of paths) found.push(...runMarks(d, opacity))

  return found
}

/** The marks reachable from `first` through marks within 5 px of each other in x and y. */
function groupOf(first: Mark, among: readonly Mark[]): Set<Mark> {
  const group = new Set([first])

  for (const mark of group) {
    for (const other of among) {
      if (Math.abs(other.x - mark.x) <= 5 && Math.abs(other.y - mark.y) <= 5) group.add(other)
    }
  }

  return group
}

const svgs = new Map(
  [underText, teeth, shallow].map((limitAt) => [limitAt, mountainSvg(compose(limitOf(limitAt)))]),
)

const resume = svgs.get(underText) ?? ""

test("keeps every mark at or below its column's limit", () => {
  for (const [limitAt, svg] of svgs) {
    const found = marks(svg)

    expect(found.length).toBeGreaterThan(400)
    expect(found.filter((mark) => mark.y < limitAt(mark.x))).toEqual([])
  }
})

test("places the band from the highest mark to the page bottom", () => {
  const found = marks(resume)
  const highest = Math.min(...found.map((mark) => mark.y))

  expect(resume).toContain(`viewBox="0 ${highest} 816 ${1056 - highest}"`)
})

test("runs the nearest range to the bottom edge across the page", () => {
  const lowest = Array.from({ length: 816 }, () => 0)

  for (const mark of marks(resume)) {
    if (mark.opacity === "1") lowest[mark.x] = Math.max(lowest[mark.x] ?? 0, mark.y)
  }

  const gaps = lowest.map((_, x) => 1055 - Math.max(...lowest.slice(Math.max(0, x - 3), x + 4)))

  expect(Math.max(...gaps)).toBeLessThanOrEqual(8)
})

test("leaves no small cluster of dots apart from the rest", () => {
  for (const svg of svgs.values()) {
    const left = new Set(marks(svg))

    for (const first of left) {
      const group = groupOf(first, [...left])

      for (const mark of group) left.delete(mark)
      expect(group.size).toBeGreaterThan(5)
    }
  }
})

test("renders the same SVG every time", () => {
  expect(mountainSvg(compose(limitOf(underText)))).toBe(resume)
})

test("fades each farther range's opacity", () => {
  const opacities = new Set(marks(resume).map((mark) => mark.opacity))

  // Farthest, middle, nearest: 55%, 27.5%, and 0% of the opacity removed.
  expect([...opacities].toSorted()).toEqual(["0.45", "0.725", "1"])
})

test("rejects a limit that does not span the page width", () => {
  expect(() => mountainSvg(compose(limitOf(underText).slice(1)))).toThrow(
    "Expected 816 limit columns, got 815",
  )
})

test("rejects a limit that is not finite or leaves no room above the page bottom", () => {
  for (const bad of [Number.NaN, Infinity]) {
    const limit = limitOf((x) => (x === 400 ? bad : underText(x)))

    expect(() => mountainSvg(compose(limit))).toThrow("Every limit must be a finite page y")
  }

  expect(() => mountainSvg(compose(limitOf(() => 1056)))).toThrow("no room for marks")
})

test("rejects a page without area", () => {
  const { camera, ranges, dither } = backAndForth

  for (const [width, height] of [
    [0, 1056],
    [816, 0],
  ] as const) {
    const limit = limitOf(underText).slice(0, width)

    expect(() => mountainSvg({ width, height, limit, camera, ranges, dither })).toThrow(
      "Page size must be whole CSS px above 0",
    )
  }
})

test("rejects a crop that reaches past the stored terrain", () => {
  const crop = { x: 700, y: 700, turn: 0, width: 9000, depth: 2700, front: 2000, floor: 300 }
  const ranges = [{ crop, left: 0.3, right: 0.3, split: 400, bumps: [] }]

  expect(() => mountainSvg(compose(limitOf(underText), ranges))).toThrow(
    "outside the stored terrain",
  )
})

// A small crop facing north at the grid's left edge, where the border pixels hold data. At x = 9.9 its leftmost
// samples need a stencil column left of the grid; at x = 10.7 the stencil stays inside.
const edgeRanges = (x: number): MountainRange[] => [
  {
    crop: { x, y: 169.5, turn: -45, width: 36, depth: 20, front: 10, floor: 300 },
    left: 0.3,
    right: 0.3,
    split: 400,
    bumps: [],
  },
]

test("rejects a crop that reaches just past a data pixel on the grid's border", () => {
  expect(() => mountainSvg(compose(limitOf(underText), edgeRanges(10.7)))).not.toThrow()

  expect(() => mountainSvg(compose(limitOf(underText), edgeRanges(9.9)))).toThrow(
    "outside the stored terrain",
  )
})
