import { expect, test } from "bun:test"

import { type Box, bandOf, distance } from "../art/testing"
import { HEIGHT, WIDTH, backMountains, frontMountains, textLines } from "./mountains"

/** The font box above and below the baseline, in em: Archivo for the name, Chivo Mono for the contact lines. */
const fontBox = { name: [0.87, 0.21], email: [0.94, 0.29], phone: [0.94, 0.29] } as const

const textBoxes: readonly Box[] = (["name", "email", "phone"] as const).map((line) => {
  const { x, y, size, width } = textLines[line]
  const em = (size * 4) / 3
  const [ascent, descent] = fontBox[line]

  return [x, y - ascent * em, x + width * em, y + descent * em]
})

test("keeps every front dot one grid square (12 pt) from the text", () => {
  const { bottom, runs, dots } = bandOf(frontMountains(), WIDTH)

  expect(bottom).toBe(HEIGHT)
  expect(dots).toBeGreaterThan(1000)

  for (const box of textBoxes) {
    expect(runs.filter((run) => distance(run, box) < 16)).toEqual([])
  }
})

test("keeps every back dot below y = 28", () => {
  const { bottom, runs, dots } = bandOf(backMountains(), WIDTH)

  expect(bottom).toBe(HEIGHT)
  expect(dots).toBeGreaterThan(1000)
  expect(runs.filter(([, top]) => top < 28)).toEqual([])
})
