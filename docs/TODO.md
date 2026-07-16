# 모면완 프론트엔드 — 남은 작업

## 완료된 것

- 프로젝트 세팅: Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui
- 라우팅 스켈레톤: 7개 경로 (`/login`, `/signup`, `/materials/new`, `/questions`, `/record`, `/result/:answerId`, `/history`)
- `src/lib/api.ts` — fetch 래퍼(토큰 첨부, FormData 처리, 에러 핸들링) + 백엔드 엔드포인트별 함수
- `src/hooks/useMediaRecorderCapture.ts` — 카메라/마이크 녹화, `RecordPage`에 미리보기+시작/종료 버튼 연결
- `src/hooks/useFaceLandmarkerMetrics.ts` + `src/lib/facialMetrics.ts` — MediaPipe로 표정/시선 지표 집계(순수 로직 분리, 테스트 완료)
- `src/lib/polling.ts` + `src/hooks/usePolling.ts` — 처리상태 폴링 유틸, `ResultPage`에 연결
- Vitest 테스트 13개 (api/facialMetrics/polling 순수 로직)

## 남은 작업

### 1. 인증 흐름
- [ ] `LoginPage` / `SignupPage` 실제 폼 구현 (shadcn Form) → `login()`/`signup()` 호출 → 토큰 저장 → 리다이렉트
- [ ] 보호된 라우트 처리 (비로그인 시 `/login`으로 리다이렉트)
- [ ] 로그아웃 동작 (토큰 삭제)
- [ ] 401 응답 시 재로그인 유도 처리

### 2. 준비자료 입력 (`MaterialInputPage`)
- [ ] 기업명 / 직무 / 준비자료 텍스트 입력 폼
- [ ] `createMaterial()` 호출, 성공 시 질문 생성 트리거 후 `/questions`로 이동
- [ ] 입력 검증 (필수값 등)

### 3. 질문 리스트 (`QuestionListPage`)
- [ ] `generateQuestions()` 결과 렌더링, 생성 대기 중 로딩 상태
- [ ] 질문별 "답변 시작" → `/record`로 이동하며 질문 컨텍스트 전달

### 4. 녹화 → 업로드 연결 (`RecordPage`)
- [ ] 현재 녹화 종료 시 결과를 화면에만 표시 — `uploadAnswer(questionId, videoBlob, facialMetrics)` 실제 호출로 연결
- [ ] 업로드 성공 시 `/result/:answerId`로 이동
- [ ] 업로드 실패 시 재시도 UI (스펙 9번 에러 처리 기준)

### 5. 히스토리 (`HistoryPage`)
- [ ] `listSessions()` / `getSession()` 연동
- [ ] 추이 그래프 — `recharts` 설치 필요 (아직 미설치)

### 6. 디자인 반영
- [ ] 7개 화면 전부 현재 자리표시자 수준 — 시안 나오는 대로 Tailwind/shadcn으로 실제 레이아웃 적용
- [ ] 로딩 / 에러 / 빈 상태 UI를 화면마다 통일된 패턴으로 정리

### 7. 기타
- [ ] `.env` 실제 배포용 `VITE_API_BASE_URL` 설정 (현재 `.env.example`만 존재)
- [ ] 반응형 대응 범위 논의 (모바일 지원 여부)

## 참고
- 백엔드 계약: `src/types.ts`의 도메인 타입과 `docs/superpowers/specs/2026-07-11-interview-lab-design.md`(별도 저장소 `depth`) 기준
- 로드맵 원본: `depth` 저장소의 `docs/superpowers/plans/2026-07-11-interview-lab-roadmap.md`
