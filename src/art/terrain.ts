import { readFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"

import { at } from "./profile"

export type Terrain = {
  readonly width: number
  readonly height: number
  /** Position of this grid's first column and row in the full tile mosaic, in data pixels. */
  readonly originX: number
  readonly originY: number
  readonly metresPerPixel: number
  /** Elevation in metres, row-major; NaN outside the stored footprint. */
  readonly elevation: ArrayLike<number>
}

const HEADER_BYTES = 32

const NO_DATA = 0

// Layout (little-endian): u16 width, u16 height, u16 originX, u16 originY, f64 lowest and highest elevation,
// f64 metres per pixel, then width x height u16 samples scaled between the two elevations, 0 for no data.
function load(filename: string): Terrain {
  const bytes = gunzipSync(readFileSync(new URL(filename, import.meta.url)))
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const width = view.getUint16(0, true)
  const height = view.getUint16(2, true)

  if (bytes.byteLength !== HEADER_BYTES + 2 * width * height) {
    throw new Error(
      `${filename} holds ${bytes.byteLength} bytes; expected a ${width}x${height} grid`,
    )
  }

  const low = view.getFloat64(8, true)
  const step = (view.getFloat64(16, true) - low) / 65535
  const elevation = new Float32Array(width * height)

  for (let index = 0; index < elevation.length; index += 1) {
    const sample = view.getUint16(HEADER_BYTES + 2 * index, true)
    elevation[index] = sample === NO_DATA ? Number.NaN : low + sample * step
  }

  return {
    width,
    height,
    originX: view.getUint16(4, true),
    originY: view.getUint16(6, true),
    metresPerPixel: view.getFloat64(24, true),
    elevation,
  }
}

let blueRidgeTerrain: Terrain | undefined

/** Blue Ridge heightfield near Shenandoah (see blue-ridge.md), decoded once. */
export function blueRidge(): Terrain {
  blueRidgeTerrain ??= load("blue-ridge.bin.gz")

  return blueRidgeTerrain
}

/** Catmull-Rom bicubic elevation at mosaic position (x, y) in data pixels, clamped at the grid's borders. */
export function elevationAt(terrain: Terrain, x: number, y: number): number {
  const { width, height, elevation: z } = terrain
  const gx = x - terrain.originX
  const gy = y - terrain.originY
  const xi = Math.floor(gx)
  const yi = Math.floor(gy)
  const tx = gx - xi
  const ty = gy - yi
  const tx2 = tx * tx
  const tx3 = tx2 * tx
  const ty2 = ty * ty
  const ty3 = ty2 * ty
  const a0 = (-tx + 2 * tx2 - tx3) * 0.5
  const a1 = (2 - 5 * tx2 + 3 * tx3) * 0.5
  const a2 = (tx + 4 * tx2 - 3 * tx3) * 0.5
  const a3 = (-tx2 + tx3) * 0.5
  const column = (i: number): number => Math.min(width - 1, Math.max(0, i))
  const x0 = column(xi - 1)
  const x1 = column(xi)
  const x2 = column(xi + 1)
  const x3 = column(xi + 2)

  const row = (i: number): number => {
    const o = Math.min(height - 1, Math.max(0, i)) * width

    return a0 * at(z, o + x0) + a1 * at(z, o + x1) + a2 * at(z, o + x2) + a3 * at(z, o + x3)
  }

  const b0 = (-ty + 2 * ty2 - ty3) * 0.5
  const b1 = (2 - 5 * ty2 + 3 * ty3) * 0.5
  const b2 = (ty + 4 * ty2 - 3 * ty3) * 0.5
  const b3 = (-ty2 + ty3) * 0.5

  return b0 * row(yi - 1) + b1 * row(yi) + b2 * row(yi + 1) + b3 * row(yi + 2)
}
