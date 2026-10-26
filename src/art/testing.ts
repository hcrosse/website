/** Left, top, right, and bottom in page px. */
export type Box = readonly [number, number, number, number]

/** A mountain SVG in page px: where its band ends, each horizontal run of dots as one box, and how many dots. */
export type Band = {
  readonly bottom: number
  readonly runs: readonly Box[]
  readonly dots: number
}

/** Each run's left, row, and length in the SVG's own px. */
function runsIn(svg: string): (readonly [number, number, number])[] {
  const runs: (readonly [number, number, number])[] = []

  for (const [, x = "", y = "", n = ""] of svg.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/gu)) {
    runs.push([Number(x), Number(y), Number(n)])
  }

  return runs
}

/** Reads mountainSvg output displayed `pageWidth` px wide at the page's bottom-left. */
export function bandOf(svg: string, pageWidth: number): Band {
  const [, top = "", width = "", height = ""] = /viewBox="0 (\d+) (\d+) (\d+)"/u.exec(svg) ?? []
  const scale = Number(width) / pageWidth
  const runs = runsIn(svg)

  return {
    bottom: (Number(top) + Number(height)) / scale,
    runs: runs.map(([x, y, n]): Box => [x / scale, y / scale, (x + n) / scale, (y + 1) / scale]),
    dots: runs.reduce((sum, [, , n]) => sum + n, 0),
  }
}

export function distance(a: Box, b: Box): number {
  const across = Math.max(0, b[0] - a[2], a[0] - b[2])
  const down = Math.max(0, b[1] - a[3], a[1] - b[3])

  return Math.hypot(across, down)
}
