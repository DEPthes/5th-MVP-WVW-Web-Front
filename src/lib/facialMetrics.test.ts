import { describe, expect, it } from "vitest"
import type { Matrix } from "@mediapipe/tasks-vision"
import { computeHeadPoseAngles, extractSample, summarizeSamples } from "@/lib/facialMetrics"

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
  it("treats low eye-look scores as eye contact", () => {
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

  it("buckets expression scores into 1-second averages", () => {
    const result = summarizeSamples([
      { eyeContact: true, expressionScore: 0.2, blinkScore: 0, timestampMs: 0 },
      { eyeContact: true, expressionScore: 0.4, blinkScore: 0, timestampMs: 500 },
      { eyeContact: true, expressionScore: 0.6, blinkScore: 0, timestampMs: 1200 },
      { eyeContact: true, expressionScore: 0.8, blinkScore: 0, timestampMs: 1800 },
      { eyeContact: true, expressionScore: 1.0, blinkScore: 0, timestampMs: 2100 },
    ])

    expect(result.expressionTimeline).toHaveLength(3)
    expect(result.expressionTimeline[0]).toBeCloseTo(0.3) // (0.2+0.4)/2
    expect(result.expressionTimeline[1]).toBeCloseTo(0.7) // (0.6+0.8)/2
    expect(result.expressionTimeline[2]).toBeCloseTo(1.0) // (1.0)/1
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
