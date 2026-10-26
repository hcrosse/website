import { type MountainComposition, mountainSvg } from "../art/mountains"

/**
 * Where the résumé's text ends, in CSS px from the page's top-left. The mountains are fitted below it, and
 * scripts/resume/browser.ts fails the PDF build when the rendered page no longer matches.
 */
export const textLayout = {
  employmentBottom: 979.171875,
  toolsBottom: 902.578125,
  ruleBottom: 979.171875,
  ruleX: 544.46875,
} as const

const WIDTH = 816

const HEIGHT = 1056

/** 0.3in between the text and the highest dot, kept as a circle around the column rule's end. */
const CLEARANCE = 28.8

/** For each CSS column, the highest page y a dot may reach, with 1.5 px to spare for dot rounding. */
function limit(): number[] {
  const { employmentBottom, toolsBottom, ruleBottom, ruleX } = textLayout

  return Array.from({ length: WIDTH }, (_, x) => {
    const centre = x + 0.5
    const fromRule = Math.abs(centre - ruleX)
    let y = (centre < ruleX ? employmentBottom : toolsBottom) + CLEARANCE

    if (fromRule < CLEARANCE + 1)
      y = Math.max(y, ruleBottom + Math.sqrt((CLEARANCE + 1) ** 2 - fromRule ** 2))

    return y + 1.5
  })
}

/**
 * "Back and forth": three Blue Ridge ranges, each tallest somewhere different, in sparse Atkinson dots. The crops
 * are the design prototype's crop search results for this composition, kept at full precision.
 */
export const backAndForth: Pick<MountainComposition, "camera" | "ranges" | "dither"> = {
  camera: { azimuth: 45, elevation: 25, exaggeration: 2.8 },
  ranges: [
    {
      crop: {
        x: 312.12033927440643,
        y: 257.0309345126152,
        turn: -3.1246240118984026,
        width: 16853.215929664544,
        depth: 5055.964778899363,
        front: 1516.789433669809,
        floor: 362.1292419433594,
      },
      left: 0.4,
      right: 0.45,
      split: textLayout.ruleX,
      bumps: [
        [760, 55, 0.55],
        [130, 90, 0.5],
      ],
    },
    {
      crop: {
        x: 389.9716002345085,
        y: 219.18054842948914,
        turn: -10.35695950105925,
        width: 13651.104903028281,
        depth: 4095.3314709084843,
        front: 1433.3660148179695,
        floor: 364.60638427734375,
      },
      left: 0.35,
      right: 0.4,
      split: textLayout.ruleX,
      bumps: [
        [620, 55, 0.55],
        [390, 90, 0.55],
      ],
    },
    {
      crop: {
        x: 259.2271099090576,
        y: 138.42157727479935,
        turn: -16.276843092522885,
        width: 10448.993876392018,
        depth: 3134.6981629176053,
        front: 3761.637795501126,
        floor: 255.9237060546875,
      },
      left: 0.22,
      right: 0.25,
      split: textLayout.ruleX,
      bumps: [
        [705, 50, 0.45],
        [40, 80, 0.65],
      ],
    },
  ],
  dither: { dot: 1, cap: 0.38, curve: 0.5, fade: 0.55 },
}

export const resumeMountains = (): string =>
  mountainSvg({
    width: WIDTH,
    height: HEIGHT,
    limit: limit(),
    camera: backAndForth.camera,
    ranges: backAndForth.ranges,
    dither: backAndForth.dither,
  })
