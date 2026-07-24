import { describe, expect, it } from "vitest"
import type { Matrix } from "@mediapipe/tasks-vision"
import {
  computeHeadPoseAngles,
  extractSample,
  summarizeSamples,
} from "@/lib/facialMetrics"

function rotationMatrixYawDeg(yawDeg: number): Matrix {
  const yawRad = (yawDeg * Math.PI) / 180
  const cos = Math.cos(yawRad)
  const sin = Math.sin(yawRad)
  // 3x3 회전(Y축) + 4x4 동차좌표, MediaPipe Matrix는 column-major 평탄화
  const rows = [
    [cos, 0, sin, 0],
    [0, 1, 0, 0],
    [-sin, 0, cos, 0],
    [0, 0, 0, 1],
  ]
  const data: number[] = []
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      data.push(rows[row][col])
    }
  }
  return { rows: 4, columns: 4, data }
}

const IDENTITY_MATRIX = rotationMatrixYawDeg(0)

describe("extractSample", () => {
  it("treats low eye-look scores as eye contact when head pose is neutral", () => {
    const sample = extractSample(
      [
        { categoryName: "eyeLookOutLeft", score: 0.05 },
        { categoryName: "eyeLookInRight", score: 0.1 },
      ],
      0,
      [IDENTITY_MATRIX]
    )

    expect(sample.eyeContact).toBe(true)
  })

  it("treats high eye-look scores as no eye contact", () => {
    const sample = extractSample(
      [{ categoryName: "eyeLookOutLeft", score: 0.8 }],
      0,
      [IDENTITY_MATRIX]
    )

    expect(sample.eyeContact).toBe(false)
  })

  it("treats large head yaw as no eye contact even with low eye-look scores", () => {
    const sample = extractSample(
      [
        { categoryName: "eyeLookOutLeft", score: 0.05 },
        { categoryName: "eyeLookInRight", score: 0.1 },
      ],
      0,
      [rotationMatrixYawDeg(45)]
    )

    expect(sample.eyeContact).toBe(false)
  })

  it("treats a missing head pose matrix as no eye contact (conservative)", () => {
    const sample = extractSample(
      [
        { categoryName: "eyeLookOutLeft", score: 0.05 },
        { categoryName: "eyeLookInRight", score: 0.1 },
      ],
      0,
      []
    )

    expect(sample.eyeContact).toBe(false)
  })

  it("averages the likability categories, treating missing ones as 0", () => {
    const sample = extractSample([
      { categoryName: "mouthSmileLeft", score: 0.7 },
      { categoryName: "mouthSmileRight", score: 0.7 },
    ])

    expect(sample.likabilityScore).toBeCloseTo((0.7 + 0.7) / 7)
  })

  it("averages the tension categories", () => {
    const sample = extractSample([
      { categoryName: "browDownLeft", score: 0.5 },
      { categoryName: "browDownRight", score: 0.3 },
    ])

    expect(sample.tensionScore).toBeCloseTo((0.5 + 0.3) / 10)
  })

  it("uses _neutral directly as the neutral score", () => {
    const sample = extractSample([{ categoryName: "_neutral", score: 0.9 }])

    expect(sample.neutralScore).toBeCloseTo(0.9)
  })

  it("computes blink score from the max of left/right eye blink", () => {
    const sample = extractSample([
      { categoryName: "eyeBlinkLeft", score: 0.2 },
      { categoryName: "eyeBlinkRight", score: 0.6 },
    ])

    expect(sample.blinkScore).toBeCloseTo(0.6)
  })
})

describe("computeHeadPoseAngles", () => {
  it("returns ~0 yaw for the identity matrix", () => {
    const { yawDeg, pitchDeg } = computeHeadPoseAngles(IDENTITY_MATRIX)
    expect(yawDeg).toBeCloseTo(0, 1)
    expect(pitchDeg).toBeCloseTo(0, 1)
  })

  it("returns ~30 yaw for a 30-degree yaw rotation matrix", () => {
    const { yawDeg } = computeHeadPoseAngles(rotationMatrixYawDeg(30))
    expect(yawDeg).toBeCloseTo(30, 1)
  })
})

describe("summarizeSamples", () => {
  it("returns zeros for no samples", () => {
    expect(summarizeSamples([])).toEqual({
      eyeContactRatio: 0,
      blinkRate: 0,
      likabilityScore: 0,
      tensionScore: 0,
      neutralScore: 0,
    })
  })

  it("computes the eye contact ratio", () => {
    const result = summarizeSamples([
      { eyeContact: true, likabilityScore: 0, tensionScore: 0, neutralScore: 0, blinkScore: 0, timestampMs: 0 },
      { eyeContact: true, likabilityScore: 0, tensionScore: 0, neutralScore: 0, blinkScore: 0, timestampMs: 1000 },
      { eyeContact: false, likabilityScore: 0, tensionScore: 0, neutralScore: 0, blinkScore: 0, timestampMs: 2000 },
      { eyeContact: false, likabilityScore: 0, tensionScore: 0, neutralScore: 0, blinkScore: 0, timestampMs: 3000 },
    ])

    expect(result.eyeContactRatio).toBe(0.5)
  })

  it("averages likability/tension/neutral scores across all frames", () => {
    const result = summarizeSamples([
      { eyeContact: true, likabilityScore: 0.2, tensionScore: 0.8, neutralScore: 0.1, blinkScore: 0, timestampMs: 0 },
      { eyeContact: true, likabilityScore: 0.6, tensionScore: 0.4, neutralScore: 0.3, blinkScore: 0, timestampMs: 1000 },
    ])

    expect(result.likabilityScore).toBeCloseTo(0.4)
    expect(result.tensionScore).toBeCloseTo(0.6)
    expect(result.neutralScore).toBeCloseTo(0.2)
  })

  it("computes blink rate from rising edges over a 10 second span", () => {
    const result = summarizeSamples([
      { eyeContact: true, likabilityScore: 0, tensionScore: 0, neutralScore: 0, blinkScore: 0, timestampMs: 0 },
      { eyeContact: true, likabilityScore: 0, tensionScore: 0, neutralScore: 0, blinkScore: 0.9, timestampMs: 2000 },
      { eyeContact: true, likabilityScore: 0, tensionScore: 0, neutralScore: 0, blinkScore: 0.9, timestampMs: 4000 },
      { eyeContact: true, likabilityScore: 0, tensionScore: 0, neutralScore: 0, blinkScore: 0, timestampMs: 6000 },
      { eyeContact: true, likabilityScore: 0, tensionScore: 0, neutralScore: 0, blinkScore: 0.9, timestampMs: 8000 },
      { eyeContact: true, likabilityScore: 0, tensionScore: 0, neutralScore: 0, blinkScore: 0, timestampMs: 10000 },
    ])

    expect(result.blinkRate).toBe(12) // 2 edges / 10s * 60
  })

  it("returns zero blink rate when duration is zero", () => {
    const result = summarizeSamples([
      { eyeContact: true, likabilityScore: 0, tensionScore: 0, neutralScore: 0, blinkScore: 0, timestampMs: 0 },
    ])

    expect(result.blinkRate).toBe(0)
  })
})
