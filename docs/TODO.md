# 모면완 프론트엔드 — 남은 작업

> **2026-07-26 방향 전환**: 카메라/MediaPipe 표정 분석, 음성 신호 지표(말속도·떨림 등 정량값), 원본 영상/음성 저장 및 다시듣기를 전부 제외하기로 결정. 답변은 마이크로만 녹음하고, STT 텍스트 + Gemini 텍스트 피드백에 집중하는 구조로 변경. 기존 구현은 `archive/video-facial-pipeline` 브랜치에 보존. 근거: 기획 폴더(`기획/모면완 IA & 기능명세서 (최종)/`)의 "카메라는 MVP 제외", 원본 음성 미저장 정책.

> **2026-08-02~03 대규모 갱신**: Figma 화면설계서 기준으로 전 화면을 다시 구현하고, 실제 백엔드 Swagger 스펙(`AI_Interview_API` 1.0.0)에 맞춰 `src/lib/api.ts`/`src/types.ts`를 전면 재작성했다. 아래 내용은 이 시점 기준으로 다시 정리한 것 — 이전 버전의 "API 대기"/"디자인 대기" 표시 대부분은 이제 해소됨.

## 완료된 것

**디자인 시스템**
- Figma 디자인 토큰(컬러/타이포/Pretendard) 반영, `Button` 컴포넌트(default/outline/destructive/secondary/ghost/link) Figma 스펙대로 재정비
- 공용 레이아웃: `Header`, `Sidebar`, `AppLayout`, `Footer`
- 공용 상태 컴포넌트: `<LoadingState/>`, `<ErrorState retry=.../>`, `ReviewQAList`(Q&A 채팅버블, 세션 상세/질문 다시보기 공용)

**라우팅** (`src/App.tsx`)
- `/login`, `/signup` — 인증 화면 (Header/Sidebar 없음)
- `/` — 홈(면접 목록), `/interviews/new` — 면접 조건 설정, `/settings` — 설정 (AppLayout 적용)
- `/questions/new` — 면접 세션 생성 대기(로딩/실패) 화면
- `/record/:questionId/start` — 시작 전 확인, `/record/:questionId` — 질문 음성재생~녹음~업로드 플로우
- `/sessions/:sessionId` — 면접 결과(피드백/질문별 다시보기 탭), `/sessions/:sessionId/evaluation` — 면접 종료 직후 평가 화면, `/sessions/:sessionId/review` — 독립 질문 다시보기 화면
- `*` — 404 (`NotFoundPage`)
- (`/result/:answerId`는 답변 업로드가 동기 응답으로 바뀌면서 삭제됨 — 폴링 화면 자체가 불필요해짐)

**화면별 구현 (전부 Figma 기준 재구현 + 실제 API 연동 완료)**
- `LoginPage`/`SignupPage` — 카드 레이아웃, 비밀번호 토글, 필드 검증(`src/lib/authValidation.ts`), `loginId` 기준 로그인/회원가입. 회원가입은 토큰을 안 돌려주므로 성공 시 `/login`으로 이동
- `HomePage` — 전체/완료 필터, 날짜별 그룹, 카드(피드백/삭제), 삭제 확인 모달
- `SettingsPage` — 프로필 수정(닉네임/관심 직무 드롭다운), 계정 관리(로그인 정보 읽기전용 — "이메일"이 아니라 "아이디"로 표시, API가 이메일을 안 줌), 비밀번호 변경, 회원탈퇴 확인 모달(Figma 문구/버튼 그대로)
- `InterviewSetupPage` — 저장된 지원 프로필 불러오기/수정/신규등록(모달), 경력을 `CareerLevel` enum 드롭다운으로 선택, 제출 시 프로필이 없으면 먼저 생성한 뒤 `/questions/new`로 이동
- `QuestionListPage` — 여기서 실제로 `createInterviewSession()`을 호출(세션 생성 + 질문 세트 발급이 API 한 번에 옴), 로딩/실패 화면
- `InterviewStartPage` — 체크리스트, 마이크 권한 실시간 상태
- `RecordPage` — 서버 TTS 오디오 재생 → 녹음 준비(진행률 바) → 녹음(웨이브폼) → 답변 제출(동기 응답, 폴링 없음) → 다음 질문 자동 이동 or 마지막 질문이면 `completeInterview()` 호출 후 평가 화면 이동. 면접 종료 모달도 Figma 기준으로 재작성
- `InterviewEvaluationPage` — 종합점수/강점/약점 카드, route state로 받은 피드백 우선 사용 + 없으면 `getInterviewDetail`로 보충
- `SessionDetailPage`/`QuestionReviewPage` — `getInterviewDetail()` 연동, 역량 게이지 5개(사고력/실행력/협업력/성장력/정착력), 질문별 다시보기
- `NotFoundPage` — 범용 404

**API 레이어** (`src/lib/api.ts`, `src/types.ts`, `src/lib/careerLevels.ts`)
- 실제 Swagger 스펙(`AI_Interview_API` 1.0.0) 기준으로 전면 재작성 완료
- accessToken/refreshToken 2종 토큰, 401 시 refreshToken으로 1회 자동 재발급 후 재요청
- `useAudioRecorder`: `MediaRecorder`(webm) → Web Audio API 캡처 + 수동 WAV 인코딩으로 교체, LINEAR16/16000Hz/모노 스펙 충족
- Vitest 테스트: api/authValidation/interviewSetupValidation/settingsValidation

## 남은 작업

### 1. 백엔드가 아직 스펙을 구현하지 않음 (제일 큰 블로커)
- 백엔드 레포(https://github.com/DEPthes/5th-MVP-WVW-Server, 로컬 클론: `~/Downloads/5th-MVP-WVW-Server`)는 2026-08-03 확인 기준 빈 Spring Boot 스켈레톤 상태 — 7/16에 로그인+Gemini 연동 코드가 있었으나 7/18 "reset" 커밋으로 전부 되돌려짐
- 사용자 판단: 프론트에서 먼저 목업 서버를 만들지 않고, 백엔드 팀 구현을 기다리기로 결정(2026-08-03)
- 백엔드 완성되면: `.env`에 실제 `VITE_API_BASE_URL` 설정, CORS 설정 요청(허용 origin/메서드/Authorization 헤더, preflight OPTIONS는 인증 없이 통과 — 대화 기록 참고) 확인 필요
- 실제 서버로 전체 흐름(로그인→면접설정→녹음→결과) 종단 테스트는 아직 한 번도 못 해봄

### 2. 의도적으로 미룬 기능 (화면설계서에 없어서 이번 연동 범위에서 제외)
- 질문별 온디맨드 AI 피드백 (`POST /interviews/{sessionId}/questions/{questionId}/feedback` — 근거/모범답안/꼬리질문). `api.ts`에 함수 자체가 없음
- 포지션 FIT 3점수(업무경험 유사도/직무이해도/조직적합도) — `OverallFeedback` 타입엔 있지만 화면에 표시 안 함

### 3. 확인 필요한 것
- `src/lib/careerLevels.ts`의 `SHALLOW_EXPERIENCE` 한글 라벨("낮은 연관 경력")은 화면설계서에 없던 값이라 임의 지정 — 실제 문구 확정 필요
- `HomePage` 카드의 "종합 면접 · 10분" 텍스트가 하드코딩 — 목록 API(`InterviewSessionSummary`)가 interviewType/durationMinutes/careerLevel을 안 줘서 실제 값 표시 불가 (상세 API엔 있음)

### 4. 기타
- 반응형: 데스크톱 전용으로 확정, 모바일 대응은 범위 밖

## 참고
- 실제 백엔드 API 스펙: https://app.swaggerhub.com/apis/uni-62b/AI_Interview_API/1.0.0
- 데이터 계약(현재 소스 오브 트루스): `src/types.ts`, `src/lib/api.ts`, `src/lib/careerLevels.ts`
- 백엔드 레포: https://github.com/DEPthes/5th-MVP-WVW-Server
