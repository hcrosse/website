import type { Raster } from "./horizon"
import type { DitherStyle } from "./mountains"
import { at } from "./profile"
import { SCALE } from "./taper"

/** 1 CSS px dot grid in rows of `columns`; `range` holds each dot's range index, -1 where there is no dot. */
export type Dots = {
  readonly columns: number
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

/** Mean tone over the SCALE x SCALE device pixels whose top-left pixel is `corner`. */
function mean(tone: ArrayLike<number>, columns: number, corner: number): number {
  let sum = 0

  for (let y = 0; y < SCALE; y += 1) {
    for (let x = 0; x < SCALE; x += 1) sum += at(tone, corner + y * columns + x)
  }

  return sum / (SCALE * SCALE)
}

// Atkinson diffuses only three quarters of the error, which wipes out pale tones; its input is lifted by 1.2.
function levels(tone: ArrayLike<number>, raster: Raster, style: DitherStyle): Float32Array {
  const columns = raster.columns / SCALE

  return Float32Array.from({ length: columns * (raster.rows / SCALE) }, (_, p) => {
    const gx = p % columns
    const gy = (p - gx) / columns
    const t = Math.min(1, mean(tone, raster.columns, (gy * raster.columns + gx) * SCALE))

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
  const columns = raster.columns / SCALE
  const on = atkinson(levels(tone, raster, style), columns)
  const nearest = raster.span.length - 1

  const range = Int8Array.from(on, (dot, p) => {
    if (!dot) return -1
    const gx = p % columns
    const x = Math.min(raster.columns - 1, Math.floor((gx + 0.5) * SCALE))
    const y = Math.min(raster.rows - 1, Math.floor(((p - gx) / columns + 0.5) * SCALE))
    const l = at(raster.layer, y * raster.columns + x)

    return l < 0 ? nearest : l
  })

  return { columns, range }
}
