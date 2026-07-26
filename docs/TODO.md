# 모면완 프론트엔드 — 남은 작업

> **2026-07-26 방향 전환**: 카메라/MediaPipe 표정 분석, 음성 신호 지표(말속도·떨림 등 정량값), 원본 영상/음성 저장 및 다시듣기를 전부 제외하기로 결정. 답변은 마이크로만 녹음하고, STT 텍스트 + Gemini 텍스트 피드백에 집중하는 구조로 변경. 기존 구현은 `archive/video-facial-pipeline` 브랜치에 보존. 근거: 기획 폴더(`기획/모면완 IA & 기능명세서 (최종)/`)의 "카메라는 MVP 제외", 원본 음성 미저장 정책.

## 완료된 것

- 프로젝트 세팅: Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui
- 라우팅: `/login`, `/signup`, `/`(홈=면접 목록), `/interviews/new`(면접 조건 설정), `/questions/:interviewId`, `/record/:questionId/start`(면접 시작 안내), `/record/:questionId`, `/result/:answerId`, `/sessions/:sessionId`(면접 상세, 자리표시자), `/settings`
- `HomePage`(`/`, 기획서 "홈" 화면설계서 기준 — 홈 자체가 면접 목록 화면) — 전체/완료 건수, 카드 목록(피드백/삭제), 삭제 확인 모달(native `<dialog>`), `listSessions()`/`deleteSession()` 연동. 목록 없으면 빈 상태+CTA. 별도 "히스토리" 메뉴는 기획서 IA에 없어서 제거(2026-07-26)
- `InterviewStartPage`(`/record/:questionId/start`) — 답변 녹음 전 마이크 권한 확인, 거부 시 안내+재시도
- `Footer` — 전 화면 공통 노출, 저작권/이용약관·개인정보처리방침(native `<dialog>` 모달)/문의 이메일
- `src/lib/api.ts` — fetch 래퍼(토큰 첨부, FormData 처리, 에러 핸들링) + 백엔드 엔드포인트별 함수
- `src/hooks/useAudioRecorder.ts` — 마이크 전용 녹음(카메라 미사용), 시작/종료 버튼 연결, 언마운트 시 트랙/레코더 정리
- `src/lib/polling.ts` + `src/hooks/usePolling.ts` — 처리상태 폴링 유틸, `ResultPage`에 연결
- 녹음 → 업로드 → 결과 플로우 연결: `RecordPage`가 `/record/:questionId`로 questionId를 받고, 녹음 종료 후 오디오가 준비되면 `uploadAnswer` 자동 호출 → 성공 시 `/result/:answerId`로 이동, 실패 시 에러 메시지+재시도 버튼
- `ResultPage`에 종합 피드백(`feedbackText`)과 STT 스크립트(`transcriptText`, "질문다시보기" 자리) 표시
- 인증 흐름 3종: `src/components/ProtectedRoute.tsx`(비로그인 시 `/login`으로 리다이렉트, `state.from`에 원래 경로 보관), `App.tsx` 네비게이션에 로그인 상태별 로그아웃/로그인 버튼 토글, `apiFetch`가 401 응답 시 토큰 삭제 + `/login` 리다이렉트
- `LoginPage`/`SignupPage` — `src/lib/authValidation.ts` 검증(아이디/비밀번호, 아이디/이메일/비밀번호/이름/약관동의) + `login()`/`signup()` 연동, 성공 시 토큰 저장 후 리다이렉트
- `QuestionListPage`(`/questions/:interviewId`) — `generateQuestions()` 연동, 질문별 "답변 시작" → `/record/:questionId`
- `InterviewSetupPage`(`/interviews/new`, 기획서 "면접 조건 설정" 화면 기준) — 지원 프로필 선택/수정/신규등록(native `<dialog>` 모달, `createApplicantProfile`/`updateApplicantProfile` 연동), 기업/직무/경력/면접유형/면접시간(5·10·15·20분) 입력, `src/lib/interviewSetupValidation.ts` 검증 + `createInterviewSetup()` 연동, 성공 시 `/questions/:interviewId` 이동. 기존 "준비자료(자유 텍스트)" 필드는 기획서에 없는 개념이라 제거(2026-07-26)
- `<LoadingState/>`/`<ErrorState retry=.../>` 공용 컴포넌트로 로딩·에러 UI 통일
- `SettingsPage`(`/settings`, 기획서 "설정" 화면설계서 기준) — 프로필 수정(닉네임/관심직무, `updateUserProfile()`), 계정관리(로그인 정보 읽기전용, 로그아웃, 비밀번호 변경 `changePassword()`, 탈퇴 확인 모달 `withdrawAccount()`), `src/lib/settingsValidation.ts` 검증
- Vitest 테스트 (api/polling/interviewSetupValidation/authValidation/settingsValidation 순수 로직)
- 라이브러리 사용 현황 및 백엔드 전송 데이터 형태: `docs/LIBRARIES_AND_API.md` 참고

## 남은 작업

각 항목에 블로커 표시: **[지금 가능]** API 명세/디자인 시안 없이 바로 착수 가능 · **[API 대기]** 백엔드 명세 확정 필요(현재 `src/types.ts` 추정 형태로 임시 구현만 가능) · **[디자인 대기]** 시안 나와야 최종 레이아웃/스타일 확정.

### 1. 인증 흐름
- [x] 보호된 라우트 처리 — `ProtectedRoute`가 토큰 없으면 `/login`으로 리다이렉트, `state.from`에 원래 경로 보관(로그인 폼이 나중에 이 값을 읽어 복귀시키면 됨)
- [x] 로그아웃 동작 (토큰 삭제 + `/login` 이동, `App.tsx` 네비게이션)
- [x] 401 응답 시 재로그인 유도 처리 — `apiFetch`가 토큰 삭제 + `/login` 리다이렉트
- [x] 로그인 필드를 기획서 기준(아이디+비밀번호)으로 정정 — `login(userId, password)`, 이메일은 회원가입 시에만 수집(비밀번호 재설정용)
- [x] `LoginPage` / `SignupPage` 폼 구현 — `src/lib/authValidation.ts` 검증 + `login()`/`signup()` 연동, 토큰 저장, `location.state.from` 있으면 그 경로로 없으면 `/`(홈)로 리다이렉트
- [ ] **[디자인 대기]** 두 폼의 최종 레이아웃/스타일 — `기획/화면설계서/` 참고

### 2. 면접 조건 설정 (`InterviewSetupPage`)
- [x] 지원 프로필(기업/직무/경력) 선택·수정·신규등록 모달, 면접 유형/시간 선택, `src/lib/interviewSetupValidation.ts` 검증 + `createInterviewSetup()`/`createApplicantProfile()`/`updateApplicantProfile()` 연동 — 기획서 화면설계서 Slide 9/10 기준
- [ ] **[API 대기]** `listApplicantProfiles()` 연동 — 지금은 이번 세션 동안 등록/수정한 프로필만 select에 표시(새로고침 시 초기화)
- [ ] **[API 대기]** 실제 필드명/응답 형태는 백엔드 확정 전엔 바뀔 수 있음
- [ ] **[디자인 대기]** 최종 레이아웃 — 화면설계서 Slide 9/10과 비교해 세부 스타일 맞추기

### 3. 질문 리스트 (`QuestionListPage`)
- [x] `generateQuestions()` 호출 + 결과 렌더링, 생성 대기 중 로딩 상태, 질문별 "답변 시작" → `/record/:questionId/start` 이동 — 라우트를 `/questions/:interviewId`로 변경(질문 생성에 interviewId 필요)
- [ ] **[디자인 대기]** 최종 레이아웃

### 4. 면접 목록 (`HomePage`)
- [x] 카드 목록(전체/완료 건수, 날짜, 상태, 피드백/삭제 버튼), 삭제 확인 모달 — 기획서 화면설계서(홈.png) 기준
- [ ] **[API 대기]** `listSessions()`/`deleteSession()` 연동 — 지금은 API 대기 중이라 항상 빈 상태로 표시
- [ ] **[디자인 대기]** 최종 레이아웃

### 5. 디자인 반영
- [ ] **[디자인 대기]** 전 화면 현재 자리표시자 수준 — 시안 나오는 대로 Tailwind/shadcn으로 실제 레이아웃 적용
- [x] 로딩/에러 상태를 `<LoadingState/>`, `<ErrorState retry=.../>` 공용 컴포넌트로 통일(RecordPage/ResultPage/QuestionListPage/InterviewSetupPage 적용) — 디자인 나오면 이 두 컴포넌트만 재스타일링하면 됨

### 6. 기타
- [ ] **[API 대기]** `.env` 실제 배포용 `VITE_API_BASE_URL` 설정 (현재 `.env.example`만 존재, 실제 서버 주소 필요)
- [x] 반응형 대응 범위 결정 — 데스크톱 우선 지원, 모바일 대응은 보류
- [x] 홈 화면 뼈대(`HomePage`, 빈 상태+CTA), 공통 푸터(`Footer`), 면접 시작 안내(`InterviewStartPage`, 마이크 권한) 구현
- [x] 지원 프로필(기업·직무·경력 선택·수정·신규등록)/면접 유형·시간 선택 — `InterviewSetupPage`로 구현
- [x] 설정(프로필 수정·계정관리: 로그아웃/비밀번호변경/탈퇴 확인 모달) — `SettingsPage`로 구현. `getUserProfile()`/`updateUserProfile()`/`changePassword()`/`withdrawAccount()`는 아직 API 대기, 실패해도 폼은 그대로 사용 가능
- [x] `SessionDetailPage`(`/sessions/:sessionId`) — 자리표시자만 존재. 실제 내용(홈2/홈3.png: 피드백 탭 — 종합점수/사고력·실행력·협업력·성장력 breakdown, 질문다시보기 탭)은 아래 세션 단위 종합 피드백 데이터 모델 결정 이후 구현
- [ ] **[API 대기, 설계 보류]** 면접 종료 확인 모달, 하나의 세션에서 여러 질문 순차 진행 + 전체 타이머, 세션 단위 종합 피드백 데이터 모델(종합점수·사고력·실행력·협업력·성장력, `PracticeSession`에 필드 없음) — 2026-07-26에 백엔드 세션/TTS/STT/Gemini API가 확정되기 전까지 설계를 보류하기로 결정(사용자 판단: 지금은 백엔드·디자인이 필요 없는 작업만 진행). API 확정되면 브레인스토밍부터 다시 시작

## 참고
- 백엔드 계약: `src/types.ts`의 도메인 타입과 `docs/superpowers/specs/2026-07-11-interview-lab-design.md`(별도 저장소 `depth`) 기준
- 로드맵 원본: `depth` 저장소의 `docs/superpowers/plans/2026-07-11-interview-lab-roadmap.md`
