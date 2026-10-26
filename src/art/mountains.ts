import { type Dots, dither } from "./dither"
import { render } from "./horizon"
import { at } from "./profile"
import { frame, rankOf } from "./taper"
import { blueRidge } from "./terrain"
import { tone } from "./tone"

/** A window of the Blue Ridge terrain for one range, as chosen in the design prototype. */
export type TerrainCrop = {
  /** Centre in data pixels of the tile mosaic described in blue-ridge.md. */
  readonly x: number
  readonly y: number
  /** Degrees added to the camera azimuth for this range's view direction. */
  readonly turn: number
  /** Metres across the page. */
  readonly width: number
  /** Metres from the near edge to the far edge; the ground curves away over half of it. */
  readonly depth: number
  /** Metres sampled in front of the near edge, where the terrain drops below the base line. */
  readonly front: number
  /** Elevation in metres that sits on the range's base line. */
  readonly floor: number
}

export type MountainRange = {
  readonly crop: TerrainCrop
  /** Share of the available height left of `split` and right of it; the blend runs from split - 30 to split + 90. */
  readonly left: number
  readonly right: number
  readonly split: number
  /** Gaussian raises of the share: centre x, width in CSS px, and amount. */
  readonly bumps: readonly (readonly [x: number, width: number, amount: number])[]
}

export type Camera = {
  /** Degrees clockwise from north that the viewer looks toward. */
  readonly azimuth: number
  /** Degrees above the horizon. */
  readonly elevation: number
  readonly exaggeration: number
}

export type DitherStyle = {
  /** Dot edge in CSS px. */
  readonly dot: 1 | 0.5
  /** Densest dot coverage. */
  readonly cap: number
  /** Exponent on the tone; below 1 lifts pale areas. */
  readonly curve: number
  /** Opacity the farthest range's dots lose; nearer ranges lose proportionally less. */
  readonly fade: number
}

export type MountainComposition = {
  /** Page size, CSS px. */
  readonly width: number
  readonly height: number
  /** For each CSS column, the highest page y a mark may reach. */
  readonly limit: readonly number[]
  readonly camera: Camera
  /** Farthest first. */
  readonly ranges: readonly MountainRange[]
  readonly dither: DitherStyle
}

/** One opacity per range: the farthest range fades by `fade`, nearer ranges proportionally less. */
function rangeOpacities(composition: MountainComposition): number[] {
  const count = composition.ranges.length
  const { fade } = composition.dither

  return composition.ranges.map((_, index) =>
    Number((1 - fade * (1 - rankOf(index, count))).toFixed(3)),
  )
}

function runLength(cells: ArrayLike<number>, p: number, columns: number): number {
  const x = p % columns
  let n = 1

  while (x + n < columns && at(cells, p + n) === at(cells, p)) n += 1

  return n
}

/** Path data per range: one rectangle per horizontal run of dots, in dot-grid units from the page top. */
function runs(cells: ArrayLike<number>, columns: number, firstRow: number): string[] {
  const byRange: string[] = []

  for (let p = 0; p < cells.length; p += 1) {
    const range = at(cells, p)
    const x = p % columns
    const starts = range >= 0 && (x === 0 || at(cells, p - 1) !== range)

    if (starts) {
      const n = runLength(cells, p, columns)
      const y = firstRow + (p - x) / columns

      byRange[range] = `${byRange[range] ?? ""}M${x} ${y}h${n}v1h-${n}z`
    }
  }

  return byRange
}

/** One path per distinct opacity, filled with currentColor; ranges that share an opacity share a path. */
function pathElements(composition: MountainComposition, byRange: readonly string[]): string {
  const byOpacity = new Map<number, string>()

  for (const [index, opacity] of rangeOpacities(composition).entries()) {
    byOpacity.set(opacity, (byOpacity.get(opacity) ?? "") + (byRange[index] ?? ""))
  }

  let out = ""

  for (const [opacity, d] of byOpacity) {
    const fade = opacity < 1 ? ` fill-opacity="${opacity}"` : ""

    if (d) out += `<path fill="currentColor"${fade} d="${d}"/>`
  }

  return out
}

function svg(composition: MountainComposition, top: number, dots: Dots): string {
  const { columns, density, range: cells } = dots
  let first = 0

  while (first < cells.length && at(cells, first) < 0) first += 1
  const bandTop = top + Math.floor(first / columns) / density
  const drawn = pathElements(composition, runs(cells, columns, top * density))
  const body = density === 1 ? drawn : `<g transform="scale(${1 / density})">${drawn}</g>`
  const { width } = composition
  const height = composition.height - bandTop

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${bandTop} ${width} ${height}" width="${width}" height="${height}" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`
}

function check(composition: MountainComposition): void {
  const { height, limit, ranges, width } = composition

  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new TypeError(`Page size must be whole CSS px, got ${width}x${height}`)
  }

  if (limit.length !== width)
    throw new Error(`Expected ${width} limit columns, got ${limit.length}`)

  if (ranges.length === 0) throw new Error("A mountain composition needs at least one range")
}

/**
 * Dithered mountains for the band from the highest mark to the page bottom, as SVG in page coordinates
 * (the viewBox starts at the band's top). Dots fill with currentColor, one path per range opacity.
 */
export function mountainSvg(composition: MountainComposition): string {
  check(composition)
  const layout = frame(composition)
  const raster = render(composition, layout, blueRidge())

  return svg(composition, layout.top, dither(tone(raster), raster, composition.dither))
}
