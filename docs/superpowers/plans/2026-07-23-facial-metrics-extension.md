# 얼굴 지표 확장 (그룹 A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MediaPipe FaceLandmarker 파이프라인에 눈 깜빡임 빈도, head pose 기반 응시 판정, 표정 변화 타임라인 3개 지표를 추가한다.

**Architecture:** 기존 `src/lib/facialMetrics.ts`의 순수 함수(`extractSample`/`summarizeSamples`) 패턴을 그대로 확장한다. `extractSample`은 프레임마다 원시 값(블링크 점수, head pose 각도, timestamp)만 수집하고, 시간 축에 걸친 판정(깜빡임 rising-edge 카운트, 타임라인 버킷팅)은 기존 `expressionChanges` 계산과 동일하게 `summarizeSamples`에서 수행한다.

**Tech Stack:** TypeScript, `@mediapipe/tasks-vision` (이미 설치됨, 새 의존성 없음), Vitest(`environment: 'node'`).

## Global Constraints

- 새 npm 의존성 추가 금지 — 표정 타임라인 시각화는 인라인 SVG로 구현(차트 라이브러리 불필요).
- 튜닝이 필요한 임계치는 기존 `EYE_LOOK_THRESHOLD`/`EXPRESSION_DELTA_THRESHOLD`와 동일하게 `// ponytail: ... 자리표시자` 주석을 남긴다.
- 테스트는 `src/lib/facialMetrics.ts`의 순수 함수 로직만 대상으로 한다 — vitest 환경이 `node`라 DOM/컴포넌트 테스트는 대상 밖(기존 컨벤션 유지, RecordPage/ResultPage에는 테스트 파일 없음).
- `FacialMetrics` 타입에 필드를 추가하면 `POST /api/answers`로 백엔드에 전송되는 페이로드가 커진다 — 백엔드 변경은 이 플랜 범위 밖(스펙 문서에 명시됨).
- 각 태스크 종료 시 `npx tsc -b`(타입 체크)와 `npm test`(vitest)가 모두 통과해야 한다.

---

### Task 1: 눈 깜빡임 빈도 (blinkRate)

**Files:**
- Modify: `src/lib/facialMetrics.ts`
- Modify: `src/lib/facialMetrics.test.ts`

**Interfaces:**
- Produces: `FrameSample.timestampMs: number`, `FrameSample.blinkScore: number`, `extractSample(categories: BlendshapeCategory[], timestampMs?: number): FrameSample` (timestampMs 2번째 파라미터, 기본값 0 — 기존 호출부 호환), `summarizeSamples(...): FacialMetrics`가 이제 `blinkRate: number` 필드를 포함.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/facialMetrics.test.ts`의 `summarizeSamples` describe 블록 안에 추가:

```ts
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
```

또한 기존 "returns zeros for no samples" 테스트를 다음으로 교체(새 필드 반영):

```ts
  it("returns zeros for no samples", () => {
    expect(summarizeSamples([])).toEqual({
      eyeContactRatio: 0,
      expressionChanges: 0,
      blinkRate: 0,
      expressionTimeline: [],
    })
  })
```

그리고 기존 "computes the eye contact ratio"/"counts expression changes..." 테스트의 각 샘플 객체에 `blinkScore: 0, timestampMs: <인덱스>*1000` 필드를 추가해 타입 에러를 없앤다(예: 4개 샘플이면 0,1000,2000,3000ms).

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/facialMetrics.test.ts`
Expected: FAIL — `blinkScore`/`timestampMs` 프로퍼티가 `FrameSample` 타입에 없다는 타입 에러, 또는 `blinkRate`가 undefined.

- [ ] **Step 3: 최소 구현**

`src/lib/facialMetrics.ts`를 다음으로 수정:

```ts
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
```

(`expressionTimeline`은 Task 3에서 채운다 — 지금은 빈 배열로 타입만 맞춘다.)

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/facialMetrics.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/facialMetrics.ts src/lib/facialMetrics.test.ts
git commit -m "feat: 눈 깜빡임 빈도(blinkRate) 지표 추가"
```

---

### Task 2: head pose 기반 응시 판정

**Files:**
- Modify: `src/lib/facialMetrics.ts`
- Modify: `src/lib/facialMetrics.test.ts`

**Interfaces:**
- Consumes: Task 1의 `FrameSample`, `extractSample(categories, timestampMs?)`.
- Produces: `extractSample(categories: BlendshapeCategory[], timestampMs?: number, matrices?: Matrix[]): FrameSample` (`matrices` 3번째 파라미터, 기본값 `[]`). `eyeContact`는 이제 eyeLook AND head pose 조건.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/facialMetrics.test.ts` 상단에 fixture 추가(다른 `describe` 밖, import 아래):

```ts
import type { Matrix } from "@mediapipe/tasks-vision"

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
```

`extractSample` describe 블록에 추가:

```ts
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
```

기존 두 테스트("treats low eye-look scores as eye contact", "treats high eye-look scores as no eye contact")의 `extractSample(...)` 호출에 3번째 인자로 `[IDENTITY_MATRIX]`를 추가해 head pose를 중립으로 고정한다(예: `extractSample([...], 0, [IDENTITY_MATRIX])`).

새 `describe("computeHeadPoseAngles")` 블록도 추가:

```ts
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
```

`computeHeadPoseAngles`를 import 목록에 추가: `import { computeHeadPoseAngles, extractSample, summarizeSamples } from "@/lib/facialMetrics"`.

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/facialMetrics.test.ts`
Expected: FAIL — `computeHeadPoseAngles`가 export되지 않음, head pose 관련 assertion 실패.

- [ ] **Step 3: 최소 구현**

`src/lib/facialMetrics.ts`에 추가/수정:

```ts
import type { Matrix } from "@mediapipe/tasks-vision"

// ... 기존 import/상수 아래에 추가
export const HEAD_YAW_THRESHOLD_DEG = 20
export const HEAD_PITCH_THRESHOLD_DEG = 20

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
```

`extractSample` 시그니처와 `eyeContact` 계산 수정:

```ts
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/facialMetrics.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/facialMetrics.ts src/lib/facialMetrics.test.ts
git commit -m "feat: head pose 기반 응시 판정 추가 (eyeLook AND head pose)"
```

---

### Task 3: 표정 변화 타임라인 (expressionTimeline)

**Files:**
- Modify: `src/lib/facialMetrics.ts`
- Modify: `src/lib/facialMetrics.test.ts`

**Interfaces:**
- Consumes: Task 1/2의 `FrameSample{ timestampMs, expressionScore }`.
- Produces: `summarizeSamples(...).expressionTimeline: number[]` — 1초 버킷 평균, 배열 길이는 `floor((마지막-첫timestamp)/1000)+1`.

- [ ] **Step 1: 실패하는 테스트 작성**

`summarizeSamples` describe 블록에 추가:

```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/facialMetrics.test.ts`
Expected: FAIL — `expressionTimeline`이 항상 `[]`.

- [ ] **Step 3: 최소 구현**

`summarizeSamples`에 버킷팅 로직 추가(기존 `return` 직전, `expressionTimeline: []`를 아래로 교체):

```ts
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/facialMetrics.test.ts`
Expected: PASS (전체 파일 기준 `npx vitest run src/lib/facialMetrics.test.ts`로 회귀 없는지도 확인)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/facialMetrics.ts src/lib/facialMetrics.test.ts
git commit -m "feat: 표정 변화 타임라인(expressionTimeline) 집계 추가"
```

---

### Task 4: FacialMetrics 타입 확장 및 MediaPipe 훅 배선

**Files:**
- Modify: `src/types.ts`
- Modify: `src/hooks/useFaceLandmarkerMetrics.ts`
- Modify: `src/lib/api.test.ts`

**Interfaces:**
- Consumes: Task 1-3의 `FacialMetrics{ eyeContactRatio, expressionChanges, blinkRate, expressionTimeline }`, `extractSample(categories, timestampMs?, matrices?)`.
- Produces: `FacialMetrics` 공개 타입에 `blinkRate`/`expressionTimeline` 반영, `useFaceLandmarkerMetrics`가 head pose 데이터를 실제로 수집.

- [ ] **Step 1: types.ts 수정**

`src/types.ts`의 `FacialMetrics` 인터페이스를 다음으로 교체:

```ts
export interface FacialMetrics {
  eyeContactRatio: number
  expressionChanges: number
  blinkRate: number
  expressionTimeline: number[]
}
```

- [ ] **Step 2: 타입 에러 확인 및 기존 테스트 수정**

Run: `npx tsc -b`
Expected: `src/lib/api.test.ts:65` 부근 `uploadAnswer("q1", new Blob(["x"]), { eyeContactRatio: 0.8, expressionChanges: 3 })` 호출에서 `blinkRate`/`expressionTimeline` 누락 타입 에러.

`src/lib/api.test.ts`의 해당 호출을 다음으로 수정:

```ts
    await uploadAnswer("q1", new Blob(["x"]), {
      eyeContactRatio: 0.8,
      expressionChanges: 3,
      blinkRate: 14,
      expressionTimeline: [0.1, 0.3, 0.2],
    })
```

- [ ] **Step 3: useFaceLandmarkerMetrics.ts 수정**

`src/hooks/useFaceLandmarkerMetrics.ts`의 `getFaceLandmarker`와 `loop`를 수정:

```ts
        FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: { modelAssetPath: MODEL_ASSET_URL, delegate: "GPU" },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: "VIDEO",
          numFaces: 1,
        })
```

```ts
      const loop = () => {
        if (video.readyState >= 2) {
          const ts = performance.now()
          const result = landmarker.detectForVideo(video, ts)
          const categories = result.faceBlendshapes?.[0]?.categories ?? []
          const matrices = result.facialTransformationMatrixes ?? []
          samplesRef.current.push(extractSample(categories, ts, matrices))
        }
        rafIdRef.current = requestAnimationFrame(loop)
      }
```

- [ ] **Step 4: 전체 테스트/타입 체크 통과 확인**

Run: `npx tsc -b && npm test`
Expected: 둘 다 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/types.ts src/hooks/useFaceLandmarkerMetrics.ts src/lib/api.test.ts
git commit -m "feat: FacialMetrics 타입 확장 및 head pose 데이터 수집 배선"
```

---

### Task 5: RecordPage/ResultPage에 새 지표 표시

**Files:**
- Create: `src/components/ExpressionSparkline.tsx`
- Modify: `src/pages/RecordPage.tsx`
- Modify: `src/pages/ResultPage.tsx`

**Interfaces:**
- Consumes: Task 4의 `FacialMetrics{ blinkRate, expressionTimeline }`.
- Produces: `ExpressionSparkline({ values: number[] })` React 컴포넌트(export).

- [ ] **Step 1: ExpressionSparkline 컴포넌트 작성**

`src/components/ExpressionSparkline.tsx`:

```tsx
interface ExpressionSparklineProps {
  values: number[]
}

export function ExpressionSparkline({ values }: ExpressionSparklineProps) {
  if (values.length === 0) return null

  const max = Math.max(...values, 0.01)
  const points = values
    .map(
      (v, i) =>
        `${(i / Math.max(values.length - 1, 1)) * 100},${100 - (v / max) * 100}`
    )
    .join(" ")

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-12 w-full text-muted-foreground"
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} />
    </svg>
  )
}
```

- [ ] **Step 2: RecordPage.tsx에 표시 추가**

`src/pages/RecordPage.tsx`의 import에 `ExpressionSparkline` 추가:

```ts
import { ExpressionSparkline } from "@/components/ExpressionSparkline"
```

`facialMetrics` 표시 블록을 다음으로 교체:

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

- [ ] **Step 3: ResultPage.tsx에 표시 추가**

`src/pages/ResultPage.tsx`의 import에 `ExpressionSparkline` 추가:

```ts
import { ExpressionSparkline } from "@/components/ExpressionSparkline"
```

`answer.status === "DONE"` 블록 안 지표 표시 부분을 다음으로 교체:

```tsx
          <p className="text-sm text-muted-foreground">
            아이컨택 비율: {(answer.facialMetrics.eyeContactRatio * 100).toFixed(0)}% ·
            표정 변화 횟수: {answer.facialMetrics.expressionChanges} · 분당 깜빡임:{" "}
            {answer.facialMetrics.blinkRate.toFixed(1)}회 · 답변 시간:{" "}
            {answer.durationSeconds}초
          </p>
          <ExpressionSparkline values={answer.facialMetrics.expressionTimeline} />
```

- [ ] **Step 4: 타입 체크 및 전체 테스트 통과 확인**

Run: `npx tsc -b && npm test`
Expected: 둘 다 PASS (컴포넌트 렌더 테스트는 없음 — vitest 환경이 node라 기존 컨벤션대로 대상 밖)

- [ ] **Step 5: 커밋**

```bash
git add src/components/ExpressionSparkline.tsx src/pages/RecordPage.tsx src/pages/ResultPage.tsx
git commit -m "feat: RecordPage/ResultPage에 깜빡임 빈도·표정 타임라인 표시"
```
