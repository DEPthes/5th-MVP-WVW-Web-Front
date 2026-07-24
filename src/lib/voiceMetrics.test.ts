import { describe, expect, it } from "vitest"
import { computeRms, estimatePitchHz, summarizeVoiceSamples } from "@/lib/voiceMetrics"

function generateSineWave(
  freqHz: number,
  sampleRate: number,
  durationSec: number
): Float32Array {
  const length = Math.floor(sampleRate * durationSec)
  const buffer = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    buffer[i] = Math.sin((2 * Math.PI * freqHz * i) / sampleRate)
  }
  return buffer
}

describe("computeRms", () => {
  it("returns the constant magnitude for a flat buffer", () => {
    expect(computeRms(new Float32Array(100).fill(0.5))).toBeCloseTo(0.5)
  })

  it("returns 0 for silence", () => {
    expect(computeRms(new Float32Array(100))).toBe(0)
  })
})

describe("estimatePitchHz", () => {
  it("estimates the fundamental frequency of a sine wave", () => {
    const buffer = generateSineWave(220, 16000, 0.05)
    const pitch = estimatePitchHz(buffer, 16000)
    expect(pitch).not.toBeNull()
    expect(Math.abs((pitch ?? 0) - 220)).toBeLessThan(10)
  })

  it("returns null for silence", () => {
    expect(estimatePitchHz(new Float32Array(800), 16000)).toBeNull()
  })
})

describe("summarizeVoiceSamples", () => {
  it("returns zeros for no samples", () => {
    expect(summarizeVoiceSamples([])).toEqual({ quietRatio: 0, trembleRatio: 0 })
  })

  it("computes quiet ratio from rms below threshold", () => {
    const result = summarizeVoiceSamples([
      { rms: 0.01, pitchHz: 150 },
      { rms: 0.01, pitchHz: 150 },
      { rms: 0.05, pitchHz: 150 },
      { rms: 0.05, pitchHz: 150 },
    ])
    expect(result.quietRatio).toBe(0.5)
  })

  it("does not flag a window with stable pitch as trembling", () => {
    const stableSamples = Array.from({ length: 5 }, () => ({
      rms: 0.05,
      pitchHz: 150,
    }))
    expect(summarizeVoiceSamples(stableSamples).trembleRatio).toBe(0)
  })

  it("flags a window with wildly varying pitch as trembling", () => {
    const jitterySamples = [
      { rms: 0.05, pitchHz: 100 },
      { rms: 0.05, pitchHz: 200 },
      { rms: 0.05, pitchHz: 100 },
      { rms: 0.05, pitchHz: 200 },
      { rms: 0.05, pitchHz: 100 },
    ]
    expect(summarizeVoiceSamples(jitterySamples).trembleRatio).toBe(1)
  })
})
