import { type MountainRange, type TerrainCrop, mountainSvg } from "../art/mountains"
import { backAndForth } from "../resume/mountains"

/** A card page in CSS px: the US 3.5 x 2 in trim with 0.125 in bleed on every side. */
export const WIDTH = 360

export const HEIGHT = 216

const BLEED = 12

/**
 * A 12 pt (16 px) grid tiles the trim exactly, 21 x 12 squares, and matches the contact lines' leading.
 * Grid line r is at y = 12 + 16r and column c at x = 12 + 16c; line 4 is the trim's upper third.
 */
const SQUARE = 16

const gridLine = (index: number): number => BLEED + SQUARE * index

/** The text's visible left edge, two squares in from the trim. */
export const TEXT_LEFT = gridLine(2)

/**
 * Text origins and baselines in page px; sizes in pt. Each origin sits left of TEXT_LEFT by its first glyph's side
 * bearing in Chromium, and `width` is how far the ink reaches right of the origin, in em. The front mountains are
 * tested against these boxes, and scripts/resume/browser.ts fails the PDF build when the rendered text differs.
 */
export const textLines = {
  name: { x: 42.07, y: gridLine(4), size: 19, width: 7.19 },
  email: { x: 43.08, y: gridLine(5), size: 8, width: 11.35 },
  phone: { x: 43.29, y: gridLine(6), size: 8, width: 7.14 },
} as const

/** Compositions render at 1.5x the page and display at page width, so their 1 px dots are 0.67 px on the card. */
const SCALE = 1.5

/** A range's heights in card px; its terrain is the résumé's matching crop. */
type RangeHeights = Omit<MountainRange, "crop">

/** `crop` narrowed around its centre so landforms appear larger. */
const zoomed = (crop: TerrainCrop, zoom: number): TerrainCrop =>
  Object.assign({}, crop, {
    width: crop.width * zoom,
    depth: crop.depth * zoom,
    front: crop.front * zoom,
  })

function resumeCrop(index: number): TerrainCrop {
  const range = backAndForth.ranges[index]

  if (!range) throw new Error(`The résumé has no mountain range ${index}`)

  return range.crop
}

/** `limit` gives the highest card y a dot may reach at card x. */
function cardMountains(
  limit: (x: number) => number,
  zoom: number,
  heights: readonly RangeHeights[],
): string {
  const width = WIDTH * SCALE

  return mountainSvg({
    width,
    height: HEIGHT * SCALE,
    limit: Array.from({ length: width }, (_, x) => limit(x / SCALE) * SCALE),
    camera: {
      azimuth: backAndForth.camera.azimuth,
      elevation: backAndForth.camera.elevation,
      exaggeration: 3.5,
    },
    ranges: heights.map((range, index) => ({
      crop: zoomed(resumeCrop(index), zoom),
      left: range.left,
      right: range.right,
      split: range.split * SCALE,
      bumps: range.bumps.map(([x, spread, amount]) => [x * SCALE, spread * SCALE, amount]),
    })),
    dither: backAndForth.dither,
  })
}

/** The résumé's bump positions and widths, scaled from its 816 px page. */
const k = WIDTH / 816

/** Under the text block, left of x = 196, dots stay below y = 130; from x = 236 they may climb to y = 26. */
function frontLimit(x: number): number {
  if (x <= 196) return 130

  if (x >= 236) return 26

  return 130 + ((x - 196) / (236 - 196)) * (26 - 130)
}

export const frontMountains = (): string =>
  cardMountains(frontLimit, 0.38, [
    {
      left: 0.4,
      right: 0.45,
      split: 216,
      bumps: [
        [760 * k, 55 * k, 0.55],
        [130 * k, 90 * k, 0.5],
      ],
    },
    {
      left: 0.35,
      right: 0.4,
      split: 216,
      bumps: [
        [620 * k, 55 * k, 0.55],
        [390 * k, 90 * k, 0.5],
      ],
    },
    {
      left: 0.22,
      right: 0.25,
      split: 216,
      bumps: [
        [705 * k, 50 * k, 0.45],
        [40 * k, 80 * k, 0.65],
      ],
    },
  ])

export const backMountains = (): string =>
  cardMountains(() => 28, 0.5, [
    { left: 0.95, right: 0.95, split: 180, bumps: [[0.72 * WIDTH, 46, 0.05]] },
    { left: 0.72, right: 0.78, split: 180, bumps: [[0.28 * WIDTH, 40, 0.2]] },
    {
      left: 0.45,
      right: 0.42,
      split: 180,
      bumps: [
        [0.88 * WIDTH, 34, 0.3],
        [0.08 * WIDTH, 44, 0.25],
      ],
    },
  ])
