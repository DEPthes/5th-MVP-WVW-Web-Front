# 모면완 프론트엔드 — 남은 작업

## 완료된 것

- 프로젝트 세팅: Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui
- 라우팅 스켈레톤: 7개 경로 (`/login`, `/signup`, `/materials/new`, `/questions`, `/record/:questionId`, `/result/:answerId`, `/history`)
- `src/lib/api.ts` — fetch 래퍼(토큰 첨부, FormData 처리, 에러 핸들링) + 백엔드 엔드포인트별 함수
- `src/hooks/useMediaRecorderCapture.ts` — 카메라/마이크 녹화, `RecordPage`에 미리보기+시작/종료 버튼 연결, 언마운트 시 트랙/레코더 정리
- `src/hooks/useFaceLandmarkerMetrics.ts` + `src/lib/facialMetrics.ts` — MediaPipe로 얼굴 지표 집계(순수 로직 분리, 테스트 완료): 아이컨택 비율(eyeLook AND head pose), 분당 깜빡임(blinkRate), 호감도/긴장도/무표정도(likabilityScore/tensionScore/neutralScore, 블렌드셰이프 카테고리 평균 기반 휴리스틱)
- `src/hooks/useVoiceMetrics.ts` + `src/lib/voiceMetrics.ts` — Web Audio API로 목소리 지표 집계: 작은 목소리 구간 비율(quietRatio), 떨림 구간 비율(trembleRatio)
- `src/hooks/useFillerWordCounter.ts` + `src/lib/fillerWords.ts` — Web Speech API로 필러워드("음"/"어"/"그"/"저기"/"니까") 카운트, 미지원 브라우저는 에러 상태로 표시
- `RecordPage`/`ResultPage`에 위 얼굴·목소리 지표 전부 표시. 언마운트 시 카메라/마이크/AudioContext/SpeechRecognition 정리, 미리보기 좌우 미러링(CSS만, 실제 녹화본은 원본 유지)
- `src/lib/polling.ts` + `src/hooks/usePolling.ts` — 처리상태 폴링 유틸, `ResultPage`에 연결
- 녹화 → 업로드 → 결과 플로우 연결: `RecordPage`가 `/record/:questionId`로 questionId를 받고, 녹화 종료 후 영상+지표가 모두 준비되면 `uploadAnswer` 자동 호출 → 성공 시 `/result/:answerId`로 이동, 실패 시 에러 메시지+재시도 버튼
- 인증 흐름 3종: `src/components/ProtectedRoute.tsx`(비로그인 시 `/login`으로 리다이렉트, `state.from`에 원래 경로 보관), `App.tsx` 네비게이션에 로그인 상태별 로그아웃/로그인 버튼 토글, `apiFetch`가 401 응답 시 토큰 삭제 + `/login` 리다이렉트
- Vitest 테스트 34개 (api/facialMetrics/voiceMetrics/fillerWords/polling 순수 로직)
- 라이브러리 사용 현황 및 백엔드 전송 데이터 형태: `docs/LIBRARIES_AND_API.md` 참고

## 남은 작업

각 항목에 블로커 표시: **[지금 가능]** API 명세/디자인 시안 없이 바로 착수 가능 · **[API 대기]** 백엔드 명세 확정 필요(현재 `src/types.ts` 추정 형태로 임시 구현만 가능) · **[디자인 대기]** 시안 나와야 최종 레이아웃/스타일 확정.

### 1. 인증 흐름
- [x] 보호된 라우트 처리 — `ProtectedRoute`가 토큰 없으면 `/login`으로 리다이렉트, `state.from`에 원래 경로 보관(로그인 폼이 나중에 이 값을 읽어 복귀시키면 됨)
- [x] 로그아웃 동작 (토큰 삭제 + `/login` 이동, `App.tsx` 네비게이션)
- [x] 401 응답 시 재로그인 유도 처리 — `apiFetch`가 토큰 삭제 + `/login` 리다이렉트
- [ ] **[API 대기]** `LoginPage` / `SignupPage` 폼 → `login()`/`signup()` 호출 → 토큰 저장 → `location.state.from` 있으면 그 경로로, 없으면 기본 경로로 리다이렉트 — 로직/상태관리는 지금 짤 수 있지만 요청·응답 필드가 명세 확정 전엔 바뀔 수 있음(현재 email/password/token 가정)
- [ ] **[디자인 대기]** 두 폼의 최종 레이아웃/스타일

### 2. 준비자료 입력 (`MaterialInputPage`)
- [ ] **[API 대기]** 기업명/직무/준비자료 입력 폼 → `createMaterial()` 호출 → `/questions` 이동 — 필드 구성이 명세 확정 전엔 바뀔 수 있음
- [ ] **[지금 가능]** 입력 검증(필수값 등)은 필드명이 크게 안 바뀔 값들이라 먼저 짜둬도 무방
- [ ] **[디자인 대기]** 최종 레이아웃

### 3. 질문 리스트 (`QuestionListPage`)
- [ ] **[API 대기]** `generateQuestions()` 결과 렌더링 — 응답 형태가 명세 확정 전엔 바뀔 수 있음
- [ ] **[지금 가능]** 생성 대기 중 로딩 상태, 질문별 "답변 시작" → `/record/:questionId` 이동 로직(이미 라우트는 연결돼 있음)
- [ ] **[디자인 대기]** 최종 레이아웃

### 4. 히스토리 (`HistoryPage`)
- [ ] **[API 대기]** `listSessions()` / `getSession()` 연동
- [ ] **[지금 가능]** `recharts` 설치 + `PracticeSession`/`AnswerRecord` 타입에 맞춘 목업 데이터로 그래프 골격 미리 구현(응답 형태는 `src/types.ts`와 거의 같을 가능성 높음)
- [ ] **[디자인 대기]** 최종 레이아웃

### 5. 디자인 반영
- [ ] **[디자인 대기]** 7개 화면 전부 현재 자리표시자 수준 — 시안 나오는 대로 Tailwind/shadcn으로 실제 레이아웃 적용
- [ ] **[지금 가능]** 로딩/에러/빈 상태를 화면마다 따로 만들지 않고 공용 컴포넌트(`<LoadingState/>`, `<ErrorState retry=.../>` 등)로 통일 — 지금 자리표시자 스타일로 만들어두면 디자인 나왔을 때 그 컴포넌트만 재스타일링하면 됨

### 6. 기타
- [ ] **[API 대기]** `.env` 실제 배포용 `VITE_API_BASE_URL` 설정 (현재 `.env.example`만 존재, 실제 서버 주소 필요)
- [ ] **[지금 가능]** 반응형 대응 범위 논의 (모바일 지원 여부) — 제품 결정 사항, 기술 블로커 없음
- [ ] **[지금 가능]** 필러워드 카운트는 `SpeechRecognition`/`webkitSpeechRecognition`(Chrome/Edge 계열만 안정 지원, Firefox 미지원) 기반 — 미지원 브라우저 사용자에게 안내 문구를 더 눈에 띄게 할지 논의/개선
- [ ] 실측 데이터 필요 — `src/lib/facialMetrics.ts`/`src/lib/voiceMetrics.ts`의 임계치(`ponytail:` 주석 표시) 튜닝. API/디자인과 무관하지만 실사용 데이터가 있어야 해서 지금은 손댈 수 없음

## 참고
- 백엔드 계약: `src/types.ts`의 도메인 타입과 `docs/superpowers/specs/2026-07-11-interview-lab-design.md`(별도 저장소 `depth`) 기준
- 로드맵 원본: `depth` 저장소의 `docs/superpowers/plans/2026-07-11-interview-lab-roadmap.md`
