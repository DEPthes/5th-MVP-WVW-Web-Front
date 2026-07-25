# 녹화 → 업로드 → 결과 플로우 연결 — 설계

## 배경
`RecordPage`는 얼굴/음성 지표를 계산해 화면에 표시만 하고, `src/lib/api.ts`에 이미 구현된
`uploadAnswer`를 어디서도 호출하지 않는다. 또한 `/record` 라우트에 `questionId`를 전달할 방법이 없다.
이 스펙은 녹화 종료 → 업로드 → `/result/:answerId` 이동까지 실제로 연결한다.
`QuestionListPage`/`MaterialInputPage`의 실제 구현은 범위 밖(별도 TODO 항목).

## 라우팅 변경
- `App.tsx`: `/record` → `/record/:questionId` (`/result/:answerId`와 동일 패턴)
- 네비게이션 데모 링크: `/record/demo-question-id`

## 데이터 흐름
1. `handleStop`에서 `faceMetrics.stop()`/`voiceMetrics.stop()`/`fillerWordCounter.stop()`이 동기로
   `facialMetrics`/`voiceMetricsResult` state를 채운다(기존 동작, 변경 없음).
2. `MediaRecorder.onstop`이 비동기로 `videoBlob` state를 채운다(기존 동작, 변경 없음).
3. `videoBlob`/`facialMetrics`/`voiceMetricsResult` 셋 다 채워지면(=`videoBlob`이 마지막으로 도착하는
   시점) `useEffect`가 자동으로 `uploadAnswer(questionId, videoBlob, facialMetrics, voiceMetricsResult)`를
   호출한다.
4. 성공 시 `useNavigate()`로 `/result/${answer.id}`로 이동.
5. 실패 시 에러 메시지 표시 + "다시 시도" 버튼 — 재녹화 없이 같은 `videoBlob`/지표로 재업로드.

## 상태 추가 (RecordPage)
```ts
const { questionId } = useParams<{ questionId: string }>()
const navigate = useNavigate()
const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "error">("idle")
const [uploadError, setUploadError] = useState<string | null>(null)
```

## 업로드 함수
```ts
function runUpload(blob: Blob, facial: FacialMetrics, voice: VoiceMetrics) {
  setUploadStatus("uploading")
  setUploadError(null)
  uploadAnswer(questionId!, blob, facial, voice)
    .then((answer) => navigate(`/result/${answer.id}`))
    .catch((err) => {
      setUploadStatus("error")
      setUploadError(err instanceof Error ? err.message : "업로드에 실패했습니다.")
    })
}
```
자동 트리거(`useEffect`)와 "다시 시도" 버튼 둘 다 이 함수를 호출한다(로직 중복 없음).

## UI 변경
- `uploadStatus === "uploading"`: 녹화 시작/종료 버튼 모두 비활성화, "업로드 중..." 텍스트 표시.
- `uploadStatus === "error"`: `uploadError` 메시지 + "다시 시도" 버튼(클릭 시 `runUpload` 재호출).
- 기존 얼굴/음성 지표 텍스트는 그대로 유지(업로드 중/성공 전 잠깐 보이는 중간 상태).

## 에러 처리
- `uploadAnswer` 실패(네트워크/4xx/5xx)는 `apiFetch`가 이미 `Error`를 던지므로 `catch`에서
  `err.message`를 그대로 노출.
- `questionId`는 라우트가 `/record/:questionId`로 매치된 이상 항상 문자열로 존재(리액트 라우터
  특성상 파라미터 없이는 라우트 자체가 매치되지 않음) — 별도 null 가드는 타입 단언(`questionId!`)만으로 처리.

## 테스트
`RecordPage`는 기존에도 컴포넌트 테스트가 없는 페이지(vitest 환경이 node)이므로 이번에도 자동 테스트
대상 밖 — `npx tsc -b`/`npm test`(회귀 확인)만으로 검증한다.

## 스코프 밖
- `QuestionListPage`/`MaterialInputPage` 실제 구현
- 인증/토큰 흐름(현재도 토큰 없이 업로드 가능한 상태 유지)
- 업로드 진행률 표시, 영상 압축/청크 업로드 등 고급 최적화
