# 녹화 → 업로드 → 결과 플로우 연결 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `RecordPage`가 녹화 종료 후 계산된 지표와 영상을 실제로 `uploadAnswer`로 전송하고, 성공 시 `/result/:answerId`로 이동하도록 연결한다.

**Architecture:** `App.tsx`에 `/record/:questionId` 라우트 추가 → `RecordPage`가 `videoBlob`/`facialMetrics`/`voiceMetricsResult` 세 상태가 모두 준비되는 시점을 `useEffect`로 감지해 업로드를 트리거 → 성공 시 이동, 실패 시 에러+재시도 버튼.

**Tech Stack:** React Router (`useParams`, `useNavigate`), 기존 `src/lib/api.ts`의 `uploadAnswer`. 새 의존성 없음.

## Global Constraints

- 새 npm 의존성 추가 금지.
- `QuestionListPage`/`MaterialInputPage` 실제 구현은 이 플랜 범위 밖.
- 각 태스크 종료 시 `npx tsc -b`와 `npm test`가 모두 통과해야 한다.
- `RecordPage`는 기존에도 컴포넌트 테스트가 없는 페이지(vitest 환경이 node) — 새 테스트 파일을 만들지 않는다.

---

### Task 1: 라우팅에 questionId 추가

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `/record/:questionId` 라우트. `RecordPage`가 `useParams<{ questionId: string }>()`로 소비.

- [ ] **Step 1: App.tsx 수정**

`src/App.tsx`의 `NAV_LINKS`에서:
```ts
{ to: '/record', label: '녹화' },
```
을
```ts
{ to: '/record/demo-question-id', label: '녹화' },
```
로 교체.

`<Routes>`에서:
```tsx
<Route path="/record" element={<RecordPage />} />
```
을
```tsx
<Route path="/record/:questionId" element={<RecordPage />} />
```
로 교체.

- [ ] **Step 2: 타입 체크 통과 확인**

Run: `npx tsc -b`
Expected: PASS (이 시점엔 `RecordPage`가 아직 `useParams`를 안 써서 `questionId` 미사용 상태 — Task 2에서 실제로 사용)

- [ ] **Step 3: 커밋**

```bash
git add src/App.tsx
git commit -m "feat: /record 라우트에 questionId 파라미터 추가"
```

---

### Task 2: RecordPage에 업로드 연결

**Files:**
- Modify: `src/pages/RecordPage.tsx`

**Interfaces:**
- Consumes: Task 1의 `/record/:questionId` 라우트, 기존 `uploadAnswer(questionId, video, facialMetrics, voiceMetrics): Promise<AnswerRecord>` (`src/lib/api.ts`).
- Produces: 녹화 종료 시 자동 업로드, 성공 시 `/result/:answerId`로 이동, 실패 시 재시도 가능한 에러 UI.

- [ ] **Step 1: import 및 상태 추가**

`src/pages/RecordPage.tsx` 상단 import를 다음으로 교체:

```tsx
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useFaceLandmarkerMetrics } from "@/hooks/useFaceLandmarkerMetrics"
import { useFillerWordCounter } from "@/hooks/useFillerWordCounter"
import { useMediaRecorderCapture } from "@/hooks/useMediaRecorderCapture"
import { useVoiceMetrics } from "@/hooks/useVoiceMetrics"
import { uploadAnswer } from "@/lib/api"
import type { FacialMetrics, VoiceMetrics } from "@/types"
```

컴포넌트 본문 상단(기존 훅 호출들 아래)에 추가:

```ts
  const { questionId } = useParams<{ questionId: string }>()
  const navigate = useNavigate()
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "error">("idle")
  const [uploadError, setUploadError] = useState<string | null>(null)
```

- [ ] **Step 2: runUpload 함수와 자동 트리거 useEffect 추가**

기존 `videoBlob` 처리 `useEffect` 아래에 추가:

```ts
  function runUpload(blob: Blob, facial: FacialMetrics, voice: VoiceMetrics) {
    setUploadStatus("uploading")
    setUploadError(null)
    uploadAnswer(questionId!, blob, facial, voice)
      .then((answer) => {
        navigate(`/result/${answer.id}`)
      })
      .catch((err) => {
        setUploadStatus("error")
        setUploadError(err instanceof Error ? err.message : "업로드에 실패했습니다.")
      })
  }

  useEffect(() => {
    if (!videoBlob || !facialMetrics || !voiceMetricsResult) return
    runUpload(videoBlob, facialMetrics, voiceMetricsResult)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- videoBlob이 세 값 중 가장 늦게 도착하므로 그 시점에만 트리거
  }, [videoBlob, facialMetrics, voiceMetricsResult])
```

- [ ] **Step 3: handleStart에서 업로드 상태 초기화**

`handleStart` 맨 위(`setFacialMetrics(null)` 옆)에 추가:

```ts
    setUploadStatus("idle")
    setUploadError(null)
```

- [ ] **Step 4: 버튼 비활성화 조건에 업로드 중 반영**

기존:
```tsx
        <Button
          onClick={handleStart}
          disabled={status === "recording" || status === "requesting"}
        >
          녹화 시작
        </Button>
        <Button
          variant="outline"
          onClick={handleStop}
          disabled={status !== "recording"}
        >
          녹화 종료
        </Button>
```
을 다음으로 교체:
```tsx
        <Button
          onClick={handleStart}
          disabled={
            status === "recording" ||
            status === "requesting" ||
            uploadStatus === "uploading"
          }
        >
          녹화 시작
        </Button>
        <Button
          variant="outline"
          onClick={handleStop}
          disabled={status !== "recording" || uploadStatus === "uploading"}
        >
          녹화 종료
        </Button>
```

- [ ] **Step 5: 업로드 상태 표시 UI 추가**

기존 에러 표시 블록(`fillerWordCounter.error` 다음) 아래에 추가:

```tsx
      {uploadStatus === "uploading" && (
        <p className="text-sm text-muted-foreground">업로드 중...</p>
      )}
      {uploadStatus === "error" && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-destructive">{uploadError}</p>
          <Button
            variant="outline"
            onClick={() => {
              if (videoBlob && facialMetrics && voiceMetricsResult) {
                runUpload(videoBlob, facialMetrics, voiceMetricsResult)
              }
            }}
          >
            다시 시도
          </Button>
        </div>
      )}
```

- [ ] **Step 6: 타입 체크 및 전체 테스트 통과 확인**

Run: `npx tsc -b && npm test`
Expected: 둘 다 PASS

- [ ] **Step 7: 커밋**

```bash
git add src/pages/RecordPage.tsx
git commit -m "feat: RecordPage에 uploadAnswer 연결, 성공 시 결과 페이지 이동"
```
