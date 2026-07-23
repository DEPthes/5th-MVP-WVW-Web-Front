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

const EXPRESSION_CATEGORIES = [
  "mouthSmileLeft",
  "mouthSmileRight",
  "browInnerUp",
  "jawOpen",
]

export function extractSample(
  categories: BlendshapeCategory[],
  timestampMs = 0
): FrameSample {
  const scoreOf = (name: string) =>
    categories.find((c) => c.categoryName === name)?.score ?? 0

  const lookOut = Math.max(scoreOf("eyeLookOutLeft"), scoreOf("eyeLookOutRight"))
  const lookIn = Math.max(scoreOf("eyeLookInLeft"), scoreOf("eyeLookInRight"))
  const eyeContact = Math.max(lookOut, lookIn) < EYE_LOOK_THRESHOLD

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

  return { eyeContactRatio, expressionChanges, blinkRate, expressionTimeline: [] }
}
