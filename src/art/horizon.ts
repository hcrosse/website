import type { MountainComposition } from "./mountains"
import { at, clamp01 } from "./profile"
import { sample, type Sampling, skyline, type View } from "./sampling"
import { type Frame, type RangeFrame, rankOf, SCALE, softclamp, taper } from "./taper"
import type { Terrain } from "./terrain"

const LIGHT_LENGTH = Math.hypot(-0.6, -0.15, 0.78)

const LIGHT_X = -0.6 / LIGHT_LENGTH

const LIGHT_Y = -0.15 / LIGHT_LENGTH

const LIGHT_Z = 0.78 / LIGHT_LENGTH

const AMBIENT = 0.12

/** Ranges composited front over back on the device raster; -1 marks paper in `layer`. */
export type Raster = {
  readonly columns: number
  readonly rows: number
  readonly layer: ArrayLike<number>
  /** 0 at a range's first depth row to 1 at its far edge. */
  readonly depth: ArrayLike<number>
  /** Lambert shading with light from the upper left, AMBIENT in shadow to 1 lit. */
  readonly shade: ArrayLike<number>
  /** Per range: the top row of everything nearer, per device column (`rows` when nothing is nearer). */
  readonly nearTop: readonly ArrayLike<number>[]
  /** Per range: CSS px of rise per metre for each CSS column, and the sampled depth in metres. */
  readonly taper: readonly ArrayLike<number>[]
  readonly span: readonly number[]
}

type Placed = {
  readonly sampling: Sampling
  readonly index: number
  readonly exaggeration: number
  readonly taper: ArrayLike<number>
  /** Per device column: rise per metre and the room's cap; and the device row of the range's base line. */
  readonly gain: ArrayLike<number>
  readonly cap: ArrayLike<number>
  readonly baseRow: number
}

type Pair = readonly [number, number]

/** Device rows from..to (exclusive of from) between two depth rows' screen y, with their depth and shade. */
type Span = {
  readonly from: number
  readonly to: number
  readonly y: number
  readonly previousY: number
  readonly depth: Pair
  readonly shade: Pair
}

function shadeAt(range: Placed, row: number, j: number): number {
  const { exaggeration, sampling } = range
  const { columns, fade, smoothed: gs } = sampling
  const jl = Math.max(0, j - 1)
  const jr = Math.min(columns - 1, j + 1)
  const down = Math.max(0, row - 1)
  const up = Math.min(sampling.rows - 1, row + 1)
  const o = row * columns
  const gu = ((at(gs, o + jr) - at(gs, o + jl)) / ((jr - jl) * sampling.across)) * at(fade, row)

  const gv =
    (at(gs, up * columns + j) * at(fade, up) - at(gs, down * columns + j) * at(fade, down)) /
    ((up - down) * sampling.along)

  const nx = -exaggeration * gu
  const ny = -exaggeration * gv
  const nl = 1 / Math.sqrt(nx * nx + ny * ny + 1)

  return AMBIENT + (1 - AMBIENT) * Math.max(0, (nx * LIGHT_X + ny * LIGHT_Y + LIGHT_Z) * nl)
}

const attributes = (range: Placed, row: number, j: number): Pair => [
  (row * range.sampling.along) / range.sampling.span,
  shadeAt(range, row, j),
]

class Painter {
  public readonly layer: Int8Array
  public readonly depth: Float32Array
  public readonly shade: Float32Array
  public readonly nearTop: Int32Array[] = []
  readonly #horizon: Int32Array

  public constructor(columns: number, rows: number) {
    this.layer = new Int8Array(columns * rows).fill(-1)
    this.depth = new Float32Array(columns * rows)
    this.shade = new Float32Array(columns * rows)
    this.#horizon = new Int32Array(columns).fill(rows)
  }

  // Front-to-back floating horizon per device column; spans interpolate between depth rows.
  public paint(range: Placed): void {
    this.nearTop[range.index] = Int32Array.from(this.#horizon)

    for (let j = 0; j < range.sampling.columns; j += 1) this.#column(range, j)
  }

  #column(range: Placed, j: number): void {
    const gain = at(range.gain, j)
    const cap = at(range.cap, j)
    let horizon = at(this.#horizon, j)
    let previousY = range.baseRow
    let painted = -1
    let previous: Pair = [0, 0]
    const { columns, fade, height, lift, rise } = range.sampling

    for (let row = 0; row < range.sampling.rows; row += 1) {
      const terrain = at(height, row * columns + j) * at(fade, row) * lift
      const y = range.baseRow - softclamp(gain * (at(rise, row) + terrain), cap) * SCALE
      const top = Math.max(0, Math.floor(y + 0.5))

      if (row > 0 && top < horizon) {
        const current = attributes(range, row, j)

        if (painted !== row - 1) previous = attributes(range, row - 1, j)
        const depth: Pair = [previous[0], current[0]]
        const shade: Pair = [previous[1], current[1]]

        this.#fill(range, j, { from: horizon, to: top, y, previousY, depth, shade })
        horizon = top
        previous = current
        painted = row
      }

      previousY = y
    }

    this.#horizon[j] = horizon
  }

  #fill(range: Placed, j: number, span: Span): void {
    const rise = span.previousY - span.y

    for (let py = span.from - 1; py >= span.to; py -= 1) {
      const t = clamp01(rise > 1e-9 ? (span.previousY - (py + 0.5)) / rise : 1)
      const u = 1 - t
      const p = py * range.sampling.columns + j

      this.layer[p] = range.index
      this.depth[p] = span.depth[0] * u + span.depth[1] * t
      this.shade[p] = span.shade[0] * u + span.shade[1] * t
    }
  }
}

/** Linear interpolation of a per-CSS-column value at device column j. */
function spread(values: ArrayLike<number>, j: number): number {
  const last = values.length - 1
  const xc = (j + 0.5) / SCALE - 0.5
  const x0 = Math.max(0, Math.min(last, Math.floor(xc)))
  const x1 = Math.min(last, x0 + 1)
  const f = clamp01(xc - x0)

  return at(values, x0) + (at(values, x1) - at(values, x0)) * f
}

type Scene = {
  readonly view: View
  readonly frame: Frame
  readonly limit: readonly number[]
}

function place(scene: Scene, range: RangeFrame): Placed {
  const { frame, limit, view } = scene
  const sampling = sample(range.range.crop, view)
  const rise = taper(skyline(sampling), range, rankOf(range.index, frame.ranges.length))
  const gain = new Float32Array(frame.columns)
  const cap = new Float32Array(frame.columns)

  for (let j = 0; j < frame.columns; j += 1) {
    gain[j] = spread(rise, j)
    cap[j] = Math.min(spread(range.room, j), range.base - at(limit, Math.floor((j + 0.5) / SCALE)))
  }

  return {
    sampling,
    index: range.index,
    exaggeration: view.camera.exaggeration,
    taper: rise,
    gain,
    cap,
    baseRow: (range.base - frame.top) * SCALE,
  }
}

export function render(composition: MountainComposition, frame: Frame, terrain: Terrain): Raster {
  const view = { camera: composition.camera, width: composition.width, terrain }

  const placed = frame.ranges.map((range) =>
    place({ view, frame, limit: composition.limit }, range),
  )

  const painter = new Painter(frame.columns, frame.rows)

  for (const range of placed.toReversed()) painter.paint(range)

  return {
    columns: frame.columns,
    rows: frame.rows,
    layer: painter.layer,
    depth: painter.depth,
    shade: painter.shade,
    nearTop: painter.nearTop,
    taper: placed.map((range) => range.taper),
    span: placed.map((range) => range.sampling.span),
  }
}
