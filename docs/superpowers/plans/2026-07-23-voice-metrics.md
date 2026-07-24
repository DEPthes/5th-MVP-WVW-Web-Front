# 음성 분석 (그룹 B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 답변 녹화 중 마이크 오디오를 분석해 필러워드 카운트, 작은 목소리 구간 비율, 목소리 떨림 구간 비율을 추가한다.

**Architecture:** `facialMetrics.ts`와 동일한 패턴(순수 로직 파일 + 이를 감싸는 브라우저 API 훅)을 두 갈래로 적용한다. 볼륨/피치는 `src/lib/voiceMetrics.ts`(Web Audio API `AnalyserNode` 래핑), 필러워드는 `src/lib/fillerWords.ts`(Web Speech API `SpeechRecognition` 래핑)로 분리한다. 오디오 스트림은 `useMediaRecorderCapture`가 이미 획득한 것을 재사용— 마이크 재요청 없음.

**Tech Stack:** TypeScript, Web Audio API(`AudioContext`/`AnalyserNode`, 표준), Web Speech API(`SpeechRecognition`/`webkitSpeechRecognition`, Chrome/Edge 계열만 안정 지원), Vitest(`environment: 'node'`).

## Global Constraints

- **선행 조건**: 이 플랜은 `docs/superpowers/plans/2026-07-23-facial-metrics-extension.md`(그룹 A)가 먼저 완료된 상태를 전제로 한다 — `RecordPage.tsx`/`ResultPage.tsx`/`api.test.ts`의 "Before" 상태는 그룹 A 적용 후 코드다.
- 새 npm 의존성 추가 금지 — Web Audio API/Web Speech API는 브라우저 표준 API.
- 튜닝이 필요한 임계치(quiet/tremble RMS·Hz 기준)는 기존 컨벤션과 동일하게 `// ponytail: ... 자리표시자` 주석을 남긴다.
- 순수 로직(`voiceMetrics.ts`, `fillerWords.ts`)만 vitest로 테스트한다. 브라우저 API를 직접 다루는 훅(`useVoiceMetrics`, `useFillerWordCounter`)은 `useFaceLandmarkerMetrics`와 동일하게 자동 테스트 대상 밖(node 환경에 `AudioContext`/`SpeechRecognition`이 없음).
- `SpeechRecognition`은 Firefox 등 일부 브라우저에서 미지원 — 미지원 시 에러 상태로 노출하고 녹화 자체는 막지 않는다.
- 각 태스크 종료 시 `npx tsc -b`(타입 체크)와 `npm test`(vitest)가 모두 통과해야 한다.

---

### Task 1: 볼륨(RMS)·피치 추정 순수 로직

**Files:**
- Create: `src/lib/voiceMetrics.ts`
- Create: `src/lib/voiceMetrics.test.ts`

**Interfaces:**
- Produces: `computeRms(buffer: Float32Array): number`, `estimatePitchHz(buffer: Float32Array, sampleRate: number): number | null` (무음/저진폭이면 `null`).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/voiceMetrics.test.ts`:

```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/voiceMetrics.test.ts`
Expected: FAIL — 모듈 `@/lib/voiceMetrics`가 없어 import 에러.

- [ ] **Step 3: 최소 구현**

`src/lib/voiceMetrics.ts`:

```ts
// ponytail: 임계치는 실제 마이크/환경 데이터로 튜닝 필요한 자리표시자
export const PITCH_DETECTION_MIN_RMS = 0.01
export const MIN_PITCH_HZ = 70
export const MAX_PITCH_HZ = 500

export function computeRms(buffer: Float32Array): number {
  let sumSquares = 0
  for (let i = 0; i < buffer.length; i++) {
    sumSquares += buffer[i] * buffer[i]
  }
  return Math.sqrt(sumSquares / buffer.length)
}

export function estimatePitchHz(
  buffer: Float32Array,
  sampleRate: number
): number | null {
  if (computeRms(buffer) < PITCH_DETECTION_MIN_RMS) return null

  const minLag = Math.floor(sampleRate / MAX_PITCH_HZ)
  const maxLag = Math.floor(sampleRate / MIN_PITCH_HZ)

  let bestLag = -1
  let bestCorrelation = 0
  for (let lag = minLag; lag <= maxLag && lag < buffer.length; lag++) {
    let correlation = 0
    for (let i = 0; i < buffer.length - lag; i++) {
      correlation += buffer[i] * buffer[i + lag]
    }
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation
      bestLag = lag
    }
  }

  return bestLag === -1 ? null : sampleRate / bestLag
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/voiceMetrics.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/voiceMetrics.ts src/lib/voiceMetrics.test.ts
git commit -m "feat: RMS/피치 추정 순수 로직(voiceMetrics) 추가"
```

---

### Task 2: 프레임 판정 및 집계 (quietRatio, trembleRatio)

**Files:**
- Modify: `src/lib/voiceMetrics.ts`
- Modify: `src/lib/voiceMetrics.test.ts`

**Interfaces:**
- Consumes: Task 1의 `computeRms`, `estimatePitchHz`.
- Produces: `VoiceFrameSample{ rms, pitchHz }`, `extractVoiceSample(buffer, sampleRate): VoiceFrameSample`, `summarizeVoiceSamples(samples: VoiceFrameSample[]): { quietRatio: number; trembleRatio: number }`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/voiceMetrics.test.ts`에 추가:

```ts
import { summarizeVoiceSamples } from "@/lib/voiceMetrics"

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
```

(위 import는 파일 상단의 기존 `import { computeRms, estimatePitchHz } from "@/lib/voiceMetrics"`에 `summarizeVoiceSamples`를 합쳐 한 줄로 정리한다.)

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/voiceMetrics.test.ts`
Expected: FAIL — `summarizeVoiceSamples`가 export되지 않음.

- [ ] **Step 3: 최소 구현**

`src/lib/voiceMetrics.ts`에 추가:

```ts
export interface VoiceFrameSample {
  rms: number
  pitchHz: number | null
}

// ponytail: 임계치는 실제 데이터로 튜닝 필요한 자리표시자
export const QUIET_RMS_THRESHOLD = 0.02
export const TREMBLE_PITCH_STDDEV_THRESHOLD_HZ = 15
export const PITCH_WINDOW_SIZE = 5

export function extractVoiceSample(
  buffer: Float32Array,
  sampleRate: number
): VoiceFrameSample {
  return { rms: computeRms(buffer), pitchHz: estimatePitchHz(buffer, sampleRate) }
}

export function summarizeVoiceSamples(samples: VoiceFrameSample[]): {
  quietRatio: number
  trembleRatio: number
} {
  if (samples.length === 0) return { quietRatio: 0, trembleRatio: 0 }

  const quietRatio =
    samples.filter((s) => s.rms < QUIET_RMS_THRESHOLD).length / samples.length

  if (samples.length < PITCH_WINDOW_SIZE) return { quietRatio, trembleRatio: 0 }

  let trembleWindows = 0
  let totalWindows = 0
  for (let i = 0; i + PITCH_WINDOW_SIZE <= samples.length; i++) {
    const pitches = samples
      .slice(i, i + PITCH_WINDOW_SIZE)
      .map((s) => s.pitchHz)
      .filter((p): p is number => p !== null)
    if (pitches.length < 2) continue

    totalWindows += 1
    const mean = pitches.reduce((sum, p) => sum + p, 0) / pitches.length
    const variance =
      pitches.reduce((sum, p) => sum + (p - mean) ** 2, 0) / pitches.length
    if (Math.sqrt(variance) > TREMBLE_PITCH_STDDEV_THRESHOLD_HZ) trembleWindows += 1
  }

  const trembleRatio = totalWindows === 0 ? 0 : trembleWindows / totalWindows
  return { quietRatio, trembleRatio }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/voiceMetrics.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/voiceMetrics.ts src/lib/voiceMetrics.test.ts
git commit -m "feat: 작은 목소리/떨림 구간 비율(quietRatio, trembleRatio) 집계 추가"
```

---

### Task 3: 필러워드 카운트 순수 로직

**Files:**
- Create: `src/lib/fillerWords.ts`
- Create: `src/lib/fillerWords.test.ts`

**Interfaces:**
- Produces: `FILLER_WORDS: string[]`, `countFillerWords(transcript: string): number`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/fillerWords.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { countFillerWords } from "@/lib/fillerWords"

describe("countFillerWords", () => {
  it("counts filler words as whole tokens, ignoring content words that merely start with one", () => {
    // "그래서"는 "그"로 시작하지만 통째로 다른 토큰이라 세지 않는다
    expect(
      countFillerWords("음 그래서 어 제 생각에는 그 이렇게 저기 하고 싶습니다")
    ).toBe(4) // 음, 어, 그, 저기
  })

  it("returns 0 when there are no filler words", () => {
    expect(countFillerWords("이 프로젝트는 3개월 동안 진행했습니다")).toBe(0)
  })

  it("counts repeated occurrences of the same filler word", () => {
    expect(countFillerWords("음 음 음 좋습니다")).toBe(3)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/fillerWords.test.ts`
Expected: FAIL — 모듈 `@/lib/fillerWords`가 없어 import 에러.

- [ ] **Step 3: 최소 구현**

`src/lib/fillerWords.ts`:

```ts
// ponytail: 기본 한국어 필러워드 세트, 실측 STT 출력으로 튜닝 필요한 자리표시자
export const FILLER_WORDS = ["음", "어", "그", "저기", "니까"]

// ponytail: 공백 기준 토큰 완전 일치만 검사 — 조사/어미가 붙은 변형은 못 잡음.
// 실측 STT 출력을 보고 형태소 분석 필요 여부 판단.
export function countFillerWords(transcript: string): number {
  const tokens = transcript.split(/\s+/).filter(Boolean)
  return tokens.filter((token) => FILLER_WORDS.includes(token)).length
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/fillerWords.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/fillerWords.ts src/lib/fillerWords.test.ts
git commit -m "feat: 필러워드 카운트 순수 로직(fillerWords) 추가"
```

---

### Task 4: VoiceMetrics 타입 및 uploadAnswer 계약 확장

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/lib/api.test.ts`

**Interfaces:**
- Produces: `VoiceMetrics{ fillerWordCount, quietRatio, trembleRatio }`, `AnswerRecord.voiceMetrics: VoiceMetrics`, `uploadAnswer(questionId, video, facialMetrics, voiceMetrics)`.

- [ ] **Step 1: types.ts 수정**

`src/types.ts`에 `FacialMetrics` 인터페이스 아래 추가:

```ts
export interface VoiceMetrics {
  fillerWordCount: number
  quietRatio: number
  trembleRatio: number
}
```

`AnswerRecord`에 필드 추가:

```ts
export interface AnswerRecord {
  id: string
  questionId: string
  videoUrl: string
  transcriptText: string | null
  feedbackText: string | null
  durationSeconds: number
  facialMetrics: FacialMetrics
  voiceMetrics: VoiceMetrics
  status: ProcessingStatus
}
```

- [ ] **Step 2: api.ts 수정**

`src/lib/api.ts` 상단 import에 `VoiceMetrics` 추가:

```ts
import type {
  AnswerRecord,
  FacialMetrics,
  PracticeSession,
  PreparationMaterial,
  QuestionSet,
  VoiceMetrics,
} from "@/types"
```

`uploadAnswer`를 다음으로 교체:

```ts
export function uploadAnswer(
  questionId: string,
  video: Blob,
  facialMetrics: FacialMetrics,
  voiceMetrics: VoiceMetrics
) {
  const formData = new FormData()
  formData.append("questionId", questionId)
  formData.append("video", video)
  formData.append("facialMetrics", JSON.stringify(facialMetrics))
  formData.append("voiceMetrics", JSON.stringify(voiceMetrics))
  return apiFetch<AnswerRecord>("/api/answers", {
    method: "POST",
    body: formData,
  })
}
```

- [ ] **Step 3: 타입 에러 확인 및 기존 테스트 수정**

Run: `npx tsc -b`
Expected: `src/lib/api.test.ts`의 `uploadAnswer("q1", new Blob(["x"]), {...})` 호출에서 4번째 인자 누락 타입 에러.

`src/lib/api.test.ts`의 해당 호출을 다음으로 수정:

```ts
    await uploadAnswer(
      "q1",
      new Blob(["x"]),
      { eyeContactRatio: 0.8, expressionChanges: 3, blinkRate: 14, expressionTimeline: [0.1, 0.3, 0.2] },
      { fillerWordCount: 2, quietRatio: 0.1, trembleRatio: 0.05 }
    )
```

- [ ] **Step 4: 전체 테스트/타입 체크 통과 확인**

Run: `npx tsc -b && npm test`
Expected: 둘 다 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/types.ts src/lib/api.ts src/lib/api.test.ts
git commit -m "feat: VoiceMetrics 타입 및 uploadAnswer 계약 확장"
```

---

### Task 5: 브라우저 API 훅 (useVoiceMetrics, useFillerWordCounter, 스트림 노출)

**Files:**
- Create: `src/hooks/useVoiceMetrics.ts`
- Create: `src/hooks/useFillerWordCounter.ts`
- Modify: `src/hooks/useMediaRecorderCapture.ts`

**Interfaces:**
- Consumes: Task 2의 `extractVoiceSample`, `summarizeVoiceSamples`; Task 3의 `countFillerWords`.
- Produces: `useMediaRecorderCapture().start(): Promise<MediaStream | null>` (기존엔 `Promise<void>`), `useVoiceMetrics(): { error, start(stream: MediaStream): void, stop(): { quietRatio: number; trembleRatio: number } }`, `useFillerWordCounter(): { error, start(): void, stop(): { fillerWordCount: number } }`.

- [ ] **Step 1: useMediaRecorderCapture.ts가 스트림을 반환하도록 수정**

`src/hooks/useMediaRecorderCapture.ts`의 `start`를 다음으로 교체(마이크/카메라 스트림을 호출자에게 직접 넘겨줌 — 별도 state 없이 재요청 없는 공유가 가능):

```ts
  const start = useCallback(async (): Promise<MediaStream | null> => {
    setError(null)
    setVideoBlob(null)
    setStatus("requesting")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      streamRef.current = stream
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream
      }

      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        setVideoBlob(new Blob(chunksRef.current, { type: "video/webm" }))
        setStatus("stopped")
      }
      recorderRef.current = recorder
      recorder.start()
      setStatus("recording")
      return stream
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "카메라/마이크 권한을 가져오지 못했습니다."
      )
      setStatus("error")
      return null
    }
  }, [])
```

- [ ] **Step 2: useVoiceMetrics.ts 작성**

`src/hooks/useVoiceMetrics.ts`:

```ts
import { useCallback, useRef, useState } from "react"
import {
  extractVoiceSample,
  summarizeVoiceSamples,
  type VoiceFrameSample,
} from "@/lib/voiceMetrics"

const FFT_SIZE = 2048

export function useVoiceMetrics() {
  const [error, setError] = useState<string | null>(null)
  const samplesRef = useRef<VoiceFrameSample[]>([])
  const rafIdRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const start = useCallback((stream: MediaStream) => {
    setError(null)
    samplesRef.current = []

    try {
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = FFT_SIZE
      source.connect(analyser)
      audioContextRef.current = audioContext

      const buffer = new Float32Array(analyser.fftSize)
      const loop = () => {
        analyser.getFloatTimeDomainData(buffer)
        samplesRef.current.push(extractVoiceSample(buffer, audioContext.sampleRate))
        rafIdRef.current = requestAnimationFrame(loop)
      }
      rafIdRef.current = requestAnimationFrame(loop)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "음성 분석을 시작하지 못했습니다."
      )
    }
  }, [])

  const stop = useCallback(() => {
    if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
    rafIdRef.current = null
    void audioContextRef.current?.close()
    audioContextRef.current = null
    return summarizeVoiceSamples(samplesRef.current)
  }, [])

  return { error, start, stop }
}
```

- [ ] **Step 3: useFillerWordCounter.ts 작성**

`src/hooks/useFillerWordCounter.ts`:

```ts
import { useCallback, useRef, useState } from "react"
import { countFillerWords } from "@/lib/fillerWords"

interface SpeechRecognitionResultLike {
  0: { transcript: string }
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  start(): void
  stop(): void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useFillerWordCounter() {
  const [error, setError] = useState<string | null>(null)
  const countRef = useRef(0)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const start = useCallback(() => {
    setError(null)
    countRef.current = 0

    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      setError("이 브라우저는 음성 인식을 지원하지 않습니다.")
      return
    }

    const recognition = new Ctor()
    recognition.lang = "ko-KR"
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        countRef.current += countFillerWords(event.results[i][0].transcript)
      }
    }
    recognition.start()
    recognitionRef.current = recognition
  }, [])

  const stop = useCallback((): { fillerWordCount: number } => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    return { fillerWordCount: countRef.current }
  }, [])

  return { error, start, stop }
}
```

- [ ] **Step 4: 타입 체크 통과 확인**

Run: `npx tsc -b`
Expected: PASS (이 태스크의 두 훅은 브라우저 전용 API라 vitest 대상 밖 — `useFaceLandmarkerMetrics`와 동일한 기존 컨벤션)

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useMediaRecorderCapture.ts src/hooks/useVoiceMetrics.ts src/hooks/useFillerWordCounter.ts
git commit -m "feat: 볼륨/피치·필러워드 브라우저 API 훅 추가 및 스트림 공유"
```

---

### Task 6: RecordPage/ResultPage에 음성 지표 표시

**Files:**
- Modify: `src/pages/RecordPage.tsx`
- Modify: `src/pages/ResultPage.tsx`

**Interfaces:**
- Consumes: Task 4의 `VoiceMetrics`, Task 5의 `useVoiceMetrics`/`useFillerWordCounter`/`useMediaRecorderCapture().start()`.

- [ ] **Step 1: RecordPage.tsx 수정**

`src/pages/RecordPage.tsx`(그룹 A 플랜 적용 후 상태 기준)의 import에 추가:

```ts
import { useFillerWordCounter } from "@/hooks/useFillerWordCounter"
import { useVoiceMetrics } from "@/hooks/useVoiceMetrics"
import type { VoiceMetrics } from "@/types"
```

컴포넌트 내부에 훅과 상태 추가:

```ts
  const voiceMetrics = useVoiceMetrics()
  const fillerWordCounter = useFillerWordCounter()
  const [voiceMetricsResult, setVoiceMetricsResult] = useState<VoiceMetrics | null>(null)
```

`handleStart`를 다음으로 교체:

```ts
  const handleStart = async () => {
    setFacialMetrics(null)
    setVoiceMetricsResult(null)
    const stream = await start()
    if (videoPreviewRef.current) {
      faceMetrics.start(videoPreviewRef.current)
    }
    if (stream) {
      voiceMetrics.start(stream)
    }
    fillerWordCounter.start()
  }
```

`handleStop`을 다음으로 교체:

```ts
  const handleStop = () => {
    stop()
    const metrics = faceMetrics.stop()
    setFacialMetrics(metrics)

    const { quietRatio, trembleRatio } = voiceMetrics.stop()
    const { fillerWordCount } = fillerWordCounter.stop()
    setVoiceMetricsResult({ fillerWordCount, quietRatio, trembleRatio })
  }
```

에러 표시 블록에 필러워드 에러 추가(기존 `faceMetrics.error` 표시 다음 줄):

```tsx
      {fillerWordCounter.error && (
        <p className="text-sm text-destructive">{fillerWordCounter.error}</p>
      )}
```

지표 표시 블록 끝에 음성 지표 추가(기존 `ExpressionSparkline` 다음):

```tsx
      {voiceMetricsResult && (
        <p className="text-sm text-muted-foreground">
          필러워드: {voiceMetricsResult.fillerWordCount}회 · 작은 목소리 구간:{" "}
          {(voiceMetricsResult.quietRatio * 100).toFixed(0)}% · 떨림 구간:{" "}
          {(voiceMetricsResult.trembleRatio * 100).toFixed(0)}%
        </p>
      )}
```

- [ ] **Step 2: ResultPage.tsx 수정**

`src/pages/ResultPage.tsx`(그룹 A 플랜 적용 후 상태 기준)의 `answer?.status === "DONE"` 블록 안, `ExpressionSparkline` 다음에 추가:

```tsx
          <p className="text-sm text-muted-foreground">
            필러워드: {answer.voiceMetrics.fillerWordCount}회 · 작은 목소리 구간:{" "}
            {(answer.voiceMetrics.quietRatio * 100).toFixed(0)}% · 떨림 구간:{" "}
            {(answer.voiceMetrics.trembleRatio * 100).toFixed(0)}%
          </p>
```

- [ ] **Step 3: 타입 체크 및 전체 테스트 통과 확인**

Run: `npx tsc -b && npm test`
Expected: 둘 다 PASS

- [ ] **Step 4: 커밋**

```bash
git add src/pages/RecordPage.tsx src/pages/ResultPage.tsx
git commit -m "feat: RecordPage/ResultPage에 필러워드·목소리 지표 표시"
```
