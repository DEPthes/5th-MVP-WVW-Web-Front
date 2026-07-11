import type { FacialMetrics } from "@/types"

export interface FrameSample {
  eyeContact: boolean
  expressionScore: number
}

interface BlendshapeCategory {
  categoryName: string
  score: number
}

// ponytail: 아이컨택/표정변화 판정 임계치는 실제 데이터로 튜닝 필요한 자리표시자
export const EYE_LOOK_THRESHOLD = 0.3
export const EXPRESSION_DELTA_THRESHOLD = 0.15

const EXPRESSION_CATEGORIES = [
  "mouthSmileLeft",
  "mouthSmileRight",
  "browInnerUp",
  "jawOpen",
]

export function extractSample(categories: BlendshapeCategory[]): FrameSample {
  const scoreOf = (name: string) =>
    categories.find((c) => c.categoryName === name)?.score ?? 0

  const lookOut = Math.max(scoreOf("eyeLookOutLeft"), scoreOf("eyeLookOutRight"))
  const lookIn = Math.max(scoreOf("eyeLookInLeft"), scoreOf("eyeLookInRight"))
  const eyeContact = Math.max(lookOut, lookIn) < EYE_LOOK_THRESHOLD

  const expressionScore = EXPRESSION_CATEGORIES.reduce(
    (sum, name) => sum + scoreOf(name),
    0
  )

  return { eyeContact, expressionScore }
}

export function summarizeSamples(samples: FrameSample[]): FacialMetrics {
  if (samples.length === 0) {
    return { eyeContactRatio: 0, expressionChanges: 0 }
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

  return { eyeContactRatio, expressionChanges }
}
