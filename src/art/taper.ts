import type { MountainComposition, MountainRange } from "./mountains"
import { at, blur, erode, smoothstep } from "./profile"

/** Device pixels per CSS pixel for the internal raster. */
export const SCALE = 3

/** Depth rank: 0 for the farthest range, 1 for the nearest. */
export const rankOf = (index: number, count: number): number =>
  count > 1 ? index / (count - 1) : 1

export type RangeFrame = {
  readonly index: number
  readonly range: MountainRange
  /** Page y of the range's near edge; the nearest sits below the page so the bottom edge cuts it. */
  readonly base: number
  /** Allowed rise above the base per CSS column, CSS px. */
  readonly room: ArrayLike<number>
  /** The room blurred and normalised to a peak of 1. */
  readonly envelope: ArrayLike<number>
}

export type Frame = {
  /** Page y of the raster's first row. */
  readonly top: number
  readonly columns: number
  readonly rows: number
  readonly ranges: readonly RangeFrame[]
}

function baseOf(index: number, count: number, height: number): number {
  if (index === count - 1) return height + 1

  return index === 0 ? height - 2 : height + 4
}

function share(range: MountainRange, x: number): number {
  let f =
    range.left + (range.right - range.left) * smoothstep(range.split - 30, range.split + 90, x)

  for (const [bx, bw, amount] of range.bumps) f += amount * Math.exp(-(((x + 0.5 - bx) / bw) ** 2))

  return Math.min(1, Math.max(0.05, f))
}

// The available height is eroded and blurred so the clamp never makes a cliff; the share and bumps apply after
// the erosion so narrow bumps keep their height.
function room(raw: ArrayLike<number>, range: MountainRange, boost: number): Float32Array {
  const eroded = erode(raw, 30)

  const target = eroded.map((available, x) =>
    Math.min(available, share(range, x) * available * boost),
  )

  return blur(target, 11).map((rise, x) => Math.max(2, Math.min(rise, at(raw, x))))
}

export function frame(composition: MountainComposition): Frame {
  const { height, limit, ranges } = composition
  const top = Math.floor(Math.min(...limit) - 2)

  return {
    top,
    columns: composition.width * SCALE,
    rows: (height - top) * SCALE,
    ranges: ranges.map((range, index) => {
      const base = baseOf(index, ranges.length, height)
      const raw = Float32Array.from(limit, (y) => base - y)
      const allowed = room(raw, range, index === 0 ? 1 : 1.1)
      const blurred = blur(allowed, 30)
      const peak = Math.max(...blurred)

      return { index, range, base, room: allowed, envelope: blurred.map((v) => v / peak) }
    }),
  }
}

export function softclamp(rise: number, limit: number): number {
  const knee = 0.92 * limit

  return rise <= knee ? rise : knee + (limit - knee) * Math.tanh((rise - knee) / (limit - knee))
}

export const TAPER_STEP = 4

/**
 * Rise per metre of terrain for each CSS column: the room's envelope, partly normalised by the crop's own skyline
 * (`natural`, sampled every TAPER_STEP columns) so real ridges survive, with a gain that fits the tallest column
 * just under its room. The gain never boosts real relief by more than a quarter.
 */
export function taper(natural: ArrayLike<number>, range: RangeFrame, rank: number): Float32Array {
  const { envelope } = range
  const smoothed = blur(natural, 40 / TAPER_STEP)
  let mean = 0

  for (const v of smoothed) mean += v
  mean /= smoothed.length
  const bend = 0.1 + 0.1 * rank
  const last = smoothed.length - 1

  const raw = Float32Array.from(
    envelope,
    (s, x) => s * (mean / at(smoothed, Math.min(last, Math.floor(x / TAPER_STEP)))) ** bend,
  )

  let worst = -Infinity

  for (let q = 0; q < natural.length; q += 1) {
    const x = q * TAPER_STEP + TAPER_STEP / 2

    if (at(envelope, x) >= 0.6)
      worst = Math.max(worst, (at(raw, x) * at(natural, q)) / at(range.room, x))
  }

  const gain = Math.min(1.25, 0.96 / worst)

  return raw.map((v) => v * gain)
}
