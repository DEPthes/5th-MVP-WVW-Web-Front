# 사용 라이브러리 및 백엔드 전송 데이터 형태

> **2026-07-26**: 카메라/MediaPipe 표정 분석, 음성 신호 지표(quietRatio/trembleRatio/fillerWordCount), 원본 영상/음성 저장·다시듣기 기능을 제거했다. 해당 구현은 `archive/video-facial-pipeline` 브랜치에 남아 있다. 지금은 마이크 녹음만 하고, STT 텍스트 + Gemini 텍스트 피드백 중심으로 간다.

> **2026-08-03**: 실제 백엔드 Swagger 스펙(`AI_Interview_API` 1.0.0, https://app.swaggerhub.com/apis/uni-62b/AI_Interview_API/1.0.0) 기준으로 2절 전체를 다시 썼다. 경로/필드명이 이전 버전(`/api/...`, `userId`/`jobRole`/`careerYears` 등)과 완전히 다르다 — 아래 내용이 현재 `src/lib/api.ts`/`src/types.ts`와 일치하는 최신 상태. 단, 실제 백엔드(https://github.com/DEPthes/5th-MVP-WVW-Server)는 아직 스펙을 구현하지 않은 빈 스켈레톤 상태라 실제 서버로 검증된 적은 없다.

## 1. 사용 라이브러리

### 런타임 의존성 (`dependencies`)

| 라이브러리 | 버전 | 이 프로젝트에서의 용도 |
|---|---|---|
| `react` / `react-dom` | ^19.2.7 | UI 렌더링. 전부 함수형 컴포넌트 + hooks (`useState`/`useEffect`/`useCallback`/`useRef`) |
| `react-router-dom` | ^7.18.1 | 라우팅. `App.tsx`에서 `/login`, `/signup`, `/`(홈=면접 목록), `/interviews/new`, `/questions/new`, `/record/:questionId/start`, `/record/:questionId`, `/sessions/:sessionId`, `/sessions/:sessionId/evaluation`, `/sessions/:sessionId/review`, `/settings`, `*`(404) 정의 |
| `tailwindcss` + `@tailwindcss/vite` | ^4.3.2 | 유틸리티 CSS, Vite 플러그인으로 빌드에 통합(별도 PostCSS 설정 없음) |
| `shadcn` | ^4.13.0 | UI 컴포넌트 CLI. `src/components/ui/button.tsx` 등 프로젝트에 복사되어 들어온 컴포넌트의 출처(런타임엔 사용 안 함, 컴포넌트 생성/업데이트 시에만 CLI로 호출) |
| `@base-ui/react` | ^1.6.0 | shadcn 컴포넌트가 내부적으로 쓰는 헤드리스 UI 프리미티브(접근성 처리된 버튼/포커스 등) |
| `class-variance-authority` | ^0.7.1 | `Button` 등의 variant(색상/크기) 클래스 조합 정의 |
| `clsx` + `tailwind-merge` | ^2.1.1 / ^3.6.0 | `src/lib/utils.ts`의 `cn()` 헬퍼 — 조건부 클래스 병합 + Tailwind 클래스 충돌 해소. `extendTailwindMerge`로 커스텀 폰트 크기 토큰(`text-heading`/`label`/`body`/`caption`)을 등록해둠 — 안 하면 이 토큰들이 `text-{color}` 그룹과 충돌해 색상 클래스가 조용히 삭제되는 버그가 있었음(2026-08-02 발견) |
| `lucide-react` | ^1.24.0 | 아이콘 |
| `tw-animate-css` | ^1.4.0 | Tailwind용 애니메이션 유틸리티 클래스 |
| `@fontsource/pretendard` | ^5.3.0 | Pretendard 폰트 자체 호스팅(2026-08-02에 Geist에서 교체, 외부 CDN 없이 번들) |

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
| `MediaDevices.getUserMedia` | 마이크 스트림 획득(오디오 전용, 카메라 미사용) | `src/hooks/useAudioRecorder.ts` |
| `AudioContext` + `ScriptProcessorNode` | 마이크 PCM 프레임 캡처 후 LINEAR16/16000Hz/모노 WAV로 직접 인코딩(백엔드 STT 스펙 충족). `MediaRecorder`(webm)로는 이 포맷을 만들 수 없어 2026-08-03에 교체. `ScriptProcessorNode`는 deprecated지만 워클릿 모듈 파일 없이 바로 쓸 수 있어 채택 — 실시간 웨이브폼 등 성능이 문제되면 `AudioWorkletNode`로 교체 예정 | `src/hooks/useAudioRecorder.ts` |
| `HTMLAudioElement`(`new Audio()`) | 질문 TTS 오디오(서버가 주는 signed URL) 재생. 이전엔 브라우저 `SpeechSynthesisUtterance`로 임시 대체했었으나 실제 TTS 오디오 API가 있어 교체 | `src/pages/RecordPage.tsx` |

---

## 2. 프론트엔드 → 백엔드 전송 데이터 형태

실제 백엔드 스펙(`AI_Interview_API` 1.0.0)은 세션 하나가 "면접 세션 생성 시 질문 세트까지 한 번에 발급 → 질문마다 답변 업로드(동기 응답) → 종료 시 종합 피드백 생성"으로 이어지는 구조다. 프론트는 `src/lib/api.ts`의 `apiFetch` 래퍼로 호출하며, 이 래퍼가 `accessToken`을 자동으로 붙이고 401 응답 시 `refreshToken`으로 1회 재발급을 시도한 뒤 재요청한다(둘 다 실패하면 토큰 삭제 + `/login` 이동).

### 인증

**`POST /auth/signup`**
```json
{ "loginId": "string", "email": "string", "password": "string", "name": "string", "privacyAgreed": true }
```
응답 없음(201). 토큰을 안 주기 때문에 프론트는 가입 성공 시 `/login`으로 이동시킨다(`SignupPage`).

**`POST /auth/login`**
```json
{ "loginId": "string", "password": "string" }
```
응답: `{ "accessToken": "string", "refreshToken": "string" }`

**`POST /auth/reissue`** — `apiFetch`가 401을 받으면 자동 호출(화면에서 직접 부르지 않음)
```json
{ "refreshToken": "string" }
```
응답: `{ "accessToken": "string", "refreshToken": "string" }`

**`POST /auth/logout`** — `SettingsPage`의 로그아웃 버튼에서 호출, 실패해도 프론트는 토큰을 지우고 `/login`으로 이동

**`PATCH /auth/password`** — 비밀번호 변경(`SettingsPage`)
```json
{ "currentPassword": "string", "newPassword": "string", "newPasswordConfirm": "string" }
```

로그인은 아이디(`loginId`) 기반이며, 이메일은 회원가입 시에만 수집한다. `src/lib/authValidation.ts`가 아이디 영문+숫자 8-12자, 비밀번호 영문+숫자+특수기호 8자 이상 형식을 클라이언트에서 검증하고, 회원가입 폼의 비밀번호 확인 필드는 서버에 전송하지 않는다(로그인용 개인정보 동의 체크박스는 `privacyAgreed`로 전송). 로그인 폼의 "자동 로그인" 체크박스는 서버 요청과 무관하게 토큰 저장 위치만 바꾼다 — 체크 시 `localStorage`, 미체크 시 `sessionStorage`.

### 계정/프로필

**`GET /users/me`** — `SettingsPage` 진입 시 호출(실패해도 빈 폼으로 진행)
응답: `{ "id": 1, "loginId": "string", "nickname": "string", "desiredPosition": "string" }`

이메일 필드가 없다 — `SettingsPage`의 "이메일"처럼 보이던 읽기전용 입력은 실제로는 `loginId`를 보여주는 것이라 라벨을 "아이디"로 바꿔뒀다.

**`PATCH /users/me`** — 프로필 수정(닉네임/관심직무) 저장
```json
{ "nickname": "string", "desiredPosition": "string" }
```

**`DELETE /users/me`** — 회원 탈퇴(`SettingsPage` 탈퇴 확인 모달). 성공(204) 시 계정·프로필·STT 답변·피드백 데이터 즉시 삭제, 프론트는 토큰 삭제 후 `/login`으로 이동.

### 지원 프로필 (`application-profiles`)

**`GET /application-profiles`** — `InterviewSetupPage` 진입 시 저장된 프로필 목록 로드

**`POST /application-profiles`**, **`PUT /application-profiles/:id`** — 지원 프로필 신규등록/수정 모달, `InterviewSetupPage` 제출 시 "새로 입력"을 선택했다면 여기서 먼저 프로필을 만든 뒤 그 id로 세션을 생성
```json
{ "companyName": "string", "jobPosition": "string", "careerLevel": "NEWCOMER" }
```
`careerLevel`은 자유 텍스트가 아니라 `NEWCOMER | RELATED_EXPERIENCE | SIMILAR_EXPERIENCE | SHALLOW_EXPERIENCE | FULL_TIME | CONTRACT_FREELANCE | INTERNSHIP` 7종 enum(`src/types.ts`의 `CareerLevel`). 한글 라벨 매핑은 `src/lib/careerLevels.ts` — `SHALLOW_EXPERIENCE`는 화면설계서에 없던 값이라 라벨("낮은 연관 경력")이 임의 지정된 상태.

### 면접 세션 (`interviews`)

**`POST /interviews`** — 세션 생성 + 질문 세트 발급을 한 번에 처리(`QuestionListPage`에서 로딩 화면과 함께 호출)
```json
{ "applicationProfileId": 1, "interviewType": "COMPREHENSIVE", "durationMinutes": 10 }
```
응답: `{ "sessionId": 1, "status": "IN_PROGRESS", "companyName", "jobPosition", "careerLevel", "questions": [{ "questionId": 101, "sequence": 1, "content": "string" }] }`

응답에 질문이 이미 다 들어있어서, 별도의 "질문 생성" 2단계 호출이 없다 — 이전 버전(`createInterviewSetup` → `generateQuestions`)과 가장 크게 달라진 부분.

**`GET /interviews?status=ALL|COMPLETED`** — 면접 목록(`HomePage`). 실패해도 빈 목록으로 진행
응답: `[{ "sessionId": 1, "companyName", "jobPosition", "status": "COMPLETED" | "FAILED", "createdAt" }]`

목록 응답엔 `careerLevel`/`interviewType`/`durationMinutes`가 없어서, `HomePage` 카드의 "종합 면접 · 10분" 텍스트는 아직 하드코딩 상태(상세 API엔 있음).

**`DELETE /interviews/:sessionId`** — 면접 목록 카드의 삭제 확인 모달. 성공(204) 시 STT 답변·피드백 데이터 함께 삭제.

**`GET /interviews/:sessionId/questions/:questionId/audio`** — 질문 TTS 오디오. `RecordPage`가 각 질문 진입 시 호출해 `<audio>`로 재생(브라우저 SpeechSynthesis 대체)
응답: `{ "questionId": 101, "audioUrl": "https://storage.googleapis.com/...(signed URL)", "expiresAt": "ISO 8601" }`

**`POST /interviews/:sessionId/answers`** — 답변 업로드(`RecordPage`가 녹음 종료 시 자동 호출)
`multipart/form-data`:

| 필드 | 타입 | 내용 |
|---|---|---|
| `questionId` | integer | - |
| `audioFile` | Blob (`audio/wav`, LINEAR16/16000Hz/모노) | `useAudioRecorder`가 Web Audio API로 캡처해 직접 인코딩한 WAV |

응답: `{ "answerId": 1, "questionId": 101, "status": "COMPLETED" | "UPLOADED" | "FAILED" }` — STT 변환까지 끝난 상태가 동기 응답으로 오므로, 이전 버전처럼 결과를 폴링할 필요가 없다(폴링 화면 `ResultPage`/`usePolling`은 이 스펙이 확인된 뒤 삭제됨). 400은 오디오 형식 오류(LINEAR16/16000Hz/모노 아님), 413은 크기 초과(10MB, 약 5분).

**`POST /interviews/:sessionId/complete`** — 면접 종료 + 종합 피드백 생성(`RecordPage`가 마지막 질문 답변 후, 또는 "면접 종료" 모달에서 호출)
응답 `OverallFeedback`:
```ts
{
  totalScore: number          // 0~100
  overallSummary: string
  competencies: {              // 세부 역량 5가지
    thinkingScore, executionScore, collaborationScore, growthScore, adaptabilityScore: number
  }
  positionFit: {                // 포지션 FIT 3가지 — 응답엔 오지만 화면엔 아직 표시 안 함(화면설계서 없음)
    fitExperienceScore, fitJobUnderstandingScore, fitOrganizationScore: number
  }
  feedbackPoints: { type: "STRENGTH" | "WEAKNESS", title: string, description: string }[]
}
```
504는 AI 분석 응답 지연(타임아웃) — `RecordPage`/`InterviewEvaluationPage`가 각자 에러 상태를 보여주고 재시도할 수 있게 되어 있다.

**`GET /interviews/:sessionId/detail`** — 면접 상세(`SessionDetailPage`, `QuestionReviewPage`, `InterviewEvaluationPage`의 새로고침 시 보충 데이터로도 사용)
응답: `{ "sessionId", "companyName", "jobPosition", "careerLevel", "durationMinutes", "overallFeedback": OverallFeedback, "qaList": [{ "questionId", "sequence", "questionContent", "transcript": string | null, "feedback": QuestionFeedback | null }] }`

`qaList[].transcript`가 `null`이면 해당 질문은 STT/답변이 실패한 것으로 간주해 화면에 "답변을 분석하지 못했습니다" 배너를 띄운다.

**`POST /interviews/:sessionId/questions/:questionId/feedback`** — 질문별 온디맨드 AI 피드백(근거/모범답안/꼬리질문). **아직 화면이 없어서 `api.ts`에 호출 함수 자체가 없다** — 화면설계서 나오면 그때 추가.
