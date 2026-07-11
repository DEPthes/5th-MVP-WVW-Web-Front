import { describe, expect, it } from "vitest"
import { extractSample, summarizeSamples } from "@/lib/facialMetrics"

describe("extractSample", () => {
  it("treats low eye-look scores as eye contact", () => {
    const sample = extractSample([
      { categoryName: "eyeLookOutLeft", score: 0.05 },
      { categoryName: "eyeLookInRight", score: 0.1 },
    ])

    expect(sample.eyeContact).toBe(true)
  })

  it("treats high eye-look scores as no eye contact", () => {
    const sample = extractSample([
      { categoryName: "eyeLookOutLeft", score: 0.8 },
    ])

    expect(sample.eyeContact).toBe(false)
  })

  it("sums only the expression categories, ignoring unrelated ones", () => {
    const sample = extractSample([
      { categoryName: "mouthSmileLeft", score: 0.4 },
      { categoryName: "mouthSmileRight", score: 0.3 },
      { categoryName: "eyeBlinkLeft", score: 0.9 },
    ])

    expect(sample.expressionScore).toBeCloseTo(0.7)
  })
})

describe("summarizeSamples", () => {
  it("returns zeros for no samples", () => {
    expect(summarizeSamples([])).toEqual({
      eyeContactRatio: 0,
      expressionChanges: 0,
    })
  })

  it("computes the eye contact ratio", () => {
    const result = summarizeSamples([
      { eyeContact: true, expressionScore: 0 },
      { eyeContact: true, expressionScore: 0 },
      { eyeContact: false, expressionScore: 0 },
      { eyeContact: false, expressionScore: 0 },
    ])

    expect(result.eyeContactRatio).toBe(0.5)
  })

  it("counts expression changes that cross the threshold", () => {
    const result = summarizeSamples([
      { eyeContact: true, expressionScore: 0 },
      { eyeContact: true, expressionScore: 0.05 }, // small change, ignored
      { eyeContact: true, expressionScore: 0.5 }, // big jump, counted
      { eyeContact: true, expressionScore: 0.52 }, // small change, ignored
      { eyeContact: true, expressionScore: 0.05 }, // big drop, counted
    ])

    expect(result.expressionChanges).toBe(2)
  })
})
