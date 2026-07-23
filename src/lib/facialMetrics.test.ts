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
      blinkRate: 0,
      expressionTimeline: [],
    })
  })

  it("computes the eye contact ratio", () => {
    const result = summarizeSamples([
      { eyeContact: true, expressionScore: 0, blinkScore: 0, timestampMs: 0 },
      { eyeContact: true, expressionScore: 0, blinkScore: 0, timestampMs: 1000 },
      { eyeContact: false, expressionScore: 0, blinkScore: 0, timestampMs: 2000 },
      { eyeContact: false, expressionScore: 0, blinkScore: 0, timestampMs: 3000 },
    ])

    expect(result.eyeContactRatio).toBe(0.5)
  })

  it("counts expression changes that cross the threshold", () => {
    const result = summarizeSamples([
      { eyeContact: true, expressionScore: 0, blinkScore: 0, timestampMs: 0 },
      { eyeContact: true, expressionScore: 0.05, blinkScore: 0, timestampMs: 1000 }, // small change, ignored
      { eyeContact: true, expressionScore: 0.5, blinkScore: 0, timestampMs: 2000 }, // big jump, counted
      { eyeContact: true, expressionScore: 0.52, blinkScore: 0, timestampMs: 3000 }, // small change, ignored
      { eyeContact: true, expressionScore: 0.05, blinkScore: 0, timestampMs: 4000 }, // big drop, counted
    ])

    expect(result.expressionChanges).toBe(2)
  })

  it("computes blink rate from rising edges over a 10 second span", () => {
    const result = summarizeSamples([
      { eyeContact: true, expressionScore: 0, blinkScore: 0, timestampMs: 0 },
      { eyeContact: true, expressionScore: 0, blinkScore: 0.9, timestampMs: 2000 }, // edge 1
      { eyeContact: true, expressionScore: 0, blinkScore: 0.9, timestampMs: 4000 }, // still closed, no new edge
      { eyeContact: true, expressionScore: 0, blinkScore: 0, timestampMs: 6000 },
      { eyeContact: true, expressionScore: 0, blinkScore: 0.9, timestampMs: 8000 }, // edge 2
      { eyeContact: true, expressionScore: 0, blinkScore: 0, timestampMs: 10000 },
    ])

    expect(result.blinkRate).toBe(12) // 2 edges / 10s * 60
  })

  it("returns zero blink rate when duration is zero", () => {
    const result = summarizeSamples([
      { eyeContact: true, expressionScore: 0, blinkScore: 0, timestampMs: 0 },
    ])

    expect(result.blinkRate).toBe(0)
  })
})
