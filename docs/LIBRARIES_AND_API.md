# 사용 라이브러리 및 백엔드 전송 데이터 형태

> **2026-07-26**: 카메라/MediaPipe 표정 분석, 음성 신호 지표(quietRatio/trembleRatio/fillerWordCount), 원본 영상/음성 저장·다시듣기 기능을 제거했다. 해당 구현은 `archive/video-facial-pipeline` 브랜치에 남아 있다. 지금은 마이크 녹음만 하고, STT 텍스트 + Gemini 텍스트 피드백 중심으로 간다.

## 1. 사용 라이브러리

### 런타임 의존성 (`dependencies`)

| 라이브러리 | 버전 | 이 프로젝트에서의 용도 |
|---|---|---|
| `react` / `react-dom` | ^19.2.7 | UI 렌더링. 전부 함수형 컴포넌트 + hooks (`useState`/`useEffect`/`useCallback`/`useRef`) |
| `react-router-dom` | ^7.18.1 | 라우팅. `App.tsx`에서 7개 경로(`/login`, `/signup`, `/materials/new`, `/questions`, `/record`, `/result/:answerId`, `/history`) 정의, `ResultPage`에서 `useParams`로 `answerId` 추출 |
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

| API | 용도 | 사용 위치 |
|---|---|---|
| `MediaDevices.getUserMedia` / `MediaRecorder` | 마이크 스트림 획득, 답변 녹음(오디오 전용, 카메라 미사용) | `src/hooks/useAudioRecorder.ts` |

---

## 2. 프론트엔드 → 백엔드 전송 데이터 형태

프론트는 `src/lib/api.ts`의 `apiFetch` 래퍼(토큰 첨부, FormData/JSON 자동 분기, 에러 시 `API error {status}: {body}` throw)로 아래 엔드포인트를 호출한다. `uploadAnswer`는 `RecordPage`가 녹음 종료 후 오디오가 준비되면 자동 호출하며, 성공 시 `/result/:answerId`로 이동하고 실패 시 재시도 버튼을 보여준다.

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

### `POST /api/answers` — 답변 업로드 (`RecordPage`가 녹음 종료 시 자동 호출)
`multipart/form-data`:

| 필드 | 타입 | 내용 |
|---|---|---|
| `questionId` | string | - |
| `audio` | Blob (`audio/webm`) | `MediaRecorder`로 녹음된 답변 오디오 |

응답: `AnswerRecord` (아래 참고)

### `GET /api/answers/:id` — `ResultPage`가 3초 간격 폴링(`usePolling`)
응답 `AnswerRecord`:
```ts
{
  id: string
  questionId: string
  transcriptText: string | null   // STT 변환 결과. status가 DONE이 되기 전엔 null
  feedbackText: string | null     // Gemini 텍스트 피드백
  durationSeconds: number
  status: "PENDING" | "DONE" | "FAILED"
}
```
원본 오디오는 서버가 STT 변환 완료 후 즉시 삭제하는 것을 전제로 한다 — 다시듣기 기능 없음(기획서 정책).

### `GET /api/sessions`, `GET /api/sessions/:id`
응답: `PracticeSession { id, materialId, createdAt, answers: AnswerRecord[] }`
