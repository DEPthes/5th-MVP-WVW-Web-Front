import { describe, expect, it } from "vitest"
import { computeRms, estimatePitchHz } from "@/lib/voiceMetrics"

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
