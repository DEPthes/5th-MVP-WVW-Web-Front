# 사용 라이브러리 및 백엔드 전송 데이터 형태

## 1. 사용 라이브러리

### 런타임 의존성 (`dependencies`)

| 라이브러리 | 버전 | 이 프로젝트에서의 용도 |
|---|---|---|
| `react` / `react-dom` | ^19.2.7 | UI 렌더링. 전부 함수형 컴포넌트 + hooks (`useState`/`useEffect`/`useCallback`/`useRef`) |
| `react-router-dom` | ^7.18.1 | 라우팅. `App.tsx`에서 7개 경로(`/login`, `/signup`, `/materials/new`, `/questions`, `/record`, `/result/:answerId`, `/history`) 정의, `ResultPage`에서 `useParams`로 `answerId` 추출 |
| `@mediapipe/tasks-vision` | ^0.10.35 | `FaceLandmarker` 모델. `src/hooks/useFaceLandmarkerMetrics.ts`에서 `<video>` 프레임마다 `detectForVideo` 호출 — 얼굴 블렌드셰이프(표정/눈 관련 52개 점수)와 얼굴 회전행렬(`facialTransformationMatrixes`, head pose)을 얻는 데 사용. WASM 런타임과 모델 파일은 CDN(`jsdelivr`, `storage.googleapis.com`)에서 로드 |
| `tailwindcss` + `@tailwindcss/vite` | ^4.3.2 | 유틸리티 CSS, Vite 플러그인으로 빌드에 통합(별도 PostCSS 설정 없음) |
| `shadcn` | ^4.13.0 | UI 컴포넌트 CLI. `src/components/ui/button.tsx` 등 프로젝트에 복사되어 들어온 컴포넌트의 출처(런타임엔 사용 안 함, 컴포넌트 생성/업데이트 시에만 CLI로 호출) |
| `@base-ui/react` | ^1.6.0 | shadcn 컴포넌트가 내부적으로 쓰는 헤드리스 UI 프리미티브(접근성 처리된 버튼/포커스 등) |
| `class-variance-authority` | ^0.7.1 | `Button` 등의 variant(색상/크기) 클래스 조합 정의 |
| `clsx` + `tailwind-merge` | ^2.1.1 / ^3.6.0 | `src/lib/utils.ts`의 `cn()` 헬퍼 — 조건부 클래스 병합 + Tailwind 클래스 충돌 해소 |
| `lucide-react` | ^1.24.0 | 아이콘 |
| `tw-animate-css` | ^1.4.0 | Tailwind용 애니메이션 유틸리티 클래스 |
| `@fontsource-variable/geist` | ^5.2.9 | Geist 가변폰트 자체 호스팅(외부 폰트 CDN 없이 번들) |

### 개발 의존성 (`devDependencies`)

| 라이브러리 | 버전 | 용도 |
|---|---|---|
| `typescript` | ~6.0.2 | 타입 체크(`tsc -b`, `noEmit`) |
| `vite` + `@vitejs/plugin-react` | ^8.1.1 / ^6.0.3 | 개발 서버/번들러 |
| `vitest` | ^4.1.10 | 순수 로직 유닛 테스트(`environment: 'node'`) — 컴포넌트/DOM 렌더 테스트 인프라는 없음 |
| `oxlint` | ^1.71.0 | 린트 |
| `@types/*` | - | React/Node 타입 정의 |

### 새 npm 의존성 없이 쓰인 브라우저 표준 API

MediaPipe 이후 추가된 얼굴/음성 지표는 라이브러리를 새로 설치하지 않고 브라우저 표준 API로 구현했다(ponytail 원칙 — 이미 있는 걸로 되면 새 의존성 추가 안 함):

| API | 용도 | 사용 위치 |
|---|---|---|
| `MediaDevices.getUserMedia` / `MediaRecorder` | 카메라+마이크 스트림 획득, 영상 녹화 | `src/hooks/useMediaRecorderCapture.ts` |
| `AudioContext` / `AnalyserNode` (Web Audio API) | 마이크 스트림에서 RMS(음량)·오토코릴레이션 기반 피치(Hz) 추출 | `src/hooks/useVoiceMetrics.ts` + `src/lib/voiceMetrics.ts` |
| `SpeechRecognition` / `webkitSpeechRecognition` (Web Speech API) | 실시간 한국어(`ko-KR`) 음성 인식, 필러워드 카운트용 | `src/hooks/useFillerWordCounter.ts`. **Chrome/Edge 계열만 안정 지원, Firefox 등은 미지원** — 미지원 시 `error` 상태로 노출하고 녹화 자체는 막지 않음 |
| `requestAnimationFrame` | MediaPipe 추론 루프, 오디오 샘플링 루프 | `useFaceLandmarkerMetrics.ts`, `useVoiceMetrics.ts` |
| `<svg>` + `<polyline>` | 표정 변화 타임라인 시각화(차트 라이브러리 없이 직접 렌더) | `src/components/ExpressionSparkline.tsx` |

---

## 2. 프론트엔드 → 백엔드 전송 데이터 형태

프론트는 `src/lib/api.ts`의 `apiFetch` 래퍼(토큰 첨부, FormData/JSON 자동 분기, 에러 시 `API error {status}: {body}` throw)로 아래 엔드포인트를 호출한다. **`uploadAnswer`는 함수만 정의되어 있고 어느 화면에서도 아직 호출되지 않는다** — `RecordPage`는 계산한 지표를 화면에 표시만 하고 서버로 보내지 않는 상태다(`docs/TODO.md` 4번 항목).

### `POST /api/auth/signup`, `POST /api/auth/login`
```json
{ "email": "string", "password": "string" }
```
응답: `{ "token": "string" }`

### `POST /api/materials`
```json
{ "companyName": "string", "jobRole": "string", "materialText": "string" }
```

### `POST /api/materials/:id/questions`
바디 없음. 응답: `QuestionSet { id, materialId, questions: [{ id, text }] }`

### `POST /api/answers` — 답변 업로드 (구현되어 있으나 미호출)
`multipart/form-data`:

| 필드 | 타입 | 내용 |
|---|---|---|
| `questionId` | string | - |
| `video` | Blob (`video/webm`) | `MediaRecorder`로 녹화된 답변 영상 |
| `facialMetrics` | JSON string | 아래 `FacialMetrics` 직렬화 |
| `voiceMetrics` | JSON string | 아래 `VoiceMetrics` 직렬화 |

**`FacialMetrics`** (`src/lib/facialMetrics.ts`가 계산, `src/types.ts`에 정의):
```ts
{
  eyeContactRatio: number  // 0~1, 눈맞춤(eyeLook 정상 AND head pose 정상) 프레임 비율
  blinkRate: number        // 분당 깜빡임 횟수 (rising-edge 카운트 / 경과시간 * 60)
  likabilityScore: number  // 0~1, 호감도 블렌드셰이프군(미소/볼조임/눈썹 등) 프레임 평균의 녹화 전체 평균
  tensionScore: number     // 0~1, 긴장도 블렌드셰이프군(입다뭄/찡그림 등) 동일 방식
  neutralScore: number     // 0~1, MediaPipe의 `_neutral` 블렌드셰이프 값 자체의 녹화 전체 평균
}
```
예시: `{ "eyeContactRatio": 0.82, "blinkRate": 14.2, "likabilityScore": 0.31, "tensionScore": 0.12, "neutralScore": 0.55 }`

호감도/긴장도/무표정도는 근육 움직임(블렌드셰이프) 기반 휴리스틱 추정치이지 실제 감정 인식이 아님 —
카테고리 구성은 `docs/superpowers/specs/2026-07-24-expression-valence-scores-design.md` 참고.

**`VoiceMetrics`** (`src/lib/voiceMetrics.ts` + `src/lib/fillerWords.ts`가 계산):
```ts
{
  fillerWordCount: number  // "음"/"어"/"그"/"저기"/"니까" 카운트 (공백 기준 토큰 완전 일치)
  quietRatio: number       // 0~1, RMS가 임계치 미만인 프레임 비율("작은 목소리" 구간)
  trembleRatio: number     // 0~1, 슬라이딩 윈도우 내 피치 표준편차가 임계치 초과인 구간 비율("떨림")
}
```
예시: `{ "fillerWordCount": 3, "quietRatio": 0.12, "trembleRatio": 0.08 }`

응답: `AnswerRecord` (아래 참고)

### `GET /api/answers/:id` — `ResultPage`가 3초 간격 폴링(`usePolling`)
응답 `AnswerRecord`:
```ts
{
  id: string
  questionId: string
  videoUrl: string
  transcriptText: string | null   // status가 DONE이 되기 전엔 null
  feedbackText: string | null
  durationSeconds: number
  facialMetrics: FacialMetrics    // 위와 동일 구조
  voiceMetrics: VoiceMetrics      // 위와 동일 구조
  status: "PENDING" | "DONE" | "FAILED"
}
```
`facialMetrics`/`voiceMetrics`는 프론트가 업로드 시 보낸 값을 서버가 그대로(혹은 서버 재계산 후) 돌려준다고 가정한 형태 — 서버 쪽 저장/재계산 방식은 이 문서 범위 밖.

### `GET /api/sessions`, `GET /api/sessions/:id`
응답: `PracticeSession { id, materialId, createdAt, answers: AnswerRecord[] }`

---

## 임계치(플레이스홀더) 목록

아래 값은 전부 `// ponytail: ... 자리표시자` 주석과 함께 코드에 있으며, 실측 데이터로 튜닝이 필요하다:

| 이름 | 위치 | 현재 값 |
|---|---|---|
| `EYE_LOOK_THRESHOLD` | `facialMetrics.ts` | 0.3 |
| `BLINK_SCORE_THRESHOLD` | `facialMetrics.ts` | 0.5 |
| `HEAD_YAW_THRESHOLD_DEG` / `HEAD_PITCH_THRESHOLD_DEG` | `facialMetrics.ts` | 20 |
| `LIKABILITY_CATEGORIES` | `facialMetrics.ts` | `mouthSmileLeft/Right`, `cheekSquintLeft/Right`, `browOuterUpLeft/Right`, `browInnerUp` |
| `TENSION_CATEGORIES` | `facialMetrics.ts` | `mouthPressLeft/Right`, `mouthRollUpper/Lower`, `browDownLeft/Right`, `eyeSquintLeft/Right`, `mouthShrugUpper/Lower` |
| `NEUTRAL_CATEGORIES` | `facialMetrics.ts` | `_neutral` |
| `QUIET_RMS_THRESHOLD` | `voiceMetrics.ts` | 0.02 |
| `PITCH_DETECTION_MIN_RMS` | `voiceMetrics.ts` | 0.01 |
| `TREMBLE_PITCH_STDDEV_THRESHOLD_HZ` | `voiceMetrics.ts` | 15 |
| `MIN_PITCH_HZ` / `MAX_PITCH_HZ` | `voiceMetrics.ts` | 70 / 500 |
| `FILLER_WORDS` | `fillerWords.ts` | `["음", "어", "그", "저기", "니까"]` |
