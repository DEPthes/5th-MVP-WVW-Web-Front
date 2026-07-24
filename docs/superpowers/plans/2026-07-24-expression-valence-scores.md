# 표정 점수를 호감도/긴장도/무표정도로 교체 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `facialMetrics.ts`의 `expressionScore`/`expressionChanges`/`expressionTimeline`을 제거하고, 블렌드셰이프를 3개 카테고리(호감도/긴장도/무표정도)로 묶어 평균 낸 0~1 점수로 교체한다.

**Architecture:** 프레임마다 카테고리별 블렌드셰이프 평균을 계산(`FrameSample`), 녹화 전체에 대해 그 프레임 값들을 다시 평균(`summarizeSamples`) — 기존 `eyeContactRatio`/`blinkRate` 집계 패턴과 동일한 구조.

**Tech Stack:** TypeScript, 기존 `@mediapipe/tasks-vision` 타입만 사용(새 의존성 없음), Vitest.

## Global Constraints

- 새 npm 의존성 추가 금지.
- `eyeContactRatio`(head pose 결합 포함)와 `blinkRate` 계산 로직은 변경하지 않는다.
- 카테고리 이름과 구성은 스펙에 명시된 목록을 그대로 사용한다(임의로 추가/축소하지 않음).
- 각 태스크 종료 시 `npx tsc -b`와 `npm test`가 모두 통과해야 한다.

---

### Task 1: 카테고리 평균 점수로 교체 (facialMetrics.ts)

**Files:**
- Modify: `src/lib/facialMetrics.ts`
- Modify: `src/lib/facialMetrics.test.ts`

**Interfaces:**
- Produces: `FrameSample{ eyeContact, likabilityScore, tensionScore, neutralScore, blinkScore, timestampMs }`,
  `summarizeSamples(...)`가 반환하는 객체에 `likabilityScore`/`tensionScore`/`neutralScore`(0~1) 포함,
  `expressionScore`/`expressionChanges`/`expressionTimeline` 완전히 제거.
  `extractSample(categories, timestampMs?, matrices?)` 시그니처는 기존과 동일하게 유지.

- [ ] **Step 1: 실패하는 테스트로 전체 교체**

`src/lib/facialMetrics.test.ts`를 다음 내용으로 완전히 교체한다:

```ts
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

    expect(result.blinkRate).toBe(12)
  })

  it("returns zero blink rate when duration is zero", () => {
    const result = summarizeSamples([
      { eyeContact: true, likabilityScore: 0, tensionScore: 0, neutralScore: 0, blinkScore: 0, timestampMs: 0 },
    ])

    expect(result.blinkRate).toBe(0)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/facialMetrics.test.ts`
Expected: FAIL — `likabilityScore`/`tensionScore`/`neutralScore`가 아직 없음.

- [ ] **Step 3: 최소 구현**

`src/lib/facialMetrics.ts`를 다음으로 교체:

```ts
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/facialMetrics.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/facialMetrics.ts src/lib/facialMetrics.test.ts
git commit -m "feat: 표정 점수를 호감도/긴장도/무표정도 3개 평균 점수로 교체"
```

---

### Task 2: FacialMetrics 타입 갱신 및 기존 테스트 호출부 수정

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/api.test.ts`

**Interfaces:**
- Consumes: Task 1의 `summarizeSamples(...)` 반환 형태.
- Produces: `FacialMetrics{ eyeContactRatio, blinkRate, likabilityScore, tensionScore, neutralScore }`.

- [ ] **Step 1: types.ts 수정**

`src/types.ts`의 `FacialMetrics` 인터페이스를 다음으로 교체:

```ts
export interface FacialMetrics {
  eyeContactRatio: number
  blinkRate: number
  likabilityScore: number
  tensionScore: number
  neutralScore: number
}
```

- [ ] **Step 2: 타입 에러 확인**

Run: `npx tsc -b`
Expected: `src/lib/api.test.ts`의 `uploadAnswer` 호출에서 `expressionChanges`/`expressionTimeline` 관련 타입 에러(존재하지 않는 프로퍼티 또는 필수 프로퍼티 누락).

- [ ] **Step 3: api.test.ts의 호출부 수정**

`src/lib/api.test.ts`에서 `uploadAnswer(...)` 호출의 facialMetrics 리터럴을 다음으로 교체:

```ts
    await uploadAnswer(
      "q1",
      new Blob(["x"]),
      {
        eyeContactRatio: 0.8,
        blinkRate: 14,
        likabilityScore: 0.3,
        tensionScore: 0.1,
        neutralScore: 0.6,
      },
      { fillerWordCount: 2, quietRatio: 0.1, trembleRatio: 0.05 }
    )
```

- [ ] **Step 4: 타입 체크 및 전체 테스트 통과 확인**

Run: `npx tsc -b && npm test`
Expected: 둘 다 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/types.ts src/lib/api.test.ts
git commit -m "feat: FacialMetrics 타입을 호감도/긴장도/무표정도 기준으로 갱신"
```

---

### Task 3: RecordPage/ResultPage UI 갱신 및 ExpressionSparkline 제거

**Files:**
- Modify: `src/pages/RecordPage.tsx`
- Modify: `src/pages/ResultPage.tsx`
- Delete: `src/components/ExpressionSparkline.tsx`

**Interfaces:**
- Consumes: Task 2의 `FacialMetrics{ eyeContactRatio, blinkRate, likabilityScore, tensionScore, neutralScore }`.

- [ ] **Step 1: RecordPage.tsx 수정**

`src/pages/RecordPage.tsx`에서 `import { ExpressionSparkline } from "@/components/ExpressionSparkline"` 줄을 삭제.

기존 facialMetrics 표시 블록:
```tsx
      {facialMetrics && (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            아이컨택 비율: {(facialMetrics.eyeContactRatio * 100).toFixed(0)}% ·
            표정 변화 횟수: {facialMetrics.expressionChanges} · 분당 깜빡임:{" "}
            {facialMetrics.blinkRate.toFixed(1)}회
          </p>
          <ExpressionSparkline values={facialMetrics.expressionTimeline} />
        </div>
      )}
```
을 다음으로 교체:
```tsx
      {facialMetrics && (
        <p className="text-sm text-muted-foreground">
          아이컨택 비율: {(facialMetrics.eyeContactRatio * 100).toFixed(0)}% ·
          분당 깜빡임: {facialMetrics.blinkRate.toFixed(1)}회 · 호감도:{" "}
          {(facialMetrics.likabilityScore * 100).toFixed(0)}% · 긴장도:{" "}
          {(facialMetrics.tensionScore * 100).toFixed(0)}% · 무표정도:{" "}
          {(facialMetrics.neutralScore * 100).toFixed(0)}%
        </p>
      )}
```

- [ ] **Step 2: ResultPage.tsx 수정**

`src/pages/ResultPage.tsx`에서 `import { ExpressionSparkline } from "@/components/ExpressionSparkline"` 줄을 삭제.

기존:
```tsx
          <p className="text-sm text-muted-foreground">
            아이컨택 비율: {(answer.facialMetrics.eyeContactRatio * 100).toFixed(0)}% ·
            표정 변화 횟수: {answer.facialMetrics.expressionChanges} · 분당 깜빡임:{" "}
            {answer.facialMetrics.blinkRate.toFixed(1)}회 · 답변 시간:{" "}
            {answer.durationSeconds}초
          </p>
          <ExpressionSparkline values={answer.facialMetrics.expressionTimeline} />
```
을 다음으로 교체:
```tsx
          <p className="text-sm text-muted-foreground">
            아이컨택 비율: {(answer.facialMetrics.eyeContactRatio * 100).toFixed(0)}% ·
            분당 깜빡임: {answer.facialMetrics.blinkRate.toFixed(1)}회 · 호감도:{" "}
            {(answer.facialMetrics.likabilityScore * 100).toFixed(0)}% · 긴장도:{" "}
            {(answer.facialMetrics.tensionScore * 100).toFixed(0)}% · 무표정도:{" "}
            {(answer.facialMetrics.neutralScore * 100).toFixed(0)}% · 답변 시간:{" "}
            {answer.durationSeconds}초
          </p>
```

- [ ] **Step 3: ExpressionSparkline.tsx 삭제**

```bash
git rm src/components/ExpressionSparkline.tsx
```

- [ ] **Step 4: 타입 체크 및 전체 테스트 통과 확인**

Run: `npx tsc -b && npm test`
Expected: 둘 다 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/pages/RecordPage.tsx src/pages/ResultPage.tsx
git commit -m "feat: RecordPage/ResultPage에 호감도/긴장도/무표정도 표시, ExpressionSparkline 제거"
```
