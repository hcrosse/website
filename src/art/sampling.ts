import type { Camera, TerrainCrop } from "./mountains"
import { at, smoothstep } from "./profile"
import { SCALE, TAPER_STEP } from "./taper"
import { elevationAt, type Terrain } from "./terrain"

export type View = {
  readonly camera: Camera
  /** Page width, CSS px. */
  readonly width: number
  readonly terrain: Terrain
}

/** One range's terrain sampled on device columns and on depth rows that run away from the viewer. */
export type Sampling = {
  readonly rows: number
  readonly columns: number
  /** Metres per device column and per depth row. */
  readonly across: number
  readonly along: number
  /** Metres from the first depth row to the far edge. */
  readonly span: number
  /** CSS px of rise per metre of elevation, before the taper. */
  readonly lift: number
  /** Per depth row: the far-edge fade weight and the rise from ground curvature, CSS px. */
  readonly fade: ArrayLike<number>
  readonly rise: ArrayLike<number>
  /** Elevation above the crop floor in metres, row-major, and a lightly smoothed copy for shading. */
  readonly height: ArrayLike<number>
  readonly smoothed: ArrayLike<number>
}

const radians = (degrees: number): number => (degrees * Math.PI) / 180

type Rows = Pick<Sampling, "rows" | "along" | "span" | "fade" | "rise">

// Rows in front of the near edge (negative distance) stay plain oblique; beyond it the ground curves away, so far
// terrain rises less, and the last 28% of the depth fades out.
function depthRows(crop: TerrainCrop, view: View): Rows {
  const along = crop.width / view.width / 1.6
  const span = crop.depth + crop.front
  const rows = Math.ceil(span / along) + 1
  const curve = crop.depth / 2
  const tilt = Math.sin(radians(view.camera.elevation)) * (view.width / crop.width)
  const fade = new Float32Array(rows)
  const rise = new Float32Array(rows)

  for (let row = 0; row < rows; row += 1) {
    const v = -crop.front + row * along

    fade[row] = v <= 0 ? 1 : 1 - smoothstep(0.72 * crop.depth, crop.depth, v)
    rise[row] = tilt * (v > 0 ? v - (v * v) / (2 * curve) : v)
  }

  return { rows, along, span, fade, rise }
}

function elevations(crop: TerrainCrop, view: View, rows: Rows): Float32Array {
  const { terrain } = view
  const columns = view.width * SCALE
  const mpp = terrain.metresPerPixel
  const azimuth = radians(view.camera.azimuth) + radians(crop.turn)
  const ca = Math.cos(azimuth)
  const sa = Math.sin(azimuth)
  const across = crop.width / columns
  const height = new Float32Array(rows.rows * columns)

  for (let row = 0; row < rows.rows; row += 1) {
    const dv = -crop.front + row * rows.along - crop.depth / 2
    const bx = crop.x + (dv * sa) / mpp - ((crop.width / 2) * ca) / mpp
    const by = crop.y - (dv * ca) / mpp - ((crop.width / 2) * sa) / mpp

    for (let j = 0; j < columns; j += 1) {
      const u = (j + 0.5) * across
      const z = elevationAt(terrain, bx + (u * ca) / mpp, by + (u * sa) / mpp)

      height[row * columns + j] = z - crop.floor
    }
  }

  if (height.some((z) => Number.isNaN(z))) {
    throw new Error(
      `Range crop at (${crop.x}, ${crop.y}) reads outside the stored terrain; see src/art/blue-ridge.md`,
    )
  }

  return height
}

// A box blur 3 CSS px across and 7 depth rows deep, so pixel-scale crags do not turn the shading into noise.
function smooth(height: ArrayLike<number>, columns: number): Float32Array {
  const rows = height.length / columns
  const ru = 3 * SCALE
  const rv = 3
  const across = new Float32Array(height.length)

  for (let row = 0; row < rows; row += 1) {
    const o = row * columns
    let sum = 0

    for (let j = -ru; j <= ru; j += 1) sum += at(height, o + Math.min(columns - 1, Math.max(0, j)))

    for (let j = 0; j < columns; j += 1) {
      across[o + j] = sum / (2 * ru + 1)
      sum += at(height, o + Math.min(columns - 1, j + ru + 1)) - at(height, o + Math.max(0, j - ru))
    }
  }

  return across.map((_, p) => {
    const j = p % columns
    const row = (p - j) / columns
    let sum = 0

    for (let q = -rv; q <= rv; q += 1)
      sum += at(across, Math.min(rows - 1, Math.max(0, row + q)) * columns + j)

    return sum / (2 * rv + 1)
  })
}

export function sample(crop: TerrainCrop, view: View): Sampling {
  const columns = view.width * SCALE
  const rows = depthRows(crop, view)
  const height = elevations(crop, view, rows)
  const scale = view.width / crop.width

  return {
    rows: rows.rows,
    along: rows.along,
    span: rows.span,
    fade: rows.fade,
    rise: rows.rise,
    columns,
    across: crop.width / columns,
    lift: view.camera.exaggeration * Math.cos(radians(view.camera.elevation)) * scale,
    height,
    smoothed: smooth(height, columns),
  }
}

/** The crop's own skyline before the taper, CSS px, every TAPER_STEP columns. */
export function skyline(sampling: Sampling): Float32Array {
  const { columns, fade, height, lift, rise } = sampling

  return Float32Array.from({ length: Math.floor(columns / SCALE / TAPER_STEP) }, (_, q) => {
    const j = Math.floor((q * TAPER_STEP + TAPER_STEP / 2) * SCALE)
    let top = 0

    for (let row = 0; row < sampling.rows; row += 3) {
      top = Math.max(top, at(rise, row) + at(height, row * columns + j) * at(fade, row) * lift)
    }

    return Math.max(1, top)
  })
}
