import type { Raster } from "./horizon"
import type { DitherStyle } from "./mountains"
import { at } from "./profile"
import { SCALE } from "./taper"

/** Dot grid in rows of `columns` cells; `range` holds each dot's range index, -1 where there is no dot. */
export type Dots = {
  readonly columns: number
  readonly rows: number
  /** Cells per CSS px. */
  readonly density: number
  readonly range: ArrayLike<number>
}

const ATKINSON: readonly (readonly [number, number])[] = [
  [1, 0],
  [2, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
  [0, 2],
]

/** Area average of the tone over one cell, in device pixels from (x0, y0) with edge `cell`. */
function average(
  tone: ArrayLike<number>,
  columns: number,
  corner: readonly [number, number, number],
): number {
  const [x0, y0, cell] = corner
  let sum = 0
  let weights = 0

  for (let y = Math.floor(y0); y < Math.ceil(y0 + cell); y += 1) {
    const wy = Math.min(y + 1, y0 + cell) - Math.max(y, y0)

    for (let x = Math.floor(x0); x < Math.ceil(x0 + cell); x += 1) {
      const w = (Math.min(x + 1, x0 + cell) - Math.max(x, x0)) * wy

      sum += at(tone, y * columns + x) * w
      weights += w
    }
  }

  return sum / weights
}

// Atkinson diffuses only three quarters of the error, which wipes out pale tones; its input is lifted by 1.2.
function levels(tone: ArrayLike<number>, raster: Raster, style: DitherStyle): Float32Array {
  const cell = SCALE * style.dot
  const columns = raster.columns / cell

  return Float32Array.from({ length: columns * (raster.rows / cell) }, (_, p) => {
    const gx = p % columns

    const t = Math.min(
      1,
      average(tone, raster.columns, [gx * cell, ((p - gx) / columns) * cell, cell]),
    )

    return t < 0.02 ? 0 : t ** style.curve * style.cap * 1.2
  })
}

function atkinson(input: ArrayLike<number>, columns: number): Uint8Array {
  const rows = input.length / columns
  const error = Float32Array.from(input)
  const out = new Uint8Array(input.length)

  for (let p = 0; p < input.length; p += 1) {
    const x = p % columns
    const old = at(error, p)
    const on = old > 0.5 ? 1 : 0
    const share = (old - on) / 8

    out[p] = on

    for (const [dx, dy] of ATKINSON) {
      const xx = x + dx
      const yy = (p - x) / columns + dy

      if (xx >= 0 && xx < columns && yy < rows)
        error[yy * columns + xx] = at(error, yy * columns + xx) + share
    }
  }

  return out
}

/** Atkinson dots over the tone, each tagged with the range under its centre (the nearest range off the terrain). */
export function dither(tone: ArrayLike<number>, raster: Raster, style: DitherStyle): Dots {
  const cell = SCALE * style.dot
  const columns = raster.columns / cell
  const on = atkinson(levels(tone, raster, style), columns)
  const nearest = raster.span.length - 1

  const range = Int8Array.from(on, (dot, p) => {
    if (!dot) return -1
    const gx = p % columns
    const x = Math.min(raster.columns - 1, Math.floor((gx + 0.5) * cell))
    const y = Math.min(raster.rows - 1, Math.floor(((p - gx) / columns + 0.5) * cell))
    const l = at(raster.layer, y * raster.columns + x)

    return l < 0 ? nearest : l
  })

  return { columns, rows: on.length / columns, density: 1 / style.dot, range }
}
