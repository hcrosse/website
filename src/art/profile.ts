/** Value at an index the caller has bounds-checked; 0 past the end. */
export const at = (values: ArrayLike<number>, index: number): number => values[index] ?? 0

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0))

  return t * t * (3 - 2 * t)
}

/** Gaussian blur with clamped ends. */
export function blur(values: ArrayLike<number>, sigma: number): Float32Array {
  const n = values.length
  const out = new Float32Array(n)
  const radius = Math.ceil(sigma * 3)

  const kernel = Array.from({ length: 2 * radius + 1 }, (_, i) =>
    Math.exp(-((i - radius) * (i - radius)) / (2 * sigma * sigma)),
  )

  let total = 0

  for (const weight of kernel) total += weight

  for (let i = 0; i < n; i += 1) {
    let sum = 0

    for (let j = -radius; j <= radius; j += 1) {
      sum += at(kernel, j + radius) * at(values, Math.min(n - 1, Math.max(0, i + j)))
    }

    out[i] = sum / total
  }

  return out
}

/** Running minimum over a window of radius samples on each side. */
export function erode(values: ArrayLike<number>, radius: number): Float32Array {
  const n = values.length

  return Float32Array.from({ length: n }, (_, i) => {
    let low = Infinity

    for (let j = Math.max(0, i - radius); j <= Math.min(n - 1, i + radius); j += 1) {
      low = Math.min(low, at(values, j))
    }

    return low
  })
}
