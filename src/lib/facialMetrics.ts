import type { Matrix } from "@mediapipe/tasks-vision"
import type { FacialMetrics } from "@/types"

export interface FrameSample {
  eyeContact: boolean
  likabilityScore: number
  tensionScore: number
  neutralScore: number
  blinkScore: number
  timestampMs: number
}

interface BlendshapeCategory {
  categoryName: string
  score: number
}

// ponytail: 아이컨택/깜빡임 판정 임계치는 실제 데이터로 튜닝 필요한 자리표시자
export const EYE_LOOK_THRESHOLD = 0.3
export const BLINK_SCORE_THRESHOLD = 0.5
export const HEAD_YAW_THRESHOLD_DEG = 20
export const HEAD_PITCH_THRESHOLD_DEG = 20

// ponytail: 호감도/긴장도/무표정도 카테고리 구성은 휴리스틱 — 실측 데이터로 재검토 필요한 자리표시자
export const LIKABILITY_CATEGORIES = [
  "mouthSmileLeft", "mouthSmileRight", "cheekSquintLeft", "cheekSquintRight",
  "browOuterUpLeft", "browOuterUpRight", "browInnerUp",
]
export const TENSION_CATEGORIES = [
  "mouthPressLeft", "mouthPressRight", "mouthRollUpper", "mouthRollLower",
  "browDownLeft", "browDownRight", "eyeSquintLeft", "eyeSquintRight",
  "mouthShrugUpper", "mouthShrugLower",
]
export const NEUTRAL_CATEGORIES = ["_neutral"]

function matrixAt(matrix: Matrix, row: number, col: number): number {
  // MediaPipe Matrix.data는 column-major로 평탄화되어 있음
  return matrix.data[col * matrix.rows + row]
}

export function computeHeadPoseAngles(matrix: Matrix): {
  yawDeg: number
  pitchDeg: number
} {
  const m02 = matrixAt(matrix, 0, 2)
  const m12 = matrixAt(matrix, 1, 2)
  const m22 = matrixAt(matrix, 2, 2)

  const yawRad = Math.asin(Math.max(-1, Math.min(1, m02)))
  const pitchRad = Math.atan2(-m12, m22)

  return { yawDeg: (yawRad * 180) / Math.PI, pitchDeg: (pitchRad * 180) / Math.PI }
}

function isHeadPoseNormal(matrices: Matrix[]): boolean {
  const matrix = matrices[0]
  if (!matrix) return false // head pose 미검출 프레임은 보수적으로 응시 아님 처리

  const { yawDeg, pitchDeg } = computeHeadPoseAngles(matrix)
  return (
    Math.abs(yawDeg) < HEAD_YAW_THRESHOLD_DEG &&
    Math.abs(pitchDeg) < HEAD_PITCH_THRESHOLD_DEG
  )
}

export function extractSample(
  categories: BlendshapeCategory[],
  timestampMs = 0,
  matrices: Matrix[] = []
): FrameSample {
  const scoreOf = (name: string) =>
    categories.find((c) => c.categoryName === name)?.score ?? 0

  const lookOut = Math.max(scoreOf("eyeLookOutLeft"), scoreOf("eyeLookOutRight"))
  const lookIn = Math.max(scoreOf("eyeLookInLeft"), scoreOf("eyeLookInRight"))
  const eyeLookNormal = Math.max(lookOut, lookIn) < EYE_LOOK_THRESHOLD
  const eyeContact = eyeLookNormal && isHeadPoseNormal(matrices)

  const averageOf = (names: string[]) =>
    names.reduce((sum, name) => sum + scoreOf(name), 0) / names.length

  const likabilityScore = averageOf(LIKABILITY_CATEGORIES)
  const tensionScore = averageOf(TENSION_CATEGORIES)
  const neutralScore = averageOf(NEUTRAL_CATEGORIES)

  const blinkScore = Math.max(scoreOf("eyeBlinkLeft"), scoreOf("eyeBlinkRight"))

  return { eyeContact, likabilityScore, tensionScore, neutralScore, blinkScore, timestampMs }
}

function countBlinkEdges(samples: FrameSample[]): number {
  let edges = 0
  let previousBlinkScore = samples[0].blinkScore
  for (const sample of samples.slice(1)) {
    if (
      sample.blinkScore >= BLINK_SCORE_THRESHOLD &&
      previousBlinkScore < BLINK_SCORE_THRESHOLD
    ) {
      edges += 1
    }
    previousBlinkScore = sample.blinkScore
  }
  return edges
}

export function summarizeSamples(samples: FrameSample[]): FacialMetrics {
  if (samples.length === 0) {
    return {
      eyeContactRatio: 0,
      blinkRate: 0,
      likabilityScore: 0,
      tensionScore: 0,
      neutralScore: 0,
    }
  }

  const eyeContactRatio =
    samples.filter((s) => s.eyeContact).length / samples.length

  const averageAcrossSamples = (pick: (s: FrameSample) => number) =>
    samples.reduce((sum, s) => sum + pick(s), 0) / samples.length

  const likabilityScore = averageAcrossSamples((s) => s.likabilityScore)
  const tensionScore = averageAcrossSamples((s) => s.tensionScore)
  const neutralScore = averageAcrossSamples((s) => s.neutralScore)

  const durationSeconds =
    (samples[samples.length - 1].timestampMs - samples[0].timestampMs) / 1000
  const blinkRate =
    durationSeconds > 0 ? (countBlinkEdges(samples) / durationSeconds) * 60 : 0

  return { eyeContactRatio, blinkRate, likabilityScore, tensionScore, neutralScore }
}
