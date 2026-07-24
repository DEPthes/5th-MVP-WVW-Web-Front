import type { Matrix } from "@mediapipe/tasks-vision"
import type { FacialMetrics } from "@/types"

export interface FrameSample {
  eyeContact: boolean
  expressionScore: number
  blinkScore: number
  timestampMs: number
}

interface BlendshapeCategory {
  categoryName: string
  score: number
}

// ponytail: 아이컨택/표정변화/깜빡임 판정 임계치는 실제 데이터로 튜닝 필요한 자리표시자
export const EYE_LOOK_THRESHOLD = 0.3
export const EXPRESSION_DELTA_THRESHOLD = 0.15
export const BLINK_SCORE_THRESHOLD = 0.5
export const HEAD_YAW_THRESHOLD_DEG = 20
export const HEAD_PITCH_THRESHOLD_DEG = 20

const EXPRESSION_CATEGORIES = [
  "mouthSmileLeft",
  "mouthSmileRight",
  "browInnerUp",
  "jawOpen",
]

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

  const expressionScore = EXPRESSION_CATEGORIES.reduce(
    (sum, name) => sum + scoreOf(name),
    0
  )

  const blinkScore = Math.max(scoreOf("eyeBlinkLeft"), scoreOf("eyeBlinkRight"))

  return { eyeContact, expressionScore, blinkScore, timestampMs }
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
      expressionChanges: 0,
      blinkRate: 0,
      expressionTimeline: [],
    }
  }

  const eyeContactRatio =
    samples.filter((s) => s.eyeContact).length / samples.length

  let expressionChanges = 0
  let previousScore = samples[0].expressionScore
  for (const sample of samples.slice(1)) {
    if (Math.abs(sample.expressionScore - previousScore) > EXPRESSION_DELTA_THRESHOLD) {
      expressionChanges += 1
    }
    previousScore = sample.expressionScore
  }

  const durationSeconds =
    (samples[samples.length - 1].timestampMs - samples[0].timestampMs) / 1000
  const blinkRate =
    durationSeconds > 0 ? (countBlinkEdges(samples) / durationSeconds) * 60 : 0

  const startMs = samples[0].timestampMs
  const endMs = samples[samples.length - 1].timestampMs
  const bucketCount = Math.floor((endMs - startMs) / 1000) + 1
  const buckets: number[][] = Array.from({ length: bucketCount }, () => [])
  for (const sample of samples) {
    const index = Math.min(
      bucketCount - 1,
      Math.floor((sample.timestampMs - startMs) / 1000)
    )
    buckets[index].push(sample.expressionScore)
  }
  const expressionTimeline = buckets.map((scores) =>
    scores.length === 0 ? 0 : scores.reduce((sum, s) => sum + s, 0) / scores.length
  )

  return { eyeContactRatio, expressionChanges, blinkRate, expressionTimeline }
}
