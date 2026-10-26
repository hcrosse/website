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

/** Dots are 1 CSS px squares. */
export type DitherStyle = {
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

/** Path data per range: one rectangle per horizontal run of dots, in page px. */
function runs(dots: Dots, count: number, top: number): string[] {
  const { columns, range: cells } = dots
  const byRange = Array.from({ length: count }, () => "")
  let p = 0

  while (p < cells.length) {
    const range = at(cells, p)
    const x = p % columns
    let n = 1

    while (x + n < columns && at(cells, p + n) === range) n += 1

    if (range >= 0) {
      byRange[range] = `${byRange[range] ?? ""}M${x} ${top + (p - x) / columns}h${n}v1h-${n}z`
    }

    p += n
  }

  return byRange
}

/** One path per range with dots, filled with currentColor; the farthest range fades by `fade`, nearer ones less. */
function pathElements(composition: MountainComposition, byRange: readonly string[]): string {
  let out = ""

  for (const [index, d] of byRange.entries()) {
    const rank = rankOf(index, byRange.length)
    const opacity = Number((1 - composition.dither.fade * (1 - rank)).toFixed(3))
    const fade = opacity < 1 ? ` fill-opacity="${opacity}"` : ""

    if (d) out += `<path fill="currentColor"${fade} d="${d}"/>`
  }

  return out
}

function svg(composition: MountainComposition, top: number, dots: Dots): string {
  const { columns, range: cells } = dots
  let first = 0

  while (first < cells.length && at(cells, first) < 0) first += 1
  const bandTop = top + Math.floor(first / columns)
  const body = pathElements(composition, runs(dots, composition.ranges.length, top))
  const { width } = composition
  const height = composition.height - bandTop

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${bandTop} ${width} ${height}" width="${width}" height="${height}" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`
}

function check(composition: MountainComposition): void {
  const { height, limit, ranges, width } = composition

  if (![width, height].every((size) => Number.isInteger(size) && size > 0)) {
    throw new TypeError(`Page size must be whole CSS px above 0, got ${width}x${height}`)
  }

  if (limit.length !== width)
    throw new Error(`Expected ${width} limit columns, got ${limit.length}`)

  if (!limit.every((y) => Number.isFinite(y)))
    throw new Error("Every limit must be a finite page y")

  if (Math.min(...limit) >= height) {
    throw new Error(`The limit leaves no room for marks above the page bottom at y = ${height}`)
  }

  if (ranges.length === 0) throw new Error("A mountain composition needs at least one range")
}

/**
 * Dithered mountains for the band from the highest mark to the page bottom, as SVG in page coordinates
 * (the viewBox starts at the band's top). Dots fill with currentColor, one path per range.
 */
export function mountainSvg(composition: MountainComposition): string {
  check(composition)
  const layout = frame(composition)
  const raster = render(composition, layout, blueRidge())

  return svg(composition, layout.top, dither(tone(raster), raster, composition.dither))
}
