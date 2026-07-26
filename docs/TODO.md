# 모면완 프론트엔드 — 남은 작업

> **2026-07-26 방향 전환**: 카메라/MediaPipe 표정 분석, 음성 신호 지표(말속도·떨림 등 정량값), 원본 영상/음성 저장 및 다시듣기를 전부 제외하기로 결정. 답변은 마이크로만 녹음하고, STT 텍스트 + Gemini 텍스트 피드백에 집중하는 구조로 변경. 기존 구현은 `archive/video-facial-pipeline` 브랜치에 보존. 근거: 기획 폴더(`기획/모면완 IA & 기능명세서 (최종)/`)의 "카메라는 MVP 제외", 원본 음성 미저장 정책.

## 완료된 것

- 프로젝트 세팅: Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui
- 라우팅: `/login`, `/signup`, `/`(홈), `/materials/new`, `/questions/:materialId`, `/record/:questionId/start`(면접 시작 안내), `/record/:questionId`, `/result/:answerId`, `/history`
- `HomePage`(`/`) — 최근 면접 목록/CTA 자리, `listSessions()` 대기 중이라 항상 빈 상태+시작 CTA
- `InterviewStartPage`(`/record/:questionId/start`) — 답변 녹음 전 마이크 권한 확인, 거부 시 안내+재시도
- `Footer` — 전 화면 공통 노출, 저작권/이용약관·개인정보처리방침(native `<dialog>` 모달)/문의 이메일
- `src/lib/api.ts` — fetch 래퍼(토큰 첨부, FormData 처리, 에러 핸들링) + 백엔드 엔드포인트별 함수
- `src/hooks/useAudioRecorder.ts` — 마이크 전용 녹음(카메라 미사용), 시작/종료 버튼 연결, 언마운트 시 트랙/레코더 정리
- `src/lib/polling.ts` + `src/hooks/usePolling.ts` — 처리상태 폴링 유틸, `ResultPage`에 연결
- 녹음 → 업로드 → 결과 플로우 연결: `RecordPage`가 `/record/:questionId`로 questionId를 받고, 녹음 종료 후 오디오가 준비되면 `uploadAnswer` 자동 호출 → 성공 시 `/result/:answerId`로 이동, 실패 시 에러 메시지+재시도 버튼
- `ResultPage`에 종합 피드백(`feedbackText`)과 STT 스크립트(`transcriptText`, "질문다시보기" 자리) 표시
- 인증 흐름 3종: `src/components/ProtectedRoute.tsx`(비로그인 시 `/login`으로 리다이렉트, `state.from`에 원래 경로 보관), `App.tsx` 네비게이션에 로그인 상태별 로그아웃/로그인 버튼 토글, `apiFetch`가 401 응답 시 토큰 삭제 + `/login` 리다이렉트
- `LoginPage`/`SignupPage` — `src/lib/authValidation.ts` 검증(아이디/비밀번호, 아이디/이메일/비밀번호/이름/약관동의) + `login()`/`signup()` 연동, 성공 시 토큰 저장 후 리다이렉트
- `QuestionListPage`(`/questions/:materialId`) — `generateQuestions()` 연동, 질문별 "답변 시작" → `/record/:questionId`
- `MaterialInputPage` — `src/lib/materialValidation.ts` 입력 검증 + `createMaterial()` 연동, 성공 시 `/questions/:materialId` 이동
- `<LoadingState/>`/`<ErrorState retry=.../>` 공용 컴포넌트로 로딩·에러 UI 통일
- Vitest 테스트 (api/polling/materialValidation 순수 로직)
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

### 2. 준비자료 입력 (`MaterialInputPage`)
- [ ] **[API 대기]** 기업명/직무/준비자료 입력 폼 → `createMaterial()` 호출 → `/questions` 이동 — 필드 구성이 명세 확정 전엔 바뀔 수 있음
- [ ] **[지금 가능]** 입력 검증(필수값 등)은 필드명이 크게 안 바뀔 값들이라 먼저 짜둬도 무방
- [ ] **[디자인 대기]** 최종 레이아웃

### 2-2. 준비자료 입력 검증
- [x] 입력 검증(필수값) — `src/lib/materialValidation.ts` + 폼 연동, `createMaterial()` 호출까지 연결

### 3. 질문 리스트 (`QuestionListPage`)
- [x] `generateQuestions()` 호출 + 결과 렌더링, 생성 대기 중 로딩 상태, 질문별 "답변 시작" → `/record/:questionId` 이동 — 라우트를 `/questions/:materialId`로 변경(질문 생성에 materialId 필요)
- [ ] **[디자인 대기]** 최종 레이아웃

### 4. 히스토리 (`HistoryPage`)
- [ ] **[API 대기]** `listSessions()` / `getSession()` 연동
- [ ] **[API 대기]** 기획서 "면접 목록 목록"(날짜·기업·직무·요약평가, 정렬, 삭제)으로 재구현 — 표정/음성 지표 그래프는 카메라 제외 결정으로 폐기
- [ ] **[디자인 대기]** 최종 레이아웃

### 5. 디자인 반영
- [ ] **[디자인 대기]** 7개 화면 전부 현재 자리표시자 수준 — 시안 나오는 대로 Tailwind/shadcn으로 실제 레이아웃 적용
- [x] 로딩/에러 상태를 `<LoadingState/>`, `<ErrorState retry=.../>` 공용 컴포넌트로 통일(RecordPage/ResultPage/QuestionListPage/MaterialInputPage 적용) — 디자인 나오면 이 두 컴포넌트만 재스타일링하면 됨

### 6. 기타
- [ ] **[API 대기]** `.env` 실제 배포용 `VITE_API_BASE_URL` 설정 (현재 `.env.example`만 존재, 실제 서버 주소 필요)
- [x] 반응형 대응 범위 결정 — 데스크톱 우선 지원, 모바일 대응은 보류
- [x] 홈 화면 뼈대(`HomePage`, 빈 상태+CTA), 공통 푸터(`Footer`), 면접 시작 안내(`InterviewStartPage`, 마이크 권한) 구현
- [ ] **[API 대기]** 설정(프로필 수정·계정관리)/지원 프로필(기업·직무·경력 선택·수정·신규등록)/면접 유형·시간 선택/면접 목록 목록·상세 — 아직 미착수. `기획/` 폴더의 기능명세서·화면설계서 기준
- [ ] **[API 대기, 설계 보류]** 면접 종료 확인 모달, 하나의 세션에서 여러 질문 순차 진행 + 전체 타이머, 세션 단위 종합 피드백 데이터 모델(`PracticeSession`에 필드 없음) — 2026-07-26에 백엔드 세션/TTS/STT/Gemini API가 확정되기 전까지 설계를 보류하기로 결정(사용자 판단: 지금은 백엔드·디자인이 필요 없는 작업만 진행). API 확정되면 브레인스토밍부터 다시 시작

## 참고
- 백엔드 계약: `src/types.ts`의 도메인 타입과 `docs/superpowers/specs/2026-07-11-interview-lab-design.md`(별도 저장소 `depth`) 기준
- 로드맵 원본: `depth` 저장소의 `docs/superpowers/plans/2026-07-11-interview-lab-roadmap.md`
