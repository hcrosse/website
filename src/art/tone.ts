import type { Raster } from "./horizon"
import { at, blur, clamp01, smoothstep } from "./profile"
import { rankOf, SCALE } from "./taper"

type Surface = {
  readonly raster: Raster
  readonly edge: ArrayLike<number>
  readonly mist: ArrayLike<number>
}

/** Device rows mist rises from (per column) and how many rows it takes to clear. */
type MistLevel = {
  readonly base: ArrayLike<number>
  readonly depth: ArrayLike<number>
}

/** The pixel above, left of, or right of p for sides 0, 1, and 2; -1 past the raster's edge. */
function neighbour(raster: Raster, p: number, side: number): number {
  const { columns } = raster
  const x = p % columns

  if (side === 0) return p >= columns ? p - columns : -1

  if (side === 1) return x > 0 ? p - 1 : -1

  return x < columns - 1 ? p + 1 : -1
}

// 1 on silhouettes (against a farther range or paper above or beside), up to 0.9 where the depth jumps within a
// range (an occlusion edge). The top row never counts as a silhouette.
function edgeAt(raster: Raster, p: number): number {
  const { columns, depth, layer } = raster
  const l = at(layer, p)
  const span = at(raster.span, l)
  const rise = at(raster.taper[l] ?? [], Math.floor((p % columns) / SCALE))
  const threshold = (0.03 * span) / Math.max(0.25, rise)
  let edge = 0

  for (let side = 0; side < 3; side += 1) {
    const q = neighbour(raster, p, side)

    if (q < 0) continue
    const lq = at(layer, q)

    if (lq < l) return p < columns ? Math.min(0.9, edge) : 1
    const jump = (at(depth, q) - at(depth, p)) * span

    if (lq === l && jump > threshold) {
      edge = Math.max(edge, smoothstep(threshold, 4 * threshold, jump))
    }
  }

  return Math.min(0.9, edge)
}

/** Per range, the top device row of its silhouette in each column (`rows` where it is absent). */
function silhouetteTops(raster: Raster): ArrayLike<number>[] {
  const { columns, layer, rows } = raster
  const tops = raster.span.map(() => new Int32Array(columns).fill(rows))

  for (let p = layer.length - 1; p >= 0; p -= 1) {
    const top = tops[at(layer, p)]

    if (top) top[p % columns] = Math.floor(p / columns)
  }

  return tops
}

// Mist rises from the silhouette of everything nearer, smoothed so it does not follow every notch, and clears
// over a depth that grows with the gap to this range's own silhouette.
function mistLevel(raster: Raster, top: ArrayLike<number>, index: number): MistLevel {
  const near = Float32Array.from(raster.nearTop[index] ?? [])
  const nearBlur = blur(near, 20 * SCALE)

  const ownTop = Float32Array.from(top, (v, j) =>
    v >= raster.rows ? Math.min(at(near, j), at(nearBlur, j)) : v,
  )

  const ownBlur = blur(ownTop, 10 * SCALE)
  const base = near.map((v, j) => Math.min(v, at(nearBlur, j)))

  return { base, depth: base.map((v, j) => 0.62 * Math.max(0, v - at(ownBlur, j)) + 4 * SCALE) }
}

/** 0 clear to 1 gone; the nearest range has none. */
function mist(raster: Raster): Float32Array {
  const levels = silhouetteTops(raster)
    .slice(0, -1)
    .map((top, index) => mistLevel(raster, top, index))

  return Float32Array.from(raster.layer, (l, p) => {
    const level = levels[l]

    if (!level) return 0
    const x = p % raster.columns
    const height = at(level.base, x) - ((p - x) / raster.columns + 0.5)

    return 1 - smoothstep(0, at(level.depth, x), height)
  })
}

// Ink concentrates under every ridge line (silhouette or occlusion edge) and fades down the face below it;
// farther ranges are lighter and dissolve into mist.
function toneAt(surface: Surface, p: number, belowRidge: number): number {
  const { raster } = surface
  const rank = rankOf(at(raster.layer, p), raster.span.length)
  const dark = smoothstep(0.25, 0.85, 1 - at(raster.shade, p))
  const ridge = Math.exp(-belowRidge / (7 * SCALE * (0.8 + 0.4 * rank)))
  let t = (0.5 + 0.28 * rank) * (0.11 + 0.45 * dark + 0.55 * ridge + 0.35 * at(surface.edge, p))

  t *= 1 - 0.3 * at(raster.depth, p)

  return clamp01(t * (1 - at(surface.mist, p)))
}

/** Ink tone per device pixel, 0 paper to 1 full ink. */
export function tone(raster: Raster): Float32Array {
  const { columns, layer, rows } = raster
  const edge = Float32Array.from(layer, (l, p) => (l < 0 ? 0 : edgeAt(raster, p)))
  const surface = { raster, edge, mist: mist(raster) }
  const out = new Float32Array(layer.length)

  for (let x = 0; x < columns; x += 1) {
    let belowRidge = 0
    let current = -1

    for (let p = x; p < rows * columns; p += columns) {
      const l = at(layer, p)

      if (l >= 0) {
        belowRidge = l !== current || at(edge, p) > 0.45 ? 0 : belowRidge + 1
        out[p] = toneAt(surface, p, belowRidge)
      }

      current = l
    }
  }

  return out
}
